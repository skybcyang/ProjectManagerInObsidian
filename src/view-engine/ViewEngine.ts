import type { App, MarkdownPostProcessorContext } from 'obsidian';
import type { EntityManager } from '../core';
import type { CardRegistry } from '../ui/cards';
import type { ViewConfig, ViewContext, ViewMode, EntityType } from './types';
import { DataService, ActionService } from './services';
import {
  BaseRenderer,
  KanbanRenderer,
  GridRenderer,
  CascadeRenderer,
  TimelineRenderer,
  CalendarRenderer,
  SelectorRenderer,
  CascadeSelectorRenderer,
} from './renderers';

/**
 * 视图引擎
 * 统一处理 pm-view 的所有视图渲染
 */
export class ViewEngine {
  private dataService: DataService;
  private actionService: ActionService;
  private renderers: Map<ViewMode, BaseRenderer>;

  constructor(
    private app: App,
    private entityManager: EntityManager,
    private cardRegistry: CardRegistry
  ) {
    // 初始化服务
    this.dataService = new DataService(app, entityManager);
    this.actionService = new ActionService(app, entityManager);

    // 初始化渲染器
    this.renderers = new Map<ViewMode, BaseRenderer>([
      ['kanban', new KanbanRenderer(app, entityManager, cardRegistry, this.dataService, this.actionService)],
      ['grid', new GridRenderer(app, entityManager, cardRegistry, this.dataService, this.actionService)],
      ['cascade', new CascadeRenderer(app, entityManager, cardRegistry, this.dataService, this.actionService)],
      ['timeline', new TimelineRenderer(app, entityManager, cardRegistry, this.dataService, this.actionService)],
      ['calendar', new CalendarRenderer(app, entityManager, cardRegistry, this.dataService, this.actionService)],
      ['selector', new SelectorRenderer(app, entityManager, cardRegistry, this.dataService, this.actionService)],
      ['cascade-selector', new CascadeSelectorRenderer(app, entityManager, cardRegistry, this.dataService, this.actionService)],
    ]);
  }

  /**
   * 渲染视图
   */
  async render(
    container: HTMLElement,
    config: ViewConfig,
    context: ViewContext
  ): Promise<void> {
    console.log('[ViewEngine] 开始渲染:', config.mode, config.type, config.id);
    
    // 清空容器
    container.empty();

    // 创建视图包装器
    const wrapper = container.createDiv('pm-view');
    const mode = config.mode || 'grid';
    wrapper.dataset.viewMode = mode;
    
    // 调试用：添加视觉标识和边框
    const debugId = Math.random().toString(36).substring(2, 8);
    wrapper.dataset.renderId = debugId;
    wrapper.style.border = '2px solid red';
    wrapper.style.padding = '10px';
    wrapper.style.margin = '5px 0';
    console.log('[ViewEngine] 创建视图 wrapper, mode:', mode, 'renderId:', debugId);

    // 获取对应的渲染器
    const renderer = this.renderers.get(mode);
    if (!renderer) {
      console.error('[ViewEngine] 不支持的视图模式:', mode);
      this.renderError(wrapper, `不支持的视图模式: ${mode}`);
      return;
    }

    // 初始化渲染器
    renderer.init(config, context);

    // 设置刷新回调
    this.actionService.setRefreshCallback(() => {
      this.render(container, config, context);
    });

    // 渲染视图
    try {
      console.log('[ViewEngine] 调用渲染器:', mode, 'wrapper子元素:', wrapper.children.length);
      await renderer.render(wrapper);
      console.log('[ViewEngine] 渲染器完成:', mode, 'wrapper子元素:', wrapper.children.length);
    } catch (error) {
      console.error('[ViewEngine] 渲染失败:', error);
      this.renderError(wrapper, `渲染失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析配置
   */
  parseConfig(source: string): ViewConfig {
    const { parseYaml } = require('obsidian');
    
    try {
      const parsed = parseYaml(source) || {};
      
      return {
        mode: (parsed.mode as ViewMode) || 'grid',
        type: (parsed.type as EntityType) || 'feature',
        id: parsed.id,
        title: parsed.title,
        groupBy: parsed.groupBy,
        filter: parsed.filter,
        sortBy: parsed.sortBy,
        sortOrder: parsed.sortOrder || 'asc',
        limit: parsed.limit,
        cols: parsed.cols,
        ...parsed, // 允许额外的配置参数
      } as ViewConfig;
    } catch (error) {
      console.error('配置解析失败:', error);
      return { mode: 'grid', type: 'feature' };
    }
  }

  /**
   * 渲染错误信息
   */
  private renderError(container: HTMLElement, message: string): void {
    const error = container.createDiv('pm-view-error');
    error.createEl('div', { cls: 'pm-error-icon', text: '⚠️' });
    error.createEl('div', { cls: 'pm-error-text', text: '视图加载失败' });
    error.createEl('div', { cls: 'pm-error-detail', text: message });
  }

  /**
   * 获取支持的视图模式
   */
  getSupportedModes(): { id: ViewMode; name: string; description: string }[] {
    return [
      { id: 'kanban', name: '看板', description: 'Trello 风格的看板视图，按状态分组' },
      { id: 'grid', name: '网格', description: '卡片网格视图，支持多列布局' },
      { id: 'cascade', name: '级联', description: '层级级联视图，版本→项目→特性' },
      { id: 'timeline', name: '时间线', description: '时间线视图，按截止日期排列' },
      { id: 'calendar', name: '日历', description: '月历视图，显示截止日期' },
      { id: 'selector', name: '选择器', description: '下拉选择框 + 动态视图渲染' },
      { id: 'cascade-selector', name: '级联选择器', description: '三级联动选择器：视图→类型→实体' },
    ];
  }
}
