export type VersionStatus = 'planning' | 'in-progress' | 'completed' | 'archived';

export interface Version {
  id: string;
  name: string;
  status: VersionStatus;
  owner?: string;
  startDate?: string;
  endDate?: string;
  tags: string[];
  estimatedHours?: number;
  actualHours?: number;
}

export interface CreateVersionData {
  name: string;
  status?: VersionStatus;
  owner?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
}

export interface UpdateVersionData {
  name?: string;
  status?: VersionStatus;
  owner?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
}
