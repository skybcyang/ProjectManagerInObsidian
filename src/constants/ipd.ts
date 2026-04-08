/**
 * IPD阶段枚举 (TR3-TR6)
 */
export const IPD_PHASES = [
  { value: 'tr3', label: 'TR3', description: '需求锁定', color: '#3498db' },
  { value: 'tr4', label: 'TR4', description: '开发完成', color: '#9b59b6' },
  { value: 'tr4a', label: 'TR4A', description: '转测完成', color: '#f39c12' },
  { value: 'tr5', label: 'TR5', description: '质量工程', color: '#e67e22' },
  { value: 'tr6', label: 'TR6', description: '发布准备', color: '#27ae60' },
] as const;

export type IPDPhaseValue = typeof IPD_PHASES[number]['value'];

/**
 * TR状态枚举
 */
export const TR_STATUSES = [
  { value: 'not-started', label: '未开始', emoji: '⏳', color: 'var(--text-muted)' },
  { value: 'in-progress', label: '进行中', emoji: '🔄', color: 'var(--text-accent)' },
  { value: 'passed', label: '已通过', emoji: '✅', color: 'var(--text-success)' },
  { value: 'blocked', label: '阻塞', emoji: '⚠️', color: 'var(--text-error)' },
] as const;

export type TRStatusValue = typeof TR_STATUSES[number]['value'];

/**
 * 默认交付件配置（可自定义）
 */
export const DEFAULT_TR_DELIVERABLES: Record<IPDPhaseValue, string[]> = {
  'tr3': [
    '需求规格说明书',
    '技术方案评审',
    '接口定义文档',
  ],
  'tr4': [
    '代码开发完成',
    'UT测试报告',
    '代码评审记录',
  ],
  'tr4a': [
    'ST测试通过',
    'Bug清零计划',
    '测试报告',
  ],
  'tr5': [
    '性能基线达标',
    '稳定性测试通过',
    '功耗测试报告',
  ],
  'tr6': [
    '发布评审通过',
    '版本发布说明',
    '运维文档',
  ],
};

/**
 * 获取IPD阶段标签
 */
export function getIPDPhaseLabel(phase: string): string {
  const found = IPD_PHASES.find(p => p.value === phase);
  return found?.label ?? phase;
}

/**
 * 获取IPD阶段描述
 */
export function getIPDPhaseDescription(phase: string): string {
  const found = IPD_PHASES.find(p => p.value === phase);
  return found?.description ?? '';
}

/**
 * 获取IPD阶段颜色
 */
export function getIPDPhaseColor(phase: string): string {
  const found = IPD_PHASES.find(p => p.value === phase);
  return found?.color ?? 'var(--text-muted)';
}

/**
 * 获取TR状态标签
 */
export function getTRStatusLabel(status: string): string {
  const found = TR_STATUSES.find(s => s.value === status);
  return found?.label ?? status;
}

/**
 * 获取TR状态emoji
 */
export function getTRStatusEmoji(status: string): string {
  const found = TR_STATUSES.find(s => s.value === status);
  return found?.emoji ?? '⏳';
}

/**
 * 获取TR状态颜色
 */
export function getTRStatusColor(status: string): string {
  const found = TR_STATUSES.find(s => s.value === status);
  return found?.color ?? 'var(--text-muted)';
}

/**
 * 获取默认交付件清单
 */
export function getDefaultDeliverables(phase: IPDPhaseValue): string[] {
  return DEFAULT_TR_DELIVERABLES[phase] ?? [];
}

/**
 * 创建默认TR检查点
 */
export function createDefaultTRCheckpoints(): Array<{
  phase: IPDPhaseValue;
  status: TRStatusValue;
  deliverables: string[];
  risks: string[];
}> {
  return IPD_PHASES.map(phase => ({
    phase: phase.value,
    status: 'not-started' as TRStatusValue,
    deliverables: getDefaultDeliverables(phase.value),
    risks: [],
  }));
}

/**
 * 预警提前天数
 */
export const TR_WARNING_DAYS = 7;
