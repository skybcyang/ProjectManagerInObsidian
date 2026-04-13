import type { Meta, StoryObj } from '@storybook/html';

interface KanbanColumnProps {
  title: string;
  color: string;
  count: number;
  cards: Array<{
    title: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    owner?: string;
    progress?: number;
    tags?: string[];
  }>;
}

const createKanbanColumn = ({ title, color, count, cards }: KanbanColumnProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view';
  container.style.cssText = 'padding: 20px; background: #1e1e1e;';

  const column = document.createElement('div');
  column.className = 'pm-kanban-column';
  column.style.width = '300px';

  // 列头部
  const header = document.createElement('div');
  header.className = 'pm-kanban-column-header';

  const titleEl = document.createElement('div');
  titleEl.className = 'pm-kanban-column-title';

  const dot = document.createElement('span');
  dot.className = 'pm-kanban-column-dot';
  dot.style.background = color;
  titleEl.appendChild(dot);

  titleEl.appendChild(document.createTextNode(title));
  header.appendChild(titleEl);

  const countEl = document.createElement('span');
  countEl.className = 'pm-kanban-column-count';
  countEl.textContent = String(count);
  header.appendChild(countEl);

  column.appendChild(header);

  // 卡片容器
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'pm-kanban-cards';

  cards.forEach((card) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'pm-kanban-card';

    // 优先级条
    const priorityColors: Record<string, string> = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#22c55e',
    };

    const priorityBar = document.createElement('div');
    priorityBar.className = 'pm-kanban-card-priority-bar';
    priorityBar.style.background = priorityColors[card.priority] || priorityColors.medium;
    cardEl.appendChild(priorityBar);

    // 头部
    const cardHeader = document.createElement('div');
    cardHeader.className = 'pm-kanban-card-header';

    const cardTitle = document.createElement('div');
    cardTitle.className = 'pm-kanban-card-title';
    cardTitle.textContent = card.title;
    cardHeader.appendChild(cardTitle);

    // 操作按钮
    const actions = document.createElement('div');
    actions.className = 'pm-kanban-card-actions';

    const openBtn = document.createElement('button');
    openBtn.className = 'pm-kanban-action-btn';
    openBtn.textContent = '↗';
    actions.appendChild(openBtn);

    cardHeader.appendChild(actions);
    cardEl.appendChild(cardHeader);

    // 标签
    if (card.tags && card.tags.length > 0) {
      const content = document.createElement('div');
      content.className = 'pm-kanban-card-content';

      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'pm-kanban-card-tags';

      card.tags.forEach((tag) => {
        const tagEl = document.createElement('span');
        tagEl.className = 'pm-kanban-card-tag';
        tagEl.textContent = tag;
        tagsContainer.appendChild(tagEl);
      });

      content.appendChild(tagsContainer);
      cardEl.appendChild(content);
    }

    // 底部
    const footer = document.createElement('div');
    footer.className = 'pm-kanban-card-footer';

    if (card.owner) {
      const ownerEl = document.createElement('span');
      ownerEl.className = 'pm-kanban-card-owner';
      ownerEl.textContent = `@${card.owner}`;
      footer.appendChild(ownerEl);
    }

    if (card.progress !== undefined) {
      const progressEl = document.createElement('div');
      progressEl.style.cssText = 'display:flex;align-items:center;gap:6px;width:70px;';

      const barContainer = document.createElement('div');
      barContainer.style.cssText = 'flex:1;height:4px;background:var(--background-modifier-border);border-radius:2px;overflow:hidden;';

      const barFill = document.createElement('div');
      barFill.style.cssText = `width:${card.progress}%;height:100%;background:var(--interactive-accent);`;
      barContainer.appendChild(barFill);

      const progressText = document.createElement('span');
      progressText.style.cssText = 'font-size:10px;color:var(--text-muted);';
      progressText.textContent = `${card.progress}%`;

      progressEl.appendChild(barContainer);
      progressEl.appendChild(progressText);
      footer.appendChild(progressEl);
    }

    cardEl.appendChild(footer);
    cardsContainer.appendChild(cardEl);
  });

  column.appendChild(cardsContainer);
  container.appendChild(column);

  return container;
};

const meta: Meta<KanbanColumnProps> = {
  title: 'Components/KanbanColumn',
  tags: ['autodocs'],
  render: (args) => createKanbanColumn(args),
  argTypes: {
    title: { control: 'text' },
    color: { control: 'color' },
    count: { control: 'number' },
  },
};

export default meta;

type Story = StoryObj<KanbanColumnProps>;

export const Todo: Story = {
  args: {
    title: '待办',
    color: '#f59e0b',
    count: 3,
    cards: [
      { title: '设计数据库结构', priority: 'high', owner: '张三', progress: 0, tags: ['后端'] },
      { title: '编写 API 文档', priority: 'medium', owner: '李四', progress: 0, tags: ['文档'] },
      { title: '单元测试补充', priority: 'low', owner: '王五', progress: 0, tags: ['测试'] },
    ],
  },
};

export const InProgress: Story = {
  args: {
    title: '进行中',
    color: '#3b82f6',
    count: 2,
    cards: [
      { title: '实现用户认证', priority: 'critical', owner: '张三', progress: 75, tags: ['后端', '安全'] },
      { title: '前端页面开发', priority: 'high', owner: '李四', progress: 45, tags: ['前端'] },
    ],
  },
};

export const Completed: Story = {
  args: {
    title: '已完成',
    color: '#22c55e',
    count: 4,
    cards: [
      { title: '需求分析', priority: 'high', owner: '产品经理', progress: 100 },
      { title: '原型设计', priority: 'medium', owner: '设计师', progress: 100 },
      { title: '技术选型', priority: 'high', owner: '架构师', progress: 100 },
      { title: '环境搭建', priority: 'medium', owner: '运维', progress: 100 },
    ],
  },
};

export const Empty: Story = {
  args: {
    title: '待办',
    color: '#f59e0b',
    count: 0,
    cards: [],
  },
};
