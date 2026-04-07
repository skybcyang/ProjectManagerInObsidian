import { BaseStore } from './BaseStore';
import { FileSystem } from '../filesystem/FileSystem';
import type { Project, CreateProjectData, UpdateProjectData, ProjectManagerSettings } from '../../types';
import type { EntityCache } from '../cache';
import { App } from 'obsidian';
import { TemplateService } from '../../services/TemplateService';

export class ProjectStore extends BaseStore<Project, CreateProjectData, UpdateProjectData> {
  private readonly FOLDER = 'ProjectManager/Projects';
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

  async create(data: CreateProjectData): Promise<Project> {
    const id = this.generateId('proj');
    const project: Project = {
      id,
      name: data.name,
      versionId: data.versionId,
      status: data.status || 'backlog',
      owner: data.owner,
      priority: data.priority || 'medium',
      tags: data.tags || [],
    };

    const path = `${this.FOLDER}/${id}.md`;
    
    // 使用模板服务渲染内容
    const content = await this.templateService.renderProjectTemplate({
      id: project.id,
      name: project.name,
      versionId: project.versionId,
      status: project.status,
      owner: project.owner,
      priority: project.priority,
      tags: project.tags,
    });
    
    await this.writeTemplate(path, content);
    return project;
  }

  async update(id: string, data: UpdateProjectData): Promise<Project> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`项目 ${id} 不存在`);
    }

    const updated: Project = {
      ...existing,
      ...data,
    };

    const path = `${this.FOLDER}/${id}.md`;
    
    // 使用模板服务渲染内容
    const content = await this.templateService.renderProjectTemplate({
      id: updated.id,
      name: updated.name,
      versionId: updated.versionId,
      status: updated.status,
      owner: updated.owner,
      priority: updated.priority,
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

  async getById(id: string): Promise<Project | null> {
    // 优先从缓存获取
    if (this.cache) {
      const cached = this.cache.getProject(id);
      if (cached) return cached;
    }
    // 回退到列表查找
    const projects = await this.list();
    return projects.find(p => p.id === id) || null;
  }

  /**
   * 根据ID获取文件路径
   */
  getPath(id: string): string {
    return `${this.FOLDER}/${id}.md`;
  }

  async list(filters?: { versionId?: string }): Promise<Project[]> {
    let projects: Project[];
    
    // 优先从缓存获取
    if (this.cache) {
      projects = this.cache.getAllProjects();
    } else {
      // 回退到文件读取
      const files = this.fs.listFiles(this.FOLDER);
      projects = [];
      for (const file of files) {
        const fileData = await this.fs.readFile(file.path);
        if (fileData?.frontmatter?.id) {
          projects.push(fileData.frontmatter as unknown as Project);
        }
      }
    }

    // 应用过滤器
    if (filters?.versionId) {
      projects = projects.filter(p => p.versionId === filters.versionId);
    }

    return projects.sort((a, b) => a.name.localeCompare(b.name));
  }

  async listByVersion(versionId: string): Promise<Project[]> {
    const all = await this.list();
    return all.filter(p => p.versionId === versionId);
  }

  async hasFeatures(projectId: string): Promise<boolean> {
    const features = await this.app.vault.getMarkdownFiles();
    const featureFolder = 'ProjectManager/Features';
    
    for (const file of features) {
      if (!file.path.startsWith(featureFolder)) continue;
      
      const metadata = this.app.metadataCache.getFileCache(file);
      if (metadata?.frontmatter?.projectId === projectId) {
        return true;
      }
    }
    
    return false;
  }

  async orphanFeatures(projectId: string): Promise<void> {
    const features = await this.app.vault.getMarkdownFiles();
    const featureFolder = 'ProjectManager/Features';
    
    for (const file of features) {
      if (!file.path.startsWith(featureFolder)) continue;
      
      const metadata = this.app.metadataCache.getFileCache(file);
      if (metadata?.frontmatter?.projectId === projectId) {
        // 将特性标记为孤儿（版本和项目ID清空）
        const content = await this.app.vault.read(file);
        const updatedContent = content.replace(
          /projectId:.*$/m,
          'projectId: ""'
        );
        await this.app.vault.modify(file, updatedContent);
      }
    }
  }
}
