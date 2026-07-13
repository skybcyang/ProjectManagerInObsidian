import type { Meta, StoryObj } from '@storybook/html';
import { createMockFeature, createMockProject, createMockVersion } from '../../tests/setup';
import { renderCascadeStory } from './utils';
import type { ViewConfig } from '../view-engine/types';

interface CascadeViewProps {
  config: ViewConfig;
}

const createCascadeView = ({ config }: CascadeViewProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view';
  container.style.cssText = 'padding: 20px; background: #1e1e1e; min-height: 100vh;';

  const versions = [
    createMockVersion({ id: 'ver-001', name: 'v2.0 大版本', status: 'in-progress', endDate: '2024-06-01' }),
    createMockVersion({ id: 'ver-002', name: 'v1.5 补丁', status: 'completed', endDate: '2024-03-15' }),
  ];

  const projects = [
    createMockProject({ id: 'proj-001', name: '用户系统重构', status: 'in-progress', versionId: 'ver-001' }),
    createMockProject({ id: 'proj-002', name: '支付模块', status: 'backlog', versionId: 'ver-001' }),
    createMockProject({ id: 'proj-003', name: 'Bug修复', status: 'completed', versionId: 'ver-002' }),
  ];

  const features = [
    createMockFeature({ id: 'feat-001', name: '登录优化', status: 'completed', priority: 'high', progress: 100, owner: '张三', versionId: 'ver-001', projectId: 'proj-001', endDate: '2024-04-15' }),
    createMockFeature({ id: 'feat-002', name: '权限管理', status: 'in-progress', priority: 'critical', progress: 75, owner: '李四', versionId: 'ver-001', projectId: 'proj-001', endDate: '2024-04-25' }),
    createMockFeature({ id: 'feat-003', name: '用户画像', status: 'todo', priority: 'medium', progress: 0, owner: '王五', versionId: 'ver-001', projectId: 'proj-001', endDate: '2024-05-10' }),
    createMockFeature({ id: 'feat-004', name: '支付宝集成', status: 'in-progress', priority: 'critical', progress: 60, owner: '赵六', versionId: 'ver-001', projectId: 'proj-002', endDate: '2024-04-30' }),
    createMockFeature({ id: 'feat-005', name: '微信支付', status: 'todo', priority: 'critical', progress: 0, owner: '钱七', versionId: 'ver-001', projectId: 'proj-002', endDate: '2024-05-05' }),
    createMockFeature({ id: 'feat-006', name: '修复内存泄漏', status: 'completed', priority: 'high', progress: 100, owner: '孙八', versionId: 'ver-002', projectId: 'proj-003' }),
    createMockFeature({ id: 'feat-007', name: '性能优化', status: 'completed', priority: 'medium', progress: 100, owner: '周九', versionId: 'ver-002', projectId: 'proj-003' }),
  ];

  // 同步返回容器，异步渲染真实视图
  renderCascadeStory(container, config, versions, projects, features).catch(() => {});
  return container;
};

const meta: Meta<CascadeViewProps> = {
  title: 'Views/CascadeView',
  tags: ['autodocs'],
  render: (args) => createCascadeView(args),
  argTypes: {
    config: { control: 'object' },
  },
};

export default meta;

type Story = StoryObj<CascadeViewProps>;

export const Default: Story = {
  args: {
    config: {
      mode: 'cascade',
      entityType: 'feature',
    },
  },
};

export const SingleVersion: Story = {
  args: {
    config: {
      mode: 'cascade',
      entityType: 'feature',
      versions: ['ver-002'],
    },
  },
};

export const Empty: Story = {
  args: {
    config: {
      mode: 'cascade',
      entityType: 'feature',
      versions: ['ver-not-exist'],
    },
  },
};
