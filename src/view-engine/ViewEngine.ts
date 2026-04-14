import type { App } from 'obsidian';
import type { EntityManager } from '../core';
import type { ViewConfig, ViewContext, ViewMode } from './types';
import { VIEW_MODE_LABELS } from './types';
import { DataService, ActionService } from './services';
import { FilterBar } from './components/FilterBar';
import { CodeBlockConfigService } from '../services';
import { ConfigValidator, ErrorHandler } from '../utils';
import { RendererRegistry } from './RendererRegistry';
import type { BaseRenderer } from './renderers';
import { ToolbarController, SortMenuController, PropertyPanelController } from './controllers';

/**
 * 视图引擎 - 重构版
 * 统一处理 pm-view 的所有视图渲染，职责委托给各个控制器
 */
export class ViewEngine {
  private dataService: DataService;
  private actionService: ActionService;
  private configService: CodeBlockConfigService;
  private toolbarController: ToolbarController;
  private sortMenuController: SortMenuController;
  private propertyPanelController: PropertyPanelController;
  // 使用 codeBlockIndex 作为 key，避免 DOM 引用导致的内存泄漏
  private filterBarMap: Map<string, FilterBar> = new Map();

  constructor(
    private app: App,
    private entityManager: EntityManager
  ) {
    this.dataService = new DataService(app, entityManager);
    this.actionService = new ActionService(app, entityManager);
    this.configService = new CodeBlockConfigService(app);
    this.toolbarController = new ToolbarController();
    this.sortMenuController = new SortMenuController();
    this.propertyPanelController = new PropertyPanelController();
  }

  /**
   * 销毁视图引擎，清理所有资源
   */
  destroy(): void {
    // 1. 清理所有 FilterBar
    this.filterBarMap.forEach((filterBar) => {
      filterBar.destroy();
    });
    this.filterBarMap.clear();

    // 2. 清理 configService 中的防抖定时器
    this.configService.clearPendingSaves();
  }

  /**
   * 防抖保存配置 - 委托给 CodeBlockConfigService
   */
  private debouncedSave(
    sourcePath: string,
    codeBlockIndex: number | undefined,
    updates: Partial<ViewConfig>,
    delay: number = 300
  ): void {
    this.configService.debouncedSave(sourcePath, codeBlockIndex, updates, delay);
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
    this.renderToolbar(wrapper, config, context, codeBlockIndex);

    // 2. 创建筛选器 - 先销毁当前代码块可能存在的旧 FilterBar
    const key = `${context.sourcePath}:${codeBlockIndex ?? 'unknown'}`;
    const oldFilterBar = this.filterBarMap.get(key);
    if (oldFilterBar) {
      oldFilterBar.destroy();
    }

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

    // 保存 FilterBar 引用到 Map - 使用 codeBlockIndex 作为 key
    this.filterBarMap.set(key, filterBar);

    // 3. 再创建内容区域（在下）
    const contentArea = wrapper.createDiv('pm-view-content');

    // 4. 渲染初始内容
    // 将 codeBlockIndex 设置到 context 中供子组件使用
    context.codeBlockIndex = codeBlockIndex;
    await this.renderContent(contentArea, config, context);
  }

  /**
   * 渲染工具栏 - 委托给 ToolbarController
   */
  private renderToolbar(
    wrapper: HTMLElement,
    config: ViewConfig,
    context: ViewContext,
    codeBlockIndex?: number
  ): HTMLElement {
    const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement
      || wrapper; // 如果还没有 contentArea，使用 wrapper 作为后备

    return this.toolbarController.render(wrapper, config, {
      onViewModeChange: async (newMode) => {
        const newConfig: ViewConfig = { ...config, mode: newMode };
        await this.saveViewModeChange(context.sourcePath, codeBlockIndex, newMode);
        const targetContentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
        if (targetContentArea) {
          await this.renderContent(targetContentArea, newConfig, context);
        }
      },
      onFilterToggle: () => {
        const filterBar = wrapper.querySelector('.pm-filter-container') as HTMLElement;
        if (filterBar) {
          const isHidden = filterBar.style.display === 'none';
          filterBar.style.display = isHidden ? 'block' : 'none';
        }
      },
      onSortClick: () => {
        this.showSortMenu(wrapper, config, context, codeBlockIndex);
      },
      onPropertyClick: () => {
        this.showPropertyPanel(wrapper, config, context, codeBlockIndex);
      },
    });
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

    // 设置刷新回调 - 使用事件总线
    const unsubscribe = this.actionService.onRefresh(() => {
      this.renderContent(container, config, context);
    });

    // 存储取消订阅函数用于清理
    (container as any)._unsubscribeRefresh = unsubscribe;

    // 渲染视图
    try {
      await renderer.render(container);
    } catch (error) {
      this.renderError(container, `渲染失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 创建新的渲染器实例 - 使用注册表模式
   */
  private createRenderer(mode: ViewMode): BaseRenderer | null {
    return RendererRegistry.create(
      mode,
      this.app,
      this.entityManager,
      this.dataService,
      this.actionService,
      this.configService
    );
  }

  /**
   * 解析配置 - 支持新版和旧版格式
   * 向后兼容：将单个 feature/project/version 转换为列表形式
   */
  parseConfig(source: string): ViewConfig {
    const { parseYaml } = require('obsidian');

    try {
      const parsed = parseYaml(source) || {};

      // 向后兼容：单个 ID 转换为列表
      if (parsed.feature && !parsed.features) {
        parsed.features = [parsed.feature];
        delete parsed.feature;
      }
      if (parsed.project && !parsed.projects) {
        parsed.projects = [parsed.project];
        delete parsed.project;
      }
      if (parsed.version && !parsed.versions) {
        parsed.versions = [parsed.version];
        delete parsed.version;
      }

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
   * 显示排序菜单 - 委托给 SortMenuController
   */
  private showSortMenu(
    wrapper: HTMLElement,
    config: ViewConfig,
    context: ViewContext,
    codeBlockIndex?: number
  ): void {
    const triggerBtn = wrapper.querySelector('.pm-toolbar-btn:nth-child(2)') as HTMLElement;
    if (!triggerBtn) return;

    this.sortMenuController.show(triggerBtn, config, async (sortBy, sortOrder) => {
      const newConfig: ViewConfig = { ...config, sortBy: sortBy as ViewConfig['sortBy'], sortOrder };
      await this.saveSortConfig(context.sourcePath, codeBlockIndex, newConfig);
      const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
      if (contentArea) {
        await this.renderContent(contentArea, newConfig, context);
      }
    });
  }

  /**
   * 显示属性面板 - 委托给 PropertyPanelController
   */
  private showPropertyPanel(
    wrapper: HTMLElement,
    config: ViewConfig,
    context: ViewContext,
    codeBlockIndex?: number
  ): void {
    const triggerBtn = wrapper.querySelector('.pm-toolbar-btn:nth-child(3)') as HTMLElement;
    if (!triggerBtn) return;

    this.propertyPanelController.show(triggerBtn, wrapper, config, {
      onConfigChange: async (updates) => {
        const newConfig = { ...config, ...updates };
        // 如果是 entityType 变更，需要保存
        if ('entityType' in updates) {
          await this.saveEntityTypeConfig(context.sourcePath, codeBlockIndex, updates.entityType!);
        }
        const contentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
        if (contentArea) {
          await this.renderContent(contentArea, newConfig, context);
        }
      },
      debouncedSave: (updates) => {
        this.debouncedSave(context.sourcePath, codeBlockIndex, updates);
      },
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
