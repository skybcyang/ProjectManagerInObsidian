import type { Meta, StoryObj } from '@storybook/html';
import { createMockFeature } from '../../tests/setup';

interface TimeViewProps {
  title: string;
  mode: 'week' | 'month' | 'quarter';
  items: Array<{
    name: string;
    startDate?: string;
    endDate?: string;
    priority?: string;
    progress?: number;
    isMilestone?: boolean;
  }>;
}

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

const createTimeView = ({ title, mode, items }: TimeViewProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view pm-timeview';
  container.style.cssText = 'padding: 20px; background: #1e1e1e; min-height: 100vh;';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'pm-timeview-toolbar';
  toolbar.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  `;

  // Navigation group
  const navGroup = document.createElement('div');
  navGroup.className = 'pm-timeview-nav';
  navGroup.style.cssText = 'display: flex; gap: 8px;';

  ['◀', '今天', '▶'].forEach((label) => {
    const btn = document.createElement('button');
    btn.className = label === '今天' ? 'pm-timeview-today-btn' : 'pm-timeview-nav-btn';
    btn.textContent = label;
    btn.style.cssText = `
      padding: 6px 12px;
      border: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    `;
    navGroup.appendChild(btn);
  });
  toolbar.appendChild(navGroup);

  // Date title
  const dateTitle = document.createElement('div');
  dateTitle.className = 'pm-timeview-date-title';
  const today = new Date();
  if (mode === 'week') {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    dateTitle.textContent = `${today.getFullYear()}年${today.getMonth() + 1}月${weekStart.getDate()}-${weekEnd.getDate()}日`;
  } else if (mode === 'month') {
    dateTitle.textContent = `${today.getFullYear()}年${today.getMonth() + 1}月`;
  } else {
    const quarter = Math.floor(today.getMonth() / 3) + 1;
    dateTitle.textContent = `${today.getFullYear()}年 Q${quarter}`;
  }
  dateTitle.style.cssText = 'font-size: 16px; font-weight: 600;';
  toolbar.appendChild(dateTitle);

  // Mode select
  const modeGroup = document.createElement('div');
  modeGroup.className = 'pm-timeview-mode';
  const modeSelect = document.createElement('select');
  modeSelect.className = 'pm-timeview-mode-select';
  ['week', 'month', 'quarter'].forEach((m) => {
    const option = document.createElement('option');
    option.value = m;
    option.textContent = m === 'week' ? '周视图' : m === 'month' ? '月视图' : '季度视图';
    if (m === mode) option.selected = true;
    modeSelect.appendChild(option);
  });
  modeSelect.style.cssText = `
    padding: 6px 12px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-primary);
    border-radius: 6px;
    font-size: 13px;
  `;
  modeGroup.appendChild(modeSelect);
  toolbar.appendChild(modeGroup);

  // Stats
  const statsGroup = document.createElement('div');
  statsGroup.className = 'pm-timeview-stats';
  statsGroup.textContent = `特性: ${items.length}`;
  statsGroup.style.cssText = 'font-size: 13px; color: var(--text-muted);';
  toolbar.appendChild(statsGroup);

  container.appendChild(toolbar);

  // Content
  const contentArea = document.createElement('div');
  contentArea.className = 'pm-timeview-content';

  if (items.length === 0) {
    contentArea.innerHTML = `
      <div style="text-align: center; padding: 60px; color: var(--text-muted);">
        <div style="font-size: 48px; margin-bottom: 16px;">📅</div>
        <div>暂无数据</div>
      </div>
    `;
    container.appendChild(contentArea);
    return container;
  }

  if (mode === 'week') {
    renderWeekView(contentArea, items);
  } else if (mode === 'month') {
    renderMonthView(contentArea, items);
  } else {
    renderQuarterView(contentArea, items);
  }

  container.appendChild(contentArea);
  return container;
};

function renderWeekView(container: HTMLElement, items: any[]) {
  container.className = 'pm-timeview-week';
  container.style.cssText = `
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    overflow: hidden;
  `;

  // Header row
  const headerRow = document.createElement('div');
  headerRow.className = 'pm-timeview-week-header';
  headerRow.style.cssText = `
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: var(--background-secondary);
    border-bottom: 1px solid var(--background-modifier-border);
  `;

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    const isToday = dayDate.toDateString() === today.toDateString();

    const cell = document.createElement('div');
    cell.className = 'pm-timeview-week-header-cell' + (isToday ? ' pm-timeview-today' : '');
    cell.style.cssText = `
      padding: 12px;
      text-align: center;
      ${isToday ? 'background: var(--background-modifier-accent);' : ''}
    `;

    const dayName = document.createElement('div');
    dayName.className = 'pm-timeview-week-day-name';
    dayName.textContent = weekDays[i];
    dayName.style.cssText = 'font-size: 12px; color: var(--text-muted); margin-bottom: 4px;';
    cell.appendChild(dayName);

    const dayNumber = document.createElement('div');
    dayNumber.className = 'pm-timeview-week-day-number';
    dayNumber.textContent = String(dayDate.getDate());
    dayNumber.style.cssText = `
      font-size: 18px;
      font-weight: 600;
      ${isToday ? 'color: var(--interactive-accent);' : ''}
    `;
    cell.appendChild(dayNumber);

    headerRow.appendChild(cell);
  }

  container.appendChild(headerRow);

  // Gantt grid
  const ganttContainer = document.createElement('div');
  ganttContainer.className = 'pm-timeview-week-gantt';
  ganttContainer.style.cssText = `
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    padding: 16px;
    min-height: 300px;
  `;

  // Calculate rows
  const rows: typeof items[] = [];
  const occupied: { startCol: number; endCol: number; row: number }[] = [];

  const sortedItems = [...items].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  sortedItems.forEach((item) => {
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);
    const actualStart = startDate < weekStart ? weekStart : startDate;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const actualEnd = endDate > weekEnd ? weekEnd : endDate;

    const startCol = actualStart.getDay();
    const endCol = actualEnd.getDay();

    let rowIndex = 0;
    while (occupied.some((o) => o.row === rowIndex && !(o.endCol < startCol || o.startCol > endCol))) {
      rowIndex++;
    }

    if (!rows[rowIndex]) rows[rowIndex] = [];
    rows[rowIndex].push(item);
    occupied.push({ startCol, endCol, row: rowIndex });
  });

  // Render bars
  rows.forEach((rowItems) => {
    rowItems.forEach((item) => {
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate);
      const actualStart = startDate < weekStart ? weekStart : startDate;
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const actualEnd = endDate > weekEnd ? weekEnd : endDate;

      const startCol = actualStart.getDay() + 1;
      const endCol = actualEnd.getDay() + 1;
      const span = endCol - startCol + 1;

      const bar = document.createElement('div');
      bar.className = 'pm-timeview-gantt-bar' + (item.isMilestone ? ' pm-timeview-gantt-bar--milestone' : '');

      const colors: Record<string, string> = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#eab308',
        low: '#22c55e',
      };
      const color = colors[item.priority || 'medium'] || '#3b82f6';

      bar.style.cssText = `
        grid-column: ${startCol} / span ${span};
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
        background: ${color}30;
        color: ${color};
        border-left: 3px solid ${color};
      `;
      bar.textContent = (item.isMilestone ? '🔷 ' : '') + item.name;

      ganttContainer.appendChild(bar);
    });
  });

  container.appendChild(ganttContainer);
}

function renderMonthView(container: HTMLElement, items: any[]) {
  container.className = 'pm-timeview-month';

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Weekday headers
  const weekdays = document.createElement('div');
  weekdays.className = 'pm-timeview-month-weekdays';
  weekdays.style.cssText = `
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 8px;
  `;

  weekDays.forEach((name) => {
    const day = document.createElement('div');
    day.className = 'pm-timeview-month-weekday';
    day.textContent = name;
    day.style.cssText = 'text-align: center; font-size: 12px; color: var(--text-muted); padding: 8px;';
    weekdays.appendChild(day);
  });

  container.appendChild(weekdays);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'pm-timeview-month-grid';
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  `;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  // Previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const cell = document.createElement('div');
    cell.className = 'pm-timeview-month-day pm-timeview-month-day--other';
    cell.style.cssText = `
      min-height: 100px;
      padding: 8px;
      background: var(--background-secondary);
      border-radius: 6px;
      opacity: 0.5;
    `;
    cell.innerHTML = `<div class="pm-timeview-month-day-number" style="font-size: 12px; color: var(--text-muted);">${prevMonthLastDay - i}</div>`;
    grid.appendChild(cell);
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month, day);
    const isToday = dayDate.toDateString() === today.toDateString();

    const cell = document.createElement('div');
    cell.className = 'pm-timeview-month-day' + (isToday ? ' pm-timeview-today' : '');
    cell.style.cssText = `
      min-height: 100px;
      padding: 8px;
      background: var(--background-primary);
      border-radius: 6px;
      border: 1px solid ${isToday ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'};
    `;

    const dayNumber = document.createElement('div');
    dayNumber.className = 'pm-timeview-month-day-number';
    dayNumber.textContent = String(day);
    dayNumber.style.cssText = `
      font-size: 12px;
      margin-bottom: 4px;
      ${isToday ? 'color: var(--interactive-accent); font-weight: 600;' : 'color: var(--text-muted);'}
    `;
    cell.appendChild(dayNumber);

    // Find items for this day
    const dayItems = items.filter((item) => {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      return dayDate >= start && dayDate <= end;
    });

    if (dayItems.length > 0) {
      const list = document.createElement('div');
      list.className = 'pm-timeview-month-list';
      list.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';

      dayItems.forEach((item) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'pm-timeview-month-item' + (item.isMilestone ? ' pm-timeview-month-item--milestone' : '');

        const colors: Record<string, string> = {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#eab308',
          low: '#22c55e',
        };
        const color = colors[item.priority || 'medium'] || '#3b82f6';

        itemEl.style.cssText = `
          font-size: 10px;
          padding: 2px 4px;
          border-radius: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          background: ${color}20;
          color: ${color};
          cursor: pointer;
        `;
        itemEl.textContent = (item.isMilestone ? '🔷 ' : '') + item.name;

        list.appendChild(itemEl);
      });

      cell.appendChild(list);
    }

    grid.appendChild(cell);
  }

  // Next month days
  const totalCells = startOffset + daysInMonth;
  const remainingCells = (7 - (totalCells % 7)) % 7;
  for (let day = 1; day <= remainingCells; day++) {
    const cell = document.createElement('div');
    cell.className = 'pm-timeview-month-day pm-timeview-month-day--other';
    cell.style.cssText = `
      min-height: 100px;
      padding: 8px;
      background: var(--background-secondary);
      border-radius: 6px;
      opacity: 0.5;
    `;
    cell.innerHTML = `<div class="pm-timeview-month-day-number" style="font-size: 12px; color: var(--text-muted);">${day}</div>`;
    grid.appendChild(cell);
  }

  container.appendChild(grid);
}

