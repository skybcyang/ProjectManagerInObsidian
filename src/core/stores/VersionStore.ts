import { BaseStore } from './BaseStore';
import { FileSystem } from '../filesystem/FileSystem';
import type { Version, CreateVersionData, UpdateVersionData } from '../../types';
import type { EntityCache } from '../cache';
import { App } from 'obsidian';

export class VersionStore extends BaseStore<Version, CreateVersionData, UpdateVersionData> {
  private readonly FOLDER = 'ProjectManager/Versions';
  private cache?: EntityCache;

  constructor(fs: FileSystem, app: App, cache?: EntityCache) {
    super(fs, app);
    this.cache = cache;
  }

  private async writeTemplate(path: string, template: string): Promise<void> {
    const yamlMatch = template.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    if (yamlMatch) {
      const yamlLines = yamlMatch[1].split('\n');
      const frontmatter: Record<string, unknown> = {};
      for (const line of yamlLines) {
        const match = line.match(/^([^:]+):\s*(.*)$/);
        if (match) {
          const [, key, value] = match;
          if (value.startsWith('[') && value.endsWith(']')) {
            frontmatter[key] = value.slice(1, -1).split(',').map(v => v.trim()).filter(v => v);
          } else {
            frontmatter[key] = value;
          }
        }
      }
      await this.fs.writeFile(path, frontmatter, yamlMatch[2]);
    }
  }

  async create(data: CreateVersionData): Promise<Version> {
    const id = this.generateId('ver');
    const version: Version = {
      id,
      name: data.name,
      status: data.status || 'planning',
      owner: data.owner,
      startDate: data.startDate,
      endDate: data.endDate,
      tags: data.tags || [],
    };

    const path = `${this.FOLDER}/${id}.md`;
    await this.writeTemplate(path, this.generateTemplate(version));
    return version;
  }

