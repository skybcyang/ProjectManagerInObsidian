import type { Meta, StoryObj } from '@storybook/html';
import { createMockFeature, createMockProject } from '../../tests/setup';

interface TimeViewProps {
  groupBy: 'owner' | 'project';
  mode: 'week' | 'month' | 'quarter';
  expandedProjects?: string[];
}

const priorityColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#22c55e',
};

const mockItems = [
  { ...createMockFeature({ name: '需求分析', status: 'completed', priority: 'high', progress: 100, owner: '张三', startDate: '2024-04-01', endDate: '2024-04-05' }), projectId: 'proj-001' },
  { ...createMockFeature({ name: '数据库设计', status: 'in-progress', priority: 'critical', progress: 75, owner: '张三', startDate: '2024-04-06', endDate: '2024-04-12' }), projectId: 'proj-001' },
  { ...createMockFeature({ name: 'API 开发', status: 'in-progress', priority: 'high', progress: 60, owner: '李四', startDate: '2024-04-08', endDate: '2024-04-18' }), projectId: 'proj-001' },
  { ...createMockFeature({ name: 'UI 设计', status: 'testing', priority: 'medium', progress: 90, owner: '王五', startDate: '2024-04-10', endDate: '2024-04-16' }), projectId: 'proj-002' },
  { ...createMockFeature({ name: '前端开发', status: 'todo', priority: 'high', progress: 0, owner: '李四', startDate: '2024-04-15', endDate: '2024-04-25' }), projectId: 'proj-002' },
  { ...createMockFeature({ name: '集成测试', status: 'backlog', priority: 'medium', progress: 0, owner: '王五', startDate: '2024-04-20', endDate: '2024-04-28' }), projectId: 'proj-002' },
];

const mockProjects = [
  createMockProject({ id: 'proj-001', name: '电商平台', status: 'in-progress', priority: 'critical', owner: '产品组', startDate: '2024-04-01', endDate: '2024-04-30' }),
  createMockProject({ id: 'proj-002', name: 'CRM系统', status: 'in-progress', priority: 'high', owner: '张三', startDate: '2024-04-10', endDate: '2024-04-28' }),
];

const rangeStart = new Date('2024-04-01');
const rangeEnd = new Date('2024-04-30');
const range = rangeEnd.getTime() - rangeStart.getTime();

function getLeftPercent(start: string): number {
  const t = new Date(start).getTime();
  return Math.max(0, Math.min(99, ((t - rangeStart.getTime()) / range) * 100));
}

function getWidthPercent(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.min(100, ((e - s) / range) * 100));
}

function createGanttBar(item: any): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'pm-timeview-gantt-bar';
  const color = priorityColors[item.priority || 'medium'] || '#3b82f6';
  const progress = item.progress || 0;
  const left = getLeftPercent(item.startDate || item.endDate);
  const width = getWidthPercent(item.startDate || item.endDate, item.endDate);

  bar.style.cssText = `
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: ${left}%;
    width: ${width}%;
    height: 22px;
    border-radius: 4px;
    padding: 0 8px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    cursor: pointer;
    z-index: 2;
    min-width: 2px;
    background: ${progress > 0 ? `linear-gradient(90deg, ${color} ${progress}%, ${color}80 ${progress}%)` : color + '80'};
    color: ${color};
    border: 1px solid ${color}40;
  `;

  const text = document.createElement('span');
  text.className = 'pm-timeview-gantt-bar-text';
  text.textContent = item.name;
  text.style.cssText = 'overflow: hidden; text-overflow: ellipsis; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.3);';
  bar.appendChild(text);

  return bar;
}

