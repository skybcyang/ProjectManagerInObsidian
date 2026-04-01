import { App } from 'obsidian';
import { FileSystem } from '../filesystem';
import { generateId } from '../../utils/idGenerator';
import type { Project, CreateProjectData, UpdateProjectData } from '../../types';

/**
 * 项目存储类
 * 负责项目实体的 CRUD 操作
 */
export class ProjectStore {
  private readonly FOLDER = 'ProjectManager/Projects';

  constructor(
    private fs: FileSystem,
    private app: App
  ) {}

  /**
   * 创建项目
   */
  async create(data: CreateProjectData): Promise<Project> {
    if (!data.versionId) {
      throw new Error('项目必须关联版本');
    }

    await this.fs.ensureFolder(this.FOLDER);

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

    const path = await this.fs.ensureUniquePath(this.buildPath(project));
    await this.fs.writeFile(path, project as unknown as Record<string, unknown>, this.generateTemplate(project));
    
    return project;
  }

  /**
   * 更新项目
   */
  async update(id: string, data: UpdateProjectData): Promise<Project | null> {
    const found = await this.getWithPath(id);
    if (!found) return null;
    const { project, path: oldPath } = found;

    const updated: Project = {
      ...project,
      ...data,
      tags: data.tags ?? project.tags,
    };

    const newPath = await this.fs.ensureUniquePath(this.buildPath(updated));

    const existing = await this.fs.readFile(oldPath);
    const content = existing?.content ?? '';

    if (oldPath !== newPath) {
      await this.fs.writeFile(newPath, updated as unknown as Record<string, unknown>, content);
      await this.fs.deleteFile(oldPath);
    } else {
      await this.fs.writeFile(newPath, updated as unknown as Record<string, unknown>, content);
    }

    return updated;
  }

  /**
   * 删除项目
   */
  async delete(id: string): Promise<boolean> {
    const found = await this.getWithPath(id);
    if (!found) return false;

    await this.fs.deleteFile(found.path);
    return true;
  }

  /**
   * 根据 ID 获取项目
   */
  async getById(id: string): Promise<Project | null> {
    const found = await this.getWithPath(id);
    return found?.project ?? null;
  }

  /**
   * 根据 ID 获取项目文件路径
   */
  async getPath(id: string): Promise<string | null> {
    const found = await this.getWithPath(id);
    return found?.path ?? null;
  }

  /**
   * 列出所有项目
   */
  async list(filters?: { versionId?: string }): Promise<Project[]> {
    const files = this.fs.listFiles(this.FOLDER);
    const projects: Project[] = [];

    for (const file of files) {
      const data = await this.fs.readFile(file.path);
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

  /**
   * 检查项目是否存在
   */
  async exists(id: string): Promise<boolean> {
    return (await this.getWithPath(id)) !== null;
  }

  /**
   * 将关联特性的 projectId 置空
   * 用于删除项目前的清理
   */
  async orphanFeatures(projectId: string): Promise<void> {
    const featureFiles = this.fs.listFiles('ProjectManager/Features');
    for (const file of featureFiles) {
      const data = await this.fs.readFile(file.path);
      if (data && data.frontmatter.projectId === projectId) {
        const cache = this.app.metadataCache.getFileCache(file);
        const fm = cache?.frontmatter;
        if (fm) {
          const updatedFrontmatter = { ...fm, projectId: '' };
          await this.fs.writeFile(file.path, updatedFrontmatter, data.content);
        }
      }
    }
  }

  /**
   * 获取项目及其路径
   */
  private async getWithPath(id: string): Promise<{ project: Project; path: string } | null> {
    const file = this.fs.findById(this.FOLDER, id);
    if (!file) return null;

    const data = await this.fs.readFile(file.path);
    if (!data) return null;

    const project = this.parseProject(data.frontmatter);
    if (!project) return null;

    return { project, path: file.path };
  }

  /**
   * 构建文件路径
   */
  private buildPath(project: Project): string {
    return `${this.FOLDER}/${this.fs.sanitizeFileName(project.name)}.md`;
  }

  /**
   * 解析 frontmatter 为 Project 对象
   */
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

  /**
   * 生成项目文件模板
   */
  private generateTemplate(project: Project): string {
    const priorityEmoji = { critical: '🔴', high: '🟠', medium: '🔵', low: '🟢' }[project.priority] || '⚪';

    return `# ${priorityEmoji} ${project.name}

> 项目 ID: ${project.id} | 状态: ${project.status} | 优先级: ${project.priority}

---

## 📋 项目概览

<!-- 在此描述项目的背景、目标和范围 -->

---

## 📊 进度统计

\`\`\`dataviewjs
const features = dv.pages('"ProjectManager/Features"').filter(f => f.projectId === "${project.id}");
const total = features.length;
const completed = features.filter(f => f.status === 'completed').length;
const inProgress = features.filter(f => f.status === 'in-progress' || f.status === 'testing').length;
const avgProgress = total > 0 ? Math.round(features.reduce((sum, f) => sum + (f.progress || 0), 0) / total) : 0;

dv.el('div', \`
<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0;">
  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">
    <div style="font-size: 28px; font-weight: 700;">\${total}</div>
    <div style="font-size: 11px; color: var(--text-muted);">总特性</div>
  </div>
  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">
    <div style="font-size: 28px; font-weight: 700; color: var(--text-success);">\${completed}</div>
    <div style="font-size: 11px; color: var(--text-muted);">已完成</div>
  </div>
  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">
    <div style="font-size: 28px; font-weight: 700; color: var(--text-accent);">\${inProgress}</div>
    <div style="font-size: 11px; color: var(--text-muted);">进行中</div>
  </div>
  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">
    <div style="font-size: 28px; font-weight: 700; color: var(--interactive-accent);">\${avgProgress}%</div>
    <div style="font-size: 11px; color: var(--text-muted);">平均进度</div>
  </div>
</div>
\`);
\`\`\`

---

## 📁 关联特性

\`\`\`dataview
TABLE status, priority, progress + "%" as "进度"
FROM "ProjectManager/Features"
WHERE projectId = "${project.id}"
SORT priority DESC
\`\`\`

---

*项目文件由 Project Manager 插件自动生成*
`;
  }
}
