import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, EntityType, getEntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';
import { QuickCreateModal } from '../../modals/QuickCreateModal';
import { DateFormat } from '../design-tokens';
import { EntityCard } from '../components';

/**
 * 日历渲染器
 * 月历/周日历视图
 */
export class CalendarRenderer extends BaseRenderer {
  private currentDate: Date = new Date();

  constructor(
    app: App,
    entityManager: EntityManager,
    dataService: DataService,
    actionService: ActionService
  ) {
    super(app, entityManager, dataService, actionService);
  }

  /**
   * 渲染日历视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-calendar-view');

    // 加载数据
    const entities = await this.dataService.loadEntities(this.config);
    const filtered = this.dataService.applyFilters(entities, this.config);

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

      // 点击添加新实体
      dayCell.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.pm-calendar-item')) return;
        // 快速创建特性，预填充截止日期
        new QuickCreateModal(
          this.app,
          this.entityManager,
          dateStr,
          async (data) => {
            try {
              await this.entityManager.createFeature(data);
              // 刷新视图
              this.render(container);
            } catch (error) {
              console.error('创建特性失败:', error);
            }
          }
        ).open();
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
   * 使用 EntityCard compact 变体
   */
  private renderCalendarItem(container: HTMLElement, entity: Entity): void {
    const entityType = getEntityType(entity);
    const wrapper = container.createDiv('pm-calendar-card-wrapper');

    // 使用 EntityCard 组件
    // 日历视图：从配置读取，但日期格子空间极小
    const cardFields = this.config.cardFields || { required: ['name', 'priority'], optional: ['status'] };
    const required = cardFields.required || ['name', 'priority'];
    const optional = cardFields.optional || [];
    const allFields = [...required, ...optional];
    
    const entityCard = new EntityCard(this.app);
    entityCard.render(
      wrapper,
      entity,
      {
        showPriority: allFields.includes('priority'),
        showStatus: allFields.includes('status'),
        showProgress: false, // 日历空间不足，强制不显示
        showOwner: false,
        showDueDate: false,
        showTags: false,
        showParent: false,
        showDescription: false,
        showTypeIcon: false,
        showStats: false,
        showActions: false,
        smallTitle: true,
      },
      {
        onOpen: () => {
          this.actionService.openEntity(entityType as EntityType, entity.id);
        },
      }
    );
  }
}
