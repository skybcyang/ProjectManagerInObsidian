export type { Version, VersionStatus, CreateVersionData, UpdateVersionData } from './version';
export type { Project, ProjectStatus, CreateProjectData, UpdateProjectData } from './project';
export type { Feature, FeatureStatus, CreateFeatureData, UpdateFeatureData } from './feature';
export type { Priority } from './feature';
export type { RiskLevel, RiskItem, ProgressLogItem, RiskSummary, EntityLogSummary } from './risk';

/**
 * 通用实体基础接口
 * 所有实体（Version、Project、Feature）共享的字段
 */
export interface EntityBase {
  id: string;
  name: string;
  status: string;
  owner?: string;
  tags: string[];
  startDate?: string;
  endDate?: string;
  estimatedHours?: number;
  actualHours?: number;
}
export type { 
  TemplateType, 
  TemplateConfig, 
  TemplateContext,
  VersionTemplateContext,
  ProjectTemplateContext,
  FeatureTemplateContext,
  OverviewTemplateContext,
  ProjectManagerSettings 
} from './template';
export { DEFAULT_SETTINGS } from './template';
export type {
  ChangeLogEntry,
  ChangeLogEntityType,
  ChangeLogAction,
  FieldChange,
  LogQueryOptions,
  ChangeLogStats
} from './changelog';
