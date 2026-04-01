import { App } from 'obsidian';
import { FileSystem } from '../filesystem';
import { generateId } from '../../utils/idGenerator';
import type { Feature, CreateFeatureData, UpdateFeatureData, FeatureStatus } from '../../types';

/**
 * 特性存储类
 * 负责特性实体的 CRUD 操作
 */
export class FeatureStore {
  private readonly FOLDER = 'ProjectManager/Features';

  constructor(
    private fs: FileSystem,
    private app: App
  ) {}

  /**
   * 创建特性
   */
  async create(data: CreateFeatureData): Promise<Feature> {
    if (!data.versionId) {
      throw new Error('特性必须关联版本');
    }
    if (!data.projectId) {
      throw new Error('特性必须关联项目');
    }

    await this.fs.ensureFolder(this.FOLDER);

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
      dueDate: data.dueDate,
    };

    const path = await this.fs.ensureUniquePath(this.buildPath(feature));
    await this.fs.writeFile(path, feature as unknown as Record<string, unknown>, this.generateTemplate(feature));
    
    return feature;
  }

  /**
   * 更新特性
   */
  async update(id: string, data: UpdateFeatureData): Promise<Feature | null> {
    const found = await this.getWithPath(id);
    if (!found) return null;
    const { feature, path: oldPath } = found;

    const updated: Feature = {
      ...feature,
      ...data,
      tags: data.tags ?? feature.tags,
      progress: data.progress ?? feature.progress,
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
   * 删除特性
   */
  async delete(id: string): Promise<boolean> {
    const found = await this.getWithPath(id);
    if (!found) return false;

    await this.fs.deleteFile(found.path);
    return true;
  }

  /**
   * 根据 ID 获取特性
   */
  async getById(id: string): Promise<Feature | null> {
    const found = await this.getWithPath(id);
    return found?.feature ?? null;
  }

  /**
   * 根据 ID 获取特性文件路径
   */
  async getPath(id: string): Promise<string | null> {
    const found = await this.getWithPath(id);
    return found?.path ?? null;
  }

  /**
   * 列出所有特性
   */
  async list(filters?: { versionId?: string; projectId?: string; status?: FeatureStatus }): Promise<Feature[]> {
    const files = this.fs.listFiles(this.FOLDER);
    const features: Feature[] = [];

    for (const file of files) {
      const data = await this.fs.readFile(file.path);
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

  /**
   * 检查特性是否存在
   */
  async exists(id: string): Promise<boolean> {
    return (await this.getWithPath(id)) !== null;
  }

  /**
   * 获取版本名称
   */
  private getVersionName(versionId: string): string | null {
    const file = this.fs.findById('ProjectManager/Versions', versionId);
    if (!file) return null;
    const cache = this.app.metadataCache.getFileCache(file);
    return cache?.frontmatter?.name ? String(cache.frontmatter.name) : file.basename;
  }

  /**
   * 获取项目名称
   */
  private getProjectName(projectId: string): string | null {
    const file = this.fs.findById('ProjectManager/Projects', projectId);
    if (!file) return null;
    const cache = this.app.metadataCache.getFileCache(file);
    return cache?.frontmatter?.name ? String(cache.frontmatter.name) : file.basename;
  }

  /**
   * 获取特性及其路径
   */
  private async getWithPath(id: string): Promise<{ feature: Feature; path: string } | null> {
    const file = this.fs.findById(this.FOLDER, id);
    if (!file) return null;

    const data = await this.fs.readFile(file.path);
    if (!data) return null;

    const feature = this.parseFeature(data.frontmatter);
    if (!feature) return null;

    return { feature, path: file.path };
  }

  /**
   * 构建文件路径
   */
  private buildPath(feature: Feature): string {
    return `${this.FOLDER}/${this.fs.sanitizeFileName(feature.name)}.md`;
  }

  /**
   * 解析 frontmatter 为 Feature 对象
   */
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
      dueDate: frontmatter.dueDate ? String(frontmatter.dueDate) : undefined,
    };
  }

  /**
   * 生成特性文件模板
   */
  private generateTemplate(feature: Feature): string {
    const priorityEmoji = { critical: '🔴', high: '🟠', medium: '🔵', low: '🟢' }[feature.priority] || '⚪';
    const statusEmoji = { backlog: '📋', todo: '📝', 'in-progress': '🚀', testing: '🧪', completed: '✅', archived: '📦' }[feature.status] || '⏳';
    const today = new Date().toISOString().split('T')[0];
    const projectName = this.getProjectName(feature.projectId);
    const versionName = this.getVersionName(feature.versionId);

    return `# ${priorityEmoji} ${statusEmoji} ${feature.name}

> 特性 ID: ${feature.id} | 进度: ${feature.progress}% | 截止日期: ${feature.dueDate || '未设置'}

---

## 📋 需求描述

<!-- 详细描述这个特性的功能需求 -->

### 用户故事

作为一个 **[角色]**，
我希望 **[功能]**，
以便 **[价值]**。

### 功能描述

1. **功能点1**: 详细描述
2. **功能点2**: 详细描述
3. **功能点3**: 详细描述

### 验收标准

- [ ] 标准1: 描述
- [ ] 标准2: 描述
- [ ] 标准3: 描述

---

## 📈 进度追踪

**当前进度: ${feature.progress}%**

<div style="height: 10px; background: var(--background-modifier-border); border-radius: 5px; overflow: hidden; margin: 12px 0;">
  <div style="width: ${feature.progress}%; height: 100%; background: var(--interactive-accent); border-radius: 5px;"></div>
</div>

### 进度日志

#### ${today} - 创建特性
- 初始进度: ${feature.progress}%
- 状态: ${feature.status}

---

## 🧪 测试记录

### 测试用例

| ID | 用例名称 | 测试步骤 | 预期结果 | 状态 |
|----|---------|---------|---------|------|
| TC01 | 用例1 | 步骤 | 结果 | ⏳ 未开始 |
| TC02 | 用例2 | 步骤 | 结果 | ⏳ 未开始 |

---

## 🔗 关联信息

### 所属项目

${projectName ? `[[ProjectManager/Projects/${projectName}|${projectName}]]` : '未分配项目'}

### 所属版本

${versionName ? `[[ProjectManager/Versions/${versionName}|${versionName}]]` : '未分配版本'}

### 相关特性

\`\`\`dataview
TABLE status, priority, progress + "%" as "进度"
FROM "ProjectManager/Features"
WHERE projectId = "${feature.projectId}" AND id != "${feature.id}"
SORT priority DESC
LIMIT 5
\`\`\`

---

*特性文件由 Project Manager 插件自动生成*
`;
  }
}
