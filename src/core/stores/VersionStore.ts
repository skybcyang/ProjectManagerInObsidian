import { BaseStore } from './BaseStore';
import { FileSystem } from '../filesystem/FileSystem';
import type { Version, CreateVersionData, UpdateVersionData, ProjectManagerSettings } from '../../types';
import type { EntityCache } from '../cache';
import { App } from 'obsidian';
import { TemplateService } from '../../services/TemplateService';

export class VersionStore extends BaseStore<Version, CreateVersionData, UpdateVersionData> {
  private readonly FOLDER = 'ProjectManager/Versions';
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

  async create(data: CreateVersionData): Promise<Version> {
    const id = this.generateId('ver');
    const version: Version = {
      id,
      name: data.name,
      status: data.status || 'planning',
      owner: data.owner,
      startDate: data.startDate,
      endDate: data.endDate,
      tags: data.tags || [],
    };

    // 使用版本 name 作为文件名
    const fileName = this.sanitizeFileName(data.name);
    const path = `${this.FOLDER}/${fileName}.md`;
    
    // 使用模板服务渲染内容
    const content = await this.templateService.renderVersionTemplate({
      id: version.id,
      name: version.name,
      status: version.status,
      owner: version.owner,
      startDate: version.startDate,
      endDate: version.endDate,
      tags: version.tags,
    });
    
    await this.writeTemplate(path, content);
    return version;
  }

  async update(id: string, data: UpdateVersionData): Promise<Version> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`版本 ${id} 不存在`);
    }

    const updated: Version = {
      ...existing,
      ...data,
    };

    // 查找现有文件路径
    let path = await this.findFilePathById(id);
    
    // 如果名称变更，生成新文件名
    if (data.name && data.name !== existing.name) {
      const newFileName = this.sanitizeFileName(data.name);
      path = `${this.FOLDER}/${newFileName}.md`;
    }
    
    if (!path) {
      throw new Error(`找不到版本 ${id} 的文件`);
    }
    
    // 使用模板服务渲染内容
    const content = await this.templateService.renderVersionTemplate({
      id: updated.id,
      name: updated.name,
      status: updated.status,
      owner: updated.owner,
      startDate: updated.startDate,
      endDate: updated.endDate,
      tags: updated.tags,
    });
    
    await this.writeTemplate(path, content);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const path = await this.findFilePathById(id);
    if (path) {
      await this.fs.deleteFile(path);
    }
    return true;
  }

  async getById(id: string): Promise<Version | null> {
    // 优先从缓存获取
    if (this.cache) {
      const cached = this.cache.getVersion(id);
      if (cached) return cached;
    }
    // 回退到列表查找
    const versions = await this.list();
    return versions.find(v => v.id === id) || null;
  }

  /**
   * 根据ID查找文件路径（兼容旧版ID文件名和新版name文件名）
   */
  private async findFilePathById(id: string): Promise<string | null> {
    // 扫描文件夹查找匹配 id 的文件
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

  async list(): Promise<Version[]> {
    // 优先从缓存获取
    if (this.cache) {
      return this.cache.getAllVersions();
    }
    // 回退到文件读取
    const files = this.fs.listFiles(this.FOLDER);
    const versions: Version[] = [];

    for (const file of files) {
      const fileData = await this.fs.readFile(file.path);
      if (fileData?.frontmatter?.id) {
        versions.push(fileData.frontmatter as unknown as Version);
      }
    }

    return versions.sort((a, b) => a.name.localeCompare(b.name));
  }

  async hasProjects(versionId: string): Promise<boolean> {
    const projects = await this.app.vault.getMarkdownFiles();
    const projectFolder = 'ProjectManager/Projects';
    
    for (const file of projects) {
      if (!file.path.startsWith(projectFolder)) continue;
      
      const metadata = this.app.metadataCache.getFileCache(file);
      if (metadata?.frontmatter?.versionId === versionId) {
        return true;
      }
    }
    
    return false;
  }
}
