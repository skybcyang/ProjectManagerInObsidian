import type { MarkdownPostProcessorContext } from 'obsidian';
import type { Version, Project, Feature } from '../types';

/**
 * 视图引擎类型定义 - 简化版
 */

// 视图模式
export type ViewMode = 'kanban' | 'list' | 'cascade' | 'timeview' | 'workload';

// 视图模式显示名称
export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  'kanban': '📊 看板视图',
  'list': '📋 列表视图',
  'cascade': '🌲 级联视图',
  'timeview': '🗓️ 时间视图',
  'workload': '⚖️ 工作量统计'
};

// 实体类型
export type EntityType = 'version' | 'project' | 'feature';

// 视图上下文
export interface ViewContext {
  sourcePath: string;
  el: HTMLElement;
  ctx?: MarkdownPostProcessorContext;
  codeBlockIndex?: number;
}

// 列配置（列表/网格视图用）
export interface ColumnConfig {
  field: string;           // 字段名
  width?: number;          // 列宽（像素）
  visible: boolean;        // 是否显示
  align?: 'left' | 'center' | 'right';  // 对齐方式
}

// 筛选条件
export interface FilterCondition {
  field: string;
  operator: 'equals' | 'not' | 'contains' | 'gt' | 'lt' | 'in' | 'isEmpty' | 'isNotEmpty';
  value?: string | number | boolean | string[];
}

// 筛选条件组
export interface FilterGroup {
  operator: 'and' | 'or';
  conditions: FilterCondition[];
}

// 排序配置
export interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

// 视图选项
export interface ViewOptions {
  expanded?: boolean;              // 级联视图展开
  maxProjects?: number;            // 级联视图最大项目数
  maxFeaturesPerProject?: number;  // 级联视图每个项目最大特性数
}

// EntityCard 显示字段配置
export interface CardFieldsConfig {
  required: string[];    // 必选字段，始终显示（如 name, priority）
  optional: string[];    // 可选字段，用户可选择显示
}

// 列表视图列配置
export type ListColumnField = 'name' | 'status' | 'priority' | 'owner' | 'startDate' | 'endDate' | 'progress' | 'tags' | 'versionId' | 'projectId' | 'risk' | 'latestProgress';

// EntityCard 可配置字段定义
export const ENTITY_CARD_FIELD_DEFINITIONS = [
  { key: 'name', label: '名称', required: true },
  { key: 'priority', label: '优先级', required: true },
  { key: 'status', label: '状态徽章', required: false },
  { key: 'owner', label: '负责人', required: false },
  { key: 'startDate', label: '开始日期', required: false },
  { key: 'endDate', label: '结束日期', required: false },
  { key: 'progress', label: '进度条', required: false },
  { key: 'risk', label: '风险徽章', required: false },
  { key: 'latestProgress', label: '最新进展', required: false },
  { key: 'tags', label: '标签', required: false },
  { key: 'description', label: '描述', required: false },
  { key: 'parent', label: '父级信息', required: false },
  { key: 'typeIcon', label: '类型图标', required: false },
  { key: 'stats', label: '统计信息', required: false },
  { key: 'actions', label: '操作按钮', required: false },
] as const;

// 列表视图字段定义
export const LIST_COLUMN_DEFINITIONS = [
  { key: 'name', label: '名称', required: true },
  { key: 'status', label: '状态', required: false },
  { key: 'priority', label: '优先级', required: false },
  { key: 'owner', label: '负责人', required: false },
  { key: 'startDate', label: '开始日期', required: false },
  { key: 'endDate', label: '结束日期', required: false },
  { key: 'progress', label: '进度', required: false },
  { key: 'risk', label: '风险', required: false },
  { key: 'latestProgress', label: '最新进展', required: false },
  { key: 'tags', label: '标签', required: false },
  { key: 'versionId', label: '版本', required: false },
  { key: 'projectId', label: '项目', required: false },
] as const;

// 通用视图配置 - 新版
export interface ViewConfig {
  // 视图模式
  mode: ViewMode;

  // 标题
  title?: string;

  // 实体类型筛选
  entityType?: EntityType;

  // 单个实体筛选（兼容旧配置）
  version?: string;      // 版本ID筛选
  project?: string;      // 项目ID筛选
  feature?: string;      // 特性ID筛选（单卡片模式）

  // 多实体筛选（支持列表）
  versions?: string[];   // 版本ID列表筛选
  projects?: string[];   // 项目ID列表筛选
  features?: string[];   // 特性ID列表筛选

  // 筛选条件（新版组合筛选）
  filters?: FilterGroup[];

  // 旧版筛选（向后兼容）
  status?: string;       // 状态筛选
  priority?: string;     // 优先级筛选
  owner?: string;        // 负责人筛选
  tag?: string;          // 标签筛选

  // 排序（新版支持多字段）
  sorts?: SortConfig[];

  // 旧版排序（向后兼容）
  sortBy?: 'name' | 'status' | 'startDate' | 'endDate' | 'priority' | 'progress' | 'created';
  sortOrder?: 'asc' | 'desc';

  // 显示列配置（列表/网格视图用）
  columns?: ColumnConfig[];

  // 限制
  limit?: number;

  // 分组（看板/级联/日历用）
  groupBy?: 'status' | 'priority' | 'version' | 'project' | 'startDate' | 'endDate';

  // 视图选项
  options?: ViewOptions;

  // 列表视图列配置
  listColumns?: ListColumnField[];

