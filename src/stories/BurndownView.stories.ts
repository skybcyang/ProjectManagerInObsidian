import type { Meta, StoryObj } from '@storybook/html';

interface BurndownViewProps {
  title: string;
  data: Array<{
    date: string;
    planned: number;
    actual: number;
  }>;
}

const createBurndownView = ({ title, data }: BurndownViewProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view pm-burndown-view';
  container.style.cssText = 'padding: 20px; background: #1e1e1e; min-height: 100vh;';

  if (data.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px; color: var(--text-muted);">
        <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
        <div>暂无数据</div>
      </div>
    `;
    return container;
  }

  // Header
  const header = document.createElement('div');
  header.className = 'pm-burndown-header';
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  `;

  const titleEl = document.createElement('h3');
  titleEl.className = 'pm-burndown-title';
  titleEl.textContent = title;
  titleEl.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600;';
  header.appendChild(titleEl);

  const rangeEl = document.createElement('span');
  rangeEl.className = 'pm-burndown-range';
  rangeEl.textContent = `${data[0].date} ~ ${data[data.length - 1].date}`;
  rangeEl.style.cssText = 'color: var(--text-muted); font-size: 13px;';
  header.appendChild(rangeEl);

  container.appendChild(header);

  // Chart
  const chartContainer = document.createElement('div');
  chartContainer.className = 'pm-burndown-chart-container';
  chartContainer.style.cssText = 'margin-bottom: 24px;';

  const padding = { top: 20, right: 30, bottom: 50, left: 60 };
  const viewWidth = 800;
  const viewHeight = 300;
  const width = viewWidth - padding.left - padding.right;
  const height = viewHeight - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map((d) => Math.max(d.planned, d.actual)));

  let svgContent = '';

  // Grid lines
  const gridCount = 5;
  for (let i = 0; i <= gridCount; i++) {
    const y = padding.top + (height / gridCount) * i;
    svgContent += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + width}" y2="${y}" stroke="var(--background-modifier-border)" stroke-width="1" stroke-dasharray="4,4" />`;
  }

  // Axes
  svgContent += `<line x1="${padding.left}" y1="${padding.top + height}" x2="${padding.left + width}" y2="${padding.top + height}" stroke="var(--text-muted)" stroke-width="1" />`;
  svgContent += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + height}" stroke="var(--text-muted)" stroke-width="1" />`;

  // X axis labels
  const labelCount = Math.min(data.length, 7);
  const step = Math.ceil(data.length / labelCount);
  for (let i = 0; i < data.length; i += step) {
    const x = padding.left + (width / (data.length - 1 || 1)) * i;
    svgContent += `<text x="${x}" y="${padding.top + height + 20}" text-anchor="middle" fill="var(--text-muted)" font-size="11">${data[i].date.slice(5)}</text>`;
  }

  // Planned line (dashed green)
  if (data.length >= 2) {
    const plannedPoints = data
      .map((d, i) => {
        const x = padding.left + (width / (data.length - 1 || 1)) * i;
        const y = padding.top + height - (d.planned / maxValue) * height;
        return `${x},${y}`;
      })
      .join(' ');

    svgContent += `<polyline points="${plannedPoints}" fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="5,5" />`;

    data.forEach((d, i) => {
      const x = padding.left + (width / (data.length - 1 || 1)) * i;
      const y = padding.top + height - (d.planned / maxValue) * height;
      svgContent += `<circle cx="${x}" cy="${y}" r="3" fill="#22c55e" stroke="var(--background-primary)" stroke-width="1" />`;
    });
  }

  // Actual line (solid blue)
  if (data.length >= 2) {
    const actualPoints = data
      .map((d, i) => {
        const x = padding.left + (width / (data.length - 1 || 1)) * i;
        const y = padding.top + height - (d.actual / maxValue) * height;
        return `${x},${y}`;
      })
      .join(' ');

    svgContent += `<polyline points="${actualPoints}" fill="none" stroke="#3b82f6" stroke-width="2" />`;

    data.forEach((d, i) => {
      const x = padding.left + (width / (data.length - 1 || 1)) * i;
      const y = padding.top + height - (d.actual / maxValue) * height;
      svgContent += `<circle cx="${x}" cy="${y}" r="4" fill="#3b82f6" stroke="var(--background-primary)" stroke-width="2" />`;
    });
  }

  // Legend
  const legendX = viewWidth - 120;
  const legendY = 30;
  svgContent += `<line x1="${legendX}" y1="${legendY + 5}" x2="${legendX + 20}" y2="${legendY + 5}" stroke="#22c55e" stroke-width="2" stroke-dasharray="5,5" />`;
  svgContent += `<text x="${legendX + 25}" y="${legendY + 9}" fill="var(--text-normal)" font-size="12">计划剩余</text>`;
  svgContent += `<line x1="${legendX}" y1="${legendY + 25}" x2="${legendX + 20}" y2="${legendY + 25}" stroke="#3b82f6" stroke-width="2" />`;
  svgContent += `<text x="${legendX + 25}" y="${legendY + 29}" fill="var(--text-normal)" font-size="12">实际剩余</text>`;

  const svg = document.createElement('div');
  svg.className = 'pm-burndown-chart';
  svg.style.cssText = `
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    padding: 16px;
  `;
  svg.innerHTML = `<svg viewBox="0 0 ${viewWidth} ${viewHeight}" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: auto;">${svgContent}</svg>`;

  chartContainer.appendChild(svg);
  container.appendChild(chartContainer);

  // Stats cards
  const statsContainer = document.createElement('div');
  statsContainer.className = 'pm-burndown-stats';
  statsContainer.style.cssText = `
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  `;

  const firstDay = data[0];
  const lastDay = data[data.length - 1];
  const completed = firstDay.planned - lastDay.actual;
  const completionRate = firstDay.planned > 0
    ? Math.round(((firstDay.planned - lastDay.actual) / firstDay.planned) * 100)
    : 0;

  const stats = [
    { label: '总预估工时', value: `${firstDay.planned}h`, type: 'normal' },
    { label: '剩余工时', value: `${lastDay.actual}h`, type: lastDay.actual > lastDay.planned ? 'warning' : 'normal' },
    { label: '已完成', value: `${completed}h`, type: 'success' },
    { label: '完成率', value: `${completionRate}%`, type: 'normal' },
  ];

  stats.forEach(({ label, value, type }) => {
    const card = document.createElement('div');
    card.className = `pm-stat-card pm-stat-card--${type}`;
    card.style.cssText = `
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      ${type === 'success' ? 'border-color: #22c55e;' : ''}
      ${type === 'warning' ? 'border-color: #f59e0b;' : ''}
    `;

    const valueEl = document.createElement('div');
    valueEl.className = 'pm-stat-card__value';
    valueEl.textContent = value;
    valueEl.style.cssText = `
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
      ${type === 'success' ? 'color: #22c55e;' : ''}
      ${type === 'warning' ? 'color: #f59e0b;' : ''}
    `;
    card.appendChild(valueEl);

    const labelEl = document.createElement('div');
    labelEl.className = 'pm-stat-card__label';
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-size: 12px; color: var(--text-muted);';
    card.appendChild(labelEl);

    statsContainer.appendChild(card);
  });

  container.appendChild(statsContainer);
  return container;
};

