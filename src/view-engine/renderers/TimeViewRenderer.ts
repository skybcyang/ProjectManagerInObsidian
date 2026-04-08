import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, EntityType, getEntityType } from '../types';
import type { Feature } from '../../types';
import { BaseRenderer } from './BaseRenderer';
import { DateFormat, getPriorityColor, translateStatus } from '../design-tokens';

/**
 * 时间视图模式
 */
type TimeViewMode = 'week' | 'month' | 'quarter';

/**
 * 时间视图项
 */
interface TimeViewItem {
  entity: Feature;
  startDate: Date;
  endDate: Date;
  isMilestone: boolean;
  progress: number;
  entityType: EntityType;
}

/**
 * 时间视图状态
 */
interface TimeViewState {
  currentDate: Date;
  viewMode: TimeViewMode;
}

/**
 * 时间视图渲染器
 * 统一的时间规划视图，支持周/月/季度三种模式
 */
export class TimeViewRenderer extends BaseRenderer {
  private state: TimeViewState;
  // 静态变量保持状态 across 重新渲染
  private static sharedState: TimeViewState | null = null;

  constructor(
    app: App,
    entityManager: EntityManager,
    dataService: DataService,
    actionService: ActionService
  ) {
    super(app, entityManager, dataService, actionService);
    // 使用共享状态或初始化新状态
    if (TimeViewRenderer.sharedState) {
      this.state = { ...TimeViewRenderer.sharedState };
    } else {
      this.state = {
        currentDate: new Date(),
        viewMode: 'month',
      };
      TimeViewRenderer.sharedState = this.state;
    }
  }

  /**
   * 渲染时间视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-timeview');

    // 加载数据
    const entities = await this.dataService.loadEntities(this.config);
    const filtered = this.dataService.applyFilters(entities, this.config);

    // 调试信息
    console.log('[TimeView] 配置:', JSON.stringify({
      entityType: this.config.entityType,
      project: this.config.project,
      version: this.config.version,
      status: this.config.status,
      priority: this.config.priority,
    }));
    console.log('[TimeView] 加载实体:', entities.length, '过滤后:', filtered.length);
    
    // 显示前5个实体的关键信息
    if (entities.length > 0) {
      console.log('[TimeView] 实体示例:', entities.slice(0, 3).map((e: any) => ({
        id: e.id,
        name: e.name,
        projectId: e.projectId,
        versionId: e.versionId,
        status: e.status,
      })));
    }

    // 转换为时间视图项（只处理有截止日期的实体）
    const items = this.convertToTimeItems(filtered);

    // 渲染工具栏（传入统计信息）
    this.renderToolbar(container, entities.length, filtered.length, items.length);

    // 渲染内容区域
    const contentArea = container.createDiv('pm-timeview-content');

    // 如果没有数据，显示提示
    if (items.length === 0) {
      this.renderEmptyState(contentArea, filtered.length === 0 ? '暂无数据' : '没有带截止日期的实体');
      return;
    }

    // 根据视图模式渲染
    switch (this.state.viewMode) {
      case 'week':
        this.renderWeekView(contentArea, items);
        break;
      case 'month':
        this.renderMonthView(contentArea, items);
        break;
      case 'quarter':
        this.renderQuarterView(contentArea, items);
        break;
    }
  }

  /**
   * 将实体转换为时间视图项
   */
  private convertToTimeItems(entities: Entity[]): TimeViewItem[] {
    return entities
      .filter((e) => 'dueDate' in e && !!e.dueDate)
      .map((e) => {
        const entity = e as Feature;
        const endDate = new Date(entity.dueDate!);
        // 如果有 startDate 就用，否则默认从开始日期为截止日期的7天前
        const startDate = entity.startDate
          ? new Date(entity.startDate)
          : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        return {
          entity,
          startDate,
          endDate,
          isMilestone: entity.isMilestone || false,
          progress: entity.progress || 0,
          entityType: getEntityType(entity),
        };
      })
      .filter((item) => !isNaN(item.startDate.getTime()) && !isNaN(item.endDate.getTime()));
  }

