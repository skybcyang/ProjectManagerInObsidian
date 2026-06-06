import type { Meta, StoryObj } from '@storybook/html';
import { createMockFeature, createMockProject } from '../../tests/setup';

interface KanbanViewProps {
  entities: any[];
  title: string;
  groupBy?: 'status' | 'priority';
}

const statusColumns = [
  { id: 'backlog', label: '待办', color: '#9ca3af' },
  { id: 'todo', label: '准备', color: '#f59e0b' },
  { id: 'in-progress', label: '进行中', color: '#3b82f6' },
  { id: 'testing', label: '测试中', color: '#ec4899' },
  { id: 'completed', label: '已完成', color: '#22c55e' },
];

const priorityColumns = [
  { id: 'critical', label: '紧急', color: '#ef4444' },
  { id: 'high', label: '高', color: '#f97316' },
  { id: 'medium', label: '中', color: '#eab308' },
  { id: 'low', label: '低', color: '#22c55e' },
];

const createKanbanView = ({ entities, title, groupBy = 'status' }: KanbanViewProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view pm-kanban-view';
  container.style.cssText = 'padding: 20px; background: #1e1e1e; min-height: 100vh;';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'pm-view-toolbar';
  toolbar.style.marginBottom = '16px';

  const titleEl = document.createElement('div');
  titleEl.className = 'pm-view-title';
  titleEl.textContent = title;
  toolbar.appendChild(titleEl);

  const groupLabel = document.createElement('div');
  groupLabel.className = 'pm-view-stats';
  groupLabel.textContent = `分组: ${groupBy === 'status' ? '状态' : '优先级'}`;
  toolbar.appendChild(groupLabel);

  container.appendChild(toolbar);

  // Board container
  const boardContainer = document.createElement('div');
  boardContainer.className = 'pm-kanban-container';
  boardContainer.style.cssText = 'overflow-x: auto;';

  const board = document.createElement('div');
  board.className = 'pm-kanban-board';
  board.style.cssText = `
    display: flex;
    gap: 16px;
    min-width: max-content;
  `;

  const columns = groupBy === 'status' ? statusColumns : priorityColumns;

  columns.forEach((column) => {
    const columnEl = document.createElement('div');
    columnEl.className = 'pm-kanban-column';
    columnEl.style.cssText = `
      width: 280px;
      background: var(--background-secondary);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 150px);
    `;

    // Header
    const header = document.createElement('div');
    header.className = 'pm-kanban-column-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--background-modifier-border);
    `;

    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    const dot = document.createElement('span');
    dot.style.cssText = `width: 8px; height: 8px; border-radius: 50%; background: ${column.color};`;
    titleRow.appendChild(dot);

    const title = document.createElement('span');
    title.textContent = column.label;
    title.style.cssText = 'font-weight: 600; font-size: 13px;';
    titleRow.appendChild(title);

    header.appendChild(titleRow);

    const count = document.createElement('span');
    count.className = 'pm-kanban-column-count';
    const columnEntities = entities.filter((e) =>
      groupBy === 'status' ? e.status === column.id : e.priority === column.id
    );
    count.textContent = String(columnEntities.length);
    count.style.cssText = `
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--background-primary);
      color: var(--text-muted);
    `;
    header.appendChild(count);
    columnEl.appendChild(header);

    // Cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'pm-kanban-cards';
    cardsContainer.style.cssText = `
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
      flex: 1;
    `;

    columnEntities.forEach((entity) => {
      const card = document.createElement('div');
      card.className = 'pm-kanban-card';
      card.style.cssText = `
        background: var(--background-primary);
        border-radius: 6px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.15s ease;
        border: 1px solid transparent;
      `;

      // Priority bar
      if (entity.priority && groupBy !== 'priority') {
        const priorityBar = document.createElement('div');
        priorityBar.style.cssText = `
          height: 3px;
          margin: -12px -12px 10px -12px;
          border-radius: 6px 6px 0 0;
          background: ${entity.priority === 'critical' ? '#ef4444' :
                       entity.priority === 'high' ? '#f97316' :
                       entity.priority === 'medium' ? '#eab308' : '#22c55e'};
        `;
        card.appendChild(priorityBar);
      }

      // Card header
      const cardHeader = document.createElement('div');
      cardHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;';

      const cardTitle = document.createElement('div');
      cardTitle.className = 'pm-kanban-card-title';
      cardTitle.textContent = entity.name;
      cardTitle.style.cssText = 'font-weight: 500; font-size: 13px; flex: 1;';
      cardHeader.appendChild(cardTitle);

      card.appendChild(cardHeader);

      // Content
      if (entity.tags?.length) {
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'pm-kanban-card-tags';
        tagsContainer.style.cssText = 'display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 10px;';
        entity.tags.slice(0, 3).forEach((tag: string) => {
          const t = document.createElement('span');
          t.className = 'pm-kanban-card-tag';
          t.textContent = tag;
          t.style.cssText = `
            padding: 1px 6px;
            background: var(--background-secondary);
            border-radius: 8px;
            font-size: 10px;
          `;
          tagsContainer.appendChild(t);
        });
        if (entity.tags.length > 3) {
          const more = document.createElement('span');
          more.className = 'pm-kanban-card-tag-more';
          more.textContent = `+${entity.tags.length - 3}`;
          more.style.cssText = 'font-size: 10px; color: var(--text-muted);';
          tagsContainer.appendChild(more);
        }
        card.appendChild(tagsContainer);
      }

      // Footer
      const footer = document.createElement('div');
      footer.className = 'pm-kanban-card-footer';
      footer.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
      `;

      if (entity.owner) {
        const owner = document.createElement('span');
        owner.className = 'pm-kanban-card-owner';
        owner.textContent = `@${entity.owner}`;
        owner.style.cssText = 'color: var(--text-accent);';
        footer.appendChild(owner);
      }

      if (entity.progress !== undefined) {
        const progressEl = document.createElement('div');
        progressEl.className = 'pm-kanban-card-progress';
        progressEl.style.cssText = 'display: flex; align-items: center; gap: 4px;';

        const bar = document.createElement('div');
        bar.className = 'pm-kanban-card-progress-bar';
        bar.style.cssText = 'width: 40px; height: 3px; background: var(--background-modifier-border); border-radius: 2px; overflow: hidden;';
        const fill = document.createElement('div');
        fill.className = 'pm-kanban-card-progress-fill';
        fill.style.cssText = `width: ${entity.progress}%; height: 100%; background: var(--interactive-accent);`;
        bar.appendChild(fill);

        const text = document.createElement('span');
        text.className = 'pm-kanban-card-progress-text';
        text.textContent = `${entity.progress}%`;
        text.style.cssText = 'color: var(--text-muted);';

        progressEl.appendChild(bar);
        progressEl.appendChild(text);
        footer.appendChild(progressEl);
      } else if (entity.endDate) {
        const due = document.createElement('span');
        due.className = 'pm-kanban-card-due';
        due.textContent = entity.endDate;
        due.style.cssText = 'color: var(--text-muted);';
        footer.appendChild(due);
      }

      card.appendChild(footer);

      // Hover effect
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--background-modifier-border)';
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'transparent';
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
      });

      cardsContainer.appendChild(card);
    });

    columnEl.appendChild(cardsContainer);
    board.appendChild(columnEl);
  });

  boardContainer.appendChild(board);
  container.appendChild(boardContainer);
  return container;
};

