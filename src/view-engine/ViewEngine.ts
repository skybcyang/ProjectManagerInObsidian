import type { App, MarkdownPostProcessorContext, TFile } from 'obsidian';
import type { EntityManager } from '../core';
import type { ViewConfig, ViewContext, ViewMode, CardFieldsConfig, ListColumnField } from './types';
import { VIEW_MODE_LABELS, ENTITY_CARD_FIELD_DEFINITIONS, LIST_COLUMN_DEFINITIONS } from './types';
import { DataService, ActionService } from './services';
import { FilterBar } from './components/FilterBar';
import { CodeBlockConfigService } from '../services';
import { ConfigValidator, ErrorHandler } from '../utils';
import {
  BaseRenderer,
  KanbanRenderer,
  ListRenderer,
  GridRenderer,
  CascadeRenderer,
  TimelineRenderer,
  TimeViewRenderer,
  BurndownRenderer,
  WorkloadRenderer,
} from './renderers';

/**
 * 视图引擎 - 简化版
 * 统一处理 pm-view 的所有视图渲染，使用筛选器选择条件
 */
export class ViewEngine {
  private dataService: DataService;
  private actionService: ActionService;
  private configService: CodeBlockConfigService;
  private pendingSave: { [key: string]: NodeJS.Timeout } = {};
  private currentFilterBar?: FilterBar;