  async update(id: string, data: UpdateVersionData): Promise<Version> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`版本 ${id} 不存在`);
    }

    const updated: Version = {
      ...existing,
      ...data,
    };

    const path = `${this.FOLDER}/${id}.md`;
    await this.writeTemplate(path, this.generateTemplate(updated));
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const path = `${this.FOLDER}/${id}.md`;
    await this.fs.deleteFile(path);
    return true;
  }

  async getById(id: string): Promise<Version | null> {
    // 优先从缓存获取
    if (this.cache) {
      const cached = this.cache.getVersion(id);
      if (cached) return cached;
    }
    // 回退到列表查找
    const versions = await this.list();
    return versions.find(v => v.id === id) || null;
  }

  /**
   * 根据ID获取文件路径
   */
  getPath(id: string): string {
    return `${this.FOLDER}/${id}.md`;
  }

  async list(): Promise<Version[]> {
    // 优先从缓存获取
    if (this.cache) {
      return this.cache.getAllVersions();
    }
    // 回退到文件读取
    const files = this.fs.listFiles(this.FOLDER);
    const versions: Version[] = [];

    for (const file of files) {
      const fileData = await this.fs.readFile(file.path);
      if (fileData?.frontmatter?.id) {
        versions.push(fileData.frontmatter as unknown as Version);
      }
    }

    return versions.sort((a, b) => a.name.localeCompare(b.name));
  }

  async hasProjects(versionId: string): Promise<boolean> {
    const projects = await this.app.vault.getMarkdownFiles();
    const projectFolder = 'ProjectManager/Projects';
    
    for (const file of projects) {
      if (!file.path.startsWith(projectFolder)) continue;
      
      const metadata = this.app.metadataCache.getFileCache(file);
      if (metadata?.frontmatter?.versionId === versionId) {
        return true;
      }
    }
    
    return false;
  }

  private generateTemplate(version: Version): string {
    return `---
${this.yamlFrontmatter(version)}
---

# 📦 ${version.name}

<!-- 版本元数据已在上方 YAML 中定义 -->

## 🎯 版本目标

<!-- 描述本版本的核心目标和预期成果 -->

## 🗓️ IPD 里程碑

### 1. 概念阶段 (Concept)
- [ ] 市场需求分析完成
- [ ] 竞品分析报告
- [ ] 可行性评估
- **风险**: <!-- 记录本阶段识别的风险 -->

### 2. 计划阶段 (Plan)
- [ ] 需求评审会议
- [ ] 技术方案评审
- [ ] 资源与排期评估
- **风险**: 

### 3. 开发阶段 (Develop)
- [ ] 设计稿确认
- [ ] 核心功能开发完成
- [ ] 单元测试通过
- **风险**: 

### 4. 验证阶段 (Qualify)
- [ ] 集成测试通过
- [ ] 系统测试通过
- [ ] 验收测试通过
- **风险**: 

### 5. 发布阶段 (Launch)
- [ ] 发布评审会议
- [ ] 生产环境部署
- [ ] 用户培训与文档
- **风险**: 

## 📊 进度与风险汇总

### 项目概览
\`\`\`dataviewjs
const projects = dv.pages('"ProjectManager/Projects"').filter(p => p.versionId === "${version.id}");
const totalProjects = projects.length;
const completedProjects = projects.filter(p => p.status === 'completed').length;
const inProgressProjects = projects.filter(p => p.status === 'in-progress').length;

if (totalProjects === 0) {
  dv.paragraph("> ⚠️ 暂无关联项目");
} else {
  const progress = Math.round((completedProjects / totalProjects) * 100);
  dv.paragraph(
    "> 📈 项目进度: **" + completedProjects + "/" + totalProjects + "** 完成 (" + progress + "%)\\n\\n" +
    "> - ✅ 已完成: " + completedProjects + "\\n" +
    "> - 🔄 进行中: " + inProgressProjects + "\\n" +
    "> - ⏳ 待开始: " + (totalProjects - completedProjects - inProgressProjects)
  );
}
\`\`\`

### 特性概览
\`\`\`dataviewjs
const features = dv.pages('"ProjectManager/Features"').filter(f => f.versionId === "${version.id}");
const totalFeatures = features.length;
const completedFeatures = features.filter(f => f.status === 'completed').length;
const inProgressFeatures = features.filter(f => f.status === 'in-progress').length;
const testingFeatures = features.filter(f => f.status === 'testing').length;

if (totalFeatures === 0) {
  dv.paragraph("> ⚠️ 暂无关联特性");
} else {
  const progress = Math.round((completedFeatures / totalFeatures) * 100);
  dv.paragraph(
    "> 📊 特性进度: **" + completedFeatures + "/" + totalFeatures + "** 完成 (" + progress + "%)\\n\\n" +
    "> - ✅ 已完成: " + completedFeatures + "\\n" +
    "> - 🔄 开发中: " + inProgressFeatures + "\\n" +
    "> - 🧪 测试中: " + testingFeatures + "\\n" +
    "> - 📋 待处理: " + (totalFeatures - completedFeatures - inProgressFeatures - testingFeatures)
  );
}
\`\`\`

### 延期风险
\`\`\`dataviewjs
const features = dv.pages('"ProjectManager/Features"').filter(f => f.versionId === "${version.id}");
const now = new Date();
const atRisk = features.filter(f => {
  if (!f.dueDate || f.status === 'completed') return false;
  const due = new Date(f.dueDate);
  const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  return diffDays < 0 || (diffDays <= 3 && f.progress < 80);
});

if (atRisk.length === 0) {
  dv.paragraph("> ✅ 暂无延期风险");
} else {
  dv.paragraph("> ⚠️ **发现 " + atRisk.length + " 个存在延期风险的特性:**\\n");
  atRisk.forEach(f => {
    const due = f.dueDate ? new Date(f.dueDate) : null;
    const diffDays = due ? Math.floor((due - now) / (1000 * 60 * 60 * 24)) : null;
    const status = diffDays < 0 ? "🔴 已延期" : (diffDays <= 3 ? "🟡 即将到期" : "");
    dv.paragraph("> - [[" + f.file.path + "|" + f.name + "]] - " + status);
  });
}
\`\`\`

## ⚠️ 风险跟踪

| 风险项 | 等级 | 应对措施 | 负责人 | 状态 |
|--------|------|----------|--------|------|
| <!-- 风险描述 --> | 高/中/低 | <!-- 应对措施 --> | <!-- 负责人 --> | 开放/已解决 |

## 📁 关联项目

\`\`\`dataviewjs
const projects = dv.pages('"ProjectManager/Projects"').filter(p => p.versionId === "${version.id}");
if (projects.length > 0) {
  dv.table(
    ["项目", "状态", "优先级", "负责人"],
    projects.map(p => [
      "[[" + p.file.path + "|" + p.name + "]]",
      p.status,
      p.priority,
      p.owner || "-"
    ])
  );
} else {
  dv.paragraph("> 📋 暂无项目");
}
\`\`\`

## 🔧 快捷操作

<span class="pm-btn pm-btn--primary" data-action="create-project" data-version-id="${version.id}">📁 新建项目</span>
<span class="pm-btn pm-btn--primary" data-action="create-feature" data-version-id="${version.id}">✨ 新建特性</span>

---

## 📎 关联展示

### 使用 pm-card 展示本版本级联状态

在当前页面插入以下代码块，即可展示本版本的完整项目树：

\`\`\`markdown
\`\`\`pm-card
id: ${version.id}
expanded: true
\`\`\`

### 展示特定项目级联

如需展示本版本下某个特定项目的级联状态，使用项目ID：

\`\`\`markdown
\`\`\`pm-card
id: proj001
expanded: true
\`\`\`

> 💡 提示：将 \\"proj001\\" 替换为实际的项目ID

---
*创建于: ${new Date().toLocaleString('zh-CN')}*
`;
  }

  private yamlFrontmatter(version: Version): string {
    const lines = [
      `id: ${version.id}`,
      `name: ${version.name}`,
      `status: ${version.status}`,
    ];

    if (version.owner) {
      lines.push(`owner: ${version.owner}`);
    }
    if (version.startDate) {
      lines.push(`startDate: ${version.startDate}`);
    }
    if (version.endDate) {
      lines.push(`endDate: ${version.endDate}`);
    }
    if (version.tags && version.tags.length > 0) {
      lines.push(`tags: [${version.tags.join(', ')}]`);
    }

    return lines.join('\n');
  }
}
