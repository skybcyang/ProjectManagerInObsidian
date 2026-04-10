import { App, TFile } from 'obsidian';
import type { Version, Project, Feature } from '../../types';

/**
 * 实体缓存管理器
 * 提供内存缓存，避免每次 getById 都全量遍历文件
 */
export class EntityCache {
  private versionCache = new Map<string, Version>();
  private projectCache = new Map<string, Project>();
  private featureCache = new Map<string, Feature>();
  private initialized = false;

  constructor(private app: App) {}

  /**
   * 初始化缓存（启动时调用）
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await Promise.all([
      this.loadVersions(),
      this.loadProjects(),
      this.loadFeatures(),
    ]);

    this.initialized = true;
    this.setupFileWatcher();
  }

  /**
   * 获取版本（优先从缓存）
   */
  getVersion(id: string): Version | undefined {
    return this.versionCache.get(id);
  }

  /**
   * 获取项目（优先从缓存）
   */
  getProject(id: string): Project | undefined {
    return this.projectCache.get(id);
  }

  /**
   * 获取特性（优先从缓存）
   */
  getFeature(id: string): Feature | undefined {
    return this.featureCache.get(id);
  }

  /**
   * 获取所有版本
   */
  getAllVersions(): Version[] {
    return Array.from(this.versionCache.values());
  }

  /**
   * 获取所有项目
   */
  getAllProjects(): Project[] {
    return Array.from(this.projectCache.values());
  }

  /**
   * 获取所有特性
   */
  getAllFeatures(): Feature[] {
    return Array.from(this.featureCache.values());
  }

  /**
   * 设置缓存
   */
  setVersion(version: Version): void {
    this.versionCache.set(version.id, version);
  }

  setProject(project: Project): void {
    this.projectCache.set(project.id, project);
  }

  setFeature(feature: Feature): void {
    this.featureCache.set(feature.id, feature);
  }

  /**
   * 删除缓存
   */
  deleteVersion(id: string): void {
    this.versionCache.delete(id);
  }

  deleteProject(id: string): void {
    this.projectCache.delete(id);
  }

  deleteFeature(id: string): void {
    this.featureCache.delete(id);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.versionCache.clear();
    this.projectCache.clear();
    this.featureCache.clear();
    this.initialized = false;
  }

  /**
   * 获取缓存统计
   */
  getStats(): { versions: number; projects: number; features: number } {
    return {
      versions: this.versionCache.size,
      projects: this.projectCache.size,
      features: this.featureCache.size,
    };
  }

  /**
   * 加载所有版本到缓存
   */
  private async loadVersions(): Promise<void> {
    const folder = 'ProjectManager/Versions';
    const files = this.app.vault.getFiles()
      .filter(f => f.path.startsWith(folder) && f.extension === 'md');

    for (const file of files) {
      const version = await this.parseVersionFile(file);
      if (version) {
        this.versionCache.set(version.id, version);
      }
    }
  }

  /**
   * 加载所有项目到缓存
   */
  private async loadProjects(): Promise<void> {
    const folder = 'ProjectManager/Projects';
    const files = this.app.vault.getFiles()
      .filter(f => f.path.startsWith(folder) && f.extension === 'md');

    for (const file of files) {
      const project = await this.parseProjectFile(file);
      if (project) {
        this.projectCache.set(project.id, project);
      }
    }
  }

  /**
   * 加载所有特性到缓存
   */
  private async loadFeatures(): Promise<void> {
    const folder = 'ProjectManager/Features';
    const files = this.app.vault.getFiles()
      .filter(f => f.path.startsWith(folder) && f.extension === 'md');

    for (const file of files) {
      const feature = await this.parseFeatureFile(file);
      if (feature) {
        this.featureCache.set(feature.id, feature);
      }
    }
  }

  /**
   * 解析版本文件
   */
  private async parseVersionFile(file: TFile): Promise<Version | null> {
    const cache = this.app.metadataCache.getFileCache(file);
    let frontmatter: Record<string, unknown> | undefined = cache?.frontmatter;

    // 如果 metadata 还没准备好，直接从文件读取
    if (!frontmatter?.id) {
      const content = await this.app.vault.cachedRead(file);
      const parsed = this.parseFrontmatterFromContent(content);
      if (!parsed?.id) return null;
      frontmatter = parsed;
    }

    return {
      id: String(frontmatter.id),
      name: String(frontmatter.name || file.basename),
      status: String(frontmatter.status || 'planning'),
      owner: frontmatter.owner ? String(frontmatter.owner) : undefined,
      startDate: frontmatter.startDate ? String(frontmatter.startDate) : undefined,
      endDate: frontmatter.endDate ? String(frontmatter.endDate) : undefined,
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
    } as Version;
  }

  /**
   * 从文件内容解析 frontmatter
   */
  private parseFrontmatterFromContent(content: string): Record<string, unknown> | null {
    const match = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!match) return null;

    const yaml = match[1];
    const frontmatter: Record<string, unknown> = {};

    for (const line of yaml.split('\n')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      if (value.startsWith('[') && value.endsWith(']')) {
        frontmatter[key] = value.slice(1, -1).split(',').map(v => v.trim()).filter(v => v);
      } else if (value === 'true') {
        frontmatter[key] = true;
      } else if (value === 'false') {
        frontmatter[key] = false;
      } else if (/^\d+$/.test(value)) {
        frontmatter[key] = parseInt(value, 10);
      } else {
        frontmatter[key] = value;
      }
    }

