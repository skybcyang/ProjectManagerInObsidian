import { App } from 'obsidian';
import { FileManager } from '../utils/fileManager';
import { generateId } from '../utils/idGenerator';
import type { Project, CreateProjectData, UpdateProjectData } from '../types';

export class ProjectService {
  private fileManager: FileManager;
  private readonly FOLDER = 'ProjectManager/Projects';
  private app: App;

  constructor(app: App) {
    this.app = app;
    this.fileManager = new FileManager(app);
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
    await this.fileManager.writeFile(path, project, this.generateTemplate(project));
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

  private generateTemplate(project: Project): string {
    const priorityEmoji = { critical: '🔴', high: '🟠', medium: '🔵', low: '🟢' }[project.priority] || '⚪';
    const today = new Date().toISOString().split('T')[0];

    return `---\nid: ${project.id}\nname: ${project.name}\nversionId: ${project.versionId}\nstatus: ${project.status}\n${project.owner ? `owner: ${project.owner}\n` : ''}priority: ${project.priority}\ntags:\n${project.tags.map(t => `  - ${t}`).join('\n')}\n---\n\n# ${priorityEmoji} ${project.name}\n\n> 项目 ID: ${project.id} | 状态: ${project.status} | 优先级: ${project.priority}\n\n---\n\n## 📋 项目概览\n\n<!-- 在此描述项目的背景、目标和范围 -->\n\n---\n\n## 📊 进度统计\n\n\`\`\`dataviewjs\nconst features = dv.pages('"ProjectManager/Features"').filter(f => f.projectId === "${project.id}");\nconst total = features.length;\nconst completed = features.filter(f => f.status === 'completed').length;\nconst inProgress = features.filter(f => f.status === 'in-progress' || f.status === 'testing').length;\nconst avgProgress = total > 0 ? Math.round(features.reduce((sum, f) => sum + (f.progress || 0), 0) / total) : 0;\n\ndv.el('div', \`\n<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0;">\n  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">\n    <div style="font-size: 28px; font-weight: 700;">\${total}</div>\n    <div style="font-size: 11px; color: var(--text-muted);">总特性</div>\n  </div>\n  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">\n    <div style="font-size: 28px; font-weight: 700; color: var(--text-success);">\${completed}</div>\n    <div style="font-size: 11px; color: var(--text-muted);">已完成</div>\n  </div>\n  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">\n    <div style="font-size: 28px; font-weight: 700; color: var(--text-accent);">\${inProgress}</div>\n    <div style="font-size: 11px; color: var(--text-muted);">进行中</div>\n  </div>\n  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">\n    <div style="font-size: 28px; font-weight: 700; color: var(--interactive-accent);">\${avgProgress}%</div>\n    <div style="font-size: 11px; color: var(--text-muted);">平均进度</div>\n  </div>\n</div>\n\`);\n\`\`\`\n\n---\n\n## 📁 关联特性\n\n\`\`\`dataview\nTABLE status, priority, progress + "%" as "进度"\nFROM "ProjectManager/Features"\nWHERE projectId = "${project.id}"\nSORT priority DESC\n\`\`\`\n\n---\n\n*项目文件由 Project Manager 插件自动生成*\n`;
  }
}