const meta: Meta<BurndownViewProps> = {
  title: 'Views/BurndownView',
  tags: ['autodocs'],
  render: (args) => createBurndownView(args),
};

export default meta;

type Story = StoryObj<BurndownViewProps>;

export const OnTrack: Story = {
  args: {
    title: 'Sprint 1 燃尽图',
    data: [
      { date: '04-01', planned: 100, actual: 100 },
      { date: '04-02', planned: 90, actual: 92 },
      { date: '04-03', planned: 80, actual: 85 },
      { date: '04-04', planned: 70, actual: 75 },
      { date: '04-05', planned: 60, actual: 62 },
      { date: '04-08', planned: 50, actual: 52 },
      { date: '04-09', planned: 40, actual: 42 },
      { date: '04-10', planned: 30, actual: 30 },
      { date: '04-11', planned: 20, actual: 18 },
      { date: '04-12', planned: 10, actual: 8 },
      { date: '04-15', planned: 0, actual: 2 },
    ],
  },
};

export const BehindSchedule: Story = {
  args: {
    title: 'Sprint 2 燃尽图（延期）',
    data: [
      { date: '04-01', planned: 80, actual: 80 },
      { date: '04-02', planned: 72, actual: 78 },
      { date: '04-03', planned: 64, actual: 75 },
      { date: '04-04', planned: 56, actual: 70 },
      { date: '04-05', planned: 48, actual: 65 },
      { date: '04-08', planned: 40, actual: 58 },
      { date: '04-09', planned: 32, actual: 52 },
      { date: '04-10', planned: 24, actual: 45 },
      { date: '04-11', planned: 16, actual: 38 },
      { date: '04-12', planned: 8, actual: 30 },
    ],
  },
};

export const AheadOfSchedule: Story = {
  args: {
    title: 'Sprint 3 燃尽图（提前）',
    data: [
      { date: '04-01', planned: 60, actual: 60 },
      { date: '04-02', planned: 54, actual: 50 },
      { date: '04-03', planned: 48, actual: 42 },
      { date: '04-04', planned: 42, actual: 35 },
      { date: '04-05', planned: 36, actual: 28 },
      { date: '04-08', planned: 30, actual: 20 },
      { date: '04-09', planned: 24, actual: 12 },
      { date: '04-10', planned: 18, actual: 5 },
      { date: '04-11', planned: 12, actual: 2 },
      { date: '04-12', planned: 6, actual: 0 },
    ],
  },
};

export const Empty: Story = {
  args: {
    title: '空燃尽图',
    data: [],
  },
};
