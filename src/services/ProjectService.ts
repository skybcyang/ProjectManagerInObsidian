import { App } from 'obsidian';
import { FileManager } from '../utils/fileManager';
import { generateId } from '../utils/idGenerator';
import { TemplateService } from './TemplateService';
import type { Project, CreateProjectData, UpdateProjectData, ProjectManagerSettings } from '../types';

export class ProjectService {
  private fileManager: FileManager;
  private app: App;
  private templateService: TemplateService;
  private readonly FOLDER = 'ProjectManager/Projects';

  constructor(app: App, settings?: ProjectManagerSettings) {
    this.app = app;
    this.fileManager = new FileManager(app);
    this.templateService = new TemplateService(app, settings);
  }

  async createProject(data: CreateProjectData): Promise<Project> {
    if (!data.versionId) {
      throw new Error('项目必须关联版本');
    }

    await this.fileManager.ensureFolder(this.FOLDER);

    const id = generateId();
    const project: Project = {
      id,
      name: data.name,
      versionId: data.versionId,
      status: data.status ?? 'backlog',
      owner: data.owner,
      priority: data.priority ?? 'medium',
      tags: data.tags ?? [],
    };

    const path = await this.ensureUniquePath(this.buildPath(project));
    
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

    await this.fileManager.writeFile(path, project, content);
    return project;
  }

  async updateProject(id: string, data: UpdateProjectData): Promise<Project | null> {
    const found = await this.getProjectById(id);
    if (!found) return null;
    const { project, path: oldPath } = found;

    const updated: Project = {
      ...project,
      ...data,
      tags: data.tags ?? project.tags,
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

  async deleteProject(id: string): Promise<boolean> {
    const found = await this.getProjectById(id);
    if (!found) return false;
    const { path } = found;

    // 删除项目文件
    await this.fileManager.deleteFile(path);

    // 将关联特性的 projectId 置空
    const featureFiles = this.fileManager.listMarkdownFiles('ProjectManager/Features');
    for (const file of featureFiles) {
      const data = await this.fileManager.readFile(file.path);
      if (data && data.frontmatter.projectId === id) {
        const cache = this.app.metadataCache.getFileCache(file);
        const fm = cache?.frontmatter;
        if (fm) {
          const updatedFrontmatter = { ...fm, projectId: '' };
          await this.fileManager.writeFile(file.path, updatedFrontmatter, data.content);
        }
      }
    }

    return true;
  }

  async getProject(id: string): Promise<Project | null> {
    const found = await this.getProjectById(id);
    return found?.project ?? null;
  }

  async getProjectPath(id: string): Promise<string | null> {
    const found = await this.getProjectById(id);
    return found?.path ?? null;
  }

  async listProjects(filters?: { versionId?: string }): Promise<Project[]> {
    const files = this.fileManager.listMarkdownFiles(this.FOLDER);
    const projects: Project[] = [];

    for (const file of files) {
      const data = await this.fileManager.readFile(file.path);
      if (data) {
        const project = this.parseProject(data.frontmatter);
        if (project) {
          if (filters?.versionId && project.versionId !== filters.versionId) continue;
          projects.push(project);
        }
      }
    }

    return projects;
  }

  async getProjectsByVersion(versionId: string): Promise<Project[]> {
    return this.listProjects({ versionId });
  }

  private async getProjectById(id: string): Promise<{ project: Project; path: string } | null> {
    const files = this.fileManager.listMarkdownFiles(this.FOLDER);
    for (const file of files) {
      const data = await this.fileManager.readFile(file.path);
      if (data && data.frontmatter.id === id) {
        const project = this.parseProject(data.frontmatter);
        if (project) return { project, path: file.path };
      }
    }
    return null;
  }

  private buildPath(project: Project): string {
    return `${this.FOLDER}/${this.sanitizeFileName(project.name)}.md`;
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

  private parseProject(frontmatter: Record<string, unknown>): Project | null {
    if (!frontmatter.id || !frontmatter.name || !frontmatter.status) {
      return null;
    }
    return {
      id: String(frontmatter.id),
      name: String(frontmatter.name),
      versionId: String(frontmatter.versionId ?? ''),
      status: String(frontmatter.status) as Project['status'],
      owner: frontmatter.owner ? String(frontmatter.owner) : undefined,
      priority: String(frontmatter.priority ?? 'medium') as Project['priority'],
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
    };
  }
}
