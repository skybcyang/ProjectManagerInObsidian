/**
 * 版本状态枚举
 */
export const VERSION_STATUSES = [
  { value: 'planning', label: '规划中', color: 'var(--text-muted)' },
  { value: 'in-progress', label: '进行中', color: 'var(--text-accent)' },
  { value: 'completed', label: '已完成', color: 'var(--text-success)' },
  { value: 'archived', label: '已归档', color: 'var(--text-faint)' },
] as const;

export type VersionStatusValue = typeof VERSION_STATUSES[number]['value'];

/**
 * 项目状态枚举
 */
export const PROJECT_STATUSES = [
  { value: 'backlog', label: '待规划', color: 'var(--text-muted)' },
  { value: 'in-progress', label: '进行中', color: 'var(--text-accent)' },
  { value: 'completed', label: '已完成', color: 'var(--text-success)' },
  { value: 'archived', label: '已归档', color: 'var(--text-faint)' },
] as const;

export type ProjectStatusValue = typeof PROJECT_STATUSES[number]['value'];

/**
 * 特性状态枚举
 */
export const FEATURE_STATUSES = [
  { value: 'backlog', label: '待规划', color: 'var(--text-muted)' },
  { value: 'todo', label: '待办', color: 'var(--text-muted)' },
  { value: 'in-progress', label: '进行中', color: 'var(--text-accent)' },
  { value: 'testing', label: '测试中', color: 'var(--text-warning)' },
  { value: 'completed', label: '已完成', color: 'var(--text-success)' },
  { value: 'archived', label: '已归档', color: 'var(--text-faint)' },
] as const;

export type FeatureStatusValue = typeof FEATURE_STATUSES[number]['value'];

/**
 * 需求状态枚举
 */
export const REQUIREMENT_STATUSES = [
  { value: 'backlog', label: '待规划', color: 'var(--text-muted)' },
  { value: 'todo', label: '待办', color: 'var(--text-muted)' },
  { value: 'in-progress', label: '进行中', color: 'var(--text-accent)' },
  { value: 'testing', label: '测试中', color: 'var(--text-warning)' },
  { value: 'completed', label: '已完成', color: 'var(--text-success)' },
  { value: 'archived', label: '已归档', color: 'var(--text-faint)' },
] as const;

export type RequirementStatusValue = typeof REQUIREMENT_STATUSES[number]['value'];

/**
 * 获取状态标签
 */
export function getStatusLabel(status: string, type: 'version' | 'project' | 'feature' | 'requirement' = 'feature'): string {
  let statuses;
  switch (type) {
    case 'version':
      statuses = VERSION_STATUSES;
      break;
    case 'project':
      statuses = PROJECT_STATUSES;
      break;
    case 'requirement':
      statuses = REQUIREMENT_STATUSES;
      break;
    case 'feature':
    default:
      statuses = FEATURE_STATUSES;
      break;
  }
  const found = statuses.find(s => s.value === status);
  return found?.label ?? status;
}

/**
 * 获取状态颜色
 */
export function getStatusColor(status: string, type: 'version' | 'project' | 'feature' | 'requirement' = 'feature'): string {
  let statuses;
  switch (type) {
    case 'version':
      statuses = VERSION_STATUSES;
      break;
    case 'project':
      statuses = PROJECT_STATUSES;
      break;
    case 'requirement':
      statuses = REQUIREMENT_STATUSES;
      break;
    case 'feature':
    default:
      statuses = FEATURE_STATUSES;
      break;
  }
  const found = statuses.find(s => s.value === status);
  return found?.color ?? 'var(--text-muted)';
}
