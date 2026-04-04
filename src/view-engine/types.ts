import type { MarkdownPostProcessorContext } from 'obsidian';
import type { Version, Project, Feature } from '../types';

/**
 * 视图引擎类型定义
 */

// 视图模式
export type ViewMode = 'kanban' | 'grid' | 'cascade' | 'timeline' | 'calendar';

// 实体类型
export type EntityType = 'version' | 'project' | 'feature';

// 视图上下文
export interface ViewContext {
  sourcePath: string;
  el: HTMLElement;
  ctx?: MarkdownPostProcessorContext;
}

// 通用视图配置
export interface ViewConfig {
  // 视图模式
  mode: ViewMode;
  
  // 标题
  title?: string;
  
  // 数据源
  type?: EntityType;
  id?: string;
  filter?: {
    status?: string;
    priority?: string;
    owner?: string;
    tag?: string;
    versionId?: string;
    projectId?: string;
  };
  
  // 排序
  sortBy?: 'name' | 'dueDate' | 'priority' | 'progress' | 'created';
  sortOrder?: 'asc' | 'desc';
  
  // 限制
  limit?: number;
  
  // 分组
  groupBy?: 'status' | 'priority' | 'version' | 'project';
  showStats?: boolean;
  inlineEdit?: boolean;
  
  // 网格特有
  cols?: 1 | 2 | 3 | 4;
  
  // 级联特有
  expanded?: boolean;
  maxProjects?: number;
  maxFeaturesPerProject?: number;
  
  // 看板特有
  cardStyle?: 'default' | 'compact';
  
  // 时间线特有
  direction?: 'horizontal' | 'vertical';
  
  // 允许额外属性
  [key: string]: any;
}

// 渲染器接口
export interface ViewRenderer {
  readonly viewType: ViewMode;
  render(container: HTMLElement, entities: Entity[], config: ViewConfig): Promise<void>;
}

// 实体联合类型 - 使用原始类型
export type Entity = Version | Project | Feature;

// 统计数据
export interface StatsData {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  completed: number;
  inProgress: number;
  averageProgress: number;
  overdue: number;
}

// 级联数据结构
export interface CascadeVersionData {
  type: 'version';
  entity: Version;
  projects: CascadeProjectData[];
  stats: {
    totalProjects: number;
    totalFeatures: number;
    completedProjects: number;
    completedFeatures: number;
  };
}

export interface CascadeProjectData {
  entity: Project;
  features: Feature[];
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    testing: number;
    todo: number;
    averageProgress: number;
    overdue: number;
    upcoming: number;
  };
}

// 帮助函数：获取实体类型
export function getEntityType(entity: Entity): EntityType {
  if ('versionId' in entity && entity.versionId !== undefined) {
    return 'project';
  }
  if ('projectId' in entity && entity.projectId !== undefined) {
    return 'feature';
  }
  return 'version';
}

// 重新导出原始类型
export type { Version, Project, Feature };
