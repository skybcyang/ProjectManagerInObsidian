import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, EntityType, getEntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';
import { RendererRegistry } from '../RendererRegistry';
import { getPriorityColor, DateFormat } from '../design-tokens';

/**
 * 时间线渲染器 - 甘特图模式
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
   * 渲染甘特图时间线
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-timeline-view');
    container.style.cssText = `
      width: 100%;
      padding: 16px;
      box-sizing: border-box;
    `;

    // 加载数据
    const entities = await this.dataService.loadEntities(this.config);
    const filtered = this.dataService.applyFilters(entities, this.config);
    const sorted = this.dataService.applySort(
      filtered,
      this.config.sortBy,
      this.config.sortOrder
    );

    if (sorted.length === 0) {
      this.createEmptyState(container, '没有符合条件的实体');
      return;
    }

    // 只渲染甘特图
    await this.renderGantt(container, sorted);
  }

  /**
   * 渲染甘特图
   */
  private async renderGantt(container: HTMLElement, entities: Entity[]): Promise<void> {
    // 过滤出有日期的实体
    const entitiesWithDates = entities.filter(
      (e) => 'endDate' in e && e.endDate
    );

    if (entitiesWithDates.length === 0) {
      this.createEmptyState(container, '没有可显示的时间信息（需要设置 endDate）');
      return;
    }

    // 计算时间范围
    const allDates: number[] = [];
    entitiesWithDates.forEach((e) => {
      const endTime = new Date((e as any).endDate).getTime();
      if (!isNaN(endTime)) allDates.push(endTime);
      if ((e as any).startDate) {
        const startTime = new Date((e as any).startDate).getTime();
        if (!isNaN(startTime)) allDates.push(startTime);
      }
    });

    if (allDates.length === 0) {
      this.createEmptyState(container, '日期格式无效');
      return;
    }

    const minDate = Math.min(...allDates);
    const maxDate = Math.max(...allDates);
    const buffer = (maxDate - minDate) * 0.1;
    const chartStart = minDate - buffer;
    const chartEnd = maxDate + buffer;
    const chartRange = chartEnd - chartStart;

    // 创建甘特图容器
    const ganttContainer = container.createDiv('pm-timeline-gantt');
    ganttContainer.style.cssText = `
      width: 100%;
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      overflow: hidden;
      background: var(--background-primary);
    `;

    // 渲染表头
    this.renderGanttHeader(ganttContainer, chartStart, chartEnd);

    // 渲染主体
    const ganttBody = ganttContainer.createDiv('pm-gantt-body');
    ganttBody.style.cssText = `
      display: flex;
      flex-direction: column;
    `;

    // 渲染每一行
    entitiesWithDates.forEach((entity) => {
      this.renderGanttRow(ganttBody, entity, chartStart, chartRange);
    });
  }

  /**
   * 渲染甘特图表头
   */
  private renderGanttHeader(
    container: HTMLElement,
    startTime: number,
    endTime: number
  ): void {
    const header = container.createDiv('pm-gantt-header');
    header.style.cssText = `
      display: flex;
      height: 40px;
      background: var(--background-secondary);
      border-bottom: 1px solid var(--background-modifier-border);
    `;

    const timeRange = endTime - startTime;
    const days = timeRange / (24 * 60 * 60 * 1000);
    const tickCount = days < 30 ? Math.ceil(days / 3) : 6;
    const tickInterval = timeRange / tickCount;

    // 名称列标题
    const nameCol = header.createDiv('pm-gantt-header-name');
    nameCol.style.cssText = `
      width: 150px;
      min-width: 150px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      border-right: 1px solid var(--background-modifier-border);
    `;
    nameCol.textContent = '特性';

    // 时间轴
    const timelineHeader = header.createDiv('pm-gantt-header-timeline');
    timelineHeader.style.cssText = `
      flex: 1;
      position: relative;
    `;

    for (let i = 0; i <= tickCount; i++) {
      const tickTime = startTime + tickInterval * i;
      const tick = timelineHeader.createDiv('pm-gantt-tick');
      tick.style.cssText = `
        position: absolute;
        bottom: 4px;
        left: ${(i / tickCount) * 100}%;
        transform: translateX(-50%);
        font-size: 11px;
        color: var(--text-muted);
        white-space: nowrap;
      `;
      const date = new Date(tickTime);
      tick.textContent = `${date.getMonth() + 1}/${date.getDate()}`;
    }

    // 网格线
    for (let i = 1; i <= tickCount; i++) {
      const gridLine = timelineHeader.createDiv('pm-gantt-grid-line');
      gridLine.style.cssText = `
        position: absolute;
        top: 0;
        bottom: 0;
        left: ${(i / tickCount) * 100}%;
        width: 1px;
        background: var(--background-modifier-border);
        opacity: 0.3;
      `;
    }
  }

  /**
   * 渲染甘特图行
   */
  private renderGanttRow(
    container: HTMLElement,
    entity: Entity,
    chartStart: number,
    chartRange: number
  ): void {
    const row = container.createDiv('pm-gantt-row');
    row.style.cssText = `
      display: flex;
      height: 44px;
      border-bottom: 1px solid var(--background-modifier-border);
      cursor: pointer;
      position: relative;
    `;
    row.addEventListener('mouseenter', () => {
      row.style.background = 'var(--background-modifier-hover)';
    });
    row.addEventListener('mouseleave', () => {
      row.style.background = '';
    });

    // 名称
    const nameCol = row.createDiv('pm-gantt-name');
    nameCol.style.cssText = `
      width: 150px;
      min-width: 150px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-normal);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-right: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
    `;
    nameCol.textContent = entity.name;
    nameCol.title = entity.name;

    // 时间轴
    const timelineCol = row.createDiv('pm-gantt-timeline');
    timelineCol.style.cssText = `
      flex: 1;
      position: relative;
    `;

    // 计算位置
    const entityStart = (entity as any).startDate
      ? new Date((entity as any).startDate).getTime()
      : new Date((entity as any).endDate).getTime();
    const entityEnd = new Date((entity as any).endDate).getTime();

    if (isNaN(entityStart) || isNaN(entityEnd)) return;

    const startPercent = ((entityStart - chartStart) / chartRange) * 100;
    const endPercent = ((entityEnd - chartStart) / chartRange) * 100;
    const widthPercent = Math.max(1, endPercent - startPercent);

    // 条形颜色
    let barColor = '#3b82f6';
    if ('priority' in entity && entity.priority) {
      const colors: Record<string, string> = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#22c55e',
      };
      barColor = colors[entity.priority] || barColor;
    }

    // 创建条形
    const bar = timelineCol.createDiv('pm-gantt-bar');
    bar.style.cssText = `
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      left: ${Math.max(0, startPercent)}%;
      width: ${Math.min(100, widthPercent)}%;
      height: 20px;
      border-radius: 4px;
      background: ${barColor};
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      min-width: 2px;
    `;

    // 进度
    const progress = (entity as any).progress || 0;
    if (progress > 0) {
      const fill = bar.createDiv('pm-gantt-progress');
      fill.style.cssText = `
        height: 100%;
        background: rgba(255, 255, 255, 0.4);
        border-radius: 4px 0 0 4px;
        width: ${progress}%;
      `;
    }

    // 点击
    row.addEventListener('click', async () => {
      await this.actionService.openEntity(getEntityType(entity) as EntityType, entity.id);
    });

    // 悬停提示
    const tooltip = timelineCol.createDiv('pm-gantt-tooltip');
    tooltip.style.cssText = `
      display: none;
      position: absolute;
      left: 10px;
      top: 30px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      min-width: 200px;
    `;
    row.addEventListener('mouseenter', () => {
      tooltip.style.display = 'block';
    });
    row.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });

    this.renderTooltip(tooltip, entity, entityStart, entityEnd);
  }

  /**
   * 渲染悬停提示
   */
  private renderTooltip(
    container: HTMLElement,
    entity: Entity,
    startDate: number,
    endDate: number
  ): void {
    const header = container.createDiv('pm-gantt-tooltip-header');
    header.style.cssText = `
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--background-modifier-border);
      color: var(--text-normal);
    `;
    header.textContent = entity.name;

    const dates = container.createDiv('pm-gantt-tooltip-dates');
    dates.style.cssText = `
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 4px;
    `;
    dates.textContent = `${DateFormat.short(new Date(startDate))} ~ ${DateFormat.short(new Date(endDate))}`;

    if ('status' in entity && entity.status) {
      const status = container.createDiv('pm-gantt-tooltip-status');
      status.style.cssText = `
        font-size: 12px;
        margin-top: 4px;
        padding: 2px 8px;
        border-radius: 4px;
        background: var(--background-secondary);
        display: inline-block;
      `;
      status.textContent = this.translateStatus(entity.status);
    }

    if ('progress' in entity && entity.progress !== undefined) {
      const progress = container.createDiv('pm-gantt-tooltip-progress');
      progress.style.cssText = `
        font-size: 12px;
        margin-top: 4px;
        color: var(--text-normal);
      `;
      progress.textContent = `进度: ${entity.progress}%`;
    }

    if (entity.owner) {
      const owner = container.createDiv('pm-gantt-tooltip-owner');
      owner.style.cssText = `
        font-size: 12px;
        margin-top: 4px;
        color: var(--text-muted);
      `;
      owner.textContent = `负责人: ${entity.owner}`;
    }
  }
}

// 自注册到渲染器注册表
RendererRegistry.register("timeline", TimelineRenderer);