function createToolbar(groupBy: 'owner' | 'project', mode: string): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.className = 'pm-timeview-toolbar';
  toolbar.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  `;

  // Nav
  const nav = document.createElement('div');
  nav.className = 'pm-timeview-nav';
  nav.style.cssText = 'display: flex; gap: 6px;';
  ['◀', '今天', '▶'].forEach((label) => {
    const btn = document.createElement('button');
    btn.className = label === '今天' ? 'pm-timeview-today-btn' : 'pm-timeview-nav-btn';
    btn.textContent = label;
    btn.style.cssText = 'padding: 4px 10px; border: 1px solid var(--background-modifier-border); border-radius: 6px; background: var(--background-primary); color: var(--text-normal); font-size: 13px; cursor: pointer;';
    nav.appendChild(btn);
  });
  toolbar.appendChild(nav);

  // Title
  const title = document.createElement('div');
  title.className = 'pm-timeview-date-title';
  title.textContent = '2024年4月';
  title.style.cssText = 'font-size: 15px; font-weight: 600; flex: 1; text-align: center;';
  toolbar.appendChild(title);

  // Mode select
  const modeGroup = document.createElement('div');
  modeGroup.className = 'pm-timeview-mode';
  const select = document.createElement('select');
  select.className = 'pm-timeview-mode-select';
  select.style.cssText = 'padding: 4px 8px; border: 1px solid var(--background-modifier-border); border-radius: 6px; background: var(--background-primary); color: var(--text-normal); font-size: 13px;';
  ['周', '月', '季度'].forEach((m, i) => {
    const opt = document.createElement('option');
    opt.textContent = m;
    if ((['week', 'month', 'quarter'][i]) === mode) opt.selected = true;
    select.appendChild(opt);
  });
  modeGroup.appendChild(select);
  toolbar.appendChild(modeGroup);

  // Group toggle
  const toggle = document.createElement('div');
  toggle.className = 'pm-timeview-group-toggle';
  toggle.style.cssText = 'display: flex; border: 1px solid var(--background-modifier-border); border-radius: 6px; overflow: hidden;';
  ['按负责人', '按项目'].forEach((label, i) => {
    const btn = document.createElement('button');
    const active = (['owner', 'project'][i]) === groupBy;
    btn.className = `pm-timeview-group-toggle__btn ${active ? 'active' : ''}`;
    btn.textContent = label;
    btn.style.cssText = `
      padding: 4px 12px;
      border: none;
      background: ${active ? 'var(--interactive-accent)' : 'var(--background-primary)'};
      color: ${active ? 'var(--text-on-accent)' : 'var(--text-muted)'};
      font-size: 13px;
      cursor: pointer;
    `;
    toggle.appendChild(btn);
  });
  toolbar.appendChild(toggle);

  // Stats
  const stats = document.createElement('div');
  stats.className = 'pm-timeview-stats';
  stats.textContent = `${mockItems.length} 项`;
  stats.style.cssText = 'font-size: 13px; color: var(--text-muted);';
  toolbar.appendChild(stats);

  return toolbar;
}

function createGanttHeader(): HTMLElement {
  const header = document.createElement('div');
  header.className = 'pm-timeview-gantt-header';
  header.style.cssText = 'display: flex; height: 40px; background: var(--background-secondary); border-bottom: 1px solid var(--background-modifier-border);';

  const nameCol = document.createElement('div');
  nameCol.className = 'pm-timeview-gantt-header-name';
  nameCol.textContent = '项目 / 特性';
  nameCol.style.cssText = 'width: 200px; min-width: 200px; padding: 0 12px; display: flex; align-items: center; font-size: 13px; font-weight: 600; color: var(--text-muted); border-right: 1px solid var(--background-modifier-border);';
  header.appendChild(nameCol);

  const timeline = document.createElement('div');
  timeline.className = 'pm-timeview-gantt-header-timeline';
  timeline.style.cssText = 'flex: 1; position: relative;';

  const ticks = ['4/1', '4/8', '4/15', '4/22', '4/29'];
  ticks.forEach((label, i) => {
    const tick = document.createElement('div');
    tick.className = 'pm-timeview-gantt-tick';
    tick.style.cssText = `position: absolute; bottom: 4px; left: ${(i / (ticks.length - 1)) * 100}%; transform: translateX(-50%); font-size: 11px; color: var(--text-muted);`;
    tick.textContent = label;
    timeline.appendChild(tick);

    const line = document.createElement('div');
    line.className = 'pm-timeview-gantt-grid-line';
    line.style.cssText = `position: absolute; top: 0; bottom: 0; left: ${(i / (ticks.length - 1)) * 100}%; width: 1px; background: var(--background-modifier-border); opacity: 0.3;`;
    timeline.appendChild(line);
  });

  header.appendChild(timeline);
  return header;
}

function createGanttRow(
  label: string,
  item?: any,
  indent: number = 0,
  expandable?: boolean,
  expanded?: boolean
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'pm-timeview-gantt-row';
  if (indent === 0) row.classList.add('pm-timeview-gantt-row--header');
  if (indent > 0) row.classList.add('pm-timeview-gantt-row--sub');
  row.style.cssText = 'display: flex; min-height: 40px; border-bottom: 1px solid var(--background-modifier-border-hover); align-items: center; transition: background 0.1s ease;';

  const nameCol = document.createElement('div');
  nameCol.className = 'pm-timeview-gantt-name';
  nameCol.style.cssText = `width: 200px; min-width: 200px; padding: 0 12px; display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-normal); border-right: 1px solid var(--background-modifier-border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-left: ${12 + indent * 20}px;`;

  if (expandable) {
    const expandBtn = document.createElement('span');
    expandBtn.className = 'pm-timeview-expand-btn';
    expandBtn.textContent = expanded ? '▼' : '▶';
    expandBtn.style.cssText = 'font-size: 11px; color: var(--text-muted); width: 16px; text-align: center;';
    nameCol.appendChild(expandBtn);
  }

  const nameText = document.createElement('span');
  nameText.className = 'pm-timeview-gantt-name-text';
  nameText.textContent = label;
  nameText.style.cssText = 'overflow: hidden; text-overflow: ellipsis;';
  nameCol.appendChild(nameText);
  row.appendChild(nameCol);

  const timelineCol = document.createElement('div');
  timelineCol.className = 'pm-timeview-gantt-timeline';
  timelineCol.style.cssText = 'flex: 1; position: relative; min-height: 40px;';

  if (item) {
    timelineCol.appendChild(createGanttBar(item));
  }

  row.appendChild(timelineCol);
  return row;
}

const createTimeView = ({ groupBy, mode, expandedProjects = [] }: TimeViewProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view pm-timeview';
  container.style.cssText = 'padding: 20px; background: #1e1e1e; min-height: 100vh;';

  container.appendChild(createToolbar(groupBy, mode));

  const gantt = document.createElement('div');
  gantt.className = 'pm-timeview-gantt';
  gantt.style.cssText = 'border: 1px solid var(--background-modifier-border); border-radius: 8px; overflow: hidden; background: var(--background-primary);';

  gantt.appendChild(createGanttHeader());

  const body = document.createElement('div');
  body.className = 'pm-timeview-gantt-body';
  body.style.cssText = 'display: flex; flex-direction: column;';

  if (groupBy === 'owner') {
    const byOwner: Record<string, typeof mockItems> = {};
    mockItems.forEach((item) => {
      const owner = item.owner || '未分配';
      if (!byOwner[owner]) byOwner[owner] = [];
      byOwner[owner].push(item);
    });

    Object.entries(byOwner).forEach(([owner, items]) => {
      body.appendChild(createGanttRow(`@${owner}`, undefined, 0));
      items.forEach((item) => {
        body.appendChild(createGanttRow(item.name, item, 1));
      });
    });
  } else {
    mockProjects.forEach((proj) => {
      const expanded = expandedProjects.includes(proj.id);
      body.appendChild(createGanttRow(proj.name, proj, 0, true, expanded));
      if (expanded) {
        mockItems
          .filter((item) => item.projectId === proj.id)
          .forEach((item) => {
            body.appendChild(createGanttRow(item.name, item, 1));
          });
      }
    });
  }

  gantt.appendChild(body);
  container.appendChild(gantt);
  return container;
};

const meta: Meta<TimeViewProps> = {
  title: 'Views/TimeView',
  tags: ['autodocs'],
  render: (args) => createTimeView(args),
  argTypes: {
    groupBy: { control: 'select', options: ['owner', 'project'] },
    mode: { control: 'select', options: ['week', 'month', 'quarter'] },
  },
};

export default meta;

type Story = StoryObj<TimeViewProps>;

export const ByOwner: Story = {
  args: {
    groupBy: 'owner',
    mode: 'month',
    expandedProjects: [],
  },
};

export const ByProjectExpanded: Story = {
  args: {
    groupBy: 'project',
    mode: 'month',
    expandedProjects: ['proj-001', 'proj-002'],
  },
};

export const ByProjectCollapsed: Story = {
  args: {
    groupBy: 'project',
    mode: 'month',
    expandedProjects: ['proj-001'],
  },
};

export const WeekView: Story = {
  args: {
    groupBy: 'owner',
    mode: 'week',
    expandedProjects: [],
  },
};
