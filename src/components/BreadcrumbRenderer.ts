import { App, TFile } from 'obsidian';
import type { VersionService } from '../services/VersionService';
import type { ProjectService } from '../services/ProjectService';
import type { FeatureService } from '../services/FeatureService';
import type { Version, Project, Feature } from '../types';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

export class BreadcrumbRenderer {
  constructor(
    private app: App,
    private versionService: VersionService,
    private projectService: ProjectService,
    private featureService: FeatureService
  ) {}

  /**
   * 为指定文件渲染面包屑导航
   */
  async renderForFile(file: TFile, containerEl: HTMLElement): Promise<void> {
    // 避免重复渲染
    if (containerEl.querySelector('.pm-breadcrumb')) return;

    const items = await this.buildBreadcrumb(file);
    if (items.length === 0) return;

    const breadcrumb = containerEl.createDiv({ cls: 'pm-breadcrumb' });
    // 插入到容器最前面
    containerEl.prepend(breadcrumb);

    items.forEach((item, index) => {
      if (index > 0) {
        breadcrumb.createEl('span', {
          text: '>',
          cls: 'pm-breadcrumb__separator',
        });
      }

      if (item.path) {
        const link = breadcrumb.createEl('a', {
          text: item.label,
          cls: 'pm-breadcrumb__link',
        });
        link.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.openFile(item.path!);
        });
      } else {
        breadcrumb.createEl('span', {
          text: item.label,
          cls: 'pm-breadcrumb__current',
        });
      }
    });
  }

  private async buildBreadcrumb(file: TFile): Promise<BreadcrumbItem[]> {
    const items: BreadcrumbItem[] = [];

    // 总览页
    items.push({ label: '📊 项目管理总览', path: 'ProjectManager/总览.md' });

    if (file.path.startsWith('ProjectManager/Versions/')) {
      const version = await this.parseVersionFile(file);
      if (version) {
        items.push({ label: version.name });
      }
    } else if (file.path.startsWith('ProjectManager/Projects/')) {
      const project = await this.parseProjectFile(file);
      if (project) {
        const versionPath = await this.versionService.getVersionPath(project.versionId);
        if (versionPath) {
          const version = await this.versionService.getVersion(project.versionId);
          items.push({
            label: version?.name ?? '未分配版本',
            path: versionPath,
          });
        }
        items.push({ label: project.name });
      }
    } else if (file.path.startsWith('ProjectManager/Features/')) {
      const feature = await this.parseFeatureFile(file);
      if (feature) {
        const versionPath = await this.versionService.getVersionPath(feature.versionId);
        if (versionPath) {
          const version = await this.versionService.getVersion(feature.versionId);
          items.push({
            label: version?.name ?? '未分配版本',
            path: versionPath,
          });
        }
        const projectPath = await this.projectService.getProjectPath(feature.projectId);
        if (projectPath) {
          const project = await this.projectService.getProject(feature.projectId);
          items.push({
            label: project?.name ?? '未分配项目',
            path: projectPath,
          });
        }
        items.push({ label: feature.name });
      }
    } else {
      return [];
    }

    return items;
  }

  private async parseVersionFile(file: TFile): Promise<Version | null> {
    const cache = this.app.metadataCache.getFileCache(file);
    const fm = cache?.frontmatter;
    if (!fm?.id || !fm?.name) return null;
    return {
      id: String(fm.id),
      name: String(fm.name),
      status: String(fm.status || 'planning') as Version['status'],
      owner: fm.owner ? String(fm.owner) : undefined,
      startDate: fm.startDate ? String(fm.startDate) : undefined,
      endDate: fm.endDate ? String(fm.endDate) : undefined,
      tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    };
  }

  private async parseProjectFile(file: TFile): Promise<Project | null> {
    const cache = this.app.metadataCache.getFileCache(file);
    const fm = cache?.frontmatter;
    if (!fm?.id || !fm?.name) return null;
    return {
      id: String(fm.id),
      name: String(fm.name),
      versionId: String(fm.versionId ?? ''),
      status: String(fm.status || 'backlog') as Project['status'],
      owner: fm.owner ? String(fm.owner) : undefined,
      priority: String(fm.priority || 'medium') as Project['priority'],
      tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    };
  }

  private async parseFeatureFile(file: TFile): Promise<Feature | null> {
    const cache = this.app.metadataCache.getFileCache(file);
    const fm = cache?.frontmatter;
    if (!fm?.id || !fm?.name) return null;
    return {
      id: String(fm.id),
      name: String(fm.name),
      versionId: String(fm.versionId ?? ''),
      projectId: String(fm.projectId ?? ''),
      status: String(fm.status || 'backlog') as Feature['status'],
      owner: fm.owner ? String(fm.owner) : undefined,
      priority: String(fm.priority || 'medium') as Feature['priority'],
      tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
      progress: Number(fm.progress ?? 0),
      dueDate: fm.dueDate ? String(fm.dueDate) : undefined,
    };
  }

  private async openFile(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf().openFile(file);
    }
  }
}
