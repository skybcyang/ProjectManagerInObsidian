/**
 * 模板类型定义
 */

/** 模板类型 */
export type TemplateType = 'overview' | 'version' | 'project' | 'feature';

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
}

/** 模板变量上下文 - 项目 */
export interface ProjectTemplateContext {
  id: string;
  name: string;
  versionId: string;
  status: string;
  owner?: string;
  priority: string;
  startDate?: string;
  endDate?: string;
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
  startDate?: string;
  endDate?: string;
  tags: string[];
  estimatedDays?: number;
  actualDays?: number;
  projectLink?: string;
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
  },
  project: {
    id: 'proj-homepage',
    name: '首页改版项目',
    versionId: 'ver-2026-q2',
    status: 'in-progress',
    owner: '李四',
    priority: 'high',
    startDate: '2026-04-01',
    endDate: '2026-05-15',
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
    startDate: '2026-04-01',
    endDate: '2026-04-15',
    tags: ['后端', '安全'],
    estimatedDays: 5,
    actualDays: 3,
  },
  overview: {
    date: new Date().toISOString().split('T')[0],
  },
};
