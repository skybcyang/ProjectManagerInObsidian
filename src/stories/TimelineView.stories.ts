import type { Meta, StoryObj } from '@storybook/html';
import { createMockFeature } from '../../tests/setup';

interface TimelineViewProps {
  entities: any[];
  title: string;
}

const createTimelineView = ({ entities, title }: TimelineViewProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view pm-timeline-view';
  container.style.cssText = 'padding: 20px; background: #1e1e1e; min-height: 100vh;';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'pm-view-toolbar';
  toolbar.style.marginBottom = '16px';

  const titleEl = document.createElement('div');
  titleEl.className = 'pm-view-title';
  titleEl.textContent = title;
  toolbar.appendChild(titleEl);

  container.appendChild(toolbar);

  // Calculate date range
  const allDates: number[] = [];
  entities.forEach((e) => {
    if (e.endDate) {
      const endTime = new Date(e.endDate).getTime();
      if (!isNaN(endTime)) allDates.push(endTime);
    }
    if (e.startDate) {
      const startTime = new Date(e.startDate).getTime();
      if (!isNaN(startTime)) allDates.push(startTime);
    }
  });

  if (allDates.length === 0) {
    container.innerHTML += '<div style="text-align: center; padding: 40px; color: var(--text-muted);">没有日期数据</div>';
    return container;
  }

  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const buffer = (maxDate - minDate) * 0.1;
  const chartStart = minDate - buffer;
  const chartEnd = maxDate + buffer;
  const chartRange = chartEnd - chartStart;

  // Gantt container
  const ganttContainer = document.createElement('div');
  ganttContainer.className = 'pm-timeline-gantt';
  ganttContainer.style.cssText = `
    width: 100%;
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--background-primary);
  `;

  // Header
  const header = document.createElement('div');
  header.className = 'pm-gantt-header';
  header.style.cssText = `
    display: flex;
    height: 40px;
    background: var(--background-secondary);
    border-bottom: 1px solid var(--background-modifier-border);
  `;

  const timeRange = chartEnd - chartStart;
  const days = timeRange / (24 * 60 * 60 * 1000);
  const tickCount = days < 30 ? Math.ceil(days / 3) : 6;
  const tickInterval = timeRange / tickCount;

  // Name column header
  const nameCol = document.createElement('div');
  nameCol.className = 'pm-gantt-header-name';
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
  header.appendChild(nameCol);

  // Timeline header
  const timelineHeader = document.createElement('div');
  timelineHeader.className = 'pm-gantt-header-timeline';
  timelineHeader.style.cssText = 'flex: 1; position: relative;';

  for (let i = 0; i <= tickCount; i++) {
    const tickTime = chartStart + tickInterval * i;
    const tick = document.createElement('div');
    tick.className = 'pm-gantt-tick';
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
    timelineHeader.appendChild(tick);

    // Grid line
    if (i > 0) {
      const gridLine = document.createElement('div');
      gridLine.className = 'pm-gantt-grid-line';
      gridLine.style.cssText = `
        position: absolute;
        top: 0;
        bottom: 0;
        left: ${(i / tickCount) * 100}%;
        width: 1px;
        background: var(--background-modifier-border);
        opacity: 0.3;
      `;
      timelineHeader.appendChild(gridLine);
    }
  }

  header.appendChild(timelineHeader);
  ganttContainer.appendChild(header);

  // Body
  const ganttBody = document.createElement('div');
  ganttBody.className = 'pm-gantt-body';
  ganttBody.style.cssText = 'display: flex; flex-direction: column;';

  entities.forEach((entity) => {
    const row = document.createElement('div');
    row.className = 'pm-gantt-row';
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

    // Name
    const nameCol = document.createElement('div');
    nameCol.className = 'pm-gantt-name';
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
    row.appendChild(nameCol);

    // Timeline
    const timelineCol = document.createElement('div');
    timelineCol.className = 'pm-gantt-timeline';
    timelineCol.style.cssText = 'flex: 1; position: relative;';

    // Calculate position
    const entityStart = entity.startDate
      ? new Date(entity.startDate).getTime()
      : new Date(entity.endDate).getTime();
    const entityEnd = new Date(entity.endDate).getTime();

    if (!isNaN(entityStart) && !isNaN(entityEnd)) {
      const startPercent = ((entityStart - chartStart) / chartRange) * 100;
      const endPercent = ((entityEnd - chartStart) / chartRange) * 100;
      const widthPercent = Math.max(1, endPercent - startPercent);

      // Bar color
      let barColor = '#3b82f6';
      if (entity.priority) {
        const colors: Record<string, string> = {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#f59e0b',
          low: '#22c55e',
        };
        barColor = colors[entity.priority] || barColor;
      }

      // Bar
      const bar = document.createElement('div');
      bar.className = 'pm-gantt-bar';
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

      // Progress
      if (entity.progress > 0) {
        const fill = document.createElement('div');
        fill.className = 'pm-gantt-progress';
        fill.style.cssText = `
          height: 100%;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 4px 0 0 4px;
          width: ${entity.progress}%;
        `;
        bar.appendChild(fill);
      }

      timelineCol.appendChild(bar);
    }

    row.appendChild(timelineCol);
    ganttBody.appendChild(row);
  });

  ganttContainer.appendChild(ganttBody);
  container.appendChild(ganttContainer);

  return container;
};

