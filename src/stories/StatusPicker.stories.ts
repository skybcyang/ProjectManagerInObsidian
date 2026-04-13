import type { Meta, StoryObj } from '@storybook/html';

interface StatusPickerProps {
  currentStatus: string;
  statusOptions: Array<{ id: string; label: string; color: string }>;
}

const FEATURE_STATUS_OPTIONS = [
  { id: 'backlog', label: '待办', color: '#9ca3af' },
  { id: 'todo', label: '准备', color: '#f59e0b' },
  { id: 'in-progress', label: '进行中', color: '#3b82f6' },
  { id: 'testing', label: '测试中', color: '#ec4899' },
  { id: 'completed', label: '已完成', color: '#22c55e' },
];

const createStatusPickerDemo = ({ currentStatus, statusOptions }: StatusPickerProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view';
  container.style.cssText = 'padding: 40px; background: #1e1e1e; min-height: 100vh;';

  // Demo trigger button
  const trigger = document.createElement('button');
  trigger.className = 'pm-status-trigger';
  trigger.textContent = '点击选择状态';
  trigger.style.cssText = `
    padding: 8px 16px;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
  `;

  const selectedStatus = statusOptions.find(s => s.id === currentStatus);
  if (selectedStatus) {
    trigger.innerHTML = `
      <span style="width: 8px; height: 8px; border-radius: 50%; background: ${selectedStatus.color};"></span>
      ${selectedStatus.label}
    `;
  }

  trigger.onclick = () => {
    // Remove existing picker
    const existing = document.querySelector('.pm-status-picker');
    if (existing) existing.remove();

    // Create picker menu
    const menu = document.createElement('div');
    menu.className = 'pm-status-picker';
    const rect = trigger.getBoundingClientRect();
    menu.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 4}px;
      left: ${rect.left}px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 4px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 140px;
    `;

    statusOptions.forEach(status => {
      const item = document.createElement('div');
      item.className = 'pm-status-picker-item';
      const isSelected = status.id === currentStatus;
      item.style.cssText = `
        padding: 6px 12px;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        ${isSelected ? 'background: var(--background-modifier-hover); font-weight: 500;' : ''}
      `;
      item.innerHTML = `
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${status.color}; flex-shrink: 0;"></span>
        ${status.label}
      `;
      item.onmouseenter = () => {
        if (!isSelected) item.style.background = 'var(--background-modifier-hover)';
      };
      item.onmouseleave = () => {
        if (!isSelected) item.style.background = '';
      };
      item.onclick = () => {
        trigger.innerHTML = `
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${status.color};"></span>
          ${status.label}
        `;
        menu.remove();
      };
      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    // Close on outside click
    setTimeout(() => {
      const closeHandler = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
          menu.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 0);
  };

  container.appendChild(trigger);

  // Status list display
  const listTitle = document.createElement('div');
  listTitle.textContent = '可用状态选项：';
  listTitle.style.cssText = 'margin-top: 40px; margin-bottom: 16px; color: var(--text-muted); font-size: 13px;';
  container.appendChild(listTitle);

  const list = document.createElement('div');
  list.style.cssText = 'display: flex; flex-direction: column; gap: 8px; max-width: 300px;';

  statusOptions.forEach(status => {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
    `;
    row.innerHTML = `
      <span style="width: 10px; height: 10px; border-radius: 50%; background: ${status.color};"></span>
      <span style="font-weight: 500;">${status.label}</span>
      <span style="margin-left: auto; font-size: 11px; color: var(--text-muted); font-family: monospace;">${status.id}</span>
    `;
    list.appendChild(row);
  });

  container.appendChild(list);
  return container;
};

const meta: Meta<StatusPickerProps> = {
  title: 'Components/StatusPicker',
  tags: ['autodocs'],
  render: (args) => createStatusPickerDemo(args),
  argTypes: {
    currentStatus: { control: 'select', options: FEATURE_STATUS_OPTIONS.map(s => s.id) },
  },
};

export default meta;

type Story = StoryObj<StatusPickerProps>;

export const Default: Story = {
  args: {
    currentStatus: 'in-progress',
    statusOptions: FEATURE_STATUS_OPTIONS,
  },
};

export const Todo: Story = {
  args: {
    currentStatus: 'todo',
    statusOptions: FEATURE_STATUS_OPTIONS,
  },
};

export const Completed: Story = {
  args: {
    currentStatus: 'completed',
    statusOptions: FEATURE_STATUS_OPTIONS,
  },
};

export const ProjectStatuses: Story = {
  args: {
    currentStatus: 'in-progress',
    statusOptions: [
      { id: 'backlog', label: '待办', color: '#9ca3af' },
      { id: 'in-progress', label: '进行中', color: '#3b82f6' },
      { id: 'completed', label: '已完成', color: '#22c55e' },
      { id: 'archived', label: '已归档', color: '#6b7280' },
    ],
  },
};
