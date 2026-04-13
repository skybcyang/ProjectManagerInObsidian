import type { Meta, StoryObj } from '@storybook/html';

interface WorkloadViewProps {
  title: string;
  groupBy: 'owner' | 'project';
  data: Array<{
    name: string;
    estimated: number;
    actual: number;
    efficiency: number;
    taskCount: number;
  }>;
}

const createWorkloadView = ({ title, groupBy, data }: WorkloadViewProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view pm-workload-view';
  container.style.cssText = 'padding: 20px; background: #1e1e1e; min-height: 100vh;';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'pm-workload-toolbar';
  toolbar.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  `;

  const titleEl = document.createElement('h3');
  titleEl.className = 'pm-workload-title';
  titleEl.textContent = title;
  titleEl.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600;';
  toolbar.appendChild(titleEl);

  // Toggle buttons
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'pm-workload-toggle';
  buttonGroup.style.cssText = `
    display: flex;
    gap: 4px;
    background: var(--background-secondary);
    padding: 4px;
    border-radius: 6px;
  `;

  ['owner', 'project'].forEach((type) => {
    const btn = document.createElement('button');
    btn.className = `pm-workload-toggle__btn ${groupBy === type ? 'active' : ''}`;
    btn.textContent = type === 'owner' ? '按负责人' : '按项目';
    btn.style.cssText = `
      padding: 6px 16px;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s ease;
      background: ${groupBy === type ? 'var(--interactive-accent)' : 'transparent'};
      color: ${groupBy === type ? 'var(--text-on-accent)' : 'var(--text-normal)'};
    `;
    buttonGroup.appendChild(btn);
  });

  toolbar.appendChild(buttonGroup);
  container.appendChild(toolbar);

  if (data.length === 0) {
    container.innerHTML += `
      <div style="text-align: center; padding: 60px; color: var(--text-muted);">
        <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
        <div>暂无数据</div>
      </div>
    `;
    return container;
  }

  // Summary
  const summaryContainer = document.createElement('div');
  summaryContainer.className = 'pm-workload-summary';
  summaryContainer.style.cssText = `
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  `;

  const totalEstimated = data.reduce((sum, d) => sum + d.estimated, 0);
  const totalActual = data.reduce((sum, d) => sum + d.actual, 0);
  const totalTasks = data.reduce((sum, d) => sum + d.taskCount, 0);
  const avgEfficiency = totalActual > 0 ? Math.round((totalEstimated / totalActual) * 100) : 100;

  const summaries = [
    { label: '总预估工时', value: `${totalEstimated}h` },
    { label: '总实际工时', value: `${totalActual}h` },
    { label: '平均效率', value: `${avgEfficiency}%` },
    { label: '任务总数', value: `${totalTasks}` },
  ];

  summaries.forEach(({ label, value }) => {
    const card = document.createElement('div');
    card.className = 'pm-workload-summary__card';
    card.style.cssText = `
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    `;

    const valueEl = document.createElement('div');
    valueEl.className = 'pm-workload-summary__value';
    valueEl.textContent = value;
    valueEl.style.cssText = 'font-size: 24px; font-weight: 700; margin-bottom: 4px;';
    card.appendChild(valueEl);

    const labelEl = document.createElement('div');
    labelEl.className = 'pm-workload-summary__label';
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-size: 12px; color: var(--text-muted);';
    card.appendChild(labelEl);

    summaryContainer.appendChild(card);
  });

  container.appendChild(summaryContainer);

  // Workload bars
  const barsContainer = document.createElement('div');
  barsContainer.className = 'pm-workload-bars';
  barsContainer.style.cssText = `
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    padding: 16px;
  `;

  const maxValue = Math.max(...data.map((d) => Math.max(d.estimated, d.actual)));

  data.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'pm-workload-bar';
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--background-modifier-border-hover);
      transition: background 0.15s ease;
    `;
    row.addEventListener('mouseenter', () => {
      row.style.background = 'var(--background-secondary)';
    });
    row.addEventListener('mouseleave', () => {
      row.style.background = '';
    });

    // Name
    const nameEl = document.createElement('div');
    nameEl.className = 'pm-workload-bar__name';
    nameEl.textContent = item.name;
    nameEl.style.cssText = 'width: 120px; font-size: 13px; font-weight: 500;';
    nameEl.title = `${item.name}: ${item.taskCount}个任务`;
    row.appendChild(nameEl);

    // Progress container
    const progressContainer = document.createElement('div');
    progressContainer.className = 'pm-workload-bar__progress';
    progressContainer.style.cssText = 'flex: 1; height: 24px; position: relative;';

    // Estimated bar (background)
    const estimatedWidth = maxValue > 0 ? (item.estimated / maxValue) * 100 : 0;
    const estimatedBar = document.createElement('div');
    estimatedBar.className = 'pm-workload-bar__estimated';
    estimatedBar.style.cssText = `
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      left: 0;
      width: ${estimatedWidth}%;
      height: 12px;
      background: var(--background-modifier-border);
      border-radius: 6px;
    `;
    progressContainer.appendChild(estimatedBar);

    // Actual bar (foreground)
    const actualWidth = maxValue > 0 ? (item.actual / maxValue) * 100 : 0;
    const actualBar = document.createElement('div');
    actualBar.className = 'pm-workload-bar__actual';
    let actualBarColor = '#3b82f6';
    if (item.efficiency > 120) actualBarColor = '#ef4444';
    else if (item.efficiency < 80) actualBarColor = '#22c55e';

    actualBar.style.cssText = `
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      left: 0;
      width: ${actualWidth}%;
      height: 12px;
      background: ${actualBarColor};
      border-radius: 6px;
      transition: width 0.3s ease;
    `;
    progressContainer.appendChild(actualBar);
    row.appendChild(progressContainer);

    // Value label
    const valueEl = document.createElement('div');
    valueEl.className = 'pm-workload-bar__value';
    valueEl.textContent = `${item.actual}/${item.estimated}h`;
    valueEl.style.cssText = 'width: 70px; font-size: 12px; color: var(--text-muted); text-align: right;';
    row.appendChild(valueEl);

    // Efficiency label
    const efficiencyEl = document.createElement('div');
    efficiencyEl.className = 'pm-workload-bar__efficiency';
    efficiencyEl.textContent = `${item.efficiency}%`;
    efficiencyEl.style.cssText = `
      width: 50px;
      font-size: 12px;
      font-weight: 600;
      text-align: right;
      color: ${item.efficiency > 120 ? '#ef4444' : item.efficiency < 80 ? '#22c55e' : 'var(--text-normal)'};
    `;
    row.appendChild(efficiencyEl);

    barsContainer.appendChild(row);
  });

  container.appendChild(barsContainer);
  return container;
};

