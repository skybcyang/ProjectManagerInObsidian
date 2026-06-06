/**
 * 设计令牌系统 (Design Tokens)
 * 统一的颜色、间距、字体、尺寸等设计常量
 */

import type { EntityType } from './types';

// ============================================
// 颜色令牌
// ============================================

export interface ColorToken {
  bg: string;
  text: string;
  label: string;
}

/** 优先级颜色 */
export const PRIORITY_COLORS: Record<string, ColorToken> = {
  critical: { bg: '#ef4444', text: '#ffffff', label: '紧急' },
  high:     { bg: '#f97316', text: '#ffffff', label: '高' },
  medium:   { bg: '#f59e0b', text: '#ffffff', label: '中' },
  low:      { bg: '#22c55e', text: '#ffffff', label: '低' },
};

/** 状态颜色 */
export const STATUS_COLORS: Record<string, ColorToken> = {
  backlog:       { bg: '#9ca3af', text: '#ffffff', label: '待处理' },
  todo:          { bg: '#3b82f6', text: '#ffffff', label: '待开始' },
  'in-progress': { bg: '#f59e0b', text: '#ffffff', label: '进行中' },
  testing:       { bg: '#8b5cf6', text: '#ffffff', label: '测试中' },
  completed:     { bg: '#22c55e', text: '#ffffff', label: '已完成' },
  archived:      { bg: '#6b7280', text: '#ffffff', label: '已归档' },
  // 版本/项目特有状态
  planning:      { bg: '#64748b', text: '#ffffff', label: '规划中' },
  active:        { bg: '#f59e0b', text: '#ffffff', label: '进行中' },
  suspended:     { bg: '#94a3b8', text: '#ffffff', label: '已暂停' },
};

/** 获取状态颜色 */
export function getStatusColor(status: string): ColorToken {
  return STATUS_COLORS[status] || { bg: '#9ca3af', text: '#ffffff', label: status };
}

/** 风险颜色 */
export const RISK_COLORS: Record<string, ColorToken> = {
  high:   { bg: '#ef4444', text: '#ffffff', label: '高' },
  medium: { bg: '#f59e0b', text: '#ffffff', label: '中' },
  low:    { bg: '#22c55e', text: '#ffffff', label: '低' },
};

/** 获取优先级颜色 */
export function getPriorityColor(priority: string): ColorToken {
  return PRIORITY_COLORS[priority] || { bg: '#9ca3af', text: '#ffffff', label: priority };
}

/** 获取风险颜色 */
export function getRiskColor(risk: string): ColorToken {
  return RISK_COLORS[risk] || { bg: '#9ca3af', text: '#ffffff', label: risk };
}

/** 翻译风险等级 */
export function translateRisk(risk: string): string {
  return RISK_COLORS[risk]?.label || risk;
}

/** 实体类型图标 */
export const ENTITY_ICONS: Record<EntityType | string, string> = {
  version: '📦',
  project: '📁',
  feature: '📝',
};

/** 获取实体类型图标 */
export function getEntityIcon(type: EntityType | string): string {
  return ENTITY_ICONS[type] || '📄';
}

/** 获取实体类型标签 */
export function getEntityLabel(type: EntityType | string): string {
  const labels: Record<string, string> = {
    version: '版本',
    project: '项目',
    feature: '特性',
  };
  return labels[type] || type;
}

// ============================================
// 日期格式化
// ============================================

export interface DateFormatter {
  /** 短格式: M/D (如 "4/6") */
  short(date: Date | string): string;
  /** 中等格式: YYYY/MM/DD (如 "2025/04/06") */
  medium(date: Date | string): string;
  /** 长格式: YYYY年M月D日 (如 "2025年4月6日") */
  long(date: Date | string): string;
  /** ISO格式: YYYY-MM-DD (如 "2025-04-06") */
  iso(date: Date | string): string;
  /** 相对日期: 今天/明天/昨天/3天后 */
  relative(date: Date | string): string;
}

function parseDate(date: Date | string): Date {
  if (date instanceof Date) return date;
  return new Date(date);
}

