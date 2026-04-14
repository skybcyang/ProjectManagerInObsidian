import type { Meta, StoryObj } from '@storybook/html';
import { createMockFeature, createMockProject, createMockVersion } from '../../tests/setup';

interface ListViewProps {
  entities: any[];
  title: string;
}

const createListView = ({ entities, title }: ListViewProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view pm-list-view';
  container.style.cssText = 'padding: 20px; background: #1e1e1e; min-height: 100vh;';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'pm-view-toolbar';
  toolbar.style.marginBottom = '16px';

  const titleEl = document.createElement('div');
  titleEl.className = 'pm-view-title';
  titleEl.textContent = title;
  toolbar.appendChild(titleEl);

  const stats = document.createElement('div');
  stats.className = 'pm-view-stats';
  stats.textContent = `${entities.length} 个实体`;
  toolbar.appendChild(stats);

  container.appendChild(toolbar);

  // List container
  const listContainer = document.createElement('div');
  listContainer.className = 'pm-list-container';

  // Header
  const header = document.createElement('div');
  header.className = 'pm-list-header';
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--background-secondary);
    border-radius: 8px 8px 0 0;
    border-bottom: 1px solid var(--background-modifier-border);
  `;

  const count = document.createElement('span');
  count.textContent = `共 ${entities.length} 个实体`;
  count.style.cssText = 'font-size: 13px; color: var(--text-muted);';
  header.appendChild(count);

  const sortControl = document.createElement('div');
  sortControl.style.cssText = 'display: flex; gap: 8px; align-items: center;';

  const sortSelect = document.createElement('select');
  sortSelect.style.cssText = `
    padding: 4px 12px;
    border-radius: 6px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-primary);
    color: var(--text-normal);
    font-size: 13px;
  `;
  ['名称', '状态', '优先级', '进度'].forEach(opt => {
    const option = document.createElement('option');
    option.textContent = opt;
    sortSelect.appendChild(option);
  });

  const orderBtn = document.createElement('button');
  orderBtn.textContent = '↑';
  orderBtn.style.cssText = `
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-primary);
    cursor: pointer;
  `;

  sortControl.appendChild(sortSelect);
  sortControl.appendChild(orderBtn);
  header.appendChild(sortControl);
  listContainer.appendChild(header);

  // Cards
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'pm-list-cards';

  entities.forEach((entity) => {
    const entityType = entity.progress !== undefined ? 'feature' :
                       entity.versionId !== undefined ? 'project' : 'version';

    const card = document.createElement('div');
    card.className = 'pm-list-card';
    card.style.cssText = `
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: var(--background-primary);
      border-bottom: 1px solid var(--background-modifier-border-hover);
      cursor: pointer;
      transition: background 0.15s ease;
    `;

    // Priority bar
    if (entity.priority) {
      const priorityBar = document.createElement('div');
      priorityBar.style.cssText = `
        width: 3px;
        height: 40px;
        border-radius: 2px;
        margin-right: 12px;
        background: ${entity.priority === 'critical' ? '#ef4444' :
                     entity.priority === 'high' ? '#f97316' :
                     entity.priority === 'medium' ? '#eab308' : '#22c55e'};
      `;
      card.appendChild(priorityBar);
    }

    // Content
    const content = document.createElement('div');
    content.style.cssText = 'display: flex; align-items: center; flex: 1; gap: 16px;';

    // Type icon
    const icon = document.createElement('span');
    icon.textContent = entityType === 'version' ? '📁' : entityType === 'project' ? '📂' : '📄';
    content.appendChild(icon);

    // Title section
    const titleSection = document.createElement('div');
    titleSection.style.cssText = 'flex: 1;';

    const title = document.createElement('div');
    title.textContent = entity.name;
    title.style.cssText = 'font-weight: 500; font-size: 14px;';
    titleSection.appendChild(title);

    if (entity.versionId || entity.projectId) {
      const subtitle = document.createElement('div');
      subtitle.textContent = entity.versionId ? `版本: ${entity.versionId}` : `项目: ${entity.projectId}`;
      subtitle.style.cssText = 'font-size: 12px; color: var(--text-muted); margin-top: 2px;';
      titleSection.appendChild(subtitle);
    }

    content.appendChild(titleSection);

    // Meta
    const meta = document.createElement('div');
    meta.style.cssText = 'display: flex; align-items: center; gap: 12px;';

    if (entity.status) {
      const status = document.createElement('span');
      status.textContent = entity.status;
      status.style.cssText = `
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        background: ${entity.status === 'completed' ? '#22c55e20' :
                     entity.status === 'in-progress' ? '#3b82f620' : '#f59e0b20'};
        color: ${entity.status === 'completed' ? '#22c55e' :
                entity.status === 'in-progress' ? '#3b82f6' : '#f59e0b'};
      `;
      meta.appendChild(status);
    }

    if (entity.progress !== undefined) {
      const progress = document.createElement('div');
      progress.style.cssText = 'display: flex; align-items: center; gap: 6px; width: 80px;';

      const bar = document.createElement('div');
      bar.style.cssText = 'flex: 1; height: 4px; background: var(--background-modifier-border); border-radius: 2px; overflow: hidden;';
      const fill = document.createElement('div');
      fill.style.cssText = `width: ${entity.progress}%; height: 100%; background: var(--interactive-accent);`;
      bar.appendChild(fill);

      const text = document.createElement('span');
      text.textContent = `${entity.progress}%`;
      text.style.cssText = 'font-size: 11px; color: var(--text-muted); min-width: 28px;';

      progress.appendChild(bar);
      progress.appendChild(text);
      meta.appendChild(progress);
    }

    if (entity.owner) {
      const owner = document.createElement('span');
      owner.textContent = `@${entity.owner}`;
      owner.style.cssText = 'font-size: 12px; color: var(--text-accent);';
      meta.appendChild(owner);
    }

    if (entity.endDate) {
      const due = document.createElement('span');
      due.textContent = entity.endDate;
      due.style.cssText = 'font-size: 11px; color: var(--text-muted);';
      meta.appendChild(due);
    }

    content.appendChild(meta);

    // Actions
    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 4px; margin-left: 12px;';

    ['⚡', '↗'].forEach(icon => {
      const btn = document.createElement('button');
      btn.textContent = icon;
      btn.style.cssText = `
        width: 28px;
        height: 28px;
        border: none;
        background: var(--background-secondary);
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        opacity: 0;
        transition: opacity 0.15s ease;
      `;
      actions.appendChild(btn);
    });

    card.appendChild(content);
    card.appendChild(actions);

    // Hover effect
    card.addEventListener('mouseenter', () => {
      actions.querySelectorAll('button').forEach(btn => {
        (btn as HTMLElement).style.opacity = '1';
      });
    });
    card.addEventListener('mouseleave', () => {
      actions.querySelectorAll('button').forEach(btn => {
        (btn as HTMLElement).style.opacity = '0';
      });
    });

    cardsContainer.appendChild(card);
  });

  listContainer.appendChild(cardsContainer);
  container.appendChild(listContainer);

  return container;
};

const meta: Meta<ListViewProps> = {
  title: 'Views/ListView',
  tags: ['autodocs'],
  render: (args) => createListView(args),
};

export default meta;

type Story = StoryObj<ListViewProps>;

export const Features: Story = {
  args: {
    title: '特性列表',
    entities: [
      createMockFeature({ name: '用户认证模块', priority: 'critical', status: 'in-progress', progress: 75, owner: '张三', endDate: '04-20' }),
      createMockFeature({ name: '前端页面开发', priority: 'high', status: 'todo', progress: 30, owner: '李四', endDate: '04-25' }),
      createMockFeature({ name: 'API 接口设计', priority: 'medium', status: 'completed', progress: 100, owner: '王五', endDate: '04-15' }),
      createMockFeature({ name: '数据库优化', priority: 'high', status: 'in-progress', progress: 60, owner: '张三', endDate: '04-22' }),
      createMockFeature({ name: '单元测试补充', priority: 'low', status: 'backlog', progress: 0, owner: '赵六', endDate: '04-30' }),
    ],
  },
};

export const Projects: Story = {
  args: {
    title: '项目列表',
    entities: [
      createMockProject({ name: 'Web 应用重构', priority: 'high', status: 'in-progress', owner: '张三', endDate: '05-01' }),
      createMockProject({ name: '移动端 App', priority: 'critical', status: 'in-progress', owner: '李四', endDate: '05-15' }),
      createMockProject({ name: '后台管理系统', priority: 'medium', status: 'backlog', owner: '王五', endDate: '06-01' }),
    ],
  },
};

export const Mixed: Story = {
  args: {
    title: '所有实体',
    entities: [
      createMockVersion({ name: 'v2.0 大版本', status: 'archived', owner: '产品组' }),
      createMockProject({ name: 'Web 应用', priority: 'high', status: 'in-progress', owner: '张三' }),
      createMockFeature({ name: '登录功能', priority: 'critical', status: 'in-progress', progress: 80, owner: '李四' }),
      createMockFeature({ name: '注册页面', priority: 'medium', status: 'todo', progress: 20, owner: '王五' }),
    ],
  },
};

export const Empty: Story = {
  args: {
    title: '空列表',
    entities: [],
  },
};
