import type { App, MarkdownPostProcessorContext } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ViewConfig, ViewContext, Entity, EntityType, getEntityType } from '../types';
import {
  STATUS_COLORS,
  FEATURE_STATUS_OPTIONS,
  getStatusColor,
  getPriorityColor,
  getEntityIcon,
  translateStatus,
  translatePriority,
  DateFormat,
} from '../design-tokens';
import type { RiskItem } from '../../types';
import type { EntityCardOptions } from '../components';


/**
 * 渲染器基类
 * 所有视图渲染器的基础
 */
export interface RendererInitOptions {
  /** 配置变更回调，用于将视图状态持久化到 YAML */
  onSaveConfig?: (updates: Partial<ViewConfig>) => void;
}

export abstract class BaseRenderer {
  protected config!: ViewConfig;
  protected context!: ViewContext;
  protected onSaveConfig?: (updates: Partial<ViewConfig>) => void;

  constructor(
    protected app: App,
    protected entityManager: EntityManager,
    protected dataService: DataService,
    protected actionService: ActionService
  ) {}

  /**
   * 初始化渲染器
   */
  init(config: ViewConfig, context: ViewContext, options?: RendererInitOptions): void {
    this.config = config;
    this.context = context;
    this.onSaveConfig = options?.onSaveConfig;
  }

  /**
   * 显示加载状态
   */
  showLoading(container: HTMLElement): HTMLElement {
    return this.createLoadingState(container);
  }

  /**
   * 保存配置更新（持久化到 YAML）
   */
  protected saveConfig(updates: Partial<ViewConfig>): void {
    this.onSaveConfig?.(updates);
  }

  /**
   * 准备数据 - 统一的数据加载、过滤、排序流程
   * 子类可以重写此方法以自定义数据准备逻辑
   */
  protected async prepareData(): Promise<Entity[]> {
    // 1. 加载数据
    const entities = await this.dataService.loadEntities(this.config);

    // 2. 应用过滤
    const filtered = this.dataService.applyFilters(entities, this.config);

    // 3. 应用排序
    const sorted = this.dataService.applySort(
      filtered,
      this.config.sortBy,
      this.config.sortOrder
    );

    // 4. 应用数量限制
    if (this.config.limit && this.config.limit > 0) {
      return sorted.slice(0, this.config.limit);
    }

    return sorted;
  }

  /**
   * 判断卡片字段是否应该显示
   */
  protected shouldShowCardField(fieldKey: string): boolean {
    const cardFields = this.config.cardFields || {
      required: ['name', 'priority'],
      optional: ['status', 'owner', 'progress']
    };
    const allFields = [...(cardFields.required || []), ...(cardFields.optional || [])];
    return allFields.includes(fieldKey);
  }

  /**
   * 构建 EntityCard 选项
   * 将 cardFields 配置映射为 EntityCardOptions
   */
  protected buildCardOptions(overrides?: Partial<EntityCardOptions>): EntityCardOptions {
    const cardFields = this.config.cardFields || {
      required: ['name', 'priority'],
      optional: ['status', 'owner', 'progress', 'endDate', 'tags', 'risk']
    };
    const allFields = new Set([
      ...(cardFields.required || []),
      ...(cardFields.optional || [])
    ]);

    return {
      showPriority: allFields.has('priority'),
      showStatus: allFields.has('status'),
      showOwner: allFields.has('owner'),
      showStartDate: allFields.has('startDate'),
      showDueDate: allFields.has('endDate'),
      showProgress: allFields.has('progress'),
      showRisk: allFields.has('risk'),
      showLatestProgress: allFields.has('latestProgress'),
      showTags: allFields.has('tags'),
      showDescription: allFields.has('description'),
      showParent: allFields.has('parent'),
      showTypeIcon: allFields.has('typeIcon'),
      showStats: allFields.has('stats'),
      showActions: allFields.has('actions'),
      showEstimatedDays: allFields.has('estimatedDays'),
      showActualDays: allFields.has('actualDays'),
      ...overrides
    };
  }

  /**
   * 渲染视图（子类必须实现）
   * 推荐使用 renderData 模式：
   * 1. 子类重写 render 方法，调用 prepareData() 获取数据
   * 2. 然后调用 renderData(container, data) 渲染具体内容
   */
  abstract render(container: HTMLElement): Promise<void>;

  /**
   * 创建视图容器
   */
  protected createContainer(parent: HTMLElement): HTMLElement {
    const container = parent.createDiv('pm-view-container');
    return container;
  }

  /**
   * 创建工具栏
   */
  protected createToolbar(
    container: HTMLElement,
    title: string,
    stats?: { total: number; filtered: number }
  ): HTMLElement {
    const toolbar = container.createDiv('pm-view-toolbar');
    
    // 标题
    const titleEl = toolbar.createDiv('pm-view-title');
    titleEl.textContent = title;

    // 统计信息
    if (stats) {
      const statsEl = toolbar.createDiv('pm-view-stats');
      if (stats.filtered !== stats.total) {
        statsEl.textContent = `${stats.filtered} / ${stats.total}`;
        statsEl.setAttribute('title', `显示 ${stats.filtered} 项 / 共 ${stats.total} 项`);
      } else {
        statsEl.textContent = `${stats.total} 项`;
      }
    }

    return toolbar;
  }

  /**
   * 创建空状态
   */
  protected createEmptyState(container: HTMLElement, message: string = '暂无数据'): HTMLElement {
    const empty = container.createDiv('pm-view-empty');
    empty.createEl('div', { cls: 'pm-empty-icon', text: '📭' });
    empty.createEl('div', { cls: 'pm-empty-text', text: message });
    return empty;
  }