const meta: Meta<WorkloadViewProps> = {
  title: 'Views/WorkloadView',
  tags: ['autodocs'],
  render: (args) => createWorkloadView(args),
  argTypes: {
    groupBy: { control: 'select', options: ['owner', 'project'] },
  },
};

export default meta;

type Story = StoryObj<WorkloadViewProps>;

export const ByOwner: Story = {
  args: {
    title: '团队工作量统计',
    groupBy: 'owner',
    data: [
      { name: '张三', estimated: 80, actual: 75, efficiency: 107, taskCount: 12 },
      { name: '李四', estimated: 100, actual: 110, efficiency: 91, taskCount: 15 },
      { name: '王五', estimated: 60, actual: 45, efficiency: 133, taskCount: 8 },
      { name: '赵六', estimated: 90, actual: 95, efficiency: 95, taskCount: 10 },
      { name: '钱七', estimated: 70, actual: 90, efficiency: 78, taskCount: 9 },
      { name: '孙八', estimated: 85, actual: 70, efficiency: 121, taskCount: 11 },
    ],
  },
};

export const ByProject: Story = {
  args: {
    title: '项目工作量统计',
    groupBy: 'project',
    data: [
      { name: '电商平台', estimated: 200, actual: 220, efficiency: 91, taskCount: 25 },
      { name: 'CRM系统', estimated: 150, actual: 135, efficiency: 111, taskCount: 18 },
      { name: '移动App', estimated: 180, actual: 190, efficiency: 95, taskCount: 22 },
      { name: '数据分析', estimated: 120, actual: 100, efficiency: 120, taskCount: 15 },
      { name: '内部工具', estimated: 80, actual: 95, efficiency: 84, taskCount: 10 },
    ],
  },
};

export const SinglePerson: Story = {
  args: {
    title: '个人工作量详情',
    groupBy: 'owner',
    data: [
      { name: '张三', estimated: 120, actual: 115, efficiency: 104, taskCount: 15 },
    ],
  },
};

export const Empty: Story = {
  args: {
    title: '空工作量统计',
    groupBy: 'owner',
    data: [],
  },
};
