import type { Meta, StoryObj } from '@storybook/html';

interface StatusBadgeProps {
  status: 'planning' | 'in-progress' | 'completed' | 'archived' | 'backlog' | 'todo' | 'testing';
  label?: string;
}

const createStatusBadge = ({ status, label }: StatusBadgeProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view';
  container.style.cssText = 'padding: 20px; display: flex; gap: 12px; flex-wrap: wrap;';

  const statusConfig: Record<string, { color: string; label: string }> = {
    'planning': { color: '#8b5cf6', label: '规划中' },
    'in-progress': { color: '#3b82f6', label: '进行中' },
    'completed': { color: '#22c55e', label: '已完成' },
    'archived': { color: '#6b7280', label: '已归档' },
    'backlog': { color: '#6b7280', label: '待办' },
    'todo': { color: '#f59e0b', label: '待处理' },
    'testing': { color: '#ec4899', label: '测试中' },
  };

  const config = statusConfig[status] || statusConfig['backlog'];

  const badge = document.createElement('span');
  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: ${config.color}20;
    color: ${config.color};
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  `;

  const dot = document.createElement('span');
  dot.style.cssText = `
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${config.color};
  `;

  badge.appendChild(dot);
  badge.appendChild(document.createTextNode(label || config.label));
  container.appendChild(badge);

  return container;
};

const meta: Meta<StatusBadgeProps> = {
  title: 'Components/StatusBadge',
  tags: ['autodocs'],
  render: (args) => createStatusBadge(args),
  argTypes: {
    status: {
      control: { type: 'select' },
      options: ['planning', 'in-progress', 'completed', 'archived', 'backlog', 'todo', 'testing'],
    },
    label: { control: 'text' },
  },
};

export default meta;

type Story = StoryObj<StatusBadgeProps>;

export const Planning: Story = {
  args: {
    status: 'planning',
  },
};

export const InProgress: Story = {
  args: {
    status: 'in-progress',
  },
};

export const Completed: Story = {
  args: {
    status: 'completed',
  },
};

export const CustomLabel: Story = {
  args: {
    status: 'testing',
    label: 'QA测试中',
  },
};

export const AllStatuses: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'pm-view';
    container.style.cssText = 'padding: 20px; display: flex; gap: 12px; flex-wrap: wrap;';

    const statuses: StatusBadgeProps['status'][] = [
      'planning', 'backlog', 'todo', 'in-progress', 'testing', 'completed', 'archived'
    ];

    statuses.forEach((status) => {
      const badge = createStatusBadge({ status });
      container.appendChild(badge.firstElementChild || badge);
    });

    return container;
  },
};
