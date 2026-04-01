import { App } from 'obsidian';
import { FileManager } from '../utils/fileManager';
import { generateId } from '../utils/idGenerator';
import type { Version, CreateVersionData, UpdateVersionData } from '../types';

export class VersionService {
  private fileManager: FileManager;
  private app: App;
  private readonly FOLDER = 'ProjectManager/Versions';

  constructor(app: App) {
    this.app = app;
    this.fileManager = new FileManager(app);
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
    await this.fileManager.writeFile(path, version, this.generateTemplate(version));
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

  private generateTemplate(version: Version): string {
    const today = new Date().toISOString().split('T')[0];

    return `---\nid: ${version.id}\nname: ${version.name}\nstatus: ${version.status}\n${version.owner ? `owner: ${version.owner}\n` : ''}${version.startDate ? `startDate: ${version.startDate}\n` : ''}${version.endDate ? `endDate: ${version.endDate}\n` : ''}tags:\n${version.tags.map(t => `  - ${t}`).join('\n')}\n---\n\n# 📦 ${version.name}\n\n> 版本 ID: ${version.id} | 状态: ${version.status}\n\n---\n\n## 🎯 版本目标\n\n<!-- 描述本版本的核心目标和预期成果 -->\n\n### 关键指标\n\n- [ ] 指标1: 描述\n- [ ] 指标2: 描述\n- [ ] 指标3: 描述\n\n---\n\n## 📊 进度概览\n\n\`\`\`dataviewjs\nconst projects = dv.pages('"ProjectManager/Projects"').filter(p => p.versionId === "${version.id}");\nconst features = dv.pages('"ProjectManager/Features"').filter(f => f.versionId === "${version.id}");\nconst completed = features.filter(f => f.status === 'completed').length;\nconst progress = features.length > 0 ? Math.round((completed / features.length) * 100) : 0;\n\ndv.el('div', \`\n<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0;">\n  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">\n    <div style="font-size: 32px; font-weight: 700;">\${projects.length}</div>\n    <div style="font-size: 12px; color: var(--text-muted);">关联项目</div>\n  </div>\n  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">\n    <div style="font-size: 32px; font-weight: 700;">\${features.length}</div>\n    <div style="font-size: 12px; color: var(--text-muted);">总特性</div>\n  </div>\n  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">\n    <div style="font-size: 32px; font-weight: 700; color: var(--interactive-accent);">\${progress}%</div>\n    <div style="font-size: 12px; color: var(--text-muted);">完成进度</div>\n  </div>\n</div>\n\`);\n\`\`\`\n\n---\n\n## 🗓️ 里程碑\n\n### 里程碑1: 规划完成\n- [x] 需求收集\n- [x] 技术方案\n- [ ] 资源分配\n\n### 里程碑2: 开发完成\n- [ ] 核心功能开发\n- [ ] 单元测试\n- [ ] 代码审查\n\n### 里程碑3: 发布上线\n- [ ] 集成测试\n- [ ] 文档更新\n- [ ] 正式发布\n\n---\n\n## 📝 变更日志\n\n| 日期 | 变更内容 | 负责人 |\n|------|---------|--------|\n| ${today} | 版本创建 | ${version.owner || '-'} |\n\n---\n\n*版本文件由 Project Manager 插件自动生成*\n`;
  }
}
