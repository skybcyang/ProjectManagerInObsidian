import { App, Plugin } from 'obsidian';
import { DataviewService } from './DataviewService';
import type { Version, Project, Feature } from '../types';

/**
 * Dataview 函数注册表
 * 注册自定义 Dataview 函数供用户在查询中使用
 */
export class DataviewFunctionRegistry {
  private app: App;
  private dataviewService: DataviewService;
  private plugin: Plugin;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.dataviewService = new DataviewService(app);
  }

  /**
   * 检查 Dataview 插件是否可用
   */
  isDataviewAvailable(): boolean {
    return this.dataviewService.isAvailable();
  }

  /**
   * 注册所有自定义 Dataview 函数
   * 需要在 Dataview 插件加载完成后调用
   */
  registerFunctions(): void {
    if (!this.isDataviewAvailable()) {
      return;
    }

    // @ts-ignore - Dataview API 没有类型定义
    const dataview = this.app.plugins.getPlugin('dataview');
    if (!dataview?.api) return;

    // 注册 pmVersionProjects 函数
    this.registerFunction(dataview.api, 'pmVersionProjects', (versionId: string): Project[] => {
      if (!versionId) return [];
      // 使用同步方式获取（在 Dataview 查询中使用缓存结果）
      const files = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith('ProjectManager/Projects/'));

      return files.map(file => {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache?.frontmatter) return null;
        return this.parseProjectFromFrontmatter(cache.frontmatter, file.path);
      }).filter((p): p is Project => p !== null && p.versionId === versionId);
    });

    // 注册 pmProjectFeatures 函数
    this.registerFunction(dataview.api, 'pmProjectFeatures', (projectId: string): Feature[] => {
      if (!projectId) return [];
      const files = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith('ProjectManager/Features/'));

      return files.map(file => {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache?.frontmatter) return null;
        return this.parseFeatureFromFrontmatter(cache.frontmatter, file.path);
      }).filter((f): f is Feature => f !== null && f.projectId === projectId);
    });

    // 注册 pmVersionProgress 函数
    this.registerFunction(dataview.api, 'pmVersionProgress', (versionId: string): number => {
      if (!versionId) return 0;
      const features = this.getVersionFeaturesSync(versionId);
      if (features.length === 0) return 0;
      const totalProgress = features.reduce((sum, f) => sum + (f.progress || 0), 0);
      return Math.round(totalProgress / features.length);
    });

    // 注册 pmProjectProgress 函数
    this.registerFunction(dataview.api, 'pmProjectProgress', (projectId: string): number => {
      if (!projectId) return 0;
      const features = this.getProjectFeaturesSync(projectId);
      if (features.length === 0) return 0;
      const totalProgress = features.reduce((sum, f) => sum + (f.progress || 0), 0);
      return Math.round(totalProgress / features.length);
    });

    // 注册 pmEntityStatus 函数
    this.registerFunction(dataview.api, 'pmEntityStatus', (id: string): string => {
      if (!id) return '';
      const entity = this.findEntityByIdSync(id);
      return entity ? entity.status : '';
    });

    // 注册 pmOverdueItems 函数
    this.registerFunction(dataview.api, 'pmOverdueItems', (type?: string): Array<Version | Project | Feature> => {
      const today = new Date().toISOString().split('T')[0];
      const items: Array<Version | Project | Feature> = [];

      if (!type || type === 'version') {
        const versions = this.getAllVersionsSync();
        items.push(...versions.filter(v => v.endDate && v.endDate < today && v.status !== 'completed'));
      }

      if (!type || type === 'project') {
        const projects = this.getAllProjectsSync();
        items.push(...projects.filter(p => p.endDate && p.endDate < today && p.status !== 'completed'));
      }

      if (!type || type === 'feature') {
        const features = this.getAllFeaturesSync();
        items.push(...features.filter(f => f.endDate && f.endDate < today && f.status !== 'completed'));
      }

      return items;
    });
  }

  /**
   * 注册单个函数到 Dataview
   */
  private registerFunction(api: unknown, name: string, fn: (...args: unknown[]) => unknown): void {
    // @ts-ignore - Dataview API 没有类型定义
    if (api) {
      // 直接赋值到 api 对象
      // @ts-ignore
      api[name] = fn;
      console.log(`【ProjectManager】注册 Dataview 函数: ${name}`);
    }
  }

  // ==================== 同步查询辅助方法 ====================

  /**
   * 同步获取版本下的所有特性
   */
  private getVersionFeaturesSync(versionId: string): Feature[] {
    const files = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith('ProjectManager/Features/'));

    return files.map(file => {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter) return null;
      const feature = this.parseFeatureFromFrontmatter(cache.frontmatter, file.path);
      return feature?.versionId === versionId ? feature : null;
    }).filter((f): f is Feature => f !== null);
  }

  /**
   * 同步获取项目下的所有特性
   */
  private getProjectFeaturesSync(projectId: string): Feature[] {
    const files = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith('ProjectManager/Features/'));

    return files.map(file => {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter) return null;
      const feature = this.parseFeatureFromFrontmatter(cache.frontmatter, file.path);
      return feature?.projectId === projectId ? feature : null;
    }).filter((f): f is Feature => f !== null);
  }

  /**
   * 同步根据 ID 查找实体
   */
  private findEntityByIdSync(id: string): Version | Project | Feature | null {
    // 先查找特性
    const featureFiles = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith('ProjectManager/Features/'));
    for (const file of featureFiles) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter?.id === id) {
        return this.parseFeatureFromFrontmatter(cache.frontmatter, file.path);
      }
    }

    // 再查找项目
    const projectFiles = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith('ProjectManager/Projects/'));
    for (const file of projectFiles) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter?.id === id) {
        return this.parseProjectFromFrontmatter(cache.frontmatter, file.path);
      }
    }

    // 最后查找版本
    const versionFiles = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith('ProjectManager/Versions/'));
    for (const file of versionFiles) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter?.id === id) {
        return this.parseVersionFromFrontmatter(cache.frontmatter, file.path);
      }
    }

    return null;
  }

  /**
   * 同步获取所有版本
   */
  private getAllVersionsSync(): Version[] {
    const files = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith('ProjectManager/Versions/'));

    return files.map(file => {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter) return null;
      return this.parseVersionFromFrontmatter(cache.frontmatter, file.path);
    }).filter((v): v is Version => v !== null);
  }

  /**
   * 同步获取所有项目
   */
  private getAllProjectsSync(): Project[] {
    const files = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith('ProjectManager/Projects/'));

    return files.map(file => {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter) return null;
      return this.parseProjectFromFrontmatter(cache.frontmatter, file.path);
    }).filter((p): p is Project => p !== null);
  }

  /**
   * 同步获取所有特性
   */
  private getAllFeaturesSync(): Feature[] {
    const files = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith('ProjectManager/Features/'));

    return files.map(file => {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter) return null;
      return this.parseFeatureFromFrontmatter(cache.frontmatter, file.path);
    }).filter((f): f is Feature => f !== null);
  }

  // ==================== 解析辅助方法 ====================

  private parseVersionFromFrontmatter(frontmatter: Record<string, unknown>, path: string): Version | null {
    const id = frontmatter.id as string;
    const name = frontmatter.name as string || path.split('/').pop()?.replace('.md', '');
    const status = frontmatter.status as string;

    if (!id || !name || !status) return null;

    return {
      id,
      name,
      status: status as Version['status'],
      owner: frontmatter.owner as string | undefined,
      startDate: frontmatter.startDate as string | undefined,
      endDate: frontmatter.endDate as string | undefined,
      tags: this.parseTags(frontmatter.tags),
    };
  }

  private parseProjectFromFrontmatter(frontmatter: Record<string, unknown>, path: string): Project | null {
    const id = frontmatter.id as string;
    const name = frontmatter.name as string || path.split('/').pop()?.replace('.md', '');
    const status = frontmatter.status as string;
    const versionId = frontmatter.versionId as string;
    const priority = frontmatter.priority as string;

    if (!id || !name || !status || !versionId || !priority) return null;

    return {
      id,
      name,
      versionId,
      status: status as Project['status'],
      owner: frontmatter.owner as string | undefined,
      priority: priority as Project['priority'],
      startDate: frontmatter.startDate as string | undefined,
      endDate: frontmatter.endDate as string | undefined,
      tags: this.parseTags(frontmatter.tags),
    };
  }

  private parseFeatureFromFrontmatter(frontmatter: Record<string, unknown>, path: string): Feature | null {
    const id = frontmatter.id as string;
    const name = frontmatter.name as string || path.split('/').pop()?.replace('.md', '');
    const status = frontmatter.status as string;
    const versionId = frontmatter.versionId as string;
    const projectId = frontmatter.projectId as string;
    const priority = frontmatter.priority as string;

    if (!id || !name || !status || !versionId || !projectId || !priority) return null;

    return {
      id,
      name,
      versionId,
      projectId,
      status: status as Feature['status'],
      owner: frontmatter.owner as string | undefined,
      priority: priority as Feature['priority'],
      tags: this.parseTags(frontmatter.tags),
      progress: (frontmatter.progress as number) || 0,
      startDate: frontmatter.startDate as string | undefined,
      endDate: frontmatter.endDate as string | undefined,
      isMilestone: frontmatter.isMilestone as boolean | undefined,
      estimatedDays: frontmatter.estimatedDays as number | undefined,
      actualDays: frontmatter.actualDays as number | undefined,
    };
  }

  private parseTags(tags: unknown): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.filter((t): t is string => typeof t === 'string');
    if (typeof tags === 'string') return [tags];
    return [];
  }
}
