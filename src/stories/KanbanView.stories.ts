import type { Meta, StoryObj } from '@storybook/html';
import { createMockFeature, createMockProject, createMockRequirement } from '../../tests/setup';
import { renderKanbanStory } from './utils';
import type { ViewConfig } from '../view-engine/types';
import type { Requirement } from '../types';

interface KanbanViewProps {
  config: ViewConfig;
  title: string;
  requirements?: Requirement[];
}

const createKanbanView = ({ config, title, requirements = [] }: KanbanViewProps & { requirements?: ReturnType<typeof createMockRequirement>[] }): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view';
  container.style.cssText = 'padding: 20px; background: #1e1e1e; min-height: 100vh;';

  const toolbar = document.createElement('div');
  toolbar.className = 'pm-view-toolbar';
  toolbar.style.marginBottom = '16px';

  const titleEl = document.createElement('div');
  titleEl.className = 'pm-view-title';
  titleEl.textContent = title;
  toolbar.appendChild(titleEl);

  const groupLabel = document.createElement('div');
  groupLabel.className = 'pm-view-stats';
  groupLabel.textContent = `分组: ${config.groupBy === 'priority' ? '优先级' : '状态'}`;
  toolbar.appendChild(groupLabel);

  container.appendChild(toolbar);

  const contentArea = document.createElement('div');
  contentArea.className = 'pm-view-content';
  container.appendChild(contentArea);

  const features = [
    createMockFeature({ name: '需求分析', status: 'completed', priority: 'high', progress: 100, owner: '张三', tags: ['分析'] }),
    createMockFeature({ name: '技术调研', status: 'completed', priority: 'medium', progress: 100, owner: '李四', tags: ['调研'] }),
    createMockFeature({ name: '数据库设计', status: 'in-progress', priority: 'critical', progress: 75, owner: '王五', tags: ['后端'] }),
    createMockFeature({ name: 'API 开发', status: 'in-progress', priority: 'high', progress: 60, owner: '赵六', tags: ['后端'] }),
    createMockFeature({ name: 'UI 设计', status: 'testing', priority: 'medium', progress: 90, owner: '钱七', tags: ['设计'] }),
    createMockFeature({ name: '前端开发', status: 'todo', priority: 'high', progress: 0, owner: '孙八', tags: ['前端'] }),
    createMockFeature({ name: '集成测试', status: 'backlog', priority: 'medium', progress: 0, owner: '周九', tags: ['测试'] }),
    createMockFeature({ name: '文档编写', status: 'backlog', priority: 'low', progress: 0, owner: '吴十', tags: ['文档'] }),
  ];

  // 同步返回容器，异步渲染真实视图
  renderKanbanStory(contentArea, config, [], [], features, requirements).catch(() => {});
  return container;
};

const meta: Meta<KanbanViewProps> = {
  title: 'Views/KanbanView',
  tags: ['autodocs'],
  render: (args) => createKanbanView(args),
  argTypes: {
    config: { control: 'object' },
  },
};

export default meta;

type Story = StoryObj<KanbanViewProps>;

export const ByStatus: Story = {
  args: {
    title: '特性看板（按状态）',
    config: {
      mode: 'kanban',
      entityType: 'feature',
      groupBy: 'status',
      cardFields: {
        required: ['name', 'priority'],
        optional: ['status', 'owner', 'progress', 'endDate', 'tags', 'risk'],
      },
    },
  },
};

export const ByPriority: Story = {
  args: {
    title: '特性看板（按优先级）',
    config: {
      mode: 'kanban',
      entityType: 'feature',
      groupBy: 'priority',
      cardFields: {
        required: ['name', 'priority'],
        optional: ['status', 'owner', 'progress', 'endDate', 'tags', 'risk'],
      },
    },
  },
};

export const Empty: Story = {
  args: {
    title: '空看板',
    config: {
      mode: 'kanban',
      entityType: 'feature',
      groupBy: 'status',
    },
  },
};

export const RequirementByStatus: Story = {
  args: {
    title: '需求看板（按状态）',
    config: {
      mode: 'kanban',
      entityType: 'requirement',
      groupBy: 'status',
      cardFields: {
        required: ['name', 'priority'],
        optional: ['status', 'owner', 'progress', 'endDate', 'tags'],
      },
    },
    requirements: [
      createMockRequirement({ name: '注册流程优化', status: 'completed', priority: 'high', progress: 100, owner: '张三', tags: ['需求'] }),
      createMockRequirement({ name: '登录页第三方授权', status: 'in-progress', priority: 'critical', progress: 60, owner: '李四', tags: ['需求'] }),
      createMockRequirement({ name: '首页个性化推荐', status: 'todo', priority: 'high', progress: 0, owner: '王五', tags: ['需求'] }),
      createMockRequirement({ name: '消息已读回执', status: 'backlog', priority: 'medium', progress: 0, owner: '赵六', tags: ['需求'] }),
      createMockRequirement({ name: '接口限流熔断', status: 'testing', priority: 'high', progress: 90, owner: '钱七', tags: ['需求'] }),
    ],
  },
};