export const DateFormat: DateFormatter = {
  short(date: Date | string): string {
    const d = parseDate(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  },

  medium(date: Date | string): string {
    const d = parseDate(date);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  },

  long(date: Date | string): string {
    const d = parseDate(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  },

  iso(date: Date | string): string {
    const d = parseDate(date);
    return d.toISOString().split('T')[0];
  },

  relative(date: Date | string): string {
    const d = parseDate(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '明天';
    if (diffDays === -1) return '昨天';
    if (diffDays > 0) return `${diffDays}天后`;
    return `${Math.abs(diffDays)}天前`;
  },
};

/** 检查日期是否逾期 */
export function isOverdue(date: Date | string, status?: string): boolean {
  if (status === 'completed') return false;
  const d = parseDate(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d < now;
}

// ============================================
// 间距和尺寸令牌
// ============================================

export const Spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
} as const;

export const BorderRadius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
} as const;

export const FontSize = {
  xs: '11px',
  sm: '12px',
  md: '13px',
  lg: '14px',
  xl: '16px',
  '2xl': '18px',
} as const;

// ============================================
// 视图配置常量
// ============================================

/** 看板状态列定义 */
export const KANBAN_COLUMNS = [
  { id: 'backlog', label: '待处理', color: '#9ca3af' },
  { id: 'todo', label: '待开始', color: '#3b82f6' },
  { id: 'in-progress', label: '进行中', color: '#f59e0b' },
  { id: 'testing', label: '测试中', color: '#8b5cf6' },
  { id: 'completed', label: '已完成', color: '#22c55e' },
];

/** 优先级选项 */
export const PRIORITY_OPTIONS = [
  { id: 'critical', label: '紧急', color: '#ef4444' },
  { id: 'high', label: '高', color: '#f97316' },
  { id: 'medium', label: '中', color: '#f59e0b' },
  { id: 'low', label: '低', color: '#22c55e' },
];

/** 特性状态选项 */
export const FEATURE_STATUS_OPTIONS = [
  { id: 'backlog', label: '待处理', color: '#9ca3af' },
  { id: 'todo', label: '待开始', color: '#3b82f6' },
  { id: 'in-progress', label: '进行中', color: '#f59e0b' },
  { id: 'testing', label: '测试中', color: '#8b5cf6' },
  { id: 'completed', label: '已完成', color: '#22c55e' },
  { id: 'archived', label: '已归档', color: '#6b7280' },
];

/** 项目状态选项 */
export const PROJECT_STATUS_OPTIONS = [
  { id: 'backlog', label: '待处理', color: '#9ca3af' },
  { id: 'in-progress', label: '进行中', color: '#f59e0b' },
  { id: 'completed', label: '已完成', color: '#22c55e' },
  { id: 'archived', label: '已归档', color: '#6b7280' },
];

/** 版本状态选项 */
export const VERSION_STATUS_OPTIONS = [
  { id: 'planning', label: '规划中', color: '#64748b' },
  { id: 'in-progress', label: '进行中', color: '#f59e0b' },
  { id: 'completed', label: '已完成', color: '#22c55e' },
  { id: 'archived', label: '已归档', color: '#6b7280' },
];

// ============================================
// 文本翻译
// ============================================

/** 翻译状态文本 */
export function translateStatus(status: string): string {
  return STATUS_COLORS[status]?.label || status;
}

/** 翻译优先级文本 */
export function translatePriority(priority: string): string {
  return PRIORITY_COLORS[priority]?.label || priority;
}

// ============================================
// 导出完整设计令牌
// ============================================

export const DesignTokens = {
  color: {
    priority: PRIORITY_COLORS,
    status: STATUS_COLORS,
  },
  spacing: Spacing,
  borderRadius: BorderRadius,
  fontSize: FontSize,
  kanbanColumns: KANBAN_COLUMNS,
  priorityOptions: PRIORITY_OPTIONS,
  featureStatuses: FEATURE_STATUS_OPTIONS,
  projectStatuses: PROJECT_STATUS_OPTIONS,
  versionStatuses: VERSION_STATUS_OPTIONS,
} as const;

export default DesignTokens;
