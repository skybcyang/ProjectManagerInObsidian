import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { CardRegistry } from '../../ui/cards';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, EntityType, getEntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';

/**
 * 时间线渲染器
 * 水平/垂直时间线视图
 */
export class TimelineRenderer extends BaseRenderer {
  constructor(
    app: App,
    entityManager: EntityManager,
    cardRegistry: CardRegistry,
    dataService: DataService,
    actionService: ActionService
  ) {
    super(app, entityManager, cardRegistry, dataService, actionService);
  }

  /**
   * 渲染时间线视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-timeline-view');

    // 加载数据
    const entities = await this.dataService.loadEntities(this.config);
    const filtered = this.dataService.applyFilters(entities, this.config.filter);
    const sorted = this.dataService.applySort(
      filtered,
      this.config.sortBy || 'dueDate',
      this.config.sortOrder || 'asc'
    );

    // 创建工具栏
    this.createToolbar(container, (this.config as any).title || '时间线视图', {
      total: entities.length,
      filtered: sorted.length,
    });

    // 根据方向渲染
    const direction = (this.config as any).direction || 'horizontal';
    
    if (direction === 'vertical') {
      await this.renderVerticalTimeline(container, sorted);
    } else {
      await this.renderHorizontalTimeline(container, sorted);
    }
  }

  /**
   * 渲染水平时间线
   */
  private async renderHorizontalTimeline(
    container: HTMLElement,
    entities: Entity[]
  ): Promise<void> {
    const timelineContainer = container.createDiv('pm-timeline-horizontal');

    if (entities.length === 0) {
      this.createEmptyState(timelineContainer, '没有符合条件的实体');
      return;
    }

    // 创建时间线轨道
    const track = timelineContainer.createDiv('pm-timeline-track');

    // 计算时间范围
    const dates = entities
      .filter((e) => 'dueDate' in e && e.dueDate)
      .map((e) => new Date((e as any).dueDate).getTime());

    if (dates.length === 0) {
      track.createDiv({ text: '没有可显示的时间信息' });
      return;
    }

    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const dateRange = maxDate - minDate || 1;

    // 渲染时间点
    entities.forEach((entity, index) => {
      const point = track.createDiv('pm-timeline-point');
      
      // 计算位置
      let position = 0;
      if ('dueDate' in entity && entity.dueDate) {
        const entityDate = new Date(entity.dueDate).getTime();
        position = ((entityDate - minDate) / dateRange) * 100;
      } else {
        // 没有日期的实体均匀分布
        position = (index / (entities.length - 1 || 1)) * 100;
      }

      point.style.left = `${position}%`;
      point.dataset.entityId = entity.id;

      // 时间点标记
      const marker = point.createDiv('pm-timeline-marker');
      marker.classList.add(`pm-entity-${getEntityType(entity)}`);

      // 状态颜色
      if ('status' in entity && entity.status) {
        marker.classList.add(`pm-status-${entity.status}`);
      }

      // 内容卡片（悬停显示）
      const card = point.createDiv('pm-timeline-card');
      this.renderTimelineCard(card, entity);

      // 点击打开
      point.addEventListener('click', () => {
        this.actionService.openEntity(getEntityType(entity) as EntityType, entity.id);
      });
    });

    // 时间轴标签
    const labels = timelineContainer.createDiv('pm-timeline-labels');
    const startLabel = labels.createDiv('pm-timeline-label');
    startLabel.textContent = this.formatDateShort(new Date(minDate));
    startLabel.style.left = '0%';

    const endLabel = labels.createDiv('pm-timeline-label');
    endLabel.textContent = this.formatDateShort(new Date(maxDate));
    endLabel.style.left = '100%';
  }

  /**
   * 渲染垂直时间线
   */
  private async renderVerticalTimeline(
    container: HTMLElement,
    entities: Entity[]
  ): Promise<void> {
    const timelineContainer = container.createDiv('pm-timeline-vertical');

    if (entities.length === 0) {
      this.createEmptyState(timelineContainer, '没有符合条件的实体');
      return;
    }

    // 按日期分组
    const grouped = this.groupByDate(entities);
    const sortedDates = Array.from(grouped.keys()).sort();

    // 渲染每个日期组
    sortedDates.forEach((dateKey) => {
      const group = timelineContainer.createDiv('pm-timeline-group');

      // 日期标签
      const dateLabel = group.createDiv('pm-timeline-date');
      dateLabel.textContent = this.formatDateLong(dateKey);

      // 该日期的实体
      const items = group.createDiv('pm-timeline-items');
      const groupEntities = grouped.get(dateKey) || [];

      groupEntities.forEach((entity) => {
        const item = items.createDiv('pm-timeline-item');
        item.dataset.entityId = entity.id;

        // 类型标记
        const typeMark = item.createDiv('pm-timeline-type-mark');
        typeMark.classList.add(`pm-entity-${getEntityType(entity)}`);

        // 内容
        const content = item.createDiv('pm-timeline-item-content');
        this.renderTimelineCard(content, entity, true);

        // 点击打开
        item.addEventListener('click', () => {
          this.actionService.openEntity(getEntityType(entity) as EntityType, entity.id);
        });
      });
    });
  }

  /**
   * 渲染时间线卡片
   */
  private renderTimelineCard(
    container: HTMLElement,
    entity: Entity,
    compact: boolean = false
  ): void {
    // 头部
    const header = container.createDiv('pm-timeline-card-header');
    
    const icon = this.getEntityTypeIcon(getEntityType(entity));
    header.createSpan({ cls: 'pm-timeline-card-icon', text: icon });
    header.createEl('span', { cls: 'pm-timeline-card-title', text: entity.name });

    // 状态徽章
    if ('status' in entity && entity.status) {
      header.createSpan({
        cls: `pm-status-badge pm-status-${entity.status}`,
        text: this.translateStatus(entity.status),
      });
    }

    if (compact) return;

    // 详细信息
    const body = container.createDiv('pm-timeline-card-body');

    if (entity.owner) {
      body.createDiv({
        cls: 'pm-timeline-card-owner',
        text: `👤 ${entity.owner}`,
      });
    }

    if ('priority' in entity && entity.priority) {
      body.createDiv({
        cls: 'pm-timeline-card-priority',
        text: `优先级: ${this.translatePriority(entity.priority)}`,
      });
    }

    // 进度条（特性）
    if (getEntityType(entity) === 'feature' && 'progress' in entity) {
      const progress = entity.progress || 0;
      const progressEl = body.createDiv('pm-timeline-card-progress');
      progressEl.createDiv({
        cls: 'pm-progress-bar',
        attr: { style: `width: ${progress}%` },
      });
      progressEl.createSpan({ text: `${progress}%` });
    }
  }

  /**
   * 按日期分组
   */
  private groupByDate(entities: Entity[]): Map<string, Entity[]> {
    const groups = new Map<string, Entity[]>();

    entities.forEach((entity) => {
      let dateKey = '未安排';
      if ('dueDate' in entity && entity.dueDate) {
        dateKey = entity.dueDate;
      }

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(entity);
    });

    return groups;
  }

  /**
   * 格式化短日期
   */
  private formatDateShort(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  /**
   * 格式化长日期
   */
  private formatDateLong(dateStr: string): string {
    if (dateStr === '未安排') return dateStr;
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }
}
