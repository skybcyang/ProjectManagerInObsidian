import type { Meta, StoryObj } from '@storybook/html';
import { createMockFeature, createMockProject, createMockVersion } from '../../tests/setup';

interface GridViewProps {
  entities: any[];
  title: string;
  cols?: number;
}

const createGridView = ({ entities, title, cols = 3 }: GridViewProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view pm-grid-view';
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

  // Grid container
  const gridContainer = document.createElement('div');
  gridContainer.className = 'pm-grid-container';
  gridContainer.style.cssText = `
    display: grid;
    grid-template-columns: repeat(${cols}, 1fr);
    gap: 16px;
  `;

  entities.forEach((entity) => {
    const entityType = entity.progress !== undefined ? 'feature' :
                       entity.versionId !== undefined ? 'project' : 'version';

    const card = document.createElement('div');
    card.className = 'pm-grid-card';
    card.style.cssText = `
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    // Priority bar
    if (entity.priority) {
      const priorityBar = document.createElement('div');
      priorityBar.style.cssText = `
        height: 4px;
        background: ${entity.priority === 'critical' ? '#ef4444' :
                     entity.priority === 'high' ? '#f97316' :
                     entity.priority === 'medium' ? '#eab308' : '#22c55e'};
      `;
      card.appendChild(priorityBar);
    }

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--background-modifier-border-hover);
    `;

    const typeLabel = document.createElement('span');
    typeLabel.textContent = entityType === 'version' ? '版本' : entityType === 'project' ? '项目' : '特性';
    typeLabel.style.cssText = `
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--background-secondary);
      color: var(--text-muted);
    `;
    header.appendChild(typeLabel);

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 4px;';
    ['⚡', '↗'].forEach(icon => {
      const btn = document.createElement('button');
      btn.textContent = icon;
      btn.style.cssText = `
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        opacity: 0;
        transition: opacity 0.15s ease;
      `;
      actions.appendChild(btn);
    });
    header.appendChild(actions);
    card.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.style.cssText = 'padding: 16px;';

    const title = document.createElement('div');
    title.textContent = entity.name;
    title.style.cssText = 'font-weight: 600; font-size: 14px; margin-bottom: 8px;';
    body.appendChild(title);

    if (entity.description) {
      const desc = document.createElement('div');
      desc.textContent = entity.description;
      desc.style.cssText = 'font-size: 12px; color: var(--text-muted); margin-bottom: 12px;';
      body.appendChild(desc);
    }

    // Status badge
    if (entity.status) {
      const status = document.createElement('span');
      status.textContent = entity.status;
      status.style.cssText = `
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        background: ${entity.status === 'completed' ? '#22c55e20' :
                     entity.status === 'in-progress' ? '#3b82f620' : '#f59e0b20'};
        color: ${entity.status === 'completed' ? '#22c55e' :
                entity.status === 'in-progress' ? '#3b82f6' : '#f59e0b'};
      `;
      body.appendChild(status);
    }

    // Tags
    if (entity.tags?.length) {
      const tagsContainer = document.createElement('div');
      tagsContainer.style.cssText = 'display: flex; gap: 4px; flex-wrap: wrap; margin-top: 12px;';
      entity.tags.slice(0, 4).forEach((tag: string) => {
        const t = document.createElement('span');
        t.textContent = tag;
        t.style.cssText = `
          padding: 2px 8px;
          background: var(--background-secondary);
          border-radius: 10px;
          font-size: 10px;
        `;
        tagsContainer.appendChild(t);
      });
      if (entity.tags.length > 4) {
        const more = document.createElement('span');
        more.textContent = `+${entity.tags.length - 4}`;
        more.style.cssText = 'padding: 2px 8px; font-size: 10px; color: var(--text-muted);';
        tagsContainer.appendChild(more);
      }
      body.appendChild(tagsContainer);
    }

    card.appendChild(body);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-top: 1px solid var(--background-modifier-border-hover);
      font-size: 12px;
    `;

    const footerLeft = document.createElement('div');
    footerLeft.style.cssText = 'display: flex; gap: 8px; color: var(--text-muted);';

    if (entity.owner) {
      const owner = document.createElement('span');
      owner.textContent = `@${entity.owner}`;
      owner.style.cssText = 'color: var(--text-accent);';
      footerLeft.appendChild(owner);
    }

    if (entity.endDate) {
      const due = document.createElement('span');
      due.textContent = entity.endDate;
      footerLeft.appendChild(due);
    }

    footer.appendChild(footerLeft);

    if (entity.progress !== undefined) {
      const progressEl = document.createElement('div');
      progressEl.style.cssText = 'display: flex; align-items: center; gap: 6px;';

      const bar = document.createElement('div');
      bar.style.cssText = 'width: 50px; height: 4px; background: var(--background-modifier-border); border-radius: 2px; overflow: hidden;';
      const fill = document.createElement('div');
      fill.style.cssText = `width: ${entity.progress}%; height: 100%; background: var(--interactive-accent);`;
      bar.appendChild(fill);

      const text = document.createElement('span');
      text.textContent = `${entity.progress}%`;
      text.style.cssText = 'font-size: 11px; color: var(--text-muted);';

      progressEl.appendChild(bar);
      progressEl.appendChild(text);
      footer.appendChild(progressEl);
    }

    card.appendChild(footer);

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

    gridContainer.appendChild(card);
  });

  container.appendChild(gridContainer);
  return container;
};

const meta: Meta<GridViewProps> = {
  title: 'Views/GridView',
  tags: ['autodocs'],
  render: (args) => createGridView(args),
  argTypes: {
    cols: { control: { type: 'number', min: 1, max: 6 }, defaultValue: 3 },
  },
};

export default meta;

type Story = StoryObj<GridViewProps>;

export const Features: Story = {
  args: {
    title: '特性网格',
    cols: 3,
    entities: [
      createMockFeature({ name: '用户认证模块', priority: 'critical', status: 'in-progress', progress: 75, owner: '张三', endDate: '04-20', tags: ['后端', '安全'] }),
      createMockFeature({ name: '前端页面开发', priority: 'high', status: 'todo', progress: 30, owner: '李四', endDate: '04-25', tags: ['前端', 'UI'] }),
      createMockFeature({ name: 'API 接口设计', priority: 'medium', status: 'completed', progress: 100, owner: '王五', endDate: '04-15', tags: ['后端'] }),
      createMockFeature({ name: '数据库优化', priority: 'high', status: 'in-progress', progress: 60, owner: '张三', endDate: '04-22', tags: ['后端', '性能'] }),
      createMockFeature({ name: '单元测试补充', priority: 'low', status: 'backlog', progress: 0, owner: '赵六', endDate: '04-30', tags: ['测试'] }),
      createMockFeature({ name: '文档编写', priority: 'medium', status: 'todo', progress: 10, owner: '钱七', tags: ['文档'] }),
    ],
  },
};

export const Projects: Story = {
  args: {
    title: '项目网格',
    cols: 2,
    entities: [
      createMockProject({ name: 'Web 应用重构', priority: 'high', status: 'in-progress', owner: '张三', endDate: '05-01', tags: ['重构', 'Web'] }),
      createMockProject({ name: '移动端 App', priority: 'critical', status: 'in-progress', owner: '李四', endDate: '05-15', tags: ['iOS', 'Android'] }),
      createMockProject({ name: '后台管理系统', priority: 'medium', status: 'backlog', owner: '王五', endDate: '06-01', tags: ['后台'] }),
      createMockProject({ name: '数据分析平台', priority: 'high', status: 'backlog', owner: '赵六', tags: ['数据'] }),
    ],
  },
};

export const Mixed: Story = {
  args: {
    title: '所有实体',
    cols: 4,
    entities: [
      createMockVersion({ name: 'v2.0 大版本', status: 'archived', owner: '产品组', tags: ['大版本'] }),
      createMockProject({ name: 'Web 应用', priority: 'high', status: 'in-progress', owner: '张三' }),
      createMockFeature({ name: '登录功能', priority: 'critical', status: 'in-progress', progress: 80, owner: '李四' }),
      createMockFeature({ name: '注册页面', priority: 'medium', status: 'todo', progress: 20, owner: '王五' }),
      createMockVersion({ name: 'v1.5 补丁', status: 'completed', owner: '维护组' }),
      createMockProject({ name: 'API 服务', priority: 'high', status: 'completed', owner: '赵六' }),
      createMockFeature({ name: '密码重置', priority: 'medium', status: 'completed', progress: 100, owner: '钱七' }),
      createMockFeature({ name: '邮箱验证', priority: 'low', status: 'backlog', progress: 0, owner: '孙八' }),
    ],
  },
};

export const Empty: Story = {
  args: {
    title: '空网格',
    cols: 3,
    entities: [],
  },
};
