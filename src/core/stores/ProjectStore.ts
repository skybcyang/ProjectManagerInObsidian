import { BaseStore } from './BaseStore';
import { FileSystem } from '../filesystem/FileSystem';
import type { Project, CreateProjectData, UpdateProjectData } from '../../types';
import type { EntityCache } from '../cache';
import { App } from 'obsidian';

export class ProjectStore extends BaseStore<Project, CreateProjectData, UpdateProjectData> {
  private readonly FOLDER = 'ProjectManager/Projects';
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

  async create(data: CreateProjectData): Promise<Project> {
    const id = this.generateId('proj');
    const project: Project = {
      id,
      name: data.name,
      versionId: data.versionId,
      status: data.status || 'backlog',
      owner: data.owner,
      priority: data.priority || 'medium',
      tags: data.tags || [],
    };

    const path = `${this.FOLDER}/${id}.md`;
    await this.writeTemplate(path, this.generateTemplate(project));
    return project;
  }

  async update(id: string, data: UpdateProjectData): Promise<Project> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`项目 ${id} 不存在`);
    }

    const updated: Project = {
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

  async getById(id: string): Promise<Project | null> {
    // 优先从缓存获取
    if (this.cache) {
      const cached = this.cache.getProject(id);
      if (cached) return cached;
    }
    // 回退到列表查找
    const projects = await this.list();
    return projects.find(p => p.id === id) || null;
  }

  /**
   * 根据ID获取文件路径
   */
  getPath(id: string): string {
    return `${this.FOLDER}/${id}.md`;
  }

  async list(filters?: { versionId?: string }): Promise<Project[]> {
    let projects: Project[];
    
    // 优先从缓存获取
    if (this.cache) {
      projects = this.cache.getAllProjects();
    } else {
      // 回退到文件读取
      const files = this.fs.listFiles(this.FOLDER);
      projects = [];
      for (const file of files) {
        const fileData = await this.fs.readFile(file.path);
        if (fileData?.frontmatter?.id) {
          projects.push(fileData.frontmatter as unknown as Project);
        }
      }
    }

    // 应用过滤器
    if (filters?.versionId) {
      projects = projects.filter(p => p.versionId === filters.versionId);
    }

    return projects.sort((a, b) => a.name.localeCompare(b.name));
  }

  async listByVersion(versionId: string): Promise<Project[]> {
    const all = await this.list();
    return all.filter(p => p.versionId === versionId);
  }

  async hasFeatures(projectId: string): Promise<boolean> {
    const features = await this.app.vault.getMarkdownFiles();
    const featureFolder = 'ProjectManager/Features';
    
    for (const file of features) {
      if (!file.path.startsWith(featureFolder)) continue;
      
      const metadata = this.app.metadataCache.getFileCache(file);
      if (metadata?.frontmatter?.projectId === projectId) {
        return true;
      }
    }
    
    return false;
  }

  async orphanFeatures(projectId: string): Promise<void> {
    const features = await this.app.vault.getMarkdownFiles();
    const featureFolder = 'ProjectManager/Features';
    
    for (const file of features) {
      if (!file.path.startsWith(featureFolder)) continue;
      
      const metadata = this.app.metadataCache.getFileCache(file);
      if (metadata?.frontmatter?.projectId === projectId) {
        // 将特性标记为孤儿（版本和项目ID清空）
        const content = await this.app.vault.read(file);
        const updatedContent = content.replace(
          /projectId:.*$/m,
          'projectId: ""'
        );
        await this.app.vault.modify(file, updatedContent);
      }
    }
  }

  private getPriorityEmoji(priority: string): string {
    const emojiMap: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🔵',
      low: '🟢',
    };
    return emojiMap[priority] || '⚪';
  }

  private generateTemplate(project: Project): string {
    const priorityEmoji = this.getPriorityEmoji(project.priority);
    
    return `---
${this.yamlFrontmatter(project)}
---

# ${priorityEmoji} ${project.name}

<!-- 项目元数据已在上方 YAML 中定义 -->

## 📋 项目概览

<!-- 简要描述项目背景、目标和范围 -->

## 🚦 阶段状态

### 阶段 1: 开工准备
- [ ] 需求对齐完成
- [ ] 技术方案确定
- [ ] 资源到位确认
- **开工日期**: <!-- 记录实际开工日期 -->

### 阶段 2: 开发进行
- [ ] 设计稿确认
- [ ] 核心功能开发
- [ ] 代码评审通过
- **当前进度**: 0%

### 阶段 3: 联调测试
- [ ] 前后端联调
- [ ] 测试用例评审
- [ ] Bug 修复完成
- **阻塞问题**: <!-- 记录联调阻塞问题 -->

### 阶段 4: 验收交付
- [ ] 产品验收
- [ ] 文档齐全确认
- [ ] 上线检查完成
- **验收日期**: <!-- 记录实际验收日期 -->

## 📊 特性进度汇总

\`\`\`dataviewjs
const features = dv.pages('"ProjectManager/Features"').filter(f => f.projectId === "${project.id}");
const total = features.length;

if (total === 0) {
  dv.paragraph("> 📋 暂无关联特性");
} else {
  const completed = features.filter(f => f.status === 'completed').length;
  const inProgress = features.filter(f => f.status === 'in-progress').length;
  const testing = features.filter(f => f.status === 'testing').length;
  const todo = features.filter(f => f.status === 'todo' || f.status === 'backlog').length;
  const progress = Math.round((completed / total) * 100);
  
  dv.paragraph(
    "> 📈 **总进度: " + progress + "%** (" + completed + "/" + total + ")\\n\\n" +
    "> | 状态 | 数量 |\\n" +
    "> |------|------|\\n" +
    "> | ✅ 已完成 | " + completed + " |\\n" +
    "> | 🔄 开发中 | " + inProgress + " |\\n" +
    "> | 🧪 测试中 | " + testing + " |\\n" +
    "> | 📋 待处理 | " + todo + " |"
  );
}
\`\`\`

### 特性列表
\`\`\`dataviewjs
const features = dv.pages('"ProjectManager/Features"').filter(f => f.projectId === "${project.id}");
if (features.length > 0) {
  dv.table(
    ["特性", "状态", "优先级", "进度", "负责人", "截止日期"],
    features.map(f => [
      "[[" + f.file.path + "|" + f.name + "]]",
      f.status,
      f.priority,
      f.progress + "%",
      f.owner || "-",
      f.dueDate || "-"
    ])
  );
} else {
  dv.paragraph("> 📋 暂无特性");
}
\`\`\`

## ⚠️ 风险跟踪

| 风险项 | 等级 | 应对措施 | 负责人 | 状态 |
|--------|------|----------|--------|------|
| <!-- 描述风险 --> | 高/中/低 | <!-- 应对措施 --> | <!-- 负责人 --> | 开放/已解决 |

## 🔗 关联版本

\`\`\`dataviewjs
const versions = dv.pages('"ProjectManager/Versions"').filter(v => v.id === "${project.versionId}");
if (versions.length > 0) {
  dv.paragraph("> 📦 所属版本: [[" + versions[0].file.path + "|" + versions[0].name + "]]");
} else {
  dv.paragraph("> ⚠️ 未关联版本");
}
\`\`\`

## 🔧 快捷操作

<span class="pm-btn pm-btn--primary" data-action="create-feature" data-project-id="${project.id}" data-version-id="${project.versionId}">✨ 新建特性</span>

---

## 📎 关联展示

### 使用 pm-card 展示本项目级联状态

在当前页面插入以下代码块，即可展示本项目的完整特性列表：

\`\`\`markdown
\`\`\`pm-card
id: ${project.id}
expanded: true
\`\`\`

### 展示所属版本级联

如需展示本项目所属版本的完整级联状态：

\`\`\`markdown
\`\`\`pm-card
id: ${project.versionId}
expanded: true
\`\`\`

### 展示特定特性

如需展示本项目下某个特定特性的卡片：

\`\`\`markdown
\`\`\`pm-card
id: feat001
\`\`\`

> 💡 提示：将 \\"feat001\\" 替换为实际的特性ID

---
*创建于: ${new Date().toLocaleString('zh-CN')}*
`;
  }

  private yamlFrontmatter(project: Project): string {
    const lines = [
      `id: ${project.id}`,
      `name: ${project.name}`,
      `versionId: ${project.versionId}`,
      `status: ${project.status}`,
      `priority: ${project.priority}`,
    ];

    if (project.owner) {
      lines.push(`owner: ${project.owner}`);
    }
    if (project.tags && project.tags.length > 0) {
      lines.push(`tags: [${project.tags.join(', ')}]`);
    }

    return lines.join('\n');
  }
}
