import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { CardRegistry } from '../../ui/cards';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, EntityType, getEntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';

/**
 * 日历渲染器
 * 月历/周日历视图
 */
export class CalendarRenderer extends BaseRenderer {
  private currentDate: Date = new Date();

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
   * 渲染日历视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-calendar-view');

    // 加载数据
    const entities = await this.dataService.loadEntities(this.config);
    const filtered = this.dataService.applyFilters(entities, this.config.filter);

    // 只保留有截止日期的实体
    const datedEntities = filtered.filter(
      (e) => 'dueDate' in e && e.dueDate
    ) as Entity[];

    // 创建日历容器
    const calendarContainer = container.createDiv('pm-calendar-container');

    // 渲染月历
    await this.renderMonthCalendar(calendarContainer, datedEntities);
  }

  /**
   * 渲染月历
   */
  private async renderMonthCalendar(
    container: HTMLElement,
    entities: Entity[]
  ): Promise<void> {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // 头部：月份导航
    const header = container.createDiv('pm-calendar-header');

    const prevBtn = header.createEl('button', { cls: 'pm-calendar-nav-btn' });
    prevBtn.textContent = '◀';
    prevBtn.onclick = () => {
      this.currentDate.setMonth(month - 1);
      this.render(container.parentElement!);
    };

    const title = header.createDiv('pm-calendar-title');
    title.textContent = `${year}年${month + 1}月`;

    const nextBtn = header.createEl('button', { cls: 'pm-calendar-nav-btn' });
    nextBtn.textContent = '▶';
    nextBtn.onclick = () => {
      this.currentDate.setMonth(month + 1);
      this.render(container.parentElement!);
    };

    const todayBtn = header.createEl('button', { cls: 'pm-calendar-today-btn' });
    todayBtn.textContent = '今天';
    todayBtn.onclick = () => {
      this.currentDate = new Date();
      this.render(container.parentElement!);
    };

    // 星期标题
    const weekdays = container.createDiv('pm-calendar-weekdays');
    const weekNames = ['日', '一', '二', '三', '四', '五', '六'];
    weekNames.forEach((name) => {
      weekdays.createDiv({ cls: 'pm-calendar-weekday', text: name });
    });

    // 日期网格
    const grid = container.createDiv('pm-calendar-grid');

    // 计算日历布局
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay(); // 星期日开始
    const daysInMonth = lastDay.getDate();

    // 上月的日期
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayCell = grid.createDiv('pm-calendar-day pm-calendar-day-other');
      dayCell.createDiv({ cls: 'pm-calendar-day-number', text: String(prevMonthLastDay - i) });
    }

    // 当月的日期
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = grid.createDiv('pm-calendar-day');
      
      // 标记今天
      if (year === today.getFullYear() && 
          month === today.getMonth() && 
          day === today.getDate()) {
        dayCell.classList.add('pm-calendar-day-today');
      }

      dayCell.createDiv({ cls: 'pm-calendar-day-number', text: String(day) });

      // 该日期的实体
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEntities = entities.filter((e) => {
        const entityDate = (e as any).dueDate;
        return entityDate === dateStr;
      });

      // 渲染实体列表
      if (dayEntities.length > 0) {
        const list = dayCell.createDiv('pm-calendar-day-list');
        dayEntities.forEach((entity) => {
          this.renderCalendarItem(list, entity);
        });
      }

      // 点击添加新实体（可扩展）
      dayCell.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.pm-calendar-item')) return;
        // TODO: 快速创建实体
      });
    }

    // 下月的日期（填充网格）
    const totalCells = startOffset + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= remainingCells; day++) {
      const dayCell = grid.createDiv('pm-calendar-day pm-calendar-day-other');
      dayCell.createDiv({ cls: 'pm-calendar-day-number', text: String(day) });
    }
  }

  /**
   * 渲染日历项
   */
  private renderCalendarItem(container: HTMLElement, entity: Entity): void {
    const item = container.createDiv('pm-calendar-item');
    item.classList.add(`pm-entity-${getEntityType(entity)}`);
    item.dataset.entityId = entity.id;

    // 优先级颜色条
    if ('priority' in entity && entity.priority) {
      const priorityColors: Record<string, string> = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#22c55e',
      };
      item.style.borderLeftColor = priorityColors[entity.priority] || '#9ca3af';
    }

    // 状态标记
    if ('status' in entity && entity.status) {
      item.classList.add(`pm-status-${entity.status}`);
    }

    // 图标
    const icon = this.getEntityTypeIcon(getEntityType(entity));
    item.createSpan({ cls: 'pm-calendar-item-icon', text: icon });

    // 名称
    item.createSpan({ cls: 'pm-calendar-item-name', text: entity.name });

    // 悬停显示更多信息
    item.title = `${entity.name} (${entity.owner || '未分配'})`;

    // 点击打开
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      this.actionService.openEntity(getEntityType(entity) as EntityType, entity.id);
    });
  }
}
