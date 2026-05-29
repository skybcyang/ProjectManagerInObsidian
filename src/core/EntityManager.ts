import { App } from 'obsidian';
import { FileSystem } from './filesystem';
import { VersionStore, ProjectStore, FeatureStore } from './stores';
import { EntityCache } from './cache';
import type { Version, Project, Feature, ProjectManagerSettings } from '../types';
import type { CreateVersionData, UpdateVersionData } from '../types';
import type { CreateProjectData, UpdateProjectData } from '../types';
import type { CreateFeatureData, UpdateFeatureData, FeatureStatus } from '../types';
import { ChangeLogService, DataviewService } from '../services';

/**
 * 实体管理器
 * 对外暴露的统一入口，协调各 Store 完成业务逻辑
 */
export class EntityManager {
  readonly version: VersionStore;
  readonly project: ProjectStore;
  readonly feature: FeatureStore;
  readonly cache: EntityCache;
  readonly dataview: DataviewService;
  private changeLogService: ChangeLogService;

  constructor(app: App, settings?: ProjectManagerSettings) {
    const fs = new FileSystem(app);
    this.cache = new EntityCache(app);
    this.version = new VersionStore(fs, app, this.cache, settings);
    this.project = new ProjectStore(fs, app, this.cache, settings);
    this.feature = new FeatureStore(fs, app, this.cache, settings);
    this.changeLogService = new ChangeLogService(app);
    this.dataview = new DataviewService(app);
  }

  /**
   * 初始化缓存（插件加载时调用）
   */
  async initialize(): Promise<void> {
    await this.cache.initialize();
  }

  // ==================== 版本操作 ====================

  async createVersion(data: CreateVersionData): Promise<Version> {
    const version = await this.version.create(data);
    await this.changeLogService.logCreate('version', version);
    return version;
  }

  async updateVersion(id: string, data: UpdateVersionData): Promise<Version | null> {
    const oldVersion = await this.version.getById(id);
    const newVersion = await this.version.update(id, data);
    if (oldVersion && newVersion) {
      await this.changeLogService.logUpdate('version', oldVersion, newVersion);
    }
    return newVersion;
  }

  /**
   * 删除版本（带关联检查）
   * @param cascade 是否级联删除关联项目
   */
  async deleteVersion(id: string, cascade: boolean = false): Promise<boolean> {
    // 获取版本信息（用于变更日志）
    const version = await this.version.getById(id);

    // 检查是否有关联项目
    const relatedProjects = await this.getVersionProjects(id);

    if (relatedProjects.length > 0) {
      if (!cascade) {
        throw new Error(`无法删除版本：存在 ${relatedProjects.length} 个关联项目，请先删除或转移关联项目`);
      }
      // 级联删除关联项目
      for (const project of relatedProjects) {
        await this.deleteProject(project.id, true);
      }
    }

    const result = await this.version.delete(id);

    // 记录变更日志
    if (result && version) {
      await this.changeLogService.logDelete('version', version);
    }

    return result;
  }

  /**
   * 获取版本的关联项目
   * 优先使用 Dataview 查询（如果可用）
   */
  async getVersionProjects(versionId: string): Promise<Project[]> {
    // 使用 Dataview 查询
    return this.dataview.queryProjects({ versionId });
  }

  async getVersion(id: string): Promise<Version | null> {
    return this.version.getById(id);
  }

  async getVersionPath(id: string): Promise<string | null> {
    return this.version.getPath(id);
  }

  async listVersions(): Promise<Version[]> {
    return this.version.list();
  }

  // ==================== 项目操作 ====================

  async createProject(data: CreateProjectData): Promise<Project> {
    const project = await this.project.create(data);
    await this.changeLogService.logCreate('project', project);
    return project;
  }

  async updateProject(id: string, data: UpdateProjectData): Promise<Project | null> {
    const oldProject = await this.project.getById(id);
    const newProject = await this.project.update(id, data);
    if (oldProject && newProject) {
      await this.changeLogService.logUpdate('project', oldProject, newProject);
    }
    return newProject;
  }

  /**
   * 删除项目（带级联处理）
   * @param cascade 是否级联删除关联特性
   */
  async deleteProject(id: string, cascade: boolean = false): Promise<boolean> {
    // 获取项目信息（用于变更日志）
    const project = await this.project.getById(id);

    // 检查是否有关联特性
    const relatedFeatures = await this.getProjectFeatures(id);

    if (relatedFeatures.length > 0) {
      if (!cascade) {
        throw new Error(`无法删除项目：存在 ${relatedFeatures.length} 个关联特性，请先删除或转移关联特性`);
      }
      // 级联删除关联特性
      for (const feature of relatedFeatures) {
        await this.deleteFeature(feature.id);
      }
    }

    const result = await this.project.delete(id);

    // 记录变更日志
    if (result && project) {
      await this.changeLogService.logDelete('project', project);
    }

    return result;
  }

