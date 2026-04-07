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

  private async writeTemplate(path: string, template: string): Promise<void> {
    const yamlMatch = template.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    if (yamlMatch) {
      const yamlLines = yamlMatch[1].split('\n');
      const frontmatter: Record<string, unknown> = {};
      for (const line of yamlLines) {
        const match = line.match(/^([^:]+):\s*(.*)$/);
        if (match) {
          const [, key, value] = match;
          if (value.startsWith('[') && value.endsWith(']')) {
            frontmatter[key] = value.slice(1, -1).split(',').map(v => v.trim()).filter(v => v);
          } else {
            frontmatter[key] = value;
          }
        }
      }
      await this.fs.writeFile(path, frontmatter, yamlMatch[2]);
    }
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
      dueDate: data.dueDate,
    };

    const path = `${this.FOLDER}/${id}.md`;
    
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
      dueDate: feature.dueDate,
      tags: feature.tags,
    });
    
    await this.writeTemplate(path, content);
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

    const path = `${this.FOLDER}/${id}.md`;
    
    // 使用模板服务渲染内容
    const content = await this.templateService.renderFeatureTemplate({
      id: updated.id,
      name: updated.name,
      versionId: updated.versionId,
      projectId: updated.projectId,
      status: updated.status,
      owner: updated.owner,
      priority: updated.priority,
      progress: updated.progress,
      dueDate: updated.dueDate,
      tags: updated.tags,
    });
    
    await this.writeTemplate(path, content);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const path = `${this.FOLDER}/${id}.md`;
    await this.fs.deleteFile(path);
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
   * 根据ID获取文件路径
   */
  getPath(id: string): string {
    return `${this.FOLDER}/${id}.md`;
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
