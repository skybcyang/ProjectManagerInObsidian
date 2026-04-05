import { App } from 'obsidian';
import { FileSystem } from './filesystem';
import { VersionStore, ProjectStore, FeatureStore } from './stores';
import { EntityCache } from './cache';
import type { Version, Project, Feature } from '../types';
import type { CreateVersionData, UpdateVersionData } from '../types';
import type { CreateProjectData, UpdateProjectData } from '../types';
import type { CreateFeatureData, UpdateFeatureData, FeatureStatus } from '../types';

/**
 * 实体管理器
 * 对外暴露的统一入口，协调各 Store 完成业务逻辑
 */
export class EntityManager {
  readonly version: VersionStore;
  readonly project: ProjectStore;
  readonly feature: FeatureStore;
  readonly cache: EntityCache;

  constructor(app: App) {
    const fs = new FileSystem(app);
    this.cache = new EntityCache(app);
    this.version = new VersionStore(fs, app, this.cache);
    this.project = new ProjectStore(fs, app, this.cache);
    this.feature = new FeatureStore(fs, app, this.cache);
  }

  /**
   * 初始化缓存（插件加载时调用）
   */
  async initialize(): Promise<void> {
    await this.cache.initialize();
  }

  // ==================== 版本操作 ====================

  async createVersion(data: CreateVersionData): Promise<Version> {
    return this.version.create(data);
  }

  async updateVersion(id: string, data: UpdateVersionData): Promise<Version | null> {
    return this.version.update(id, data);
  }

  /**
   * 删除版本（带关联检查）
   * @param cascade 是否级联删除关联项目
   */
  async deleteVersion(id: string, cascade: boolean = false): Promise<boolean> {
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
    
    return this.version.delete(id);
  }

  /**
   * 获取版本的关联项目
   */
  async getVersionProjects(versionId: string): Promise<Project[]> {
    const allProjects = await this.listProjects();
    return allProjects.filter(p => p.versionId === versionId);
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
    return this.project.create(data);
  }

  async updateProject(id: string, data: UpdateProjectData): Promise<Project | null> {
    return this.project.update(id, data);
  }

  /**
   * 删除项目（带级联处理）
   * @param cascade 是否级联删除关联特性
   */
  async deleteProject(id: string, cascade: boolean = false): Promise<boolean> {
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
    
    return this.project.delete(id);
  }

  /**
   * 获取项目的关联特性
   */
  async getProjectFeatures(projectId: string): Promise<Feature[]> {
    const allFeatures = await this.listFeatures();
    return allFeatures.filter(f => f.projectId === projectId);
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
    return this.feature.create(data);
  }

  async updateFeature(id: string, data: UpdateFeatureData): Promise<Feature | null> {
    return this.feature.update(id, data);
  }

  async deleteFeature(id: string): Promise<boolean> {
    return this.feature.delete(id);
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
}
