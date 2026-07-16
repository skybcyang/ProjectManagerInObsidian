export type RequirementStatus = 'backlog' | 'todo' | 'in-progress' | 'testing' | 'completed' | 'archived';

export interface Requirement {
  id: string;
  name: string;
  type: 'requirement';
  versionId: string;
  projectId?: string;
  status: RequirementStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  owner?: string;
  startDate?: string;
  endDate?: string;
  tags: string[];
  progress: number;
  estimatedDays?: number;
  actualDays?: number;
  description?: string;
  featureId?: string;
}

export interface CreateRequirementData {
  name: string;
  versionId: string;
  projectId?: string;
  status?: RequirementStatus;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  owner?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  progress?: number;
  estimatedDays?: number;
  actualDays?: number;
  description?: string;
  featureId?: string;
}

export interface UpdateRequirementData {
  name?: string;
  versionId?: string;
  projectId?: string;
  status?: RequirementStatus;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  owner?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  progress?: number;
  estimatedDays?: number;
  actualDays?: number;
  description?: string;
  featureId?: string;
}
