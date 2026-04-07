import type { App, MarkdownPostProcessorContext, TFile } from 'obsidian';
import type { EntityManager } from '../core';
import type { ViewConfig, ViewContext, ViewMode, CardFieldsConfig, ListColumnField } from './types';
import { VIEW_MODE_LABELS, ENTITY_CARD_FIELD_DEFINITIONS, LIST_COLUMN_DEFINITIONS } from './types';
import { DataService, ActionService } from './services';
import { FilterBar } from './components/FilterBar';
import {
  BaseRenderer,
  KanbanRenderer,
  ListRenderer,
  GridRenderer,
  CascadeRenderer,
  TimelineRenderer,
  CalendarRenderer,
} from './renderers';

/**
 * 视图引擎 - 简化版
 * 统一处理 pm-view 的所有视图渲染，使用筛选器选择条件
 */
export class ViewEngine {
  private dataService: DataService;
  private actionService: ActionService;

  constructor(
    private app: App,
    private entityManager: EntityManager
  ) {
    this.dataService = new DataService(app, entityManager);
    this.actionService = new ActionService(app, entityManager);
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
    container.empty();
    container.addClass('pm-view');

    // 创建视图包装器
    const wrapper = container.createDiv('pm-view-wrapper');

    // 1. 渲染工具栏（视图切换、属性面板等）
    const toolbarEl = this.renderToolbar(wrapper, config, context, codeBlockIndex);

    // 2. 创建筛选器
    const filterBar = new FilterBar(
      this.app,
      this.entityManager,
      async (filters) => {
        const finalConfig: ViewConfig = { ...config, ...filters };
        await this.renderContent(contentArea, finalConfig, context);
      },
      context.sourcePath,
      codeBlockIndex
    );
    await filterBar.loadOptions();
    filterBar.render(wrapper, config);

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
      this.showSortMenu(sortBtn, wrapper, config, context);
    });

    // 属性按钮
    const propBtn = buttonGroup.createEl('button', {
      cls: 'pm-toolbar-btn',
      text: '属性 ▼',
    });
    propBtn.addEventListener('click', () => {
      this.showPropertyPanel(propBtn, wrapper, config, context, codeBlockIndex);
    });

    // 设置按钮
    const settingsBtn = buttonGroup.createEl('button', {
      cls: 'pm-toolbar-btn pm-toolbar-icon',
      text: '⚙️',
    });
    settingsBtn.title = '视图设置';
    settingsBtn.addEventListener('click', () => {
      // TODO: 显示视图设置
      console.log('视图设置功能待实现');
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
   * 保存视图配置到代码块（通用方法）
   */
  private async saveViewConfig(
    sourcePath: string,
    codeBlockIndex: number | undefined,
    updates: Partial<ViewConfig>
  ): Promise<void> {
    if (!sourcePath || codeBlockIndex === undefined) return;

    const { TFile } = require('obsidian');
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) return;

    try {
      const content = await this.app.vault.read(file as TFile);
      const lines = content.split('\n');

      // 找到代码块
      let blockStart = -1;
      let blockEnd = -1;
      let currentIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line === '```pm-view') {
          if (currentIndex === codeBlockIndex) {
            blockStart = i;
          }
          currentIndex++;
        }

        if (blockStart !== -1 && line === '```') {
          blockEnd = i;
          break;
        }
      }

      if (blockStart === -1 || blockEnd === -1) return;

      // 提取原有配置
      const configLines = lines.slice(blockStart + 1, blockEnd);
      const configText = configLines.join('\n');
      const { parseYaml, stringifyYaml } = require('obsidian');
      const currentConfig = parseYaml(configText) || {};

      // 合并更新
      const newConfig = { ...currentConfig, ...updates };

      // 清理 undefined 值
      Object.keys(newConfig).forEach(key => {
        if (newConfig[key] === undefined) {
          delete newConfig[key];
        }
      });

      // 序列化为 YAML
      const yamlContent = stringifyYaml(newConfig).trim();

      // 构建新代码块
      const newBlock = ['```pm-view', yamlContent, '```'];

      // 替换原代码块
      const newLines = [
        ...lines.slice(0, blockStart),
        ...newBlock,
        ...lines.slice(blockEnd + 1)
      ];

      const newContent = newLines.join('\n');
      if (newContent !== content) {
        await this.app.vault.modify(file as TFile, newContent);
      }
    } catch (error) {
      console.error('保存视图配置失败:', error);
    }
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
      case 'calendar':
        return new CalendarRenderer(this.app, this.entityManager, this.dataService, this.actionService);
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

      // 构建 ViewConfig
      const config: ViewConfig = {
        mode: parsed.mode || 'kanban',
        title: parsed.title,

        // 实体类型筛选
        entityType: parsed.entityType || 'feature',

        // 单实体筛选（旧版兼容）
        version: parsed.version,
        project: parsed.project,
        feature: parsed.feature,

        // 新版组合筛选
        filters: parsed.filters,

        // 旧版筛选（向后兼容）
        status: parsed.status,
        priority: parsed.priority,
        owner: parsed.owner,
        tag: parsed.tag,

        // 新版排序
        sorts: parsed.sorts,

        // 旧版排序（向后兼容）
        sortBy: parsed.sortBy,
        sortOrder: parsed.sortOrder,

        // 列配置
        columns: parsed.columns,

        // ⭐ 新增：列表视图列配置
        listColumns: parsed.listColumns,

        // ⭐ 新增：EntityCard 字段配置
        cardFields: parsed.cardFields,

        // 限制
        limit: parsed.limit,

        // 分组
        groupBy: parsed.groupBy,

        // 视图选项
        options: parsed.options,

        // 旧版配置（向后兼容）
        cols: parsed.cols,
        expanded: parsed.expanded,
        maxProjects: parsed.maxProjects,
        maxFeaturesPerProject: parsed.maxFeaturesPerProject,
      };

      return config;
    } catch (error) {
      console.error('配置解析失败:', error);
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
    context: ViewContext
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
      { value: 'dueDate', label: '截止日期' },
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
        await this.saveSortConfig(context.sourcePath, config, newConfig);
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
    select.addEventListener('change', async () => {
      const newConfig: ViewConfig = { ...config, entityType: select.value as any };
      await this.saveEntityTypeConfig(context.sourcePath, codeBlockIndex, select.value);
      const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
      if (contentArea) {
        await this.renderContent(contentArea, newConfig, context);
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

      checkbox.addEventListener('change', async () => {
        let newColumns = [...currentColumns];
        if (checkbox.checked) {
          if (!newColumns.includes(field.key as ListColumnField)) {
            newColumns.push(field.key as ListColumnField);
          }
        } else {
          newColumns = newColumns.filter(k => k !== field.key);
        }
        const newConfig: ViewConfig = { ...config, listColumns: newColumns };
        // 保存到代码块
        await this.saveViewConfig(context.sourcePath, codeBlockIndex, { listColumns: newColumns });
        const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
        if (contentArea) {
          await this.renderContent(contentArea, newConfig, context);
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

      checkbox.addEventListener('change', async () => {
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
        // 保存到代码块
        await this.saveViewConfig(context.sourcePath, codeBlockIndex, { cardFields: newCardFields });
        const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
        if (contentArea) {
          await this.renderContent(contentArea, newConfig, context);
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
    select.addEventListener('change', async () => {
      const newConfig: ViewConfig = { ...config, groupBy: select.value as any };
      // 保存到代码块
      await this.saveViewConfig(context.sourcePath, codeBlockIndex, { groupBy: select.value as any });
      const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
      if (contentArea) {
        await this.renderContent(contentArea, newConfig, context);
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
    select.addEventListener('change', async () => {
      const newCols = parseInt(select.value) as 1 | 2 | 3 | 4;
      const newConfig: ViewConfig = { ...config, cols: newCols };
      // 保存到代码块
      await this.saveViewConfig(context.sourcePath, codeBlockIndex, { cols: newCols });
      const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
      if (contentArea) {
        await this.renderContent(contentArea, newConfig, context);
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
    input.addEventListener('change', async () => {
      const limit = input.value ? parseInt(input.value) : undefined;
      const newConfig: ViewConfig = { ...config, limit };
      // 保存到代码块
      await this.saveViewConfig(context.sourcePath, codeBlockIndex, { limit });
      const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
      if (contentArea) {
        await this.renderContent(contentArea, newConfig, context);
      }
    });
  }

  /**
   * 保存排序配置
   */
  private async saveSortConfig(
    sourcePath: string,
    oldConfig: ViewConfig,
    newConfig: ViewConfig
  ): Promise<void> {
    if (!sourcePath) return;

    const { TFile } = require('obsidian');
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) return;

    try {
      const content = await this.app.vault.read(file as TFile);
      let newContent = content;

      if (content.includes('sortBy:')) {
        newContent = content.replace(/sortBy:\s*\w+/, `sortBy: ${newConfig.sortBy}`);
      } else {
        newContent = content.replace(
          /(```pm-view\n)/,
          `$1sortBy: ${newConfig.sortBy}\n`
        );
      }

      if (content.includes('sortOrder:')) {
        newContent = newContent.replace(/sortOrder:\s*\w+/, `sortOrder: ${newConfig.sortOrder}`);
      } else {
        newContent = newContent.replace(
          /(sortBy:.*\n)/,
          `$1sortOrder: ${newConfig.sortOrder}\n`
        );
      }

      if (newContent !== content) {
        await this.app.vault.modify(file as TFile, newContent);
      }
    } catch (error) {
      console.error('保存排序配置失败:', error);
    }
  }

  /**
   * 保存实体类型配置
   */
  private async saveEntityTypeConfig(
    sourcePath: string,
    codeBlockIndex: number | undefined,
    entityType: string
  ): Promise<void> {
    if (!sourcePath) return;

    const { TFile } = require('obsidian');
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) return;

    try {
      const content = await this.app.vault.read(file as TFile);

      if (content.includes('entityType:')) {
        const newContent = content.replace(/entityType:\s*\w+/, `entityType: ${entityType}`);
        await this.app.vault.modify(file as TFile, newContent);
      } else {
        const newContent = content.replace(
          /(```pm-view\n)/,
          `$1entityType: ${entityType}\n`
        );
        await this.app.vault.modify(file as TFile, newContent);
      }
    } catch (error) {
      console.error('保存实体类型配置失败:', error);
    }
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