  /**
   * 获取项目的关联特性
   * 优先使用 Dataview 查询（如果可用）
   */
  async getProjectFeatures(projectId: string): Promise<Feature[]> {
    // 使用 Dataview 查询
    return this.dataview.queryFeatures({ projectId });
  }

  async getProject(id: string): Promise<Project | null> {
    return this.project.getById(id);
  }

  async getProjectPath(id: string): Promise<string | null> {
    return this.project.getPath(id);
  }

  async listProjects(filters?: { versionId?: string }): Promise<Project[]> {
    return this.project.list(filters);
  }

  // ==================== 特性操作 ====================

  async createFeature(data: CreateFeatureData): Promise<Feature> {
    const feature = await this.feature.create(data);
    await this.changeLogService.logCreate('feature', feature);
    return feature;
  }

  async updateFeature(id: string, data: UpdateFeatureData): Promise<Feature | null> {
    const oldFeature = await this.feature.getById(id);
    const newFeature = await this.feature.update(id, data);
    if (oldFeature && newFeature) {
      await this.changeLogService.logUpdate('feature', oldFeature, newFeature);
    }
    return newFeature;
  }

  async deleteFeature(id: string): Promise<boolean> {
    // 获取特性信息（用于变更日志）
    const feature = await this.feature.getById(id);
    const result = await this.feature.delete(id);

    // 记录变更日志
    if (result && feature) {
      await this.changeLogService.logDelete('feature', feature);
    }

    return result;
  }

  async getFeature(id: string): Promise<Feature | null> {
    return this.feature.getById(id);
  }

  async getFeaturePath(id: string): Promise<string | null> {
    return this.feature.getPath(id);
  }

  async listFeatures(filters?: { versionId?: string; projectId?: string; status?: FeatureStatus }): Promise<Feature[]> {
    return this.feature.list(filters);
  }

  // ==================== 批量查询 ====================

  /**
   * 获取实体的路径（通用方法）
   */
  async getEntityPath(type: 'version' | 'project' | 'feature', id: string): Promise<string | null> {
    switch (type) {
      case 'version':
        return this.version.getPath(id);
      case 'project':
        return this.project.getPath(id);
      case 'feature':
        return this.feature.getPath(id);
      default:
        return null;
    }
  }

  /**
   * 根据 ID 查找实体（通用方法）
   */
  async findById(id: string): Promise<{ type: 'version' | 'project' | 'feature'; entity: Version | Project | Feature } | null> {
    const feature = await this.feature.getById(id);
    if (feature) return { type: 'feature', entity: feature };

    const project = await this.project.getById(id);
    if (project) return { type: 'project', entity: project };

    const version = await this.version.getById(id);
    if (version) return { type: 'version', entity: version };

    return null;
  }

  // ==================== 缓存优化查询 ====================

  /**
   * 获取所有负责人列表（从缓存，高性能）
   * 用于 ToolbarController 负责人筛选下拉框
   */
  getOwners(): string[] {
    return this.cache.getOwners();
  }

  // ==================== Dataview 集成方法 ====================

  /**
   * 检查 Dataview 插件是否可用
   */
  isDataviewAvailable(): boolean {
    return this.dataview.isAvailable();
  }

  /**
   * 获取版本进度（根据特性完成情况计算）
   * @param versionId 版本 ID
   * @returns 进度百分比 0-100
   */
  async getVersionProgress(versionId: string): Promise<number> {
    return this.dataview.getVersionProgress(versionId);
  }

  /**
   * 获取项目进度（根据特性完成情况计算）
   * @param projectId 项目 ID
   * @returns 进度百分比 0-100
   */
  async getProjectProgress(projectId: string): Promise<number> {
    return this.dataview.getProjectProgress(projectId);
  }

  /**
   * 获取逾期项目/特性
   * @param type 实体类型，不提供则返回所有类型
   * @returns 逾期实体列表
   */
  async getOverdueItems(type?: 'version' | 'project' | 'feature'): Promise<Array<Version | Project | Feature>> {
    return this.dataview.getOverdueItems(type);
  }
}
