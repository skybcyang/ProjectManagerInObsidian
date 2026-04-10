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
  startDate?: string;
  endDate?: string;
  isMilestone?: boolean;
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
  startDate?: string;
  endDate?: string;
  isMilestone?: boolean;
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
  startDate?: string;
  endDate?: string;
  isMilestone?: boolean;
}
