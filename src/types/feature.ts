import type { IPDPhaseValue } from '../constants';

export type FeatureStatus = 'backlog' | 'todo' | 'in-progress' | 'testing' | 'completed' | 'archived';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface Feature {
  id: string;
  name: string;
  versionId: string;
  projectId: string;
  status: FeatureStatus;
  owner?: string;
  priority: Priority;
  tags: string[];
  progress: number;
  dueDate?: string;
  startDate?: string;
  isMilestone?: boolean;
  
  // === IPD扩展字段 ===
  /** 特性交付的TR阶段 */
  trPhase?: IPDPhaseValue;
}

export interface CreateFeatureData {
  name: string;
  versionId: string;
  projectId: string;
  status?: FeatureStatus;
  owner?: string;
  priority?: Priority;
  tags?: string[];
  progress?: number;
  dueDate?: string;
  startDate?: string;
  isMilestone?: boolean;
  trPhase?: IPDPhaseValue;
}

export interface UpdateFeatureData {
  name?: string;
  versionId?: string;
  projectId?: string;
  status?: FeatureStatus;
  owner?: string;
  priority?: Priority;
  tags?: string[];
  progress?: number;
  dueDate?: string;
  startDate?: string;
  isMilestone?: boolean;
  trPhase?: IPDPhaseValue;
}