const meta: Meta<KanbanViewProps> = {
  title: 'Views/KanbanView',
  tags: ['autodocs'],
  render: (args) => createKanbanView(args),
  argTypes: {
    groupBy: { control: 'select', options: ['status', 'priority'] },
  },
};

export default meta;

type Story = StoryObj<KanbanViewProps>;

export const ByStatus: Story = {
  args: {
    title: '特性看板（按状态）',
    groupBy: 'status',
    entities: [
      createMockFeature({ name: '需求分析', status: 'completed', priority: 'high', progress: 100, owner: '张三', tags: ['分析'] }),
      createMockFeature({ name: '技术调研', status: 'completed', priority: 'medium', progress: 100, owner: '李四', tags: ['调研'] }),
      createMockFeature({ name: '数据库设计', status: 'in-progress', priority: 'critical', progress: 75, owner: '王五', tags: ['后端'] }),
      createMockFeature({ name: 'API 开发', status: 'in-progress', priority: 'high', progress: 60, owner: '赵六', tags: ['后端'] }),
      createMockFeature({ name: 'UI 设计', status: 'testing', priority: 'medium', progress: 90, owner: '钱七', tags: ['设计'] }),
      createMockFeature({ name: '前端开发', status: 'todo', priority: 'high', progress: 0, owner: '孙八', tags: ['前端'] }),
      createMockFeature({ name: '集成测试', status: 'backlog', priority: 'medium', progress: 0, owner: '周九', tags: ['测试'] }),
      createMockFeature({ name: '文档编写', status: 'backlog', priority: 'low', progress: 0, owner: '吴十', tags: ['文档'] }),
    ],
  },
};

export const ByPriority: Story = {
  args: {
    title: '特性看板（按优先级）',
    groupBy: 'priority',
    entities: [
      createMockFeature({ name: '支付系统集成', status: 'in-progress', priority: 'critical', progress: 40, owner: '张三' }),
      createMockFeature({ name: '用户登录安全', status: 'todo', priority: 'critical', progress: 0, owner: '李四' }),
      createMockFeature({ name: '订单管理', status: 'in-progress', priority: 'high', progress: 65, owner: '王五' }),
      createMockFeature({ name: '消息通知', status: 'testing', priority: 'high', progress: 85, owner: '赵六' }),
      createMockFeature({ name: '数据导出', status: 'todo', priority: 'medium', progress: 20, owner: '钱七' }),
      createMockFeature({ name: '搜索优化', status: 'completed', priority: 'medium', progress: 100, owner: '孙八' }),
      createMockFeature({ name: '主题切换', status: 'backlog', priority: 'low', progress: 0, owner: '周九' }),
    ],
  },
};

export const ProjectsByStatus: Story = {
  args: {
    title: '项目看板',
    groupBy: 'status',
    entities: [
      createMockProject({ name: '电商平台', status: 'in-progress', priority: 'critical', owner: '产品组' }),
      createMockProject({ name: 'CRM系统', status: 'in-progress', priority: 'high', owner: '张三' }),
      createMockProject({ name: 'BI报表', status: 'completed', priority: 'medium', owner: '李四' }),
      createMockProject({ name: '微信小程序', status: 'backlog', priority: 'high', owner: '王五' }),
    ],
  },
};

export const Empty: Story = {
  args: {
    title: '空看板',
    groupBy: 'status',
    entities: [],
  },
};
