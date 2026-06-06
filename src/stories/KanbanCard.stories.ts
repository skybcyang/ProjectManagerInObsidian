import type { Meta, StoryObj } from '@storybook/html';

interface KanbanCardProps {
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  owner?: string;
  progress?: number;
  dueDate?: string;
  tags?: string[];
  isOverdue?: boolean;
}

const createKanbanCard = ({
  title,
  priority,
  owner,
  progress,
  dueDate,
  tags = [],
  isOverdue = false,
}: KanbanCardProps): HTMLElement => {
  const card = document.createElement('div');
  card.className = 'pm-kanban-card';

  // 优先级颜色
  const priorityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  };

  // 优先级条
  const priorityBar = document.createElement('div');
  priorityBar.className = 'pm-kanban-card-priority-bar';
  priorityBar.style.background = priorityColors[priority] || priorityColors.medium;
  card.appendChild(priorityBar);

  // 头部
  const header = document.createElement('div');
  header.className = 'pm-kanban-card-header';

  const titleEl = document.createElement('div');
  titleEl.className = 'pm-kanban-card-title';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  card.appendChild(header);

  // 内容区
  if (tags.length > 0) {
    const content = document.createElement('div');
    content.className = 'pm-kanban-card-content';

    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'pm-kanban-card-tags';

    tags.slice(0, 3).forEach((tag) => {
      const tagEl = document.createElement('span');
      tagEl.className = 'pm-kanban-card-tag';
      tagEl.textContent = tag;
      tagsContainer.appendChild(tagEl);
    });

    if (tags.length > 3) {
      const moreEl = document.createElement('span');
      moreEl.className = 'pm-kanban-card-tag-more';
      moreEl.textContent = `+${tags.length - 3}`;
      tagsContainer.appendChild(moreEl);
    }

    content.appendChild(tagsContainer);
    card.appendChild(content);
  }

  // 底部
  const footer = document.createElement('div');
  footer.className = 'pm-kanban-card-footer';

  if (owner) {
    const ownerEl = document.createElement('span');
    ownerEl.className = 'pm-kanban-card-owner';
    ownerEl.textContent = `@${owner}`;
    footer.appendChild(ownerEl);
  }

  if (progress !== undefined) {
    const progressEl = document.createElement('div');
    progressEl.style.cssText = 'display:flex;align-items:center;gap:6px;width:70px;';

    const barContainer = document.createElement('div');
    barContainer.style.cssText = 'flex:1;height:4px;background:var(--background-modifier-border);border-radius:2px;overflow:hidden;';

    const barFill = document.createElement('div');
    barFill.style.cssText = `width:${progress}%;height:100%;background:var(--interactive-accent);`;
    barContainer.appendChild(barFill);

    const progressText = document.createElement('span');
    progressText.style.cssText = 'font-size:10px;color:var(--text-muted);';
    progressText.textContent = `${progress}%`;

    progressEl.appendChild(barContainer);
    progressEl.appendChild(progressText);
    footer.appendChild(progressEl);
  }

  if (dueDate) {
    const dueEl = document.createElement('span');
    dueEl.className = `pm-kanban-card-due ${isOverdue ? 'pm-overdue' : ''}`;
    dueEl.textContent = dueDate;
    footer.appendChild(dueEl);
  }

  card.appendChild(footer);

  return card;
};

const meta: Meta<KanbanCardProps> = {
  title: 'Components/KanbanCard',
  tags: ['autodocs'],
  render: (args) => {
    const container = document.createElement('div');
    container.className = 'pm-view';
    container.style.cssText = 'padding: 20px; background: #1e1e1e;';
    container.appendChild(createKanbanCard(args));
    return container;
  },
  argTypes: {
    title: { control: 'text' },
    priority: {
      control: { type: 'select' },
      options: ['critical', 'high', 'medium', 'low'],
    },
    status: { control: 'text' },
    owner: { control: 'text' },
    progress: {
      control: { type: 'range', min: 0, max: 100 },
    },
    dueDate: { control: 'text' },
    isOverdue: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<KanbanCardProps>;

export const Default: Story = {
  args: {
    title: '实现用户登录功能',
    priority: 'high',
    status: 'in-progress',
    owner: '张三',
    progress: 65,
    dueDate: '04-20',
    tags: ['前端', '认证'],
  },
};

export const Critical: Story = {
  args: {
    title: '修复生产环境崩溃问题',
    priority: 'critical',
    status: 'in-progress',
    owner: '李四',
    progress: 90,
    dueDate: '今天',
    tags: ['Bug', '紧急'],
  },
};

export const LowPriority: Story = {
  args: {
    title: '优化文档格式',
    priority: 'low',
    status: 'backlog',
    owner: '王五',
    tags: ['文档'],
  },
};

export const Overdue: Story = {
  args: {
    title: '延迟交付的功能模块',
    priority: 'high',
    status: 'in-progress',
    owner: '赵六',
    progress: 30,
    dueDate: '04-10',
    isOverdue: true,
    tags: ['后端', 'API'],
  },
};

export const NoOwner: Story = {
  args: {
    title: '待分配的任务',
    priority: 'medium',
    status: 'todo',
    progress: 0,
    tags: ['规划'],
  },
};

export const ManyTags: Story = {
  args: {
    title: '复杂的跨团队功能',
    priority: 'high',
    status: 'in-progress',
    owner: '团队A',
    progress: 45,
    tags: ['前端', '后端', '设计', '测试', '文档'],
  },
};