const meta: Meta<TimelineViewProps> = {
  title: 'Views/TimelineView',
  tags: ['autodocs'],
  render: (args) => createTimelineView(args),
};

export default meta;

type Story = StoryObj<TimelineViewProps>;

export const Default: Story = {
  args: {
    title: '项目时间线',
    entities: [
      createMockFeature({ name: '需求分析', startDate: '2024-04-01', endDate: '2024-04-05', priority: 'high', progress: 100 }),
      createMockFeature({ name: '技术设计', startDate: '2024-04-03', endDate: '2024-04-08', priority: 'high', progress: 100 }),
      createMockFeature({ name: '后端开发', startDate: '2024-04-08', endDate: '2024-04-20', priority: 'critical', progress: 75 }),
      createMockFeature({ name: '前端开发', startDate: '2024-04-10', endDate: '2024-04-22', priority: 'high', progress: 60 }),
      createMockFeature({ name: '接口联调', startDate: '2024-04-18', endDate: '2024-04-25', priority: 'medium', progress: 30 }),
      createMockFeature({ name: '系统测试', startDate: '2024-04-23', endDate: '2024-04-28', priority: 'high', progress: 0 }),
      createMockFeature({ name: '上线部署', startDate: '2024-04-28', endDate: '2024-04-30', priority: 'critical', progress: 0 }),
    ],
  },
};

export const ShortTimeline: Story = {
  args: {
    title: '短期冲刺',
    entities: [
      createMockFeature({ name: '任务1', startDate: '2024-04-01', endDate: '2024-04-02', priority: 'high', progress: 100 }),
      createMockFeature({ name: '任务2', startDate: '2024-04-02', endDate: '2024-04-04', priority: 'medium', progress: 80 }),
      createMockFeature({ name: '任务3', startDate: '2024-04-03', endDate: '2024-04-05', priority: 'critical', progress: 50 }),
    ],
  },
};

export const LongTimeline: Story = {
  args: {
    title: '长期规划',
    entities: [
      createMockFeature({ name: 'Q1 规划', startDate: '2024-01-01', endDate: '2024-03-31', priority: 'high', progress: 100 }),
      createMockFeature({ name: 'Q2 开发', startDate: '2024-04-01', endDate: '2024-06-30', priority: 'critical', progress: 60 }),
      createMockFeature({ name: 'Q3 测试', startDate: '2024-07-01', endDate: '2024-09-30', priority: 'high', progress: 0 }),
      createMockFeature({ name: 'Q4 上线', startDate: '2024-10-01', endDate: '2024-12-31', priority: 'critical', progress: 0 }),
    ],
  },
};

export const Empty: Story = {
  args: {
    title: '空时间线',
    entities: [],
  },
};
