import { App } from 'obsidian';
import { FileManager } from '../utils/fileManager';
import { generateId } from '../utils/idGenerator';
import type { Feature, CreateFeatureData, UpdateFeatureData } from '../types';

export class FeatureService {
  private fileManager: FileManager;
  private app: App;
  private readonly FOLDER = 'ProjectManager/Features';

  constructor(app: App) {
    this.app = app;
    this.fileManager = new FileManager(app);
  }

  async createFeature(data: CreateFeatureData): Promise<Feature> {
    if (!data.versionId) {
      throw new Error('特性必须关联版本');
    }
    if (!data.projectId) {
      throw new Error('特性必须关联项目');
    }

    await this.fileManager.ensureFolder(this.FOLDER);

    const id = generateId();
    const feature: Feature = {
      id,
      name: data.name,
      versionId: data.versionId,
      projectId: data.projectId,
      status: data.status ?? 'backlog',
      owner: data.owner,
      priority: data.priority ?? 'medium',
      tags: data.tags ?? [],
      progress: data.progress ?? 0,
      startDate: data.startDate,
      endDate: data.endDate,
    };

    const path = await this.ensureUniquePath(this.buildPath(feature));
    await this.fileManager.writeFile(path, feature, this.generateTemplate(feature));
    return feature;
  }

