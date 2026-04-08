import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, EntityType, getEntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';
import { getPriorityColor, DateFormat, isOverdue } from '../design-tokens';

/**
 * 时间线渲染器 - 卡片式时间线视图
 * 支持水平和垂直两种布局
 */
export class TimelineRenderer extends BaseRenderer {
  constructor(
    app: App,
    entityManager: EntityManager,
    dataService: DataService,
    actionService: ActionService
  ) {
    super(app, entityManager, dataService, actionService);
  }

  /**
   * 渲染时间线视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-timeline-view');

    // 加载数据
    const entities = await this.dataService.loadEntities(this.config);
    const filtered = this.dataService.applyFilters(entities, this.config);
    const sorted = this.dataService.applySort(
      filtered,
      this.config.sortBy,
      this.config.sortOrder
    );

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
        position = (index / (entities.length - 1 || 1)) * 100;
      }

      point.style.left = `${position}%`;
      point.dataset.entityId = entity.id;

      // 时间点标记
      const marker = point.createDiv('pm-timeline-marker');
      marker.classList.add(`pm-entity-${getEntityType(entity)}`);

      // 优先级颜色
      if ('priority' in entity && entity.priority) {
        marker.style.background = getPriorityColor(entity.priority).bg;
      }

      // 状态样式
      if ('status' in entity && entity.status) {
        marker.classList.add(`pm-status-${entity.status}`);
      }

      // 悬停卡片
      const card = point.createDiv('pm-timeline-hover-card');
      this.renderTimelineHoverCard(card, entity);

      // 点击打开
      point.addEventListener('click', () => {
        this.actionService.openEntity(getEntityType(entity) as EntityType, entity.id);
      });
    });

    // 时间轴标签
    const labels = timelineContainer.createDiv('pm-timeline-labels');
    const startLabel = labels.createDiv('pm-timeline-label');
    startLabel.textContent = DateFormat.short(new Date(minDate));

    const endLabel = labels.createDiv('pm-timeline-label');
    endLabel.textContent = DateFormat.short(new Date(maxDate));
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
      if (dateKey === '未安排') {
        dateLabel.textContent = dateKey;
        dateLabel.addClass('pm-timeline-date--unscheduled');
      } else {
        const date = new Date(dateKey);
        dateLabel.textContent = `${date.getMonth() + 1}月${date.getDate()}日`;
        dateLabel.createEl('span', { 
          cls: 'pm-timeline-date-weekday',
          text: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
        });
      }

      // 该日期的实体卡片
      const items = group.createDiv('pm-timeline-items');
      const groupEntities = grouped.get(dateKey) || [];

      groupEntities.forEach((entity) => {
        const card = items.createDiv('pm-timeline-card');
        card.dataset.entityId = entity.id;

        // 渲染卡片内容
        this.renderTimelineVerticalCard(card, entity);

        // 点击打开
        card.addEventListener('click', () => {
          this.actionService.openEntity(getEntityType(entity) as EntityType, entity.id);
        });
      });
    });
  }

  /**
   * 渲染时间线悬停卡片（水平时间线用）
   */
  private renderTimelineHoverCard(container: HTMLElement, entity: Entity): void {
    const entityType = getEntityType(entity);

    // 优先级条
    if ('priority' in entity && entity.priority) {
      const priorityBar = container.createDiv('pm-timeline-hover-priority');
      priorityBar.style.background = getPriorityColor(entity.priority).bg;
    }

    const content = container.createDiv('pm-timeline-hover-content');

    // 类型 + 标题
    const header = content.createDiv('pm-timeline-hover-header');
    header.createSpan({ 
      cls: 'pm-timeline-hover-type', 
      text: this.getEntityTypeIcon(entityType) 
    });
    header.createSpan({ 
      cls: 'pm-timeline-hover-title', 
      text: entity.name 
    });

    // 状态
    if ('status' in entity && entity.status) {
      content.createSpan({
        cls: `pm-timeline-hover-status pm-status-${entity.status}`,
        text: this.translateStatus(entity.status),
      });
    }

    // 进度
    if ('progress' in entity && entity.progress !== undefined) {
      const progressEl = content.createDiv('pm-timeline-hover-progress');
      const progressBar = progressEl.createDiv('pm-timeline-hover-progress-bar');
      progressBar.createDiv({
        cls: 'pm-timeline-hover-progress-fill',
        attr: { style: `width: ${entity.progress}%` }
      });
      progressEl.createSpan({ text: `${entity.progress}%` });
    }
  }

  /**
   * 渲染垂直时间线卡片
   */
  private renderTimelineVerticalCard(card: HTMLElement, entity: Entity): void {
    const entityType = getEntityType(entity);

    // 优先级标记条
    if ('priority' in entity && entity.priority) {
      const priorityBar = card.createDiv('pm-timeline-card-priority-bar');
      priorityBar.style.background = getPriorityColor(entity.priority).bg;
    }

    const content = card.createDiv('pm-timeline-card-content');

    // 头部：类型图标 + 标题
    const header = content.createDiv('pm-timeline-card-header');
    
    const typeIcon = header.createDiv('pm-timeline-card-type-icon');
    typeIcon.textContent = this.getEntityTypeIcon(entityType);

    const titleSection = header.createDiv('pm-timeline-card-title-section');
    titleSection.createDiv({ 
      cls: 'pm-timeline-card-title', 
      text: entity.name 
    });

    // 元信息
    const meta = content.createDiv('pm-timeline-card-meta');

    // 状态
    if ('status' in entity && entity.status) {
      meta.createSpan({
        cls: `pm-timeline-card-status pm-status-${entity.status}`,
        text: this.translateStatus(entity.status),
      });
    }

    // 进度
    if ('progress' in entity && entity.progress !== undefined) {
      const progressEl = meta.createDiv('pm-timeline-card-progress');
      const progressBar = progressEl.createDiv('pm-timeline-card-progress-bar');
      progressBar.createDiv({
        cls: 'pm-timeline-card-progress-fill',
        attr: { style: `width: ${entity.progress}%` }
      });
      progressEl.createSpan({ text: `${entity.progress}%` });
    }

    // 负责人
    if (entity.owner) {
      meta.createSpan({ cls: 'pm-timeline-card-owner', text: `@${entity.owner}` });
    }

    // 操作按钮
    const actions = content.createDiv('pm-timeline-card-actions');
    
    const openBtn = actions.createEl('button', { cls: 'pm-timeline-action-btn' });
    openBtn.textContent = '↗';
    openBtn.title = '打开文件';
    openBtn.onclick = (e) => {
      e.stopPropagation();
      this.actionService.openEntity(entityType, entity.id);
    };
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
}
