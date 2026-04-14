import { App } from 'obsidian';
import type { Version, Project, Feature, FeatureStatus } from '../types';

/**
 * Dataview 查询过滤器
 */
export interface FeatureFilters {
  versionId?: string;
  projectId?: string;
  status?: FeatureStatus;
}

export interface ProjectFilters {
  versionId?: string;
  status?: string;
}

/**
 * Dataview API 接口定义
 */
interface DataviewApi {
  page(path: string): Record<string, unknown> | undefined;
  pages(query?: string): Array<Record<string, unknown>>;
  table(headers: string[], rows: unknown[][]): void;
}

/**
 * Dataview 插件接口
 */
interface DataviewPlugin {
  api: DataviewApi;
}

/**
 * DataviewService
 * 封装 Dataview API 的调用，提供查询功能
 * 当 Dataview 未安装时自动降级到手动遍历
 */
export class DataviewService {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  /**
   * 检查 Dataview 插件是否可用
   */
  isAvailable(): boolean {
    // @ts-ignore - Obsidian 插件 API 没有类型定义
    const dataview = this.app.plugins.getPlugin('dataview');
    return !!dataview && !!(dataview as DataviewPlugin).api;
  }

  /**
   * 获取 Dataview API
   */
  private getDataviewApi(): DataviewApi | null {
    if (!this.isAvailable()) return null;
    // @ts-ignore
    const dataview = this.app.plugins.getPlugin('dataview') as DataviewPlugin;
    return dataview.api;
  }

  /**
   * 获取 Dataview 页面元数据
   * @param path 文件路径
   * @returns 页面元数据或 null
   */
  getPageMetadata(path: string): Record<string, unknown> | null {
    const api = this.getDataviewApi();
    if (!api) return null;
    return api.page(path) || null;
  }

  /**
   * 使用 Dataview 查询版本
   * 降级方案：使用 app.vault 遍历文件
   */
  async queryVersions(): Promise<Version[]> {
    const api = this.getDataviewApi();
    if (api) {
      return this.queryVersionsWithDataview(api);
    }
    return this.fallbackQueryVersions();
  }

  /**
   * 使用 Dataview API 查询版本
   */
  private async queryVersionsWithDataview(api: DataviewApi): Promise<Version[]> {
    const pages = api.pages('"ProjectManager/Versions"');
    return pages.map(page => this.parseVersionFromPage(page)).filter((v): v is Version => v !== null);
  }

