/**
 * 模板类型定义
 */

import type { IPDPhaseValue, TRStatusValue } from '../constants';

/** 模板类型 */
export type TemplateType = 'overview' | 'version' | 'project' | 'feature';

/** TR检查点模板上下文 */
export interface TRCheckpointTemplateContext {
  phase: IPDPhaseValue;
  status: TRStatusValue;
  plannedDate?: string;
  actualDate?: string;
  deliverables: string[];
  risks: string[];
}

/** 模板配置 */
export interface TemplateConfig {
  /** 总览页面模板 */
  overview: string;
  /** 版本页面模板 */
  version: string;
  /** 项目页面模板 */
  project: string;
  /** 特性页面模板 */
  feature: string;
}

/** 模板变量上下文 - 版本 */
export interface VersionTemplateContext {
  id: string;
  name: string;
  status: string;
  owner?: string;
  startDate?: string;
  endDate?: string;
  tags: string[];
  // IPD扩展字段
  phase?: IPDPhaseValue;
  trCheckpoints?: TRCheckpointTemplateContext[];
  targetDate?: string;
}

/** 模板变量上下文 - 项目 */
export interface ProjectTemplateContext {
  id: string;
  name: string;
  versionId: string;
  status: string;
  owner?: string;
  priority: string;
  tags: string[];
}

/** 模板变量上下文 - 特性 */
export interface FeatureTemplateContext {
  id: string;
  name: string;
  versionId: string;
  projectId: string;
  status: string;
  owner?: string;
  priority: string;
  progress: number;
  dueDate?: string;
  tags: string[];
  // IPD扩展字段
  trPhase?: IPDPhaseValue;
}

/** 模板变量上下文 - 总览 */
export interface OverviewTemplateContext {
  date: string;
}

/** 模板变量上下文联合类型 */
export type TemplateContext = 
  | VersionTemplateContext 
  | ProjectTemplateContext 
  | FeatureTemplateContext 
  | OverviewTemplateContext;

/** 插件设置 */
export interface ProjectManagerSettings {
  /** 是否启用自定义模板 */
  enableCustomTemplates: boolean;
  /** 自定义模板配置 */
  customTemplates: Partial<TemplateConfig>;
  /** 模板文件路径（可选，优先级高于内置配置） */
  templateFolder?: string;
}

/** 默认设置 */
export const DEFAULT_SETTINGS: ProjectManagerSettings = {
  enableCustomTemplates: false,
  customTemplates: {},
};

/** 示例数据 - 用于模板预览 */
export const PREVIEW_EXAMPLES = {
  version: {
    id: 'ver-2026-q2',
    name: '2026 Q2 版本',
    status: 'planning',
    owner: '张三',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    tags: ['重要', '移动端'],
    phase: 'tr4',
    trCheckpoints: [
      { phase: 'tr3', status: 'passed', plannedDate: '2026-04-01', actualDate: '2026-03-28', deliverables: ['需求规格说明书'], risks: [] },
      { phase: 'tr4', status: 'in-progress', plannedDate: '2026-05-01', deliverables: ['代码开发完成'], risks: ['进度稍有延迟'] },
    ],
    targetDate: '2026-06-30',
  },
  project: {
    id: 'proj-homepage',
    name: '首页改版项目',
    versionId: 'ver-2026-q2',
    status: 'in-progress',
    owner: '李四',
    priority: 'high',
    tags: ['前端', 'UI'],
  },
  feature: {
    id: 'feat-login',
    name: '登录功能优化',
    versionId: 'ver-2026-q2',
    projectId: 'proj-homepage',
    status: 'in-progress',
    owner: '王五',
    priority: 'critical',
    progress: 65,
    dueDate: '2026-04-15',
    tags: ['后端', '安全'],
    trPhase: 'tr4',
  },
  overview: {
    date: new Date().toISOString().split('T')[0],
  },
};