  // EntityCard 显示字段配置
  cardFields?: CardFieldsConfig;

  // 级联配置
  expanded?: boolean;
  maxProjects?: number;
  maxFeaturesPerProject?: number;
}

// 渲染器接口
export interface ViewRenderer {
  readonly viewType: ViewMode;
  render(container: HTMLElement, entities: Entity[], config: ViewConfig): Promise<void>;
}

// 实体联合类型
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

// ==================== 报表数据类型 ====================

/** 工作量数据 */
export interface WorkloadData {
  name: string;
  estimated: number;
  actual: number;
  remaining: number;
  taskCount: number;
  efficiency: number;
}

/** 趋势数据点 */
export interface TrendDataPoint {
  date: string;
  count: number;
}

/** 项目健康度指标 */
export interface HealthMetrics {
  totalFeatures: number;
  completedFeatures: number;
  completionRate: number;
  overdueCount: number;
  overdueRate: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  hoursVariance: number;
  avgProgress: number;
  riskLevel: 'low' | 'medium' | 'high';
}

// 帮助函数：获取实体类型
export function getEntityType(entity: Entity): EntityType {
  // 必须先检查 projectId，因为 feature 也有 versionId
  if ('projectId' in entity && entity.projectId !== undefined) {
    return 'feature';
  }
  if ('versionId' in entity && entity.versionId !== undefined) {
    return 'project';
  }
  return 'version';
}

// 实体字段定义（用于列配置和内联编辑）
export interface EntityField {
  name: string;           // 字段名
  label: string;          // 显示标签
  type: 'text' | 'select' | 'date' | 'number' | 'multi-select' | 'progress' | 'entity';
  options?: string[];     // 可选项（select/multi-select 用）
  editable: boolean;      // 是否可编辑
  sortable: boolean;      // 是否可排序
  filterable: boolean;    // 是否可筛选
}

// 特性字段定义
export const FEATURE_FIELDS: EntityField[] = [
  { name: 'name', label: '名称', type: 'text', editable: true, sortable: true, filterable: true },
  { name: 'status', label: '状态', type: 'select', options: ['backlog', 'todo', 'in-progress', 'testing', 'completed', 'archived'], editable: true, sortable: true, filterable: true },
  { name: 'priority', label: '优先级', type: 'select', options: ['critical', 'high', 'medium', 'low'], editable: true, sortable: true, filterable: true },
  { name: 'owner', label: '负责人', type: 'text', editable: true, sortable: true, filterable: true },
  { name: 'startDate', label: '开始日期', type: 'date', editable: true, sortable: true, filterable: true },
  { name: 'endDate', label: '结束日期', type: 'date', editable: true, sortable: true, filterable: true },
  { name: 'progress', label: '进度', type: 'progress', editable: true, sortable: true, filterable: false },
  { name: 'estimatedHours', label: '预估工时', type: 'number', editable: true, sortable: true, filterable: false },
  { name: 'actualHours', label: '实际工时', type: 'number', editable: true, sortable: true, filterable: false },
  { name: 'tags', label: '标签', type: 'multi-select', editable: true, sortable: false, filterable: true },
  { name: 'versionId', label: '版本', type: 'entity', editable: true, sortable: true, filterable: true },
  { name: 'projectId', label: '项目', type: 'entity', editable: true, sortable: true, filterable: true },
];

// 项目字段定义
export const PROJECT_FIELDS: EntityField[] = [
  { name: 'name', label: '名称', type: 'text', editable: true, sortable: true, filterable: true },
  { name: 'status', label: '状态', type: 'select', options: ['backlog', 'in-progress', 'completed', 'archived'], editable: true, sortable: true, filterable: true },
  { name: 'priority', label: '优先级', type: 'select', options: ['critical', 'high', 'medium', 'low'], editable: true, sortable: true, filterable: true },
  { name: 'owner', label: '负责人', type: 'text', editable: true, sortable: true, filterable: true },
  { name: 'startDate', label: '开始日期', type: 'date', editable: true, sortable: true, filterable: true },
  { name: 'endDate', label: '结束日期', type: 'date', editable: true, sortable: true, filterable: true },
  { name: 'tags', label: '标签', type: 'multi-select', editable: true, sortable: false, filterable: true },
  { name: 'versionId', label: '版本', type: 'entity', editable: true, sortable: true, filterable: true },
];

// 版本字段定义
export const VERSION_FIELDS: EntityField[] = [
  { name: 'name', label: '名称', type: 'text', editable: true, sortable: true, filterable: true },
  { name: 'status', label: '状态', type: 'select', options: ['planning', 'in-progress', 'completed', 'archived'], editable: true, sortable: true, filterable: true },
  { name: 'owner', label: '负责人', type: 'text', editable: true, sortable: true, filterable: true },
  { name: 'startDate', label: '开始日期', type: 'date', editable: true, sortable: true, filterable: true },
  { name: 'endDate', label: '结束日期', type: 'date', editable: true, sortable: true, filterable: true },
  { name: 'tags', label: '标签', type: 'multi-select', editable: true, sortable: false, filterable: true },
];

// 获取实体字段定义
export function getEntityFields(entityType: EntityType): EntityField[] {
  switch (entityType) {
    case 'feature':
      return FEATURE_FIELDS;
    case 'project':
      return PROJECT_FIELDS;
    case 'version':
      return VERSION_FIELDS;
    default:
      return [];
  }
}

// 重新导出原始类型
export type { Version, Project, Feature };
