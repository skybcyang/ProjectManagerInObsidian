import type { Meta, StoryObj } from '@storybook/html';
import { createMockFeature, createMockProject } from '../../tests/setup';
import { renderTimeViewStory } from './utils';
import type { ViewConfig, TimeViewMode, TimeGroupBy } from '../view-engine/types';

interface TimeViewProps {
  config: ViewConfig;
}

const createTimeView = ({ config }: TimeViewProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view';
  container.style.cssText = 'padding: 20px; background: #1e1e1e; min-height: 100vh;';

  const projects = [
    createMockProject({ id: 'proj-001', name: '电商平台', status: 'in-progress', priority: 'critical', owner: '产品组' }),
    createMockProject({ id: 'proj-002', name: 'CRM系统', status: 'in-progress', priority: 'high', owner: '张三' }),
  ];

  const features = [
    createMockFeature({ id: 'feat-001', name: '需求分析', status: 'completed', priority: 'high', progress: 100, owner: '张三', versionId: 'ver-001', projectId: 'proj-001', startDate: '2024-04-01', endDate: '2024-04-05' }),
    createMockFeature({ id: 'feat-002', name: '数据库设计', status: 'in-progress', priority: 'critical', progress: 75, owner: '张三', versionId: 'ver-001', projectId: 'proj-001', startDate: '2024-04-06', endDate: '2024-04-12' }),
    createMockFeature({ id: 'feat-003', name: 'API 开发', status: 'in-progress', priority: 'high', progress: 60, owner: '李四', versionId: 'ver-001', projectId: 'proj-001', startDate: '2024-04-08', endDate: '2024-04-18' }),
    createMockFeature({ id: 'feat-004', name: 'UI 设计', status: 'testing', priority: 'medium', progress: 90, owner: '王五', versionId: 'ver-001', projectId: 'proj-002', startDate: '2024-04-10', endDate: '2024-04-16' }),
    createMockFeature({ id: 'feat-005', name: '前端开发', status: 'todo', priority: 'high', progress: 0, owner: '李四', versionId: 'ver-001', projectId: 'proj-002', startDate: '2024-04-15', endDate: '2024-04-25' }),
    createMockFeature({ id: 'feat-006', name: '集成测试', status: 'backlog', priority: 'medium', progress: 0, owner: '王五', versionId: 'ver-001', projectId: 'proj-002', startDate: '2024-04-20', endDate: '2024-04-28' }),
  ];

  // 同步返回容器，异步渲染真实视图
  renderTimeViewStory(container, config, [], projects, features).catch(() => {});
  return container;
};

const meta: Meta<TimeViewProps> = {
  title: 'Views/TimeView',
  tags: ['autodocs'],
  render: (args) => createTimeView(args),
  argTypes: {
    config: { control: 'object' },
  },
};

export default meta;

type Story = StoryObj<TimeViewProps>;

export const ByOwner: Story = {
  args: {
    config: {
      mode: 'timeview',
      entityType: 'feature',
      timeGroupBy: 'owner' as TimeGroupBy,
      timeViewMode: 'month' as TimeViewMode,
      timeViewDate: '2024-04-15',
    },
  },
};

export const ByProjectExpanded: Story = {
  args: {
    config: {
      mode: 'timeview',
      entityType: 'feature',
      timeGroupBy: 'project' as TimeGroupBy,
      timeViewMode: 'month' as TimeViewMode,
      timeViewDate: '2024-04-15',
      collapsedGroups: [],
    },
  },
};

export const ByProjectCollapsed: Story = {
  args: {
    config: {
      mode: 'timeview',
      entityType: 'feature',
      timeGroupBy: 'project' as TimeGroupBy,
      timeViewMode: 'month' as TimeViewMode,
      timeViewDate: '2024-04-15',
      collapsedGroups: ['proj-002'],
    },
  },
};

export const WeekView: Story = {
  args: {
    config: {
      mode: 'timeview',
      entityType: 'feature',
      timeGroupBy: 'owner' as TimeGroupBy,
      timeViewMode: 'week' as TimeViewMode,
      timeViewDate: '2024-04-15',
    },
  },
};

export const YearView: Story = {
  args: {
    config: {
      mode: 'timeview',
      entityType: 'feature',
      timeGroupBy: 'owner' as TimeGroupBy,
      timeViewMode: 'year' as TimeViewMode,
      timeViewDate: '2024-04-15',
    },
  },
};
