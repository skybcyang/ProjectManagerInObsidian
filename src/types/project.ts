export type ProjectStatus = 'backlog' | 'in-progress' | 'completed' | 'archived';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface Project {
  id: string;
  name: string;
  versionId: string;  // 必填，项目必须关联版本
  status: ProjectStatus;
  owner?: string;
  priority: Priority;
  startDate?: string;
  endDate?: string;
  tags: string[];
  estimatedHours?: number;
  actualHours?: number;
}

export interface CreateProjectData {
  name: string;
  versionId: string;  // 必填
  status?: ProjectStatus;
  owner?: string;
  priority?: Priority;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
}

export interface UpdateProjectData {
  name?: string;
  versionId?: string;
  status?: ProjectStatus;
  owner?: string;
  priority?: Priority;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
}
