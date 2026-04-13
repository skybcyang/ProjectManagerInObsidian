import type { Meta, StoryObj } from '@storybook/html';

interface KanbanBoardProps {
  columns: Array<{
    id: string;
    title: string;
    color: string;
    cards: Array<{
      title: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      owner?: string;
      progress?: number;
      tags?: string[];
      dueDate?: string;
      isOverdue?: boolean;
    }>;
  }>;
}

const createKanbanBoard = ({ columns }: KanbanBoardProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view pm-kanban-view';
  container.style.cssText = 'padding: 20px; background: #1e1e1e; min-height: 100vh;';

  // 工具栏
  const toolbar = document.createElement('div');
  toolbar.className = 'pm-view-toolbar';
  toolbar.style.marginBottom = '16px';

  const title = document.createElement('div');
  title.className = 'pm-view-title';
  title.textContent = '项目看板';
  toolbar.appendChild(title);

  const stats = document.createElement('div');
  stats.className = 'pm-view-stats';
  const totalCards = columns.reduce((sum, col) => sum + col.cards.length, 0);
  stats.textContent = `${columns.length} 列 · ${totalCards} 任务`;
  toolbar.appendChild(stats);

  container.appendChild(toolbar);

  // 看板容器
  const boardContainer = document.createElement('div');
  boardContainer.className = 'pm-kanban-container';

  const board = document.createElement('div');
  board.className = 'pm-kanban-board';

  columns.forEach((column) => {
    const columnEl = document.createElement('div');
    columnEl.className = 'pm-kanban-column';
    columnEl.style.width = '280px';
    columnEl.style.minWidth = '280px';

    // 列头部
    const header = document.createElement('div');
    header.className = 'pm-kanban-column-header';

    const titleEl = document.createElement('div');
    titleEl.className = 'pm-kanban-column-title';

    const dot = document.createElement('span');
    dot.className = 'pm-kanban-column-dot';
    dot.style.background = column.color;
    titleEl.appendChild(dot);

    titleEl.appendChild(document.createTextNode(column.title));
    header.appendChild(titleEl);

    const countEl = document.createElement('span');
    countEl.className = 'pm-kanban-column-count';
    countEl.textContent = String(column.cards.length);
    header.appendChild(countEl);

    columnEl.appendChild(header);

    // 卡片容器
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'pm-kanban-cards';

    column.cards.forEach((card) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'pm-kanban-card';

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

        card.tags.slice(0, 3).forEach((tag) => {
          const tagEl = document.createElement('span');
          tagEl.className = 'pm-kanban-card-tag';
          tagEl.textContent = tag;
          tagsContainer.appendChild(tagEl);
        });

        if (card.tags.length > 3) {
          const moreEl = document.createElement('span');
          moreEl.className = 'pm-kanban-card-tag-more';
          moreEl.textContent = `+${card.tags.length - 3}`;
          tagsContainer.appendChild(moreEl);
        }

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

      if (card.dueDate) {
        const dueEl = document.createElement('span');
        dueEl.className = `pm-kanban-card-due ${card.isOverdue ? 'pm-overdue' : ''}`;
        dueEl.textContent = card.dueDate;
        footer.appendChild(dueEl);
      }

      cardEl.appendChild(footer);
      cardsContainer.appendChild(cardEl);
    });

    columnEl.appendChild(cardsContainer);
    board.appendChild(columnEl);
  });

  boardContainer.appendChild(board);
  container.appendChild(boardContainer);

  return container;
};

const meta: Meta<KanbanBoardProps> = {
  title: 'Views/KanbanBoard',
  tags: ['autodocs'],
  render: (args) => createKanbanBoard(args),
};

export default meta;

type Story = StoryObj<KanbanBoardProps>;

export const Default: Story = {
  args: {
    columns: [
      {
        id: 'backlog',
        title: '待办',
        color: '#6b7280',
        cards: [
          { title: '技术调研', priority: 'medium', owner: '张三', progress: 0, tags: ['研究'] },
          { title: '需求评审', priority: 'high', owner: '李四', progress: 0, tags: ['会议'] },
        ],
      },
      {
        id: 'todo',
        title: '待处理',
        color: '#f59e0b',
        cards: [
          { title: '数据库设计', priority: 'high', owner: '张三', progress: 0, tags: ['后端', '数据库'] },
          { title: 'API 接口定义', priority: 'medium', owner: '李四', progress: 0, tags: ['后端'] },
        ],
      },
      {
        id: 'in-progress',
        title: '进行中',
        color: '#3b82f6',
        cards: [
          { title: '用户认证模块', priority: 'critical', owner: '张三', progress: 75, tags: ['后端', '安全'], dueDate: '04-20' },
          { title: '前端页面开发', priority: 'high', owner: '李四', progress: 45, tags: ['前端'], dueDate: '04-25' },
          { title: '接口联调', priority: 'medium', owner: '王五', progress: 30, tags: ['前后端'], dueDate: '04-15', isOverdue: true },
        ],
      },
      {
        id: 'testing',
        title: '测试中',
        color: '#ec4899',
        cards: [
          { title: '登录功能测试', priority: 'high', owner: '测试组', progress: 90, tags: ['测试'] },
        ],
      },
      {
        id: 'completed',
        title: '已完成',
        color: '#22c55e',
        cards: [
          { title: '需求分析', priority: 'high', owner: '产品', progress: 100 },
          { title: '原型设计', priority: 'medium', owner: '设计', progress: 100 },
          { title: '技术选型', priority: 'high', owner: '架构', progress: 100 },
        ],
      },
    ],
  },
};

export const SprintPlanning: Story = {
  args: {
    columns: [
      {
        id: 'todo',
        title: 'Sprint Backlog',
        color: '#f59e0b',
        cards: [
          { title: '用户故事 1: 作为用户，我想要登录', priority: 'high', owner: 'Dev1', progress: 0, tags: ['Story'] },
          { title: '用户故事 2: 作为用户，我想要注册', priority: 'high', owner: 'Dev2', progress: 0, tags: ['Story'] },
          { title: '技术债务: 重构旧代码', priority: 'low', owner: 'Dev3', progress: 0, tags: ['TechDebt'] },
        ],
      },
      {
        id: 'in-progress',
        title: 'In Progress',
        color: '#3b82f6',
        cards: [
          { title: '实现 OAuth 登录', priority: 'critical', owner: 'Dev1', progress: 60, tags: ['Feature'], dueDate: 'Sprint结束' },
        ],
      },
      {
        id: 'review',
        title: 'Code Review',
        color: '#8b5cf6',
        cards: [
          { title: '修复登录 Bug', priority: 'high', owner: 'Dev2', progress: 100, tags: ['Bugfix'] },
        ],
      },
      {
        id: 'done',
        title: 'Done',
        color: '#22c55e',
        cards: [
          { title: 'Sprint 计划会议', priority: 'medium', owner: 'Team', progress: 100 },
          { title: '环境配置', priority: 'high', owner: 'DevOps', progress: 100 },
        ],
      },
    ],
  },
};
