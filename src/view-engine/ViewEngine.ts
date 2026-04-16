import type { App } from 'obsidian';
import type { EntityManager } from '../core';
import type { ViewConfig, ViewContext, ViewMode } from './types';
import { VIEW_MODE_LABELS } from './types';
import { DataService, ActionService } from './services';
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
  private sortMenuController: SortMenuController;
  private propertyPanelController: PropertyPanelController;
  // 保存每个代码块的工具栏控制器，避免 DOM 引用导致的内存泄漏
  private toolbarMap: Map<string, ToolbarController> = new Map();
  // 保存每个代码块的最新配置，避免闭包陷阱
  private currentConfigs: Map<string, ViewConfig> = new Map();
  // 当前处于全屏模式的 wrapper
  private fullscreenWrapper: HTMLElement | null = null;
  // fullscreenchange 事件处理器
  private fullscreenChangeHandler: (() => void) | null = null;

  constructor(
    private app: App,
    private entityManager: EntityManager
  ) {
    this.dataService = new DataService(app, entityManager);
    this.actionService = new ActionService(app, entityManager);
    this.configService = new CodeBlockConfigService(app);
    this.sortMenuController = new SortMenuController();
    this.propertyPanelController = new PropertyPanelController();

    // 注册打开实体前自动退出全屏的回调
    this.actionService.setBeforeOpenEntityCallback(() => {
      if (this.fullscreenWrapper && document.fullscreenElement === this.fullscreenWrapper) {
        document.exitFullscreen().catch(() => {});
      }
    });

    this.setupFullscreenHandler();
  }

  /**
   * 销毁视图引擎，清理所有资源
   */
  destroy(): void {
    // 1. 清理所有 ToolbarController
    this.toolbarMap.forEach((toolbar) => {
      toolbar.destroy();
    });
    this.toolbarMap.clear();

    // 2. 清理 currentConfigs
    this.currentConfigs.clear();

    // 3. 清理 configService 中的防抖定时器
    this.configService.clearPendingSaves();

    // 4. 如果当前本实例管理的视图处于全屏，退出全屏
    if (this.fullscreenWrapper && document.fullscreenElement === this.fullscreenWrapper) {
      document.exitFullscreen().catch(() => {});
    }
    this.fullscreenWrapper = null;

    // 5. 移除 fullscreenchange 监听
    if (this.fullscreenChangeHandler) {
      document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
      this.fullscreenChangeHandler = null;
    }
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
   * 设置全屏状态变化监听器
   */
  private setupFullscreenHandler(): void {
    this.fullscreenChangeHandler = () => {
      const isFullscreen = !!document.fullscreenElement;
      document.querySelectorAll('.pm-toolbar-btn-fullscreen').forEach((btn) => {
        const { setIcon } = require('obsidian');
        setIcon(btn as HTMLElement, isFullscreen ? 'minimize' : 'maximize');
      });
      if (!isFullscreen) {
        this.fullscreenWrapper = null;
      }
    };
    document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
  }

  /**
   * 切换全屏状态
   */
  private toggleFullscreen(wrapper: HTMLElement): void {
    if (document.fullscreenElement === wrapper) {
      document.exitFullscreen().catch(() => {});
    } else {
      this.fullscreenWrapper = wrapper;
      wrapper.requestFullscreen().catch(() => {});
    }
  }

  /**
   * 获取 ActionService 实例
   */
  getActionService(): ActionService {
    return this.actionService;
  }

  /**
   * 渲染视图 - 工具栏（含筛选）在上，视图在下
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

    // 初始化 key 和配置
    const key = `${context.sourcePath}:${codeBlockIndex ?? 'unknown'}`;
    const oldToolbar = this.toolbarMap.get(key);
    if (oldToolbar) {
      oldToolbar.destroy();
    }
    this.currentConfigs.set(key, config);

    // 创建 ToolbarController（包含筛选器、排序、属性、全屏按钮）
    const toolbarController = new ToolbarController(
      this.app,
      this.entityManager,
      async (filters) => {
        const currentConfig = this.currentConfigs.get(key) || config;
        const finalConfig: ViewConfig = { ...currentConfig, ...filters };
        this.currentConfigs.set(key, finalConfig);
        await this.renderContent(contentArea, finalConfig, context);
      },
      (filterUpdates) => {
        this.debouncedSave(context.sourcePath, codeBlockIndex, filterUpdates as Partial<ViewConfig>);
      },
      context.sourcePath,
      codeBlockIndex
    );
    await toolbarController.loadOptions();
    this.toolbarMap.set(key, toolbarController);

    // 1. 渲染工具栏（在上）
    this.renderToolbar(wrapper, config, context, codeBlockIndex, toolbarController);

    // 2. 创建内容区域（在下）
    const contentArea = wrapper.createDiv('pm-view-content');

    // 3. 渲染初始内容
    context.codeBlockIndex = codeBlockIndex;
    await this.renderContent(contentArea, config, context);
  }

  /**
   * 渲染工具栏 - 委托给 ToolbarController 完整渲染
   */
  private renderToolbar(
    wrapper: HTMLElement,
    config: ViewConfig,
    context: ViewContext,
    codeBlockIndex: number | undefined,
    toolbarController: ToolbarController
  ): HTMLElement {
    const key = `${context.sourcePath}:${codeBlockIndex ?? 'unknown'}`;

    return toolbarController.render(wrapper, config, {
      onViewModeChange: async (newMode) => {
        const currentConfig = this.currentConfigs.get(key) || config;
        const newConfig: ViewConfig = { ...currentConfig, mode: newMode };
        this.currentConfigs.set(key, newConfig);
        await this.saveViewModeChange(context.sourcePath, codeBlockIndex, newMode);
        const targetContentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
        if (targetContentArea) {
          await this.renderContent(targetContentArea, newConfig, context);
        }
      },
      onPropertyClick: () => {
        this.showPropertyPanel(wrapper, this.currentConfigs.get(key) || config, context, codeBlockIndex);
      },
      onFullscreenClick: () => {
        this.toggleFullscreen(wrapper);
      },
      sortMenuController: this.sortMenuController,
      sortConfig: this.currentConfigs.get(key) || config,
      onSortChange: async (sortBy, sortOrder) => {
        const currentConfig = this.currentConfigs.get(key) || config;
        const newConfig: ViewConfig = { ...currentConfig, sortBy: sortBy as ViewConfig['sortBy'], sortOrder };
        this.currentConfigs.set(key, newConfig);
        await this.saveSortConfig(context.sourcePath, codeBlockIndex, newConfig);
        const targetContentArea = wrapper.querySelector('.pm-view-content') as HTMLElement;
        if (targetContentArea) {
          await this.renderContent(targetContentArea, newConfig, context);
        }
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

    const mode = config.mode || 'cascade';

    // 创建渲染器
    const renderer = this.createRenderer(mode);
    if (!renderer) {
      this.renderError(container, `不支持的视图模式: ${mode}`);
      return;
    }

    // 初始化渲染器
    renderer.init(config, context);

    // 设置刷新回调 - 使用事件总线
    // 先取消旧订阅，防止内存泄漏
    (container as any)._unsubscribeRefresh?.();
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
      this.actionService
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
      return { mode: 'cascade' };
    }
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
    const triggerBtn = wrapper.querySelector('.pm-toolbar-right .pm-toolbar-prop-btn') as HTMLElement;
    if (!triggerBtn) return;

    const key = `${context.sourcePath}:${codeBlockIndex ?? 'unknown'}`;
    this.propertyPanelController.show(triggerBtn, wrapper, config, {
      onConfigChange: async (updates) => {
        const currentConfig = this.currentConfigs.get(key) || config;
        const newConfig = { ...currentConfig, ...updates };
        this.currentConfigs.set(key, newConfig);
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
   * 渲染错误状态
   */
  private renderError(container: HTMLElement, error: string): void {
    container.empty();
    const errorEl = container.createDiv('pm-view-error');
    errorEl.createEl('div', { cls: 'pm-error-icon', text: '⚠️' });
    errorEl.createEl('div', { cls: 'pm-error-text', text: error });
  }
}