  private fullscreenKeyListener?: (e: KeyboardEvent) => void;
  private fullscreenOriginalParent: HTMLElement | null = null;
  private fullscreenOriginalNextSibling: Node | null = null;
  private fullscreenEscHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    private app: App,
    private entityManager: EntityManager
  ) {
    this.dataService = new DataService(app, entityManager);
    this.actionService = new ActionService(app, entityManager);
    this.configService = new CodeBlockConfigService(app);
    this.setupFullscreenKeyListener();
  }

  /**
   * 设置全屏 ESC 键监听
   */
  private setupFullscreenKeyListener(): void {
    if (this.fullscreenKeyListener) return;
    
    this.fullscreenKeyListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const fullscreenWrapper = document.querySelector('.pm-view-fullscreen');
        if (fullscreenWrapper) {
          const btn = fullscreenWrapper.querySelector('.pm-fullscreen-btn');
          if (btn) {
            this.toggleFullscreen(fullscreenWrapper as HTMLElement, btn as HTMLElement);
          }
        }
      }
    };
    document.addEventListener('keydown', this.fullscreenKeyListener);
  }

  /**
   * 销毁视图引擎，清理所有资源
   */
  destroy(): void {
    // 1. 清理全屏键盘监听
    if (this.fullscreenKeyListener) {
      document.removeEventListener('keydown', this.fullscreenKeyListener);
      this.fullscreenKeyListener = undefined;
    }

    // 2. 如果处于全屏状态，先退出全屏（恢复DOM位置）
    if (this.fullscreenEscHandler) {
      document.removeEventListener('keydown', this.fullscreenEscHandler);
      this.fullscreenEscHandler = null;
    }

    // 3. 清理 FilterBar
    if (this.currentFilterBar) {
      this.currentFilterBar.destroy();
      this.currentFilterBar = undefined;
    }

    // 4. 清理所有待执行的防抖定时器
    Object.values(this.pendingSave).forEach(timeout => {
      clearTimeout(timeout);
    });
    this.pendingSave = {};
  }

  /**
   * 切换全屏模式
   */
  private toggleFullscreen(wrapper: HTMLElement, btn: HTMLElement): void {
    const isFullscreen = wrapper.classList.contains('pm-view-fullscreen');

    if (isFullscreen) {
      // 退出全屏
      this.exitFullscreen(wrapper);
      btn.textContent = '⛶';
      btn.setAttribute('title', '全屏');
    } else {
      // 进入全屏
      this.enterFullscreen(wrapper);
      btn.textContent = '✕';
      btn.setAttribute('title', '退出全屏');
    }
  }

  /**
   * 进入全屏 - 使用CSS类方式，保持事件监听器
   */
  private enterFullscreen(wrapper: HTMLElement): void {
    // 记录原始父元素和位置，用于退出时恢复
    this.fullscreenOriginalParent = wrapper.parentElement;
    this.fullscreenOriginalNextSibling = wrapper.nextSibling;

    // 给wrapper添加全屏类
    wrapper.classList.add('pm-view-fullscreen');

    // 将wrapper移动到body下以确保最高层级
    document.body.appendChild(wrapper);

    // ESC键退出
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.exitFullscreen(wrapper);
        document.removeEventListener('keydown', escHandler);
        this.fullscreenEscHandler = null;
      }
    };
    document.addEventListener('keydown', escHandler);
    this.fullscreenEscHandler = escHandler;

    console.log('[PM] 进入全屏');
  }

  /**
   * 退出全屏 - 恢复DOM到原始位置
   */
  private exitFullscreen(wrapper: HTMLElement): void {
    // 移除全屏类
    wrapper.classList.remove('pm-view-fullscreen');

    // 恢复原始位置
    if (this.fullscreenOriginalParent) {
      // 如果原始父元素存在，将wrapper插回原来的位置
      const placeholder = document.createElement('div');
      placeholder.id = 'pm-fullscreen-restore-placeholder';

      // 先插入占位符到body中的wrapper位置（实际不需要，因为我们直接append）
      if (wrapper.parentNode) {
        // 确保wrapper还在DOM中
        if (this.fullscreenOriginalNextSibling) {
          this.fullscreenOriginalParent.insertBefore(wrapper, this.fullscreenOriginalNextSibling);
        } else {
          this.fullscreenOriginalParent.appendChild(wrapper);
        }
      }

      console.log('[PM] 退出全屏，恢复DOM位置');
    }

    // 清理记录
    this.fullscreenOriginalParent = null;
    this.fullscreenOriginalNextSibling = null;
  }

  /**
   * 防抖保存配置 - 避免频繁保存
   */
  private debouncedSave(
    sourcePath: string,
    codeBlockIndex: number | undefined,
    updates: Partial<ViewConfig>,
    delay: number = 300
  ): void {
    const key = `${sourcePath}:${codeBlockIndex}`;
    
    // 清除之前的定时器
    if (this.pendingSave[key]) {
      clearTimeout(this.pendingSave[key]);
    }
    
    // 设置新的定时器
    this.pendingSave[key] = setTimeout(() => {
      this.saveViewConfig(sourcePath, codeBlockIndex, updates);
      delete this.pendingSave[key];
    }, delay);
  }

  /**
   * 渲染视图 - 工具栏在上，筛选在中，视图在下
   */
  async render(
    container: HTMLElement,
    config: ViewConfig,
    context: ViewContext,
    codeBlockIndex?: number
  ): Promise<void> {
    // 清理旧的 FilterBar
    if (this.currentFilterBar) {
      this.currentFilterBar.destroy();
      this.currentFilterBar = undefined;
    }

    container.empty();
    container.addClass('pm-view');

    // 创建视图包装器
    const wrapper = container.createDiv('pm-view-wrapper');

    // 1. 渲染工具栏（视图切换、属性面板等）
    const toolbarEl = this.renderToolbar(wrapper, config, context, codeBlockIndex);

    // 2. 创建筛选器
    this.currentFilterBar = new FilterBar(
      this.app,
      this.entityManager,
      async (filters) => {
        const finalConfig: ViewConfig = { ...config, ...filters };
        await this.renderContent(contentArea, finalConfig, context);
      },
      context.sourcePath,
      codeBlockIndex
    );
    await this.currentFilterBar.loadOptions();
    this.currentFilterBar.render(wrapper, config);

    // 3. 再创建内容区域（在下）
    const contentArea = wrapper.createDiv('pm-view-content');

    // 4. 渲染初始内容
    await this.renderContent(contentArea, config, context);
  }

  /**
   * 渲染工具栏
   */
  private renderToolbar(
    wrapper: HTMLElement,
    config: ViewConfig,
    context: ViewContext,
    codeBlockIndex?: number
  ): HTMLElement {
    const toolbar = wrapper.createDiv('pm-view-toolbar');

    // 左侧：视图模式切换下拉
    const viewModeGroup = toolbar.createDiv('pm-toolbar-group');

    const viewModeSelect = viewModeGroup.createEl('select', { cls: 'pm-toolbar-select' });

    // 添加视图模式选项
    Object.entries(VIEW_MODE_LABELS).forEach(([mode, label]) => {
      const option = viewModeSelect.createEl('option', {
        text: label,
        value: mode,
      });
      if (mode === config.mode) {
        option.selected = true;
      }
    });

    // 视图切换事件
    viewModeSelect.addEventListener('change', async () => {
      const newMode = viewModeSelect.value as ViewMode;
      const newConfig: ViewConfig = { ...config, mode: newMode };

      // 保存新配置到代码块
      await this.saveViewModeChange(context.sourcePath, codeBlockIndex, newMode);

      // 重新渲染内容区域
      const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
      if (contentArea) {
        await this.renderContent(contentArea, newConfig, context);
      }
    });

    // 右侧：功能按钮组
    const buttonGroup = toolbar.createDiv('pm-toolbar-group pm-toolbar-right');

    // 筛选按钮
    const filterBtn = buttonGroup.createEl('button', {
      cls: 'pm-toolbar-btn',
      text: '筛选 ▼',
    });
    filterBtn.addEventListener('click', () => {
      // 显示/隐藏筛选栏
      const filterBar = wrapper.querySelector('.pm-filter-container') as HTMLElement;
      if (filterBar) {
        const isHidden = filterBar.style.display === 'none';
        filterBar.style.display = isHidden ? 'block' : 'none';
        filterBtn.textContent = isHidden ? '筛选 ▲' : '筛选 ▼';
      }
    });

    // 排序按钮
    const sortBtn = buttonGroup.createEl('button', {
      cls: 'pm-toolbar-btn',
      text: '排序 ▼',
    });
    sortBtn.addEventListener('click', () => {
      this.showSortMenu(sortBtn, wrapper, config, context, codeBlockIndex);
    });

    // 属性按钮
    const propBtn = buttonGroup.createEl('button', {
      cls: 'pm-toolbar-btn',
      text: '属性 ▼',
    });
    propBtn.addEventListener('click', () => {
      this.showPropertyPanel(propBtn, wrapper, config, context, codeBlockIndex);
    });

    // 全屏按钮
    const fullscreenBtn = buttonGroup.createEl('button', {
      cls: 'pm-toolbar-btn pm-fullscreen-btn',
      text: '⛶',
      attr: { title: '全屏' }
    });

    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('[PM] 全屏按钮被点击');
      this.toggleFullscreen(wrapper, fullscreenBtn);
    });

    return toolbar;
  }

  /**
   * 保存视图模式变更到代码块
   */
  private async saveViewModeChange(
    sourcePath: string,
    codeBlockIndex: number | undefined,
    newMode: ViewMode
  ): Promise<void> {
    await this.saveViewConfig(sourcePath, codeBlockIndex, { mode: newMode });
  }

  /**
   * 保存视图配置到代码块（使用 CodeBlockConfigService）
   */
  private async saveViewConfig(
    sourcePath: string,
    codeBlockIndex: number | undefined,
    updates: Partial<ViewConfig>
  ): Promise<void> {
    if (codeBlockIndex === undefined) return;
    await this.configService.saveConfig(sourcePath, codeBlockIndex, updates);
  }

  /**
   * 渲染内容区域
   */
  private async renderContent(
    container: HTMLElement,
    config: ViewConfig,
    context: ViewContext
  ): Promise<void> {
    container.empty();

    const mode = config.mode || 'kanban';

    // 创建渲染器
    const renderer = this.createRenderer(mode);
    if (!renderer) {
      this.renderError(container, `不支持的视图模式: ${mode}`);
      return;
    }

    // 初始化渲染器
    renderer.init(config, context);

    // 设置刷新回调
    this.actionService.setRefreshCallback(() => {
      this.renderContent(container, config, context);
    });

    // 渲染视图
    try {
      await renderer.render(container);
    } catch (error) {
      this.renderError(container, `渲染失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 创建新的渲染器实例
   */
  private createRenderer(mode: ViewMode): BaseRenderer | null {
    switch (mode) {
      case 'kanban':
        return new KanbanRenderer(this.app, this.entityManager, this.dataService, this.actionService);
      case 'list':
        return new ListRenderer(this.app, this.entityManager, this.dataService, this.actionService);
      case 'grid':
        return new GridRenderer(this.app, this.entityManager, this.dataService, this.actionService);
      case 'cascade':
        return new CascadeRenderer(this.app, this.entityManager, this.dataService, this.actionService);
      case 'timeline':
        return new TimelineRenderer(this.app, this.entityManager, this.dataService, this.actionService);
      case 'timeview':
        return new TimeViewRenderer(this.app, this.entityManager, this.dataService, this.actionService);
      case 'burndown':
        return new BurndownRenderer(this.app, this.entityManager, this.dataService, this.actionService);
      case 'workload':
        return new WorkloadRenderer(this.app, this.entityManager, this.dataService, this.actionService);
      default:
        return null;
    }
  }

  /**
   * 解析配置 - 支持新版和旧版格式
   */
  parseConfig(source: string): ViewConfig {
    const { parseYaml } = require('obsidian');

    try {
      const parsed = parseYaml(source) || {};

      // 使用 ConfigValidator 验证配置
      const validation = ConfigValidator.validate(parsed);

      // 记录错误和警告
      if (validation.errors.length > 0) {
        validation.errors.forEach(err => {
          ErrorHandler.handleUserError(err, '配置验证');
        });
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warn => {
          console.warn('[ProjectManager] 配置警告:', warn);
        });
      }

      return validation.config;
    } catch (error) {
      ErrorHandler.handle(error, '配置解析失败', { category: 'user' });
      return { mode: 'kanban' };
    }
  }

  /**
   * 显示排序菜单
   */
  private showSortMenu(
    triggerBtn: HTMLElement,
    wrapper: HTMLElement,
    config: ViewConfig,
    context: ViewContext,
    codeBlockIndex?: number
  ): void {
    const existingMenu = document.querySelector('.pm-sort-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'pm-sort-menu pm-dropdown-menu';
    menu.style.cssText = `
      position: absolute;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 8px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 180px;
    `;

    const sortFields = [
      { value: 'name', label: '名称' },
      { value: 'startDate', label: '开始日期' },
      { value: 'endDate', label: '结束日期' },
      { value: 'priority', label: '优先级' },
      { value: 'progress', label: '进度' },
      { value: 'created', label: '创建时间' },
    ];

    const currentSortBy = config.sortBy || 'name';
    const currentSortOrder = config.sortOrder || 'asc';

    menu.createEl('div', { text: '排序字段', cls: 'pm-menu-section-title' });
    const fieldList = menu.createDiv('pm-sort-field-list');

    sortFields.forEach(field => {
      const item = fieldList.createEl('div', { cls: 'pm-sort-field-item' });
      item.style.cssText = `
        padding: 6px 12px;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      `;
      item.textContent = field.label;

      if (currentSortBy === field.value) {
        item.classList.add('pm-sort-active');
        item.style.background = 'var(--background-modifier-hover)';
        const orderIcon = item.createSpan();
        orderIcon.textContent = currentSortOrder === 'asc' ? ' ▲' : ' ▼';
      }

      item.addEventListener('click', async () => {
        const newConfig: ViewConfig = {
          ...config,
          sortBy: field.value as any,
          sortOrder: currentSortBy === field.value && currentSortOrder === 'asc' ? 'desc' : 'asc'
        };
        await this.saveSortConfig(context.sourcePath, codeBlockIndex, newConfig);
        const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
        if (contentArea) {
          await this.renderContent(contentArea, newConfig, context);
        }
        menu.remove();
      });

      item.addEventListener('mouseenter', () => {
        if (currentSortBy !== field.value) {
          item.style.background = 'var(--background-modifier-hover)';
        }
      });
      item.addEventListener('mouseleave', () => {
        if (currentSortBy !== field.value) {
          item.style.background = '';
        }
      });
    });

    const rect = triggerBtn.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 4}px`;

    document.body.appendChild(menu);

    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && e.target !== triggerBtn) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }

  /**
   * 显示属性面板（重构版）
   * 支持列表视图表头勾选配置和 EntityCard 字段多选配置
   */
  private showPropertyPanel(
    triggerBtn: HTMLElement,
    wrapper: HTMLElement,
    config: ViewConfig,
    context: ViewContext,
    codeBlockIndex?: number
  ): void {
    const existingPanel = document.querySelector('.pm-property-panel');
    if (existingPanel) existingPanel.remove();

    const panel = document.createElement('div');
    panel.className = 'pm-property-panel pm-dropdown-menu';
    panel.style.cssText = `
      position: absolute;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 12px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 260px;
      max-height: 500px;
      overflow-y: auto;
    `;

    // 标题
    panel.createEl('div', {
      text: '视图属性',
      cls: 'pm-panel-title'
    }).style.cssText = 'font-weight: 600; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--background-modifier-border);';

    // 1. 基础配置：实体类型
    this.renderEntityTypeSelector(panel, config, wrapper, context, codeBlockIndex);

    // 2. 列表视图：表头字段勾选配置
    if (config.mode === 'list') {
      this.renderListColumnSelector(panel, config, wrapper, context, codeBlockIndex);
    }

    // 3. EntityCard 视图：字段多选配置
    if (config.mode !== 'list') {
      this.renderCardFieldSelector(panel, config, wrapper, context, codeBlockIndex);
    }

    // 4. 视图特定配置
    if (config.mode === 'kanban' || config.mode === 'cascade') {
      this.renderGroupBySelector(panel, config, wrapper, context, codeBlockIndex);
    }

    if (config.mode === 'grid') {
      this.renderColsSelector(panel, config, wrapper, context, codeBlockIndex);
    }

    // 5. 通用配置：显示数量限制
    this.renderLimitInput(panel, config, wrapper, context, codeBlockIndex);

    // 定位面板
    const rect = triggerBtn.getBoundingClientRect();
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.bottom + 4}px`;

    setTimeout(() => {
      const panelRect = panel.getBoundingClientRect();
      if (panelRect.right > window.innerWidth) {
        panel.style.left = `${window.innerWidth - panelRect.width - 10}px`;
      }
    }, 0);

    document.body.appendChild(panel);

    // 点击外部关闭
    const closePanel = (e: MouseEvent) => {
      if (!panel.contains(e.target as Node) && e.target !== triggerBtn) {
        panel.remove();
        document.removeEventListener('click', closePanel);
      }
    };
    setTimeout(() => document.addEventListener('click', closePanel), 0);
  }

  /**
   * 渲染实体类型选择器
   */
  private renderEntityTypeSelector(
    panel: HTMLElement,
    config: ViewConfig,
    wrapper: HTMLElement,
    context: ViewContext,
    codeBlockIndex?: number
  ): void {
    const section = panel.createDiv('pm-property-section');
    section.style.marginBottom = '12px';
    section.createEl('label', {
      text: '实体类型',
      cls: 'pm-property-label'
    }).style.cssText = 'display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;';

    const select = section.createEl('select', { cls: 'pm-property-select' });
    select.style.cssText = 'width: 100%; padding: 6px 8px; height: 32px; line-height: 1.4;';
    const entityTypes = [
      { value: 'feature', label: '特性' },
      { value: 'project', label: '项目' },
      { value: 'version', label: '版本' }
    ];
    entityTypes.forEach(type => {
      const option = select.createEl('option');
      option.value = type.value;
      option.textContent = type.label;
      if (config.entityType === type.value) option.selected = true;
    });
    select.addEventListener('change', () => {
      const newConfig: ViewConfig = { ...config, entityType: select.value as any };
      this.saveEntityTypeConfig(context.sourcePath, codeBlockIndex, select.value);
      const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
      if (contentArea) {
        this.renderContent(contentArea, newConfig, context);
      }
    });
  }

  /**
   * 渲染列表视图表头字段选择器（勾选形式）
   */
  private renderListColumnSelector(
    panel: HTMLElement,
    config: ViewConfig,
    wrapper: HTMLElement,
    context: ViewContext,
    codeBlockIndex?: number
  ): void {
    const section = panel.createDiv('pm-property-section');
    section.style.marginBottom = '12px';
    section.createEl('label', {
      text: '显示列',
      cls: 'pm-property-label'
    }).style.cssText = 'display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;';

    const checkboxContainer = section.createDiv('pm-checkbox-group');
    checkboxContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

    // 获取当前选中的列
    const currentColumns = config.listColumns || ['name', 'status', 'priority', 'owner'];

    LIST_COLUMN_DEFINITIONS.forEach(field => {
      const label = checkboxContainer.createEl('label');
      label.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px;';

      const checkbox = label.createEl('input');
      checkbox.type = 'checkbox';
      checkbox.checked = currentColumns.includes(field.key as ListColumnField);
      checkbox.disabled = field.required; // 必选字段不可取消

      const text = label.createSpan();
      text.textContent = field.label + (field.required ? ' (必选)' : '');
      text.style.cssText = field.required ? 'color: var(--text-muted);' : '';

      checkbox.addEventListener('change', () => {
        let newColumns = [...currentColumns];
        if (checkbox.checked) {
          if (!newColumns.includes(field.key as ListColumnField)) {
            newColumns.push(field.key as ListColumnField);
          }
        } else {
          newColumns = newColumns.filter(k => k !== field.key);
        }
        const newConfig: ViewConfig = { ...config, listColumns: newColumns };
        // 防抖保存到代码块
        this.debouncedSave(context.sourcePath, codeBlockIndex, { listColumns: newColumns });
        const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
        if (contentArea) {
          this.renderContent(contentArea, newConfig, context);
        }
      });
    });
  }

  /**
   * 渲染 EntityCard 字段选择器（多选下拉形式）
   */
  private renderCardFieldSelector(
    panel: HTMLElement,
    config: ViewConfig,
    wrapper: HTMLElement,
    context: ViewContext,
    codeBlockIndex?: number
  ): void {
    const section = panel.createDiv('pm-property-section');
    section.style.marginBottom = '12px';
    section.createEl('label', {
      text: '卡片显示字段',
      cls: 'pm-property-label'
    }).style.cssText = 'display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;';

    // 获取当前配置，确保数组存在
    const currentCardFields: CardFieldsConfig = config.cardFields || {
      required: ['name', 'priority'],
      optional: ['status', 'owner', 'progress']
    };
    const currentOptional = currentCardFields.optional || [];

    // 创建可滚动的多选区域
    const multiSelectContainer = section.createDiv('pm-multi-select');
    multiSelectContainer.style.cssText = `
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      padding: 8px;
      max-height: 150px;
      overflow-y: auto;
    `;

    // 必选字段（始终显示，不可取消）
    const requiredSection = multiSelectContainer.createDiv('pm-required-fields');
    requiredSection.style.cssText = 'margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed var(--background-modifier-border);';
    requiredSection.createEl('div', { text: '必选字段', cls: 'pm-section-subtitle' }).style.cssText = 'font-size: 11px; color: var(--text-muted); margin-bottom: 4px;';

    ENTITY_CARD_FIELD_DEFINITIONS.filter(f => f.required).forEach(field => {
      const label = requiredSection.createEl('label');
      label.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted);';
      const checkbox = label.createEl('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.disabled = true;
      label.createSpan({ text: field.label });
    });

    // 可选字段（用户可选择）
    const optionalSection = multiSelectContainer.createDiv('pm-optional-fields');
    optionalSection.createEl('div', { text: '可选字段', cls: 'pm-section-subtitle' }).style.cssText = 'font-size: 11px; color: var(--text-muted); margin-bottom: 4px;';

    ENTITY_CARD_FIELD_DEFINITIONS.filter(f => !f.required).forEach(field => {
      const label = optionalSection.createEl('label');
      label.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; padding: 2px 0;';

      const checkbox = label.createEl('input');
      checkbox.type = 'checkbox';
      checkbox.checked = currentOptional.includes(field.key);

      label.createSpan({ text: field.label });

      checkbox.addEventListener('change', () => {
        let newOptional = [...currentOptional];
        if (checkbox.checked) {
          if (!newOptional.includes(field.key)) {
            newOptional.push(field.key);
          }
        } else {
          newOptional = newOptional.filter(k => k !== field.key);
        }
        const newCardFields = { ...currentCardFields, optional: newOptional };
        const newConfig: ViewConfig = { ...config, cardFields: newCardFields };
        // 防抖保存到代码块
        this.debouncedSave(context.sourcePath, codeBlockIndex, { cardFields: newCardFields });
        const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
        if (contentArea) {
          this.renderContent(contentArea, newConfig, context);
        }
      });
    });
  }

  /**
   * 渲染分组方式选择器
   */
  private renderGroupBySelector(
    panel: HTMLElement,
    config: ViewConfig,
    wrapper: HTMLElement,
    context: ViewContext,
    codeBlockIndex?: number
  ): void {
    const section = panel.createDiv('pm-property-section');
    section.style.marginBottom = '12px';
    section.createEl('label', {
      text: '分组方式',
      cls: 'pm-property-label'
    }).style.cssText = 'display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;';

    const select = section.createEl('select', { cls: 'pm-property-select' });
    select.style.cssText = 'width: 100%; padding: 6px 8px; height: 32px; line-height: 1.4;';
    const options = [
      { value: 'status', label: '状态' },
      { value: 'priority', label: '优先级' },
    ];
    options.forEach(opt => {
      const option = select.createEl('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (config.groupBy === opt.value) option.selected = true;
    });
    select.addEventListener('change', () => {
      const newConfig: ViewConfig = { ...config, groupBy: select.value as any };
      // 防抖保存到代码块
      this.debouncedSave(context.sourcePath, codeBlockIndex, { groupBy: select.value as any });
      const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
      if (contentArea) {
        this.renderContent(contentArea, newConfig, context);
      }
    });
  }

  /**
   * 渲染网格列数选择器
   */
  private renderColsSelector(
    panel: HTMLElement,
    config: ViewConfig,
    wrapper: HTMLElement,
    context: ViewContext,
    codeBlockIndex?: number
  ): void {
    const section = panel.createDiv('pm-property-section');
    section.style.marginBottom = '12px';
    section.createEl('label', {
      text: '列数',
      cls: 'pm-property-label'
    }).style.cssText = 'display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;';

    const select = section.createEl('select', { cls: 'pm-property-select' });
    select.style.cssText = 'width: 100%; padding: 6px 8px; height: 32px; line-height: 1.4;';
    [2, 3, 4, 5].forEach(num => {
      const option = select.createEl('option');
      option.value = String(num);
      option.textContent = `${num} 列`;
      if ((config.cols || 3) === num) option.selected = true;
    });
    select.addEventListener('change', () => {
      const newCols = parseInt(select.value) as 1 | 2 | 3 | 4;
      const newConfig: ViewConfig = { ...config, cols: newCols };
      // 防抖保存到代码块
      this.debouncedSave(context.sourcePath, codeBlockIndex, { cols: newCols });
      const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
      if (contentArea) {
        this.renderContent(contentArea, newConfig, context);
      }
    });
  }

  /**
   * 渲染显示数量限制输入框
   */
  private renderLimitInput(
    panel: HTMLElement,
    config: ViewConfig,
    wrapper: HTMLElement,
    context: ViewContext,
    codeBlockIndex?: number
  ): void {
    const section = panel.createDiv('pm-property-section');
    section.style.marginBottom = '12px';
    section.createEl('label', {
      text: '显示数量限制',
      cls: 'pm-property-label'
    }).style.cssText = 'display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;';

    const input = section.createEl('input');
    input.type = 'number';
    input.placeholder = '无限制';
    input.value = config.limit ? String(config.limit) : '';
    input.style.cssText = 'width: 100%; padding: 4px 8px;';
    input.addEventListener('change', () => {
      const limit = input.value ? parseInt(input.value) : undefined;
      const newConfig: ViewConfig = { ...config, limit };
      // 防抖保存到代码块
      this.debouncedSave(context.sourcePath, codeBlockIndex, { limit });
      const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
      if (contentArea) {
        this.renderContent(contentArea, newConfig, context);
      }
    });
  }

  /**
   * 保存排序配置 - 使用 YAML 解析
   */
  private async saveSortConfig(
    sourcePath: string,
    codeBlockIndex: number | undefined,
    newConfig: ViewConfig
  ): Promise<void> {
    await this.saveViewConfig(sourcePath, codeBlockIndex, {
      sortBy: newConfig.sortBy,
      sortOrder: newConfig.sortOrder
    });
  }

  /**
   * 保存实体类型配置 - 使用统一的 saveViewConfig
   */
  private async saveEntityTypeConfig(
    sourcePath: string,
    codeBlockIndex: number | undefined,
    entityType: string
  ): Promise<void> {
    await this.saveViewConfig(sourcePath, codeBlockIndex, { entityType: entityType as 'version' | 'project' | 'feature' });
  }

  /**
   * 渲染错误状态
   */
  private renderError(container: HTMLElement, error: string): void {
    container.empty();
    const errorEl = container.createDiv('pm-view-error');
    errorEl.createEl('div', { cls: 'pm-error-icon', text: '⚠️' });
    errorEl.createEl('div', { cls: 'pm-error-text', text: error });
  }
}
