import type { Meta, StoryObj } from '@storybook/html';
import { createMockVersion, createMockProject, createMockFeature } from '../../tests/setup';
import { EntityCard } from '../view-engine/components/EntityCard';
import { App } from '../__mocks__/obsidian';

const app = new App();

const meta: Meta = {
  title: 'Components/EntityCard',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

function createCardContainer(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'pm-view';
  container.style.cssText = 'padding: 20px; display: flex; gap: 20px; flex-wrap: wrap;';
  return container;
}

export const Feature: Story = {
  render: () => {
    const container = createCardContainer();
    const card = new EntityCard(app as any);
    card.render(
      container,
      createMockFeature({
        name: '实现用户登录功能',
        priority: 'high',
        status: 'in-progress',
        owner: '张三',
        progress: 65,
        endDate: '2024-04-20',
        tags: ['前端', '认证'],
      }),
      {
        showTypeIcon: true,
        showPriority: true,
        showStatus: true,
        showOwner: true,
        showProgress: true,
        showDueDate: true,
        showTags: true,
      }
    );
    return container;
  },
};

export const Project: Story = {
  render: () => {
    const container = createCardContainer();
    const card = new EntityCard(app as any);
    card.render(
      container,
      createMockProject({
        name: '后台管理系统',
        priority: 'high',
        status: 'in-progress',
        owner: '李四',
        endDate: '2024-05-01',
        tags: ['Web', '管理后台'],
      }),
      {
        showTypeIcon: true,
        showPriority: true,
        showStatus: true,
        showOwner: true,
        showDueDate: true,
        showTags: true,
      }
    );
    return container;
  },
};

export const Version: Story = {
  render: () => {
    const container = createCardContainer();
    const card = new EntityCard(app as any);
    card.render(
      container,
      createMockVersion({
        name: 'v2.0 大版本',
        status: 'in-progress',
        owner: '产品组',
        endDate: '2024-06-01',
        tags: ['大版本', '里程碑'],
      }),
      {
        showTypeIcon: true,
        showStatus: true,
        showOwner: true,
        showDueDate: true,
        showTags: true,
      }
    );
    return container;
  },
};

export const Compact: Story = {
  render: () => {
    const container = createCardContainer();
    const card = new EntityCard(app as any);
    card.render(
      container,
      createMockFeature({
        name: '快速修复 Bug',
        priority: 'critical',
        status: 'todo',
        progress: 0,
      }),
      {
        showTypeIcon: false,
        showPriority: true,
        showStatus: false,
        showOwner: false,
        showProgress: false,
        showDueDate: false,
        showTags: false,
        showDescription: false,
        smallTitle: true,
      }
    );
    return container;
  },
};

export const AllTypes: Story = {
  render: () => {
    const container = createCardContainer();

    const entities = [
      { entity: createMockVersion({ name: 'v1.0', status: 'completed' }), label: 'Version' },
      { entity: createMockProject({ name: 'Web 应用', status: 'in-progress', priority: 'high' }), label: 'Project' },
      { entity: createMockFeature({ name: '登录页面', status: 'todo', priority: 'medium', progress: 30 }), label: 'Feature' },
    ];

    entities.forEach(({ entity }) => {
      const card = new EntityCard(app as any);
      card.render(
        container,
        entity,
        {
          showTypeIcon: true,
          showPriority: true,
          showStatus: true,
          showOwner: true,
          showProgress: true,
          showDueDate: true,
          showTags: true,
        }
      );
    });

    return container;
  },
};

export const AllFieldsEnabled: Story = {
  render: () => {
    const container = createCardContainer();
    const card = new EntityCard(app as any);
    card.render(
      container,
      createMockFeature({
        name: '全字段展示验证卡片',
        priority: 'high',
        status: 'in-progress',
        owner: '张三',
        progress: 78,
        startDate: '2024-03-01',
        endDate: '2024-04-20',
        tags: ['前端', '认证', 'Obsidian', '重要'],
        description: '这是一个用于验证卡片在多字段勾选时布局是否优雅的长描述文本。需要确认底部信息栏能够正确换行而不发生重叠或溢出。',
        projectId: 'proj-test',
        versionId: 'ver-test',
      } as any),
      {
        showTypeIcon: true,
        showPriority: true,
        showStatus: true,
        showOwner: true,
        showStartDate: true,
        showDueDate: true,
        showProgress: true,
        showRisk: true,
        showLatestProgress: true,
        showTags: true,
        showDescription: true,
        showParent: true,
        showActions: true,
      },
      undefined,
      {
        latestProgress: '已完成核心逻辑开发，正在进行 UI 细节调整',
        riskSummary: {
          total: 3,
          open: 2,
          high: 1,
          medium: 1,
          low: 1,
          closed: 1,
        },
      } as any
    );
    return container;
  },
};

export const KanbanCardReadonly: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'pm-view';
    container.style.cssText = 'padding: 20px;';

    const board = document.createElement('div');
    board.className = 'pm-kanban-cards';
    board.style.cssText = 'width: 280px; background: var(--background-secondary); padding: 12px; border-radius: 8px;';

    const wrapper = document.createElement('div');
    wrapper.className = 'pm-kanban-card-wrapper';

    const card = new EntityCard(app as any);
    card.render(
      wrapper,
      createMockFeature({
        name: '看板卡片示例（只读）',
        priority: 'high',
        status: 'in-progress',
        owner: '李四',
        progress: 45,
        endDate: '2024-04-30',
        tags: ['后端', 'API'],
      }),
      {
        showTypeIcon: true,
        showPriority: true,
        showStatus: true,
        showOwner: true,
        showProgress: true,
        showDueDate: true,
        showTags: true,
        draggable: false,
        smallTitle: true,
        showActions: false,
      }
    );

    board.appendChild(wrapper);
    container.appendChild(board);
    return container;
  },
};
