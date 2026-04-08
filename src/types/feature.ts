export type FeatureStatus = 'backlog' | 'todo' | 'in-progress' | 'testing' | 'completed' | 'archived';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface Feature {
  id: string;
  name: string;
  versionId: string;  // 必填
  projectId: string;  // 必填
  status: FeatureStatus;
  owner?: string;
  priority: Priority;
  tags: string[];
  progress: number;
  dueDate?: string;
  startDate?: string;      // 开始日期，用于时间视图规划
  isMilestone?: boolean;   // 手动标记为里程碑
}

export interface CreateFeatureData {
  name: string;
  versionId: string;  // 必填
  projectId: string;  // 必填
  status?: FeatureStatus;
  owner?: string;
  priority?: Priority;
  tags?: string[];
  progress?: number;
  dueDate?: string;
  startDate?: string;      // 开始日期
  isMilestone?: boolean;   // 标记为里程碑
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
  startDate?: string;      // 开始日期
  isMilestone?: boolean;   // 标记为里程碑
}
