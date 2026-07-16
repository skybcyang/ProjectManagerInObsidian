/**
 * 变更日志类型定义
 * 用于追踪实体变更历史
 */

/** 实体类型 */
export type ChangeLogEntityType = 'version' | 'project' | 'feature' | 'requirement';

/** 变更动作类型 */
export type ChangeLogAction = 'create' | 'update' | 'delete';

/** 字段变更类型 */
export type FieldChangeType = 'added' | 'modified' | 'removed';

/** 字段级变更详情 */
export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  type: FieldChangeType;
}

/** 变更日志条目 */
export interface ChangeLogEntry {
  id: string;
  timestamp: number;
  entityType: ChangeLogEntityType;
  entityId: string;
  entityName: string;
  action: ChangeLogAction;
  changes: FieldChange[];
  operator?: string;
}

/** 查询选项 */
export interface LogQueryOptions {
  entityType?: ChangeLogEntityType;
  entityId?: string;
  action?: ChangeLogAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/** 变更统计 */
export interface ChangeLogStats {
  totalCount: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
  byEntityType: Record<ChangeLogEntityType, number>;
}
