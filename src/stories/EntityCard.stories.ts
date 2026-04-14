import type { Meta, StoryObj } from '@storybook/html';
import { createMockVersion, createMockProject, createMockFeature } from '../../tests/setup';

interface EntityCardProps {
  entity: any;
  options: any;
}

const createEntityCard = ({ entity, options }: EntityCardProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view';
  container.style.cssText = 'padding: 20px; background: #1e1e1e; display: flex; gap: 20px; flex-wrap: wrap;';

  const entityType = entity.progress !== undefined ? 'feature' :
                     entity.versionId !== undefined ? 'project' : 'version';

  const card = document.createElement('div');
  card.className = `pm-entity-card pm-entity-card--${entityType}`;
  card.style.cssText = `
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    padding: 16px;
    width: 280px;
    cursor: pointer;
    transition: all 0.2s ease;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;';

  if (options.showTypeIcon) {
    const icon = document.createElement('span');
    icon.textContent = entityType === 'version' ? '📁' : entityType === 'project' ? '📂' : '📄';
    header.appendChild(icon);
  }

  if (options.showPriority && entity.priority) {
    const priority = document.createElement('span');
    priority.textContent = '●';
    priority.style.color = entity.priority === 'critical' ? '#ef4444' :
                           entity.priority === 'high' ? '#f97316' :
                           entity.priority === 'medium' ? '#eab308' : '#22c55e';
    header.appendChild(priority);
  }

  const title = document.createElement('h3');
  title.textContent = entity.name;
  title.style.cssText = 'margin: 0; font-size: 14px; font-weight: 600; flex: 1;';
  header.appendChild(title);

  if (options.showStatus && entity.status) {
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
    header.appendChild(status);
  }

  card.appendChild(header);

  // Body
  if (options.showDescription && entity.description) {
    const desc = document.createElement('div');
    desc.textContent = entity.description;
    desc.style.cssText = 'font-size: 12px; color: var(--text-muted); margin-bottom: 12px;';
    card.appendChild(desc);
  }

  if (options.showTags && entity.tags?.length) {
    const tags = document.createElement('div');
    tags.style.cssText = 'display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px;';
    entity.tags.slice(0, 3).forEach((tag: string) => {
      const t = document.createElement('span');
      t.textContent = tag;
      t.style.cssText = 'padding: 2px 8px; background: var(--background-secondary); border-radius: 10px; font-size: 10px;';
      tags.appendChild(t);
    });
    card.appendChild(tags);
  }

  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

  const left = document.createElement('div');
  left.style.cssText = 'display: flex; gap: 8px; align-items: center;';

  if (options.showOwner && entity.owner) {
    const owner = document.createElement('span');
    owner.textContent = `@${entity.owner}`;
    owner.style.cssText = 'font-size: 12px; color: var(--text-accent);';
    left.appendChild(owner);
  }

  if (options.showDueDate && entity.endDate) {
    const due = document.createElement('span');
    due.textContent = entity.endDate;
    due.style.cssText = 'font-size: 11px; color: var(--text-muted);';
    left.appendChild(due);
  }

  footer.appendChild(left);

  if (options.showProgress && entity.progress !== undefined) {
    const progress = document.createElement('div');
    progress.style.cssText = 'display: flex; align-items: center; gap: 6px;';

    const bar = document.createElement('div');
    bar.style.cssText = 'width: 60px; height: 4px; background: var(--background-modifier-border); border-radius: 2px; overflow: hidden;';
    const fill = document.createElement('div');
    fill.style.cssText = `width: ${entity.progress}%; height: 100%; background: var(--interactive-accent);`;
    bar.appendChild(fill);

    const text = document.createElement('span');
    text.textContent = `${entity.progress}%`;
    text.style.cssText = 'font-size: 11px; color: var(--text-muted);';

    progress.appendChild(bar);
    progress.appendChild(text);
    footer.appendChild(progress);
  }

  card.appendChild(footer);
  container.appendChild(card);

  return container;
};

const meta: Meta<EntityCardProps> = {
  title: 'Components/EntityCard',
  tags: ['autodocs'],
  render: (args) => createEntityCard(args),
  argTypes: {
    entity: { control: 'object' },
    options: { control: 'object' },
  },
};

export default meta;

type Story = StoryObj<EntityCardProps>;

export const Feature: Story = {
  args: {
    entity: createMockFeature({
      name: '实现用户登录功能',
      priority: 'high',
      status: 'in-progress',
      owner: '张三',
      progress: 65,
      endDate: '2024-04-20',
      tags: ['前端', '认证'],
    }),
    options: {
      showTypeIcon: true,
      showPriority: true,
      showStatus: true,
      showOwner: true,
      showProgress: true,
      showDueDate: true,
      showTags: true,
    },
  },
};

export const Project: Story = {
  args: {
    entity: createMockProject({
      name: '后台管理系统',
      priority: 'high',
      status: 'in-progress',
      owner: '李四',
      endDate: '2024-05-01',
      tags: ['Web', '管理后台'],
    }),
    options: {
      showTypeIcon: true,
      showPriority: true,
      showStatus: true,
      showOwner: true,
      showDueDate: true,
      showTags: true,
    },
  },
};

export const Version: Story = {
  args: {
    entity: createMockVersion({
      name: 'v2.0 大版本',
      status: 'in-progress',
      owner: '产品组',
      endDate: '2024-06-01',
      tags: ['大版本', '里程碑'],
    }),
    options: {
      showTypeIcon: true,
      showStatus: true,
      showOwner: true,
      showDueDate: true,
      showTags: true,
    },
  },
};

export const Compact: Story = {
  args: {
    entity: createMockFeature({
      name: '快速修复 Bug',
      priority: 'critical',
      status: 'todo',
      progress: 0,
    }),
    options: {
      showTypeIcon: false,
      showPriority: true,
      showStatus: false,
      showOwner: false,
      showProgress: false,
      showDueDate: false,
      showTags: false,
      showDescription: false,
    },
  },
};

export const AllTypes: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'pm-view';
    container.style.cssText = 'padding: 20px; background: #1e1e1e;';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; gap: 20px; flex-wrap: wrap;';

    const entities = [
      { entity: createMockVersion({ name: 'v1.0', status: 'completed' }), label: 'Version' },
      { entity: createMockProject({ name: 'Web 应用', status: 'in-progress', priority: 'high' }), label: 'Project' },
      { entity: createMockFeature({ name: '登录页面', status: 'todo', priority: 'medium', progress: 30 }), label: 'Feature' },
    ];

    entities.forEach(({ entity, label }) => {
      const card = createEntityCard({
        entity,
        options: {
          showTypeIcon: true,
          showPriority: true,
          showStatus: true,
          showOwner: true,
          showProgress: true,
          showDueDate: true,
          showTags: true,
        },
      });
      const labelEl = document.createElement('div');
      labelEl.textContent = label;
      labelEl.style.cssText = 'text-align: center; margin-bottom: 8px; color: var(--text-muted); font-size: 12px;';
      const wrap = document.createElement('div');
      wrap.appendChild(labelEl);
      wrap.appendChild(card.firstElementChild!);
      wrapper.appendChild(wrap);
    });

    container.appendChild(wrapper);
    return container;
  },
};
