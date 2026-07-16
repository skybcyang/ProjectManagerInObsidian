import { BaseStore } from './BaseStore';
import { FileSystem } from '../filesystem/FileSystem';
import type { Requirement, CreateRequirementData, UpdateRequirementData, RequirementStatus, ProjectManagerSettings } from '../../types';
import type { EntityCache } from '../cache';
import { App } from 'obsidian';
import { TemplateService } from '../../services/TemplateService';

export class RequirementStore extends BaseStore<Requirement, CreateRequirementData, UpdateRequirementData> {
  private readonly FOLDER = 'ProjectManager/Requirements';
  private cache?: EntityCache;
  private templateService: TemplateService;

  constructor(fs: FileSystem, app: App, cache?: EntityCache, settings?: ProjectManagerSettings) {
    super(fs, app);
    this.cache = cache;
    this.templateService = new TemplateService(app, settings);
  }

  async create(data: CreateRequirementData): Promise<Requirement> {
    const id = this.generateId('req');
    const requirement: Requirement = {
      id,
      name: data.name,
      type: 'requirement',
      versionId: data.versionId,
      projectId: data.projectId,
      status: data.status || 'backlog',
      owner: data.owner,
      priority: data.priority || 'medium',
      tags: data.tags || [],
      progress: data.progress || 0,
      startDate: data.startDate,
      endDate: data.endDate,
      estimatedDays: data.estimatedDays,
      actualDays: data.actualDays,
      description: data.description,
      featureId: data.featureId,
    };

    let versionName = '';
    let projectName = '';

    try {
      const versionFiles = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith('ProjectManager/Versions/'));
      for (const file of versionFiles) {
        const metadata = this.app.metadataCache.getFileCache(file);
        if (metadata && metadata.frontmatter && metadata.frontmatter.id === data.versionId) {
          versionName = metadata.frontmatter.name || '';
          break;
        }
      }

      const projectFiles = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith('ProjectManager/Projects/'));
      for (const file of projectFiles) {
        const metadata = this.app.metadataCache.getFileCache(file);
        if (metadata && metadata.frontmatter && metadata.frontmatter.id === data.projectId) {
          projectName = metadata.frontmatter.name || '';
          break;
        }
      }
    } catch {
      // 忽略错误
    }

    const prefix = projectName || versionName;
    const fileName = this.sanitizeFileName(`${prefix}-${data.name}`);
    const path = `${this.FOLDER}/${fileName}.md`;

    const content = await this.templateService.renderRequirementTemplate({
      id: requirement.id,
      name: requirement.name,
      versionId: requirement.versionId,
      projectId: requirement.projectId,
      status: requirement.status,
      owner: requirement.owner,
      priority: requirement.priority,
      progress: requirement.progress,
      startDate: requirement.startDate,
      endDate: requirement.endDate,
      tags: requirement.tags,
      estimatedDays: requirement.estimatedDays,
      actualDays: requirement.actualDays,
      description: requirement.description,
      featureId: requirement.featureId,
    });

    await this.fs.writeRawFile(path, content);
    return requirement;
  }

  async update(id: string, data: UpdateRequirementData): Promise<Requirement> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`需求 ${id} 不存在`);
    }

    const updated: Requirement = {
      ...existing,
      ...data,
    };

    const oldPath = await this.findFilePathById(id);
    if (!oldPath) {
      throw new Error(`找不到需求 ${id} 的文件`);
    }

    let path = oldPath;

    const versionChanged = data.versionId !== undefined && data.versionId !== existing.versionId;
    const projectChanged = data.projectId !== undefined && data.projectId !== existing.projectId;
    const nameChanged = data.name !== undefined && data.name !== existing.name;

    if (versionChanged || projectChanged || nameChanged) {
      let versionName = '';
      let projectName = '';

      try {
        const versionFiles = this.app.vault.getMarkdownFiles()
          .filter(f => f.path.startsWith('ProjectManager/Versions/'));
        for (const file of versionFiles) {
          const metadata = this.app.metadataCache.getFileCache(file);
          if (metadata && metadata.frontmatter && metadata.frontmatter.id === updated.versionId) {
            versionName = metadata.frontmatter.name || '';
            break;
          }
        }

        const projectFiles = this.app.vault.getMarkdownFiles()
          .filter(f => f.path.startsWith('ProjectManager/Projects/'));
        for (const file of projectFiles) {
          const metadata = this.app.metadataCache.getFileCache(file);
          if (metadata && metadata.frontmatter && metadata.frontmatter.id === updated.projectId) {
            projectName = metadata.frontmatter.name || '';
            break;
          }
        }
      } catch {}

      const prefix = projectName || versionName;
      const fileName = this.sanitizeFileName(`${prefix}-${updated.name}`);
      path = `${this.FOLDER}/${fileName}.md`;
      await this.fs.moveFile(oldPath, path);
    }

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

  async getById(id: string): Promise<Requirement | null> {
    if (this.cache) {
      const cached = this.cache.getRequirement(id);
      if (cached) return cached;
    }
    const requirements = await this.list();
    return requirements.find(r => r.id === id) || null;
  }

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

  async getPath(id: string): Promise<string | null> {
    return this.findFilePathById(id);
  }

  async list(filters?: { versionId?: string; projectId?: string; status?: RequirementStatus }): Promise<Requirement[]> {
    let requirements: Requirement[];

    if (this.cache) {
      requirements = this.cache.getAllRequirements();
    } else {
      const files = this.fs.listFiles(this.FOLDER);
      requirements = [];
      for (const file of files) {
        const fileData = await this.fs.readFile(file.path);
        if (fileData?.frontmatter?.id) {
          requirements.push(fileData.frontmatter as unknown as Requirement);
        }
      }
    }

    if (filters) {
      if (filters.versionId) {
        requirements = requirements.filter(r => r.versionId === filters.versionId);
      }
      if (filters.projectId) {
        requirements = requirements.filter(r => r.projectId === filters.projectId);
      }
      if (filters.status) {
        requirements = requirements.filter(r => r.status === filters.status);
      }
    }

    return requirements.sort((a, b) => a.name.localeCompare(b.name));
  }

  async listByProject(projectId: string): Promise<Requirement[]> {
    const all = await this.list();
    return all.filter(r => r.projectId === projectId);
  }

  async listByVersion(versionId: string): Promise<Requirement[]> {
    const all = await this.list();
    return all.filter(r => r.versionId === versionId);
  }
}