  /**
   * 创建加载状态
   */
  protected createLoadingState(container: HTMLElement): HTMLElement {
    container.empty();
    const loading = container.createDiv('pm-view-loading');
    loading.createEl('div', { cls: 'pm-loading-spinner' });
    loading.createEl('div', { cls: 'pm-loading-text', text: '加载中...' });
    return loading;
  }

  /**
   * 创建错误状态
   */
  protected createErrorState(container: HTMLElement, error: string): HTMLElement {
    const errorEl = container.createDiv('pm-view-error');
    errorEl.createEl('div', { cls: 'pm-error-icon', text: '⚠️' });
    errorEl.createEl('div', { cls: 'pm-error-text', text: '加载失败' });
    errorEl.createEl('div', { cls: 'pm-error-detail', text: error });
    return errorEl;
  }

  /**
   * 渲染状态徽章
   */
  protected renderStatusBadge(container: HTMLElement, status: string): HTMLElement {
    const color = getStatusColor(status);
    const badge = container.createSpan({
      cls: 'pm-status-badge',
      text: translateStatus(status),
    });
    badge.style.backgroundColor = color.bg;
    badge.style.color = color.text;
    return badge;
  }

  /**
   * 渲染优先级徽章
   */
  protected renderPriorityBadge(container: HTMLElement, priority: string): HTMLElement {
    const color = getPriorityColor(priority);
    const badge = container.createSpan({
      cls: 'pm-priority-badge',
      text: translatePriority(priority),
    });
    badge.style.backgroundColor = color.bg;
    badge.style.color = color.text;
    return badge;
  }

  /**
   * 渲染进度条
   */
  protected renderProgressBar(container: HTMLElement, progress: number): HTMLElement {
    const progressEl = container.createDiv('pm-progress-bar');
    const trackEl = progressEl.createDiv('pm-progress-bar__track');
    const fillEl = trackEl.createDiv('pm-progress-bar__fill');
    fillEl.style.width = `${progress}%`;
    progressEl.createSpan({
      cls: 'pm-progress-bar__text',
      text: `${progress}%`,
    });
    return progressEl;
  }

  /**
   * 渲染标签列表
   */
  protected renderTags(container: HTMLElement, tags: string[], limit: number = 3): HTMLElement {
    const tagsEl = container.createDiv('pm-tags');
    tags.slice(0, limit).forEach((tag) => {
      tagsEl.createSpan({ cls: 'pm-tag', text: tag });
    });
    if (tags.length > limit) {
      tagsEl.createSpan({
        cls: 'pm-tag pm-tag--more',
        text: `+${tags.length - limit}`,
      });
    }
    return tagsEl;
  }

  /**
   * 渲染日期
   */
  protected renderDate(container: HTMLElement, date: string | Date, cls?: string): HTMLElement {
    const span = container.createSpan({
      cls: cls || 'pm-date',
      text: DateFormat.medium(date),
    });
    return span;
  }

  /**
   * 渲染人天
   */
  protected renderDays(container: HTMLElement, days: number, label?: string): HTMLElement {
    const text = label ? `${label}: ${days}d` : `${days}d`;
    return container.createSpan({
      cls: 'pm-days',
      text,
    });
  }

  /**
   * 渲染实体详情面板（最新进展 + 最新风险，只读）
   */
  protected renderDetailPanel(container: HTMLElement, entity: Entity): HTMLElement {
    const existing = container.querySelector('.pm-list-card-detail');
    if (existing) existing.remove();

    const detail = container.createDiv('pm-list-card-detail');
    const inner = detail.createDiv('pm-list-card-detail-inner');

    const logSummary = this.entityManager.cache.getLogSummary(entity.id);

    // 进展行
    const progressRow = inner.createDiv('pm-list-detail-row');
    progressRow.createDiv({ cls: 'pm-list-detail-section-title', text: '📈 最新进展' });

    if (logSummary?.latestProgress) {
      progressRow.createDiv({
        cls: 'pm-list-detail-item',
        text: `📝 ${logSummary.latestProgress}`,
      });
    } else {
      progressRow.createDiv({
        cls: 'pm-list-detail-item pm-list-detail-item--empty',
        text: '📝 暂无进展记录',
      });
    }

    // 风险行
    const riskRow = inner.createDiv('pm-list-detail-row');
    riskRow.createDiv({ cls: 'pm-list-detail-section-title', text: '⚠️ 最新风险' });

    const openRisks = (logSummary as any)?.risks?.filter((r: RiskItem) => r.status === '未关闭' || r.status === '跟踪中') || [];
    if (openRisks.length > 0) {
      const firstRisk = openRisks[0];
      const levelEmoji = firstRisk.level === 'high' ? '🔴' : firstRisk.level === 'medium' ? '🟡' : '🟢';
      riskRow.createDiv({
        cls: 'pm-list-detail-item',
        text: `${levelEmoji} ${firstRisk.level === 'high' ? '高' : firstRisk.level === 'medium' ? '中' : '低'} | ${firstRisk.type} | ${firstRisk.description}`,
      });
    } else {
      riskRow.createDiv({
        cls: 'pm-list-detail-item pm-list-detail-item--empty',
        text: '⚠️ 暂无未关闭风险',
      });
    }

    return detail;
  }

  /**
   * 获取实体类型图标
   */
  protected getEntityTypeIcon(entityOrType: Entity | string): string {
    const type = typeof entityOrType === 'string' ? entityOrType : getEntityType(entityOrType as Entity);
    return getEntityIcon(type);
  }

  /**
   * 翻译状态（使用设计令牌）
   */
  protected translateStatus(status: string): string {
    return translateStatus(status);
  }

  /**
   * 翻译优先级（使用设计令牌）
   */
  protected translatePriority(priority: string): string {
    return translatePriority(priority);
  }
}