  async updateFeature(id: string, data: UpdateFeatureData): Promise<Feature | null> {
    const found = await this.getFeatureById(id);
    if (!found) return null;
    const { feature, path: oldPath } = found;

    const updated: Feature = {
      ...feature,
      ...data,
      tags: data.tags ?? feature.tags,
      progress: data.progress ?? feature.progress,
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

  async deleteFeature(id: string): Promise<boolean> {
    const found = await this.getFeatureById(id);
    if (!found) return false;
    const { path } = found;

    await this.fileManager.deleteFile(path);
    return true;
  }

  async getFeature(id: string): Promise<Feature | null> {
    const found = await this.getFeatureById(id);
    return found?.feature ?? null;
  }

  async getFeaturePath(id: string): Promise<string | null> {
    const found = await this.getFeatureById(id);
    return found?.path ?? null;
  }

  async listFeatures(filters?: { versionId?: string; projectId?: string; status?: Feature['status'] }): Promise<Feature[]> {
    const files = this.fileManager.listMarkdownFiles(this.FOLDER);
    const features: Feature[] = [];

    for (const file of files) {
      const data = await this.fileManager.readFile(file.path);
      if (data) {
        const feature = this.parseFeature(data.frontmatter);
        if (feature) {
          if (filters?.versionId && feature.versionId !== filters.versionId) continue;
          if (filters?.projectId && feature.projectId !== filters.projectId) continue;
          if (filters?.status && feature.status !== filters.status) continue;
          features.push(feature);
        }
      }
    }

    return features;
  }

  async getFeaturesByVersion(versionId: string): Promise<Feature[]> {
    return this.listFeatures({ versionId });
  }

  async getFeaturesByProject(projectId: string): Promise<Feature[]> {
    return this.listFeatures({ projectId });
  }

  private async getFeatureById(id: string): Promise<{ feature: Feature; path: string } | null> {
    const files = this.fileManager.listMarkdownFiles(this.FOLDER);
    for (const file of files) {
      const data = await this.fileManager.readFile(file.path);
      if (data && data.frontmatter.id === id) {
        const feature = this.parseFeature(data.frontmatter);
        if (feature) return { feature, path: file.path };
      }
    }
    return null;
  }

  private buildPath(feature: Feature): string {
    return `${this.FOLDER}/${this.sanitizeFileName(feature.name)}.md`;
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

  private parseFeature(frontmatter: Record<string, unknown>): Feature | null {
    if (!frontmatter.id || !frontmatter.name || !frontmatter.status) {
      return null;
    }
    return {
      id: String(frontmatter.id),
      name: String(frontmatter.name),
      versionId: String(frontmatter.versionId ?? ''),
      projectId: String(frontmatter.projectId ?? ''),
      status: String(frontmatter.status) as Feature['status'],
      owner: frontmatter.owner ? String(frontmatter.owner) : undefined,
      priority: String(frontmatter.priority ?? 'medium') as Feature['priority'],
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
      progress: Number(frontmatter.progress ?? 0),
      startDate: frontmatter.startDate ? String(frontmatter.startDate) : undefined,
      endDate: frontmatter.endDate ? String(frontmatter.endDate) : undefined,
    };
  }

  private generateTemplate(feature: Feature): string {
    const priorityEmoji = { critical: '🔴', high: '🟠', medium: '🔵', low: '🟢' }[feature.priority] || '⚪';
    const statusEmoji = { backlog: '📋', todo: '📝', 'in-progress': '🚀', testing: '🧪', completed: '✅', archived: '📦' }[feature.status] || '⏳';
    const today = new Date().toISOString().split('T')[0];
    const projectName = this.getEntityName('ProjectManager/Projects', feature.projectId);
    const versionName = this.getEntityName('ProjectManager/Versions', feature.versionId);

    return `---\nid: ${feature.id}\nname: ${feature.name}\nversionId: ${feature.versionId}\nprojectId: ${feature.projectId}\nstatus: ${feature.status}\n${feature.owner ? `owner: ${feature.owner}\n` : ''}priority: ${feature.priority}\nprogress: ${feature.progress}\n${feature.startDate ? `startDate: ${feature.startDate}\n` : ''}${feature.endDate ? `endDate: ${feature.endDate}\n` : ''}tags:\n${feature.tags.map(t => `  - ${t}`).join('\n')}\n---\n\n# ${priorityEmoji} ${statusEmoji} ${feature.name}\n\n> 特性 ID: ${feature.id} | 进度: ${feature.progress}% | 结束日期: ${feature.endDate || '未设置'}\n\n---\n\n## 📋 需求描述\n\n<!-- 详细描述这个特性的功能需求 -->\n\n### 用户故事\n\n作为一个 **[角色]**，\n我希望 **[功能]**，\n以便 **[价值]**。\n\n### 功能描述\n\n1. **功能点1**: 详细描述\n2. **功能点2**: 详细描述\n3. **功能点3**: 详细描述\n\n### 验收标准\n\n- [ ] 标准1: 描述\n- [ ] 标准2: 描述\n- [ ] 标准3: 描述\n\n---\n\n## 📈 进度追踪\n\n**当前进度: ${feature.progress}%**\n\n<div style="height: 10px; background: var(--background-modifier-border); border-radius: 5px; overflow: hidden; margin: 12px 0;">\n  <div style="width: ${feature.progress}%; height: 100%; background: var(--interactive-accent); border-radius: 5px;"></div>\n</div>\n\n### 进度日志\n\n#### ${today} - 创建特性\n- 初始进度: ${feature.progress}%\n- 状态: ${feature.status}\n\n---\n\n## 🧪 测试记录\n\n### 测试用例\n\n| ID | 用例名称 | 测试步骤 | 预期结果 | 状态 |\n|----|---------|---------|---------|------|\n| TC01 | 用例1 | 步骤 | 结果 | ⏳ 未开始 |\n| TC02 | 用例2 | 步骤 | 结果 | ⏳ 未开始 |\n\n---\n\n## 🔗 关联信息\n\n### 所属项目\n\n${projectName ? `[[ProjectManager/Projects/${projectName}|${projectName}]]` : '未分配项目'}\n\n### 所属版本\n\n${versionName ? `[[ProjectManager/Versions/${versionName}|${versionName}]]` : '未分配版本'}\n\n### 相关特性\n\n\`\`\`dataview\nTABLE status, priority, progress + "%" as "进度"\nFROM "ProjectManager/Features"\nWHERE projectId = "${feature.projectId}" AND id != "${feature.id}"\nSORT priority DESC\nLIMIT 5\n\`\`\`\n\n---\n\n*特性文件由 Project Manager 插件自动生成*\n`;
  }

  private getEntityName(folder: string, id: string): string | null {
    const files = this.fileManager.listMarkdownFiles(folder);
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter?.id === id) {
        return String(cache.frontmatter.name || file.basename);
      }
    }
    return null;
  }
}