  /**
   * 降级方案：手动遍历查询版本
   */
  private async fallbackQueryVersions(): Promise<Version[]> {
    const files = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith('ProjectManager/Versions/'));
    const versions: Version[] = [];

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter) continue;

      const version = this.parseVersionFromFrontmatter(cache.frontmatter, file.path);
      if (version) versions.push(version);
    }

    return versions;
  }

  /**
   * 使用 Dataview 查询项目
   * 降级方案：使用 app.vault 遍历文件
   */
  async queryProjects(filters?: ProjectFilters): Promise<Project[]> {
    const api = this.getDataviewApi();
    if (api) {
      return this.queryProjectsWithDataview(api, filters);
    }
    return this.fallbackQueryProjects(filters);
  }

  /**
   * 使用 Dataview API 查询项目
   */
  private async queryProjectsWithDataview(api: DataviewApi, filters?: ProjectFilters): Promise<Project[]> {
    const pages = api.pages('"ProjectManager/Projects"');
    let projects = pages.map(page => this.parseProjectFromPage(page)).filter((p): p is Project => p !== null);

    // 应用过滤器
    if (filters?.versionId) {
      projects = projects.filter(p => p.versionId === filters.versionId);
    }
    if (filters?.status) {
      projects = projects.filter(p => p.status === filters.status);
    }

    return projects;
  }

  /**
   * 降级方案：手动遍历查询项目
   */
  private async fallbackQueryProjects(filters?: ProjectFilters): Promise<Project[]> {
    const files = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith('ProjectManager/Projects/'));
    const projects: Project[] = [];

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter) continue;

      const project = this.parseProjectFromFrontmatter(cache.frontmatter, file.path);
      if (!project) continue;

      // 应用过滤器
      if (filters?.versionId && project.versionId !== filters.versionId) continue;
      if (filters?.status && project.status !== filters.status) continue;

      projects.push(project);
    }

    return projects;
  }

  /**
   * 使用 Dataview 查询特性
   * 降级方案：使用 app.vault 遍历文件
   */
  async queryFeatures(filters?: FeatureFilters): Promise<Feature[]> {
    const api = this.getDataviewApi();
    if (api) {
      return this.queryFeaturesWithDataview(api, filters);
    }
    return this.fallbackQueryFeatures(filters);
  }

  /**
   * 使用 Dataview API 查询特性
   */
  private async queryFeaturesWithDataview(api: DataviewApi, filters?: FeatureFilters): Promise<Feature[]> {
    const pages = api.pages('"ProjectManager/Features"');
    let features = pages.map(page => this.parseFeatureFromPage(page)).filter((f): f is Feature => f !== null);

    // 应用过滤器
    if (filters?.versionId) {
      features = features.filter(f => f.versionId === filters.versionId);
    }
    if (filters?.projectId) {
      features = features.filter(f => f.projectId === filters.projectId);
    }
    if (filters?.status) {
      features = features.filter(f => f.status === filters.status);
    }

    return features;
  }

  /**
   * 降级方案：手动遍历查询特性
   */
  async fallbackQueryFeatures(filters?: FeatureFilters): Promise<Feature[]> {
    const files = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith('ProjectManager/Features/'));
    const features: Feature[] = [];

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter) continue;

      const feature = this.parseFeatureFromFrontmatter(cache.frontmatter, file.path);
      if (!feature) continue;

      // 应用过滤器
      if (filters?.versionId && feature.versionId !== filters.versionId) continue;
      if (filters?.projectId && feature.projectId !== filters.projectId) continue;
      if (filters?.status && feature.status !== filters.status) continue;

      features.push(feature);
    }

    return features;
  }

  /**
   * 从 Dataview 页面解析版本
   */
  private parseVersionFromPage(page: Record<string, unknown>): Version | null {
    const id = page.id as string;
    const fileName = (page.file as Record<string, unknown> | undefined)?.name as string | undefined;
    const name = (page.name as string) || fileName || '';
    const status = page.status as string;

    if (!id || !name || !status) return null;

    return {
      id,
      name,
      status: status as Version['status'],
      owner: page.owner as string | undefined,
      startDate: page.startDate as string | undefined,
      endDate: page.endDate as string | undefined,
      tags: this.parseTags(page.tags),
    };
  }

  /**
   * 从 frontmatter 解析版本
   */
  private parseVersionFromFrontmatter(frontmatter: Record<string, unknown>, path: string): Version | null {
    const id = frontmatter.id as string;
    const name = frontmatter.name as string || path.split('/').pop()?.replace('.md', '');
    const status = frontmatter.status as string;

    if (!id || !name || !status) return null;

    return {
      id,
      name,
      status: status as Version['status'],
      owner: frontmatter.owner as string | undefined,
      startDate: frontmatter.startDate as string | undefined,
      endDate: frontmatter.endDate as string | undefined,
      tags: this.parseTags(frontmatter.tags),
    };
  }

  /**
   * 从 Dataview 页面解析项目
   */
  private parseProjectFromPage(page: Record<string, unknown>): Project | null {
    const id = page.id as string;
    const fileName = (page.file as Record<string, unknown> | undefined)?.name as string | undefined;
    const name = (page.name as string) || fileName || '';
    const status = page.status as string;
    const versionId = page.versionId as string;
    const priority = page.priority as string;

    if (!id || !name || !status || !versionId || !priority) return null;

    return {
      id,
      name,
      versionId,
      status: status as Project['status'],
      owner: page.owner as string | undefined,
      priority: priority as Project['priority'],
      startDate: page.startDate as string | undefined,
      endDate: page.endDate as string | undefined,
      tags: this.parseTags(page.tags),
    };
  }

  /**
   * 从 frontmatter 解析项目
   */
  private parseProjectFromFrontmatter(frontmatter: Record<string, unknown>, path: string): Project | null {
    const id = frontmatter.id as string;
    const name = frontmatter.name as string || path.split('/').pop()?.replace('.md', '');
    const status = frontmatter.status as string;
    const versionId = frontmatter.versionId as string;
    const priority = frontmatter.priority as string;

    if (!id || !name || !status || !versionId || !priority) return null;

    return {
      id,
      name,
      versionId,
      status: status as Project['status'],
      owner: frontmatter.owner as string | undefined,
      priority: priority as Project['priority'],
      startDate: frontmatter.startDate as string | undefined,
      endDate: frontmatter.endDate as string | undefined,
      tags: this.parseTags(frontmatter.tags),
    };
  }

  /**
   * 从 Dataview 页面解析特性
   */
  private parseFeatureFromPage(page: Record<string, unknown>): Feature | null {
    const id = page.id as string;
    const fileName = (page.file as Record<string, unknown> | undefined)?.name as string | undefined;
    const name = (page.name as string) || fileName || '';
    const status = page.status as string;
    const versionId = page.versionId as string;
    const projectId = page.projectId as string;
    const priority = page.priority as string;

    if (!id || !name || !status || !versionId || !projectId || !priority) return null;

    return {
      id,
      name,
      versionId,
      projectId,
      status: status as Feature['status'],
      owner: page.owner as string | undefined,
      priority: priority as Feature['priority'],
      tags: this.parseTags(page.tags),
      progress: (page.progress as number) || 0,
      startDate: page.startDate as string | undefined,
      endDate: page.endDate as string | undefined,
      isMilestone: page.isMilestone as boolean | undefined,
      estimatedHours: page.estimatedHours as number | undefined,
      actualHours: page.actualHours as number | undefined,
    };
  }

  /**
   * 从 frontmatter 解析特性
   */
  private parseFeatureFromFrontmatter(frontmatter: Record<string, unknown>, path: string): Feature | null {
    const id = frontmatter.id as string;
    const name = frontmatter.name as string || path.split('/').pop()?.replace('.md', '');
    const status = frontmatter.status as string;
    const versionId = frontmatter.versionId as string;
    const projectId = frontmatter.projectId as string;
    const priority = frontmatter.priority as string;

    if (!id || !name || !status || !versionId || !projectId || !priority) return null;

    return {
      id,
      name,
      versionId,
      projectId,
      status: status as Feature['status'],
      owner: frontmatter.owner as string | undefined,
      priority: priority as Feature['priority'],
      tags: this.parseTags(frontmatter.tags),
      progress: (frontmatter.progress as number) || 0,
      startDate: frontmatter.startDate as string | undefined,
      endDate: frontmatter.endDate as string | undefined,
      isMilestone: frontmatter.isMilestone as boolean | undefined,
      estimatedHours: frontmatter.estimatedHours as number | undefined,
      actualHours: frontmatter.actualHours as number | undefined,
    };
  }

  /**
   * 解析标签字段
   */
  private parseTags(tags: unknown): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.filter((t): t is string => typeof t === 'string');
    if (typeof tags === 'string') return [tags];
    return [];
  }

  /**
   * 获取版本进度（根据特性完成情况计算）
   * @param versionId 版本 ID
   * @returns 进度百分比 0-100
   */
  async getVersionProgress(versionId: string): Promise<number> {
    const features = await this.queryFeatures({ versionId });
    if (features.length === 0) return 0;

    const totalProgress = features.reduce((sum, f) => sum + (f.progress || 0), 0);
    return Math.round(totalProgress / features.length);
  }

  /**
   * 获取项目进度（根据特性完成情况计算）
   * @param projectId 项目 ID
   * @returns 进度百分比 0-100
   */
  async getProjectProgress(projectId: string): Promise<number> {
    const features = await this.queryFeatures({ projectId });
    if (features.length === 0) return 0;

    const totalProgress = features.reduce((sum, f) => sum + (f.progress || 0), 0);
    return Math.round(totalProgress / features.length);
  }

  /**
   * 获取逾期项目/特性
   * @param type 实体类型，不提供则返回所有类型
   * @returns 逾期实体列表
   */
  async getOverdueItems(type?: 'version' | 'project' | 'feature'): Promise<Array<Version | Project | Feature>> {
    const today = new Date().toISOString().split('T')[0];
    const overdueItems: Array<Version | Project | Feature> = [];

    if (!type || type === 'version') {
      const versions = await this.queryVersions();
      overdueItems.push(...versions.filter(v => v.endDate && v.endDate < today && v.status !== 'completed'));
    }

    if (!type || type === 'project') {
      const projects = await this.queryProjects();
      overdueItems.push(...projects.filter(p => p.endDate && p.endDate < today && p.status !== 'completed'));
    }

    if (!type || type === 'feature') {
      const features = await this.queryFeatures();
      overdueItems.push(...features.filter(f => f.endDate && f.endDate < today && f.status !== 'completed'));
    }

    return overdueItems;
  }
}