    return frontmatter;
  }

  /**
   * 解析项目文件
   */
  private async parseProjectFile(file: TFile): Promise<Project | null> {
    const cache = this.app.metadataCache.getFileCache(file);
    let frontmatter: Record<string, unknown> | undefined = cache?.frontmatter;

    // 如果 metadata 还没准备好，直接从文件读取
    if (!frontmatter?.id) {
      const content = await this.app.vault.cachedRead(file);
      const parsed = this.parseFrontmatterFromContent(content);
      if (!parsed?.id) return null;
      frontmatter = parsed;
    }

    return {
      id: String(frontmatter.id),
      name: String(frontmatter.name || file.basename),
      versionId: frontmatter.versionId ? String(frontmatter.versionId) : undefined,
      status: String(frontmatter.status || 'backlog'),
      description: frontmatter.description ? String(frontmatter.description) : undefined,
      startDate: frontmatter.startDate ? String(frontmatter.startDate) : undefined,
      endDate: frontmatter.endDate ? String(frontmatter.endDate) : undefined,
      owner: frontmatter.owner ? String(frontmatter.owner) : undefined,
      priority: frontmatter.priority ? String(frontmatter.priority) : undefined,
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
    } as Project;
  }

  /**
   * 解析特性文件
   */
  private async parseFeatureFile(file: TFile): Promise<Feature | null> {
    const cache = this.app.metadataCache.getFileCache(file);
    let frontmatter: Record<string, unknown> | undefined = cache?.frontmatter;

    // 如果 metadata 还没准备好，直接从文件读取
    if (!frontmatter?.id) {
      const content = await this.app.vault.cachedRead(file);
      const parsed = this.parseFrontmatterFromContent(content);
      if (!parsed?.id) return null;
      frontmatter = parsed;
    }

    return {
      id: String(frontmatter.id),
      name: String(frontmatter.name || file.basename),
      projectId: frontmatter.projectId ? String(frontmatter.projectId) : undefined,
      versionId: frontmatter.versionId ? String(frontmatter.versionId) : undefined,
      status: String(frontmatter.status || 'backlog'),
      priority: String(frontmatter.priority || 'medium'),
      progress: typeof frontmatter.progress === 'number' ? frontmatter.progress : 0,
      description: frontmatter.description ? String(frontmatter.description) : undefined,
      startDate: frontmatter.startDate ? String(frontmatter.startDate) : undefined,
      endDate: frontmatter.endDate ? String(frontmatter.endDate) : undefined,
      owner: frontmatter.owner ? String(frontmatter.owner) : undefined,
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
      isMilestone: frontmatter.isMilestone === true,
    } as Feature;
  }

  /**
   * 设置文件监听器
   */
  private setupFileWatcher(): void {
    // 监听文件创建
    this.app.vault.on('create', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        this.handleFileChange(file);
      }
    });

    // 监听文件修改
    this.app.metadataCache.on('changed', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        this.handleFileChange(file);
      }
    });

    // 监听文件删除
    this.app.vault.on('delete', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        this.handleFileDelete(file);
      }
    });

    // 监听文件重命名
    this.app.vault.on('rename', (file, oldPath) => {
      if (file instanceof TFile && file.extension === 'md') {
        this.handleFileRename(file, oldPath);
      }
    });
  }

  /**
   * 处理文件变更
   */
  private async handleFileChange(file: TFile): Promise<void> {
    const path = file.path;

    if (path.startsWith('ProjectManager/Versions/')) {
      const version = await this.parseVersionFile(file);
      if (version) {
        this.versionCache.set(version.id, version);
      }
    } else if (path.startsWith('ProjectManager/Projects/')) {
      const project = await this.parseProjectFile(file);
      if (project) {
        this.projectCache.set(project.id, project);
      }
    } else if (path.startsWith('ProjectManager/Features/')) {
      const feature = await this.parseFeatureFile(file);
      if (feature) {
        this.featureCache.set(feature.id, feature);
      }
    }
  }

  /**
   * 处理文件删除
   * 从缓存中删除对应的实体
   */
  private handleFileDelete(file: TFile): void {
    const path = file.path;

    // 通过文件名查找并删除对应缓存
    // 文件名格式: 版本名.md / 版本名-项目名.md / 版本名-项目名-特性名.md
    const fileName = file.basename;

    if (path.startsWith('ProjectManager/Versions/')) {
      // 查找匹配的版本缓存
      for (const [id, version] of this.versionCache.entries()) {
        if (version.name === fileName) {
          this.versionCache.delete(id);
          break;
        }
      }
    } else if (path.startsWith('ProjectManager/Projects/')) {
      // 查找匹配的项目缓存
      for (const [id, project] of this.projectCache.entries()) {
        // 项目文件名格式: 版本名-项目名
        const expectedName = `${project.name}`;
        if (fileName.endsWith(expectedName) || fileName === expectedName) {
          this.projectCache.delete(id);
          break;
        }
      }
    } else if (path.startsWith('ProjectManager/Features/')) {
      // 查找匹配的特性缓存
      for (const [id, feature] of this.featureCache.entries()) {
        // 特性文件名格式: 版本名-项目名-特性名
        if (fileName.endsWith(feature.name)) {
          this.featureCache.delete(id);
          break;
        }
      }
    }
  }

  /**
   * 处理文件重命名
   */
  private async handleFileRename(file: TFile, oldPath: string): Promise<void> {
    this.handleFileDelete({ path: oldPath } as TFile);
    await this.handleFileChange(file);
  }
}