function renderQuarterView(container: HTMLElement, items: any[]) {
  container.className = 'pm-timeview-quarter';
  container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">季度视图 - 简化展示</div>';
}

const meta: Meta<TimeViewProps> = {
  title: 'Views/TimeView',
  tags: ['autodocs'],
  render: (args) => createTimeView(args),
  argTypes: {
    mode: { control: 'select', options: ['week', 'month', 'quarter'] },
  },
};

export default meta;

type Story = StoryObj<TimeViewProps>;

export const WeekView: Story = {
  args: {
    title: '本周计划',
    mode: 'week',
    items: [
      createMockFeature({ name: '需求评审', startDate: '2024-04-15', endDate: '2024-04-15', priority: 'high', progress: 100 }),
      createMockFeature({ name: '技术设计', startDate: '2024-04-16', endDate: '2024-04-17', priority: 'high', progress: 80 }),
      createMockFeature({ name: '编码实现', startDate: '2024-04-17', endDate: '2024-04-19', priority: 'critical', progress: 50 }),
      createMockFeature({ name: '代码审查', startDate: '2024-04-19', endDate: '2024-04-19', priority: 'medium', progress: 0 }),
    ],
  },
};

export const MonthView: Story = {
  args: {
    title: '本月计划',
    mode: 'month',
    items: [
      createMockFeature({ name: 'Sprint 1', startDate: '2024-04-01', endDate: '2024-04-14', priority: 'high', progress: 100 }),
      createMockFeature({ name: 'Sprint 2', startDate: '2024-04-15', endDate: '2024-04-28', priority: 'critical', progress: 60 }),
      createMockFeature({ name: 'Release', startDate: '2024-04-29', endDate: '2024-04-30', priority: 'critical', isMilestone: true }),
    ],
  },
};

export const WithMilestones: Story = {
  args: {
    title: '里程碑视图',
    mode: 'month',
    items: [
      createMockFeature({ name: '项目启动', startDate: '2024-04-01', endDate: '2024-04-01', priority: 'high', isMilestone: true }),
      createMockFeature({ name: '第一阶段', startDate: '2024-04-01', endDate: '2024-04-10', priority: 'medium', progress: 100 }),
      createMockFeature({ name: '中期评审', startDate: '2024-04-15', endDate: '2024-04-15', priority: 'high', isMilestone: true }),
      createMockFeature({ name: '第二阶段', startDate: '2024-04-11', endDate: '2024-04-25', priority: 'high', progress: 50 }),
      createMockFeature({ name: '项目上线', startDate: '2024-04-30', endDate: '2024-04-30', priority: 'critical', isMilestone: true }),
    ],
  },
};

export const Empty: Story = {
  args: {
    title: '空日历',
    mode: 'month',
    items: [],
  },
};
