import { App } from 'obsidian';
import { FileManager } from '../utils/fileManager';
import { generateId } from '../utils/idGenerator';
import { TemplateService } from './TemplateService';
import type { Version, CreateVersionData, UpdateVersionData, ProjectManagerSettings } from '../types';

export class VersionService {
  private fileManager: FileManager;
  private app: App;
  private templateService: TemplateService;
  private readonly FOLDER = 'ProjectManager/Versions';

  constructor(app: App, settings?: ProjectManagerSettings) {
    this.app = app;
    this.fileManager = new FileManager(app);
    this.templateService = new TemplateService(app, settings);
  }

  async createVersion(data: CreateVersionData): Promise<Version> {
    await this.fileManager.ensureFolder(this.FOLDER);

    const id = generateId();
    const version: Version = {
      id,
      name: data.name,
      status: data.status ?? 'planning',
      owner: data.owner,
      startDate: data.startDate,
      endDate: data.endDate,
      tags: data.tags ?? [],
    };

    const path = await this.ensureUniquePath(this.buildPath(version));
    
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

    await this.fileManager.writeFile(path, version, content);
    return version;
  }

  async updateVersion(id: string, data: UpdateVersionData): Promise<Version | null> {
    const found = await this.getVersionById(id);
    if (!found) return null;
    const { version, path: oldPath } = found;

    const updated: Version = {
      ...version,
      ...data,
      tags: data.tags ?? version.tags,
    };

    const newPath = await this.ensureUniquePath(this.buildPath(updated));

    const existing = await this.fileManager.readFile(oldPath);
    const content = existing?.content ?? '';

    if (oldPath !== newPath) {
      await this.fileManager.writeFile(newPath, updated, content);
      await this.fileManager.deleteFile(oldPath);
    } else {
      await this.fileManager.writeFile(newPath, updated, content);
    }

    return updated;
  }

  async deleteVersion(id: string): Promise<boolean> {
    const found = await this.getVersionById(id);
    if (!found) return false;
    const { path } = found;

    // 检查是否有关联项目
    const projectFiles = this.fileManager.listMarkdownFiles('ProjectManager/Projects');
    for (const file of projectFiles) {
      const data = await this.fileManager.readFile(file.path);
      if (data && data.frontmatter.versionId === id) {
        throw new Error(`无法删除版本：存在关联项目 "${data.frontmatter.name || file.name}"，请先删除或转移关联项目`);
      }
    }

    await this.fileManager.deleteFile(path);
    return true;
  }

  async getVersion(id: string): Promise<Version | null> {
    const found = await this.getVersionById(id);
    return found?.version ?? null;
  }

  async getVersionPath(id: string): Promise<string | null> {
    const found = await this.getVersionById(id);
    return found?.path ?? null;
  }

  async listVersions(): Promise<Version[]> {
    const files = this.fileManager.listMarkdownFiles(this.FOLDER);
    const versions: Version[] = [];

    for (const file of files) {
      const data = await this.fileManager.readFile(file.path);
      if (data) {
        const version = this.parseVersion(data.frontmatter);
        if (version) versions.push(version);
      }
    }

    return versions;
  }

  async versionExists(id: string): Promise<boolean> {
    const version = await this.getVersionById(id);
    return version !== null;
  }

  private async getVersionById(id: string): Promise<{ version: Version; path: string } | null> {
    const files = this.fileManager.listMarkdownFiles(this.FOLDER);
    for (const file of files) {
      const data = await this.fileManager.readFile(file.path);
      if (data && data.frontmatter.id === id) {
        const version = this.parseVersion(data.frontmatter);
        if (version) return { version, path: file.path };
      }
    }
    return null;
  }

  private buildPath(version: Version): string {
    return `${this.FOLDER}/${this.sanitizeFileName(version.name)}.md`;
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '-');
  }

  private async ensureUniquePath(path: string): Promise<string> {
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (!existing) return path;
    const base = path.replace(/\.md$/, '');
    let i = 1;
    while (true) {
      const newPath = `${base} (${i}).md`;
      if (!this.app.vault.getAbstractFileByPath(newPath)) return newPath;
      i++;
    }
  }

  private parseVersion(frontmatter: Record<string, unknown>): Version | null {
    if (!frontmatter.id || !frontmatter.name || !frontmatter.status) {
      return null;
    }
    return {
      id: String(frontmatter.id),
      name: String(frontmatter.name),
      status: String(frontmatter.status) as Version['status'],
      owner: frontmatter.owner ? String(frontmatter.owner) : undefined,
      startDate: frontmatter.startDate ? String(frontmatter.startDate) : undefined,
      endDate: frontmatter.endDate ? String(frontmatter.endDate) : undefined,
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
    };
  }
}
