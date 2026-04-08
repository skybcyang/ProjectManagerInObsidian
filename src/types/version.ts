import type { IPDPhaseValue, TRStatusValue } from '../constants';

export type VersionStatus = 'planning' | 'in-progress' | 'completed' | 'archived';

/**
 * TR检查点
 */
export interface TRCheckpoint {
  phase: IPDPhaseValue;
  status: TRStatusValue;
  plannedDate?: string;
  actualDate?: string;
  deliverables: string[];
  risks: string[];
}

export interface Version {
  id: string;
  name: string;
  status: VersionStatus;
  
  // === IPD扩展字段 ===
  /** 当前TR阶段 */
  phase?: IPDPhaseValue;
  /** TR检查点列表 */
  trCheckpoints?: TRCheckpoint[];
  /** TR6目标发布日期 */
  targetDate?: string;
  
  owner?: string;
  startDate?: string;
  endDate?: string;
  tags: string[];
}

export interface CreateVersionData {
  name: string;
  status?: VersionStatus;
  phase?: IPDPhaseValue;
  trCheckpoints?: TRCheckpoint[];
  targetDate?: string;
  owner?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

export interface UpdateVersionData {
  name?: string;
  status?: VersionStatus;
  phase?: IPDPhaseValue;
  trCheckpoints?: TRCheckpoint[];
  targetDate?: string;
  owner?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
}
