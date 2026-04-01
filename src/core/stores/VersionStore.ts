import { App } from 'obsidian';
import { FileSystem } from '../filesystem';
import { generateId } from '../../utils/idGenerator';
import type { Version, CreateVersionData, UpdateVersionData } from '../../types';

/**
 * 版本存储类
 * 负责版本实体的 CRUD 操作
 */
export class VersionStore {
  private readonly FOLDER = 'ProjectManager/Versions';

  constructor(
    private fs: FileSystem,
    private app: App
  ) {}

  /**
   * 创建版本
   */
  async create(data: CreateVersionData): Promise<Version> {
    await this.fs.ensureFolder(this.FOLDER);

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

    const path = await this.fs.ensureUniquePath(this.buildPath(version));
    await this.fs.writeFile(path, version as unknown as Record<string, unknown>, this.generateTemplate(version));
    
    return version;
  }

  /**
   * 更新版本
   */
  async update(id: string, data: UpdateVersionData): Promise<Version | null> {
    const found = await this.getWithPath(id);
    if (!found) return null;
    const { version, path: oldPath } = found;

    const updated: Version = {
      ...version,
      ...data,
      tags: data.tags ?? version.tags,
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
   * 删除版本
   */
  async delete(id: string): Promise<boolean> {
    const found = await this.getWithPath(id);
    if (!found) return false;
    
    await this.fs.deleteFile(found.path);
    return true;
  }

  /**
   * 根据 ID 获取版本
   */
  async getById(id: string): Promise<Version | null> {
    const found = await this.getWithPath(id);
    return found?.version ?? null;
  }

  /**
   * 根据 ID 获取版本文件路径
   */
  async getPath(id: string): Promise<string | null> {
    const found = await this.getWithPath(id);
    return found?.path ?? null;
  }

  /**
   * 列出所有版本
   */
  async list(): Promise<Version[]> {
    const files = this.fs.listFiles(this.FOLDER);
    const versions: Version[] = [];

    for (const file of files) {
      const data = await this.fs.readFile(file.path);
      if (data) {
        const version = this.parseVersion(data.frontmatter);
        if (version) versions.push(version);
      }
    }

    return versions;
  }

  /**
   * 检查版本是否存在
   */
  async exists(id: string): Promise<boolean> {
    return (await this.getWithPath(id)) !== null;
  }

  /**
   * 检查版本下是否有关联项目
   */
  async hasProjects(versionId: string): Promise<boolean> {
    const projectFiles = this.fs.listFiles('ProjectManager/Projects');
    for (const file of projectFiles) {
      const data = await this.fs.readFile(file.path);
      if (data && data.frontmatter.versionId === versionId) {
        return true;
      }
    }
    return false;
  }

  /**
   * 获取版本及其路径
   */
  private async getWithPath(id: string): Promise<{ version: Version; path: string } | null> {
    const file = this.fs.findById(this.FOLDER, id);
    if (!file) return null;

    const data = await this.fs.readFile(file.path);
    if (!data) return null;

    const version = this.parseVersion(data.frontmatter);
    if (!version) return null;

    return { version, path: file.path };
  }

  /**
   * 构建文件路径
   */
  private buildPath(version: Version): string {
    return `${this.FOLDER}/${this.fs.sanitizeFileName(version.name)}.md`;
  }

  /**
   * 解析 frontmatter 为 Version 对象
   */
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

  /**
   * 生成版本文件模板
   */
  private generateTemplate(version: Version): string {
    const today = new Date().toISOString().split('T')[0];

    return `# 📦 ${version.name}

> 版本 ID: ${version.id} | 状态: ${version.status}

---

## 🎯 版本目标

<!-- 描述本版本的核心目标和预期成果 -->

### 关键指标

- [ ] 指标1: 描述
- [ ] 指标2: 描述
- [ ] 指标3: 描述

---

## 📊 进度概览

\`\`\`dataviewjs
const projects = dv.pages('"ProjectManager/Projects"').filter(p => p.versionId === "${version.id}");
const features = dv.pages('"ProjectManager/Features"').filter(f => f.versionId === "${version.id}");
const completed = features.filter(f => f.status === 'completed').length;
const progress = features.length > 0 ? Math.round((completed / features.length) * 100) : 0;

dv.el('div', \`
<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0;">
  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">
    <div style="font-size: 32px; font-weight: 700;">\${projects.length}</div>
    <div style="font-size: 12px; color: var(--text-muted);">关联项目</div>
  </div>
  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">
    <div style="font-size: 32px; font-weight: 700;">\${features.length}</div>
    <div style="font-size: 12px; color: var(--text-muted);">总特性</div>
  </div>
  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">
    <div style="font-size: 32px; font-weight: 700; color: var(--interactive-accent);">\${progress}%</div>
    <div style="font-size: 12px; color: var(--text-muted);">完成进度</div>
  </div>
</div>
\`);
\`\`\`

---

## 🗓️ 里程碑

### 里程碑1: 规划完成
- [x] 需求收集
- [x] 技术方案
- [ ] 资源分配

### 里程碑2: 开发完成
- [ ] 核心功能开发
- [ ] 单元测试
- [ ] 代码审查

### 里程碑3: 发布上线
- [ ] 集成测试
- [ ] 文档更新
- [ ] 正式发布

---

## 📝 变更日志

| 日期 | 变更内容 | 负责人 |
|------|---------|--------|
| ${today} | 版本创建 | ${version.owner || '-'} |

---

*版本文件由 Project Manager 插件自动生成*
`;
  }
}
