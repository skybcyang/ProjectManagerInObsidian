/**
 * 优先级枚举
 */
export const PRIORITIES = [
  { value: 'critical', label: '紧急', color: '#ef4444' },
  { value: 'high', label: '高', color: '#f97316' },
  { value: 'medium', label: '中', color: '#3b82f6' },
  { value: 'low', label: '低', color: '#22c55e' },
] as const;

export type PriorityValue = typeof PRIORITIES[number]['value'];

/**
 * 获取优先级标签
 */
export function getPriorityLabel(priority: string): string {
  const found = PRIORITIES.find(p => p.value === priority);
  return found?.label ?? priority;
}

/**
 * 获取优先级颜色
 */
export function getPriorityColor(priority: string): string {
  const found = PRIORITIES.find(p => p.value === priority);
  return found?.color ?? 'var(--text-muted)';
}

/**
 * 优先级排序权重
 */
export const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};
