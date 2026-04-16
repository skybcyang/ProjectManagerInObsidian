import { BaseStore } from './BaseStore';
import { FileSystem } from '../filesystem/FileSystem';
import type { Feature, CreateFeatureData, UpdateFeatureData, FeatureStatus, ProjectManagerSettings } from '../../types';
import type { EntityCache } from '../cache';
import { App } from 'obsidian';
import { TemplateService } from '../../services/TemplateService';

export class FeatureStore extends BaseStore<Feature, CreateFeatureData, UpdateFeatureData> {
  private readonly FOLDER = 'ProjectManager/Features';
  private cache?: EntityCache;
  private templateService: TemplateService;

  constructor(fs: FileSystem, app: App, cache?: EntityCache, settings?: ProjectManagerSettings) {
    super(fs, app);
    this.cache = cache;
    this.templateService = new TemplateService(app, settings);
  }

  async create(data: CreateFeatureData): Promise<Feature> {
    const id = this.generateId('feat');
    const feature: Feature = {
      id,
      name: data.name,
      versionId: data.versionId,
      projectId: data.projectId,
      status: data.status || 'backlog',
      owner: data.owner,
      priority: data.priority || 'medium',
      tags: data.tags || [],
      progress: data.progress || 0,
      startDate: data.startDate,
      endDate: data.endDate,
      estimatedHours: data.estimatedHours,
      actualHours: data.actualHours,
      projectLink: data.projectLink,
    };

    // 获取版本名称和项目名称
    let versionName = '';
    let projectName = '';
    
    try {
      // 扫描版本文件夹找到匹配 versionId 的文件
      const versionFiles = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith('ProjectManager/Versions/'));
      for (const file of versionFiles) {
        const metadata = this.app.metadataCache.getFileCache(file);
        if (metadata?.frontmatter?.id === data.versionId) {
          versionName = metadata.frontmatter.name || '';
          break;
        }
      }
      
      // 扫描项目文件夹找到匹配 projectId 的文件
      const projectFiles = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith('ProjectManager/Projects/'));
      for (const file of projectFiles) {
        const metadata = this.app.metadataCache.getFileCache(file);
        if (metadata?.frontmatter?.id === data.projectId) {
          projectName = metadata.frontmatter.name || '';
          break;
        }
      }
    } catch {
      // 忽略错误
    }
    
    // 组合文件名：版本name+项目name+特性name
    const parts = [
      versionName,
      projectName,
      data.name
    ].filter(Boolean);
    
    const fileName = parts.map(p => this.sanitizeFileName(p)).join('-');
    const path = `${this.FOLDER}/${fileName}.md`;
    
    // 使用模板服务渲染内容
    const content = await this.templateService.renderFeatureTemplate({
      id: feature.id,
      name: feature.name,
      versionId: feature.versionId,
      projectId: feature.projectId,
      status: feature.status,
      owner: feature.owner,
      priority: feature.priority,
      progress: feature.progress,
      startDate: feature.startDate,
      endDate: feature.endDate,
      tags: feature.tags,
      estimatedHours: feature.estimatedHours,
      actualHours: feature.actualHours,
      projectLink: feature.projectLink,
    });

    await this.fs.writeRawFile(path, content);
    return feature;
  }

  async update(id: string, data: UpdateFeatureData): Promise<Feature> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`特性 ${id} 不存在`);
    }

    const updated: Feature = {
      ...existing,
      ...data,
    };

    // 查找现有文件路径
    const oldPath = await this.findFilePathById(id);
    if (!oldPath) {
      throw new Error(`找不到特性 ${id} 的文件`);
    }

    let path = oldPath;

    // 如果名称、版本或项目变更，移动文件
    const versionChanged = data.versionId && data.versionId !== existing.versionId;
    const projectChanged = data.projectId && data.projectId !== existing.projectId;
    const nameChanged = data.name && data.name !== existing.name;

    if (versionChanged || projectChanged || nameChanged) {
      let versionName = '';
      let projectName = '';

      try {
        // 扫描版本文件夹
        const versionFiles = this.app.vault.getMarkdownFiles()
          .filter(f => f.path.startsWith('ProjectManager/Versions/'));
        for (const file of versionFiles) {
          const metadata = this.app.metadataCache.getFileCache(file);
          if (metadata?.frontmatter?.id === updated.versionId) {
            versionName = metadata.frontmatter.name || '';
            break;
          }
        }

        // 扫描项目文件夹
        const projectFiles = this.app.vault.getMarkdownFiles()
          .filter(f => f.path.startsWith('ProjectManager/Projects/'));
        for (const file of projectFiles) {
          const metadata = this.app.metadataCache.getFileCache(file);
          if (metadata?.frontmatter?.id === updated.projectId) {
            projectName = metadata.frontmatter.name || '';
            break;
          }
        }
      } catch {}

      const parts = [
        versionName,
        projectName,
        updated.name
      ].filter(Boolean);

      const fileName = parts.map(p => this.sanitizeFileName(p)).join('-');
      path = `${this.FOLDER}/${fileName}.md`;
      await this.fs.moveFile(oldPath, path);
    }

    // 只更新 frontmatter，保留用户手动编辑的正文
    await this.fs.updateFile(path, data as Record<string, unknown>);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const path = await this.findFilePathById(id);
    if (path) {
      await this.fs.deleteFile(path);
    }
    return true;
  }

  async getById(id: string): Promise<Feature | null> {
    // 优先从缓存获取
    if (this.cache) {
      const cached = this.cache.getFeature(id);
      if (cached) return cached;
    }
    // 回退到列表查找
    const features = await this.list();
    return features.find(f => f.id === id) || null;
  }

  /**
   * 根据ID查找文件路径（兼容旧版ID文件名和新版name文件名）
   */
  private async findFilePathById(id: string): Promise<string | null> {
    const files = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(this.FOLDER));
    
    for (const file of files) {
      const metadata = this.app.metadataCache.getFileCache(file);
      if (metadata?.frontmatter?.id === id) {
        return file.path;
      }
    }
    return null;
  }

  /**
   * 根据ID获取文件路径
   */
  async getPath(id: string): Promise<string | null> {
    return this.findFilePathById(id);
  }

  async list(filters?: { versionId?: string; projectId?: string; status?: FeatureStatus }): Promise<Feature[]> {
    let features: Feature[];
    
    // 优先从缓存获取
    if (this.cache) {
      features = this.cache.getAllFeatures();
    } else {
      // 回退到文件读取
      const files = this.fs.listFiles(this.FOLDER);
      features = [];
      for (const file of files) {
        const fileData = await this.fs.readFile(file.path);
        if (fileData?.frontmatter?.id) {
          features.push(fileData.frontmatter as unknown as Feature);
        }
      }
    }

    // 应用过滤器
    if (filters) {
      if (filters.versionId) {
        features = features.filter(f => f.versionId === filters.versionId);
      }
      if (filters.projectId) {
        features = features.filter(f => f.projectId === filters.projectId);
      }
      if (filters.status) {
        features = features.filter(f => f.status === filters.status);
      }
    }

    return features.sort((a, b) => a.name.localeCompare(b.name));
  }

  async listByProject(projectId: string): Promise<Feature[]> {
    const all = await this.list();
    return all.filter(f => f.projectId === projectId);
  }

  async listByVersion(versionId: string): Promise<Feature[]> {
    const all = await this.list();
    return all.filter(f => f.versionId === versionId);
  }
}