  /**
   * 渲染空状态
   */
  private renderEmptyState(container: HTMLElement, message: string): void {
    const empty = container.createDiv('pm-timeview-empty');
    empty.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      color: var(--text-muted);
      gap: 12px;
    `;
    empty.createDiv({ text: '📅', cls: 'pm-timeview-empty-icon' }).style.cssText = 'font-size: 48px;';
    empty.createDiv({ text: message, cls: 'pm-timeview-empty-text' }).style.cssText = 'font-size: 14px;';
    
    const hint = empty.createDiv({ cls: 'pm-timeview-empty-hint' });
    hint.style.cssText = 'font-size: 12px; opacity: 0.7;';
    hint.textContent = '提示：为实体添加 dueDate 字段即可在时间视图中显示';
  }

  /**
   * 渲染工具栏
   */
  private renderToolbar(
    container: HTMLElement,
    totalCount: number = 0,
    filteredCount: number = 0,
    timeItemsCount: number = 0
  ): void {
    const toolbar = container.createDiv('pm-timeview-toolbar');

    // 左侧：日期导航
    const navGroup = toolbar.createDiv('pm-timeview-nav');

    const prevBtn = navGroup.createEl('button', { cls: 'pm-timeview-nav-btn' });
    prevBtn.textContent = '◀';
    prevBtn.onclick = () => {
      this.navigateDate(-1);
      this.refresh(container);
    };

    const todayBtn = navGroup.createEl('button', { cls: 'pm-timeview-today-btn' });
    todayBtn.textContent = '今天';
    todayBtn.onclick = () => {
      this.state.currentDate = new Date();
      this.refresh(container);
    };

    const nextBtn = navGroup.createEl('button', { cls: 'pm-timeview-nav-btn' });
    nextBtn.textContent = '▶';
    nextBtn.onclick = () => {
      this.navigateDate(1);
      this.refresh(container);
    };

    // 中间：当前日期标题
    const dateTitle = toolbar.createDiv('pm-timeview-date-title');
    dateTitle.textContent = this.getDateTitle();

    // 中间：视图模式切换
    const modeGroup = toolbar.createDiv('pm-timeview-mode');
    const modeSelect = modeGroup.createEl('select', { cls: 'pm-timeview-mode-select' });

    const modes: { value: TimeViewMode; label: string }[] = [
      { value: 'week', label: '周视图' },
      { value: 'month', label: '月视图' },
      { value: 'quarter', label: '季度视图' },
    ];

    modes.forEach((mode) => {
      const option = modeSelect.createEl('option', {
        text: mode.label,
        value: mode.value,
      });
      if (mode.value === this.state.viewMode) {
        option.selected = true;
      }
    });

    modeSelect.addEventListener('change', () => {
      this.state.viewMode = modeSelect.value as TimeViewMode;
      // 同步到共享状态
      TimeViewRenderer.sharedState = { ...this.state };
      this.refresh(container);
    });

    // 右侧：统计信息
    const statsGroup = toolbar.createDiv('pm-timeview-stats');
    const entityType = this.config.entityType || 'feature';
    statsGroup.textContent = `${entityType === 'feature' ? '特性' : entityType === 'project' ? '项目' : '版本'}: ${timeItemsCount}`;
  }

  /**
   * 日期导航 - 只修改日期，不触发渲染（由调用方负责刷新）
   */
  private navigateDate(direction: -1 | 1): void {
    const { viewMode, currentDate } = this.state;

    switch (viewMode) {
      case 'week':
        currentDate.setDate(currentDate.getDate() + direction * 7);
        break;
      case 'month':
        currentDate.setMonth(currentDate.getMonth() + direction);
        break;
      case 'quarter':
        currentDate.setMonth(currentDate.getMonth() + direction * 3);
        break;
    }
    
    // 同步到共享状态
    TimeViewRenderer.sharedState = { ...this.state };
  }

  /**
   * 刷新视图
   */
  private refresh(container: HTMLElement): void {
    this.render(container);
  }

  /**
   * 获取日期标题
   */
  private getDateTitle(): string {
    const { currentDate, viewMode } = this.state;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    switch (viewMode) {
      case 'week': {
        const weekStart = this.getWeekStart(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const startMonth = weekStart.getMonth() + 1;
        const startDay = weekStart.getDate();
        const endMonth = weekEnd.getMonth() + 1;
        const endDay = weekEnd.getDate();
        
        if (startMonth === endMonth) {
          return `${year}年${startMonth}月${startDay}日-${endDay}日`;
        } else {
          return `${year}年${startMonth}月${startDay}日-${endMonth}月${endDay}日`;
        }
      }
      case 'month':
        return `${year}年${month}月`;
      case 'quarter': {
        const quarter = Math.floor((month - 1) / 3) + 1;
        return `${year}年 Q${quarter}`;
      }
      default:
        return `${year}年${month}月`;
    }
  }

  /**
   * 渲染周视图 - 甘特图风格
   */
  private renderWeekView(container: HTMLElement, items: TimeViewItem[]): void {
    container.empty();
    container.addClass('pm-timeview-week');

    const { currentDate } = this.state;
    const weekStart = this.getWeekStart(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // 渲染星期标题行
    const headerRow = container.createDiv('pm-timeview-week-header');
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + i);

      const isToday = this.isSameDay(dayDate, new Date());
      const headerCell = headerRow.createDiv('pm-timeview-week-header-cell');
      if (isToday) {
        headerCell.classList.add('pm-timeview-today');
      }

      headerCell.createDiv({
        cls: 'pm-timeview-week-day-name',
        text: weekDays[i],
      });
      headerCell.createDiv({
        cls: 'pm-timeview-week-day-number',
        text: String(dayDate.getDate()),
      });
    }

    // 筛选出在当前周有显示的任务
    const weekItems = items.filter((item) =>
      this.isDateRangeOverlap(item.startDate, item.endDate, weekStart, weekEnd)
    );

    // 计算每行的任务
    const rows = this.calculateGanttRows(weekItems, weekStart, weekEnd);

    // 渲染甘特图网格
    const ganttContainer = container.createDiv('pm-timeview-week-gantt');
    ganttContainer.style.display = 'grid';
    ganttContainer.style.gridTemplateColumns = 'repeat(7, 1fr)';
    ganttContainer.style.gap = '4px';
    ganttContainer.style.padding = '8px';

    // 渲染日期列背景
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + i);
      const dayBg = ganttContainer.createDiv('pm-timeview-week-day-bg');
      dayBg.style.gridColumn = String(i + 1);
      dayBg.style.gridRow = `1 / span ${rows.length}`;
      dayBg.style.background = this.isSameDay(dayDate, new Date())
        ? 'var(--background-modifier-accent)'
        : 'var(--background-secondary)';
      dayBg.style.borderRadius = '4px';
      dayBg.style.opacity = '0.5';
    }

    // 渲染甘特条
    rows.forEach((rowItems, rowIndex) => {
      rowItems.forEach((item) => {
        this.renderWeekGanttBar(ganttContainer, item, weekStart, rowIndex + 1);
      });
    });
  }

  /**
   * 计算甘特图行分配
   */
  private calculateGanttRows(
    items: TimeViewItem[],
    rangeStart: Date,
    rangeEnd: Date
  ): TimeViewItem[][] {
    const rows: TimeViewItem[][] = [];
    const occupied: { startCol: number; endCol: number; row: number }[] = [];

    // 按开始日期排序
    const sortedItems = [...items].sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );

    for (const item of sortedItems) {
      // 计算在当前范围内的列位置
      const actualStart = item.startDate < rangeStart ? rangeStart : item.startDate;
      const actualEnd = item.endDate > rangeEnd ? rangeEnd : item.endDate;

      const startCol = actualStart.getDay();
      const endCol = actualEnd.getDay();

      // 找到第一个不冲突的行
      let rowIndex = 0;
      while (
        occupied.some(
          (o) =>
            o.row === rowIndex &&
            !(o.endCol < startCol || o.startCol > endCol)
        )
      ) {
        rowIndex++;
      }

      if (!rows[rowIndex]) {
        rows[rowIndex] = [];
      }
      rows[rowIndex].push(item);
      occupied.push({ startCol, endCol, row: rowIndex });
    }

    return rows.length > 0 ? rows : [[]];
  }

  /**
   * 渲染周视图甘特条
   */
  private renderWeekGanttBar(
    container: HTMLElement,
    item: TimeViewItem,
    weekStart: Date,
    row: number
  ): void {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // 计算在当前周的位置
    const actualStart = item.startDate < weekStart ? weekStart : item.startDate;
    const actualEnd = item.endDate > weekEnd ? weekEnd : item.endDate;

    const startCol = actualStart.getDay() + 1; // grid-column 从1开始
    const endCol = actualEnd.getDay() + 1;
    const span = endCol - startCol + 1;

    const bar = container.createDiv('pm-timeview-gantt-bar');
    bar.style.gridColumn = `${startCol} / span ${span}`;
    bar.style.gridRow = String(row);
    bar.style.margin = '2px 4px';

    // 优先级颜色
    const priorityColor = getPriorityColor(item.entity.priority);

    // 里程碑特殊样式
    if (item.isMilestone) {
      bar.classList.add('pm-timeview-gantt-bar--milestone');
      bar.style.background = `linear-gradient(90deg, ${priorityColor.text}, ${priorityColor.bg})`;
      bar.style.color = '#fff';
    } else {
      // 进度条效果
      if (item.progress > 0) {
        bar.style.background = `linear-gradient(90deg, ${priorityColor.text} ${item.progress}%, ${priorityColor.bg} ${item.progress}%)`;
      } else {
        bar.style.background = priorityColor.bg;
      }
      bar.style.color = priorityColor.text;
    }

    bar.style.borderRadius = '4px';
    bar.style.padding = '6px 10px';
    bar.style.fontSize = '12px';
    bar.style.fontWeight = item.isMilestone ? '600' : '500';
    bar.style.whiteSpace = 'nowrap';
    bar.style.overflow = 'hidden';
    bar.style.textOverflow = 'ellipsis';
    bar.style.cursor = 'pointer';
    bar.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    bar.style.transition = 'all 0.15s ease';
    bar.style.display = 'flex';
    bar.style.alignItems = 'center';
    bar.style.gap = '6px';

    // 内容
    if (item.isMilestone) {
      bar.textContent = '🔷 ';
    }
    bar.appendChild(document.createTextNode(item.entity.name));

    // 悬停效果
    bar.addEventListener('mouseenter', () => {
      bar.style.transform = 'translateY(-2px)';
      bar.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      bar.style.zIndex = '10';
    });
    bar.addEventListener('mouseleave', () => {
      bar.style.transform = 'translateY(0)';
      bar.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      bar.style.zIndex = 'auto';
    });

    // 点击打开
    bar.addEventListener('click', () => {
      this.actionService.openEntity(item.entityType, item.entity.id);
    });
  }

  /**
   * 检查日期范围是否重叠
   */
  private isDateRangeOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 <= end2 && end1 >= start2;
  }

  /**
   * 渲染月视图 - 简化版，每天显示任务列表
   */
  private renderMonthView(container: HTMLElement, items: TimeViewItem[]): void {
    container.empty();
    container.addClass('pm-timeview-month');

    const { currentDate } = this.state;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 星期标题
    const weekdays = container.createDiv('pm-timeview-month-weekdays');
    const weekNames = ['日', '一', '二', '三', '四', '五', '六'];
    weekNames.forEach((name) => {
      weekdays.createDiv({ cls: 'pm-timeview-month-weekday', text: name });
    });

    // 日期网格
    const grid = container.createDiv('pm-timeview-month-grid');

    // 计算日历布局
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // 上月的日期
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayCell = grid.createDiv('pm-timeview-month-day pm-timeview-month-day--other');
      dayCell.createDiv({
        cls: 'pm-timeview-month-day-number',
        text: String(prevMonthLastDay - i),
      });
    }

    // 当月的日期
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const dayCell = grid.createDiv('pm-timeview-month-day');

      // 标记今天
      if (this.isSameDay(dayDate, today)) {
        dayCell.classList.add('pm-timeview-today');
      }

      dayCell.createDiv({
        cls: 'pm-timeview-month-day-number',
        text: String(day),
      });

      // 找出在这一天有显示的任务（跨天任务也在每一天显示）
      const dayItems = items.filter((item) =>
        this.isDateInRange(dayDate, item.startDate, item.endDate)
      );

      if (dayItems.length > 0) {
        const list = dayCell.createDiv('pm-timeview-month-list');
        dayItems.forEach((item) => {
          // 只在任务开始日期显示跨天条标记
          const isStartDay = this.isSameDay(dayDate, item.startDate);
          this.renderMonthItem(list, item, isStartDay);
        });
      }
    }

    // 下月的日期（填充网格）
    const totalCells = startOffset + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= remainingCells; day++) {
      const dayCell = grid.createDiv('pm-timeview-month-day pm-timeview-month-day--other');
      dayCell.createDiv({
        cls: 'pm-timeview-month-day-number',
        text: String(day),
      });
    }
  }

  /**
   * 渲染月视图甘特条
   */
  private renderMonthGanttBar(
    container: HTMLElement,
    item: TimeViewItem,
    weekStart: Date,
    weekEnd: Date,
    weekIndex: number,
    rowIndex: number,
    month: number
  ): void {
    // 计算在当前周的位置
    const actualStart = item.startDate < weekStart ? weekStart : item.startDate;
    const actualEnd = item.endDate > weekEnd ? weekEnd : item.endDate;

    const startCol = actualStart.getDay() + 1;
    const endCol = actualEnd.getDay() + 1;
    const span = endCol - startCol + 1;

    // 计算网格行位置
    const gridRow = weekIndex * 5 + rowIndex + 2; // +2 是因为日期背景占一行

    const bar = container.createDiv('pm-timeview-gantt-bar');
    bar.style.gridColumn = `${startCol} / span ${span}`;
    bar.style.gridRow = String(gridRow);
    bar.style.margin = '1px 2px';
    bar.style.height = '22px';

    // 优先级颜色
    const priorityColor = getPriorityColor(item.entity.priority);

    if (item.isMilestone) {
      bar.classList.add('pm-timeview-gantt-bar--milestone');
      bar.style.background = `linear-gradient(90deg, ${priorityColor.text}, ${priorityColor.bg})`;
      bar.style.color = '#fff';
    } else {
      if (item.progress > 0) {
        bar.style.background = `linear-gradient(90deg, ${priorityColor.text} ${item.progress}%, ${priorityColor.bg} ${item.progress}%)`;
      } else {
        bar.style.background = priorityColor.bg;
      }
      bar.style.color = priorityColor.text;
    }

    bar.style.borderRadius = '3px';
    bar.style.padding = '2px 6px';
    bar.style.fontSize = '10px';
    bar.style.fontWeight = item.isMilestone ? '600' : '500';
    bar.style.whiteSpace = 'nowrap';
    bar.style.overflow = 'hidden';
    bar.style.textOverflow = 'ellipsis';
    bar.style.cursor = 'pointer';
    bar.style.display = 'flex';
    bar.style.alignItems = 'center';
    bar.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';

    // 内容
    if (item.isMilestone) {
      bar.textContent = '🔷 ';
    }
    bar.appendChild(document.createTextNode(item.entity.name));

    // 悬停效果
    bar.addEventListener('mouseenter', () => {
      bar.style.transform = 'translateY(-1px)';
      bar.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
      bar.style.zIndex = '10';
    });
    bar.addEventListener('mouseleave', () => {
      bar.style.transform = 'translateY(0)';
      bar.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
      bar.style.zIndex = 'auto';
    });

    // 点击打开
    bar.addEventListener('click', () => {
      this.actionService.openEntity(item.entityType, item.entity.id);
    });
  }

  /**
   * 渲染跨天任务条
   */
  private renderMultiDayBar(
    container: HTMLElement,
    item: TimeViewItem,
    startDate: Date
  ): void {
    const bar = container.createDiv('pm-timeview-month-bar');

    const priorityColor = getPriorityColor(item.entity.priority);
    bar.style.background = priorityColor.bg;

    if (item.isMilestone) {
      bar.classList.add('pm-timeview-month-bar--milestone');
    }

    bar.textContent = item.entity.name;
    bar.title = `${item.entity.name} (${DateFormat.short(item.startDate)} - ${DateFormat.short(item.endDate)})`;

    bar.addEventListener('click', () => {
      this.actionService.openEntity(item.entityType, item.entity.id);
    });
  }

  /**
   * 渲染月视图中的单个任务
   */
  private renderMonthItem(container: HTMLElement, item: TimeViewItem, isStartDay: boolean = false): void {
    const itemEl = container.createDiv('pm-timeview-month-item');

    if (item.isMilestone) {
      itemEl.classList.add('pm-timeview-month-item--milestone');
    }

    // 优先级颜色 - 如果是跨天任务的开始，使用更醒目的颜色
    const priorityColor = getPriorityColor(item.entity.priority);
    const isMultiDay = item.startDate.getTime() !== item.endDate.getTime();
    
    if (isMultiDay && isStartDay) {
      // 跨天任务的开始日期，使用渐变背景
      itemEl.style.background = `linear-gradient(90deg, ${priorityColor.bg}, transparent)`;
      itemEl.style.borderLeft = `4px solid ${priorityColor.text}`;
    } else {
      itemEl.style.borderLeft = `3px solid ${priorityColor.bg}`;
    }

    // 标题
    const title = itemEl.createDiv('pm-timeview-month-item-title');
    
    // 跨天标记
    if (isMultiDay && isStartDay) {
      title.createSpan({
        cls: 'pm-timeview-month-item-range',
        text: '[→] ',
      }).style.cssText = 'color: var(--text-muted); font-size: 10px;';
    }
    
    title.appendChild(document.createTextNode(item.entity.name));

    // 里程碑标记
    if (item.isMilestone) {
      title.createSpan({
        cls: 'pm-timeview-month-item-milestone-icon',
        text: ' 🔷',
      });
    }

    // 进度显示
    if (!item.isMilestone && item.progress > 0) {
      const progress = itemEl.createDiv('pm-timeview-month-item-progress');
      progress.style.cssText = `
        height: 2px;
        background: var(--background-modifier-border);
        border-radius: 1px;
        margin-top: 2px;
        overflow: hidden;
      `;
      const fill = progress.createDiv();
      fill.style.cssText = `
        height: 100%;
        width: ${item.progress}%;
        background: ${priorityColor.text};
      `;
    }

    itemEl.addEventListener('click', () => {
      this.actionService.openEntity(item.entityType, item.entity.id);
    });
  }

  /**
   * 渲染季度视图
   */
  private renderQuarterView(container: HTMLElement, items: TimeViewItem[]): void {
    container.empty();
    container.createDiv({
      cls: 'pm-timeview-placeholder',
      text: '季度视图开发中...',
    });
  }

  /**
   * 获取周开始日期（周日）
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  /**
   * 判断是否为同一天
   */
  private isSameDay(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  /**
   * 判断日期是否在范围内
   */
  private isDateInRange(date: Date, start: Date, end: Date): boolean {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return d >= s && d <= e;
  }
}
