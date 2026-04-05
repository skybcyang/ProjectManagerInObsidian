import { BaseStore } from './BaseStore';
import { FileSystem } from '../filesystem/FileSystem';
import type { Feature, CreateFeatureData, UpdateFeatureData, FeatureStatus } from '../../types';
import type { EntityCache } from '../cache';
import { App } from 'obsidian';

export class FeatureStore extends BaseStore<Feature, CreateFeatureData, UpdateFeatureData> {
  private readonly FOLDER = 'ProjectManager/Features';
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

  async create(data: CreateFeatureData): Promise<Feature> {
    const id = this.generateId('feat');
    const feature: Feature = {
      id,
      name: data.name,
      versionId: data.versionId,
      projectId: data.projectId,
      status: data.status || 'backlog',
      owner: data.owner,
      priority: data.priority || 'medium',
      tags: data.tags || [],
      progress: data.progress || 0,
      dueDate: data.dueDate,
    };

    const path = `${this.FOLDER}/${id}.md`;
    await this.writeTemplate(path, this.generateTemplate(feature));
    return feature;
  }

  async update(id: string, data: UpdateFeatureData): Promise<Feature> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`特性 ${id} 不存在`);
    }

    const updated: Feature = {
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

  async getById(id: string): Promise<Feature | null> {
    // 优先从缓存获取
    if (this.cache) {
      const cached = this.cache.getFeature(id);
      if (cached) return cached;
    }
    // 回退到列表查找
    const features = await this.list();
    return features.find(f => f.id === id) || null;
  }

  /**
   * 根据ID获取文件路径
   */
  getPath(id: string): string {
    return `${this.FOLDER}/${id}.md`;
  }

  async list(filters?: { versionId?: string; projectId?: string; status?: FeatureStatus }): Promise<Feature[]> {
    let features: Feature[];
    
    // 优先从缓存获取
    if (this.cache) {
      features = this.cache.getAllFeatures();
    } else {
      // 回退到文件读取
      const files = this.fs.listFiles(this.FOLDER);
      features = [];
      for (const file of files) {
        const fileData = await this.fs.readFile(file.path);
        if (fileData?.frontmatter?.id) {
          features.push(fileData.frontmatter as unknown as Feature);
        }
      }
    }

    // 应用过滤器
    if (filters) {
      if (filters.versionId) {
        features = features.filter(f => f.versionId === filters.versionId);
      }
      if (filters.projectId) {
        features = features.filter(f => f.projectId === filters.projectId);
      }
      if (filters.status) {
        features = features.filter(f => f.status === filters.status);
      }
    }

    return features.sort((a, b) => a.name.localeCompare(b.name));
  }

  async listByProject(projectId: string): Promise<Feature[]> {
    const all = await this.list();
    return all.filter(f => f.projectId === projectId);
  }

  async listByVersion(versionId: string): Promise<Feature[]> {
    const all = await this.list();
    return all.filter(f => f.versionId === versionId);
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

  private getStatusEmoji(status: string): string {
    const emojiMap: Record<string, string> = {
      backlog: '📋',
      todo: '📝',
      'in-progress': '🔄',
      testing: '🧪',
      completed: '✅',
      archived: '📦',
    };
    return emojiMap[status] || '⚪';
  }

  private generateTemplate(feature: Feature): string {
    const priorityEmoji = this.getPriorityEmoji(feature.priority);
    const statusEmoji = this.getStatusEmoji(feature.status);
    
    return `---
${this.yamlFrontmatter(feature)}
---

# ${priorityEmoji} ${statusEmoji} ${feature.name}

<!-- 特性元数据已在上方 YAML 中定义 -->

## 📋 需求 AR 列表

| AR 编号 | 描述 | 状态 |
|---------|------|------|
| AR001 | <!-- 需求描述 --> | ✅ 已完成 |
| AR002 | <!-- 需求描述 --> | 🔄 进行中 |
| AR003 | <!-- 需求描述 --> | ⏳ 未开始 |

**AR 状态说明**: ✅ 已完成 | 🔄 进行中 | ⏳ 未开始 | ❌ 已取消

## 📝 进展反馈

### 历史记录
<!-- 进展将自动记录在这里 -->
- [${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}] 特性创建

### 添加新进展
<input class="pm-progress-input" data-feature-id="${feature.id}" placeholder="输入当前进展，按 Enter 保存...">

## 📅 对齐计划

### 里程碑节点

| 节点 | 计划日期 | 实际日期 | 状态 |
|------|----------|----------|------|
| 需求评审 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 设计评审 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 开发完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 联调完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 测试完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 上线发布 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |

## 👥 周边团队与负责人

### 核心团队

| 角色 | 负责人 | 团队/部门 |
|------|--------|-----------|
| 产品经理 | <!-- @姓名 --> | 产品部 |
| 前端开发 | <!-- @姓名 --> | 前端组 |
| 后端开发 | <!-- @姓名 --> | 后端组 |
| 测试工程师 | <!-- @姓名 --> | QA组 |
| UI/UX设计 | <!-- @姓名 --> | 设计组 |

### 依赖协作

- [ ] 运维团队 - <!-- 协作事项 -->
- [ ] 安全团队 - <!-- 协作事项 -->
- [ ] 数据团队 - <!-- 协作事项 -->
- [ ] 法务合规 - <!-- 协作事项 -->

## 💻 开发状态

### 代码信息

- **Change ID**: <!-- 代码变更ID -->
- **开发分支**: \`feature/${feature.id}\`
- **目标分支**: \`main\`
- **MR/PR 链接**: <!-- 填入 Merge Request 或 Pull Request 链接 -->

### 各阶段状态

#### 🔨 开发阶段
- **状态**: ⬜ 未开始 / 🟡 进行中 / 🟢 已完成
- **负责人**: <!-- @开发人员 -->
- **完成度**: ${feature.progress}%
- **备注**: <!-- 开发备注 -->

#### 🔗 联调阶段
- **状态**: ⬜ 未开始 / 🟡 进行中 / 🟢 已完成
- **负责人**: <!-- @联调负责人 -->
- **阻塞问题**: <!-- 记录联调阻塞问题 -->
- **依赖服务**: <!-- 列出依赖的其他服务/接口 -->

#### 🧪 转测阶段
- **状态**: ⬜ 未开始 / 🟡 进行中 / 🟢 已完成 / 🔴 有阻塞
- **测试负责人**: <!-- @测试人员 -->
- **Bug 统计**:
  - 🔴 P0 阻塞: 0
  - 🟠 P1 严重: 0
  - 🟡 P2 一般: 0
  - 🟢 P3 轻微: 0
- **测试报告**: <!-- 链接到测试报告 -->

#### 📖 文档阶段
- **状态**: ⬜ 未开始 / 🟡 进行中 / 🟢 已完成
- **文档清单**:
  - [ ] API 接口文档
  - [ ] 使用手册
  - [ ] 部署文档
  - [ ] 变更日志

#### 👀 代码检视
- **状态**: ⬜ 未开始 / 🟡 进行中 / 🟢 已通过 / 🔴 需修改
- **检视人**: <!-- @检视人 -->
- **检视意见**: <!-- 记录检视意见 -->
- **检视链接**: <!-- 代码检视工具链接 -->

#### 🔀 合入分支
- **状态**: ⬜ 未合并 / 🟡 合并中 / 🟢 已合并 / 🔴 冲突
- **MR/PR 状态**: <!-- 开启/已合并/已关闭 -->
- **合并冲突**: <!-- 有则记录冲突详情 -->
- **回滚方案**: <!-- 记录回滚方案 -->

## 🔗 关联信息

### 所属项目
\`\`\`dataviewjs
const projects = dv.pages('"ProjectManager/Projects"').filter(p => p.id === "${feature.projectId}");
if (projects.length > 0) {
  dv.paragraph("> 📁 所属项目: [[" + projects[0].file.path + "|" + projects[0].name + "]]");
} else {
  dv.paragraph("> ⚠️ 未关联项目");
}
\`\`\`

### 所属版本
\`\`\`dataviewjs
const versions = dv.pages('"ProjectManager/Versions"').filter(v => v.id === "${feature.versionId}");
if (versions.length > 0) {
  dv.paragraph("> 📦 所属版本: [[" + versions[0].file.path + "|" + versions[0].name + "]]");
} else {
  dv.paragraph("> ⚠️ 未关联版本");
}
\`\`\`

## 🏷️ 标签

${feature.tags.length > 0 ? feature.tags.map(tag => `#${tag}`).join(' ') : '<!-- 添加标签 -->'}

---

## 📎 关联展示

### 使用 pm-card 展示本特性卡片

在当前页面插入以下代码块，即可展示本特性的卡片：

\`\`\`markdown
\`\`\`pm-card
id: ${feature.id}
\`\`\`

### 展示所属项目级联

如需展示本特性所属项目的完整级联状态（包含所有特性）：

\`\`\`markdown
\`\`\`pm-card
id: ${feature.projectId}
expanded: true
\`\`\`

### 展示所属版本级联

如需展示本特性所属版本的完整级联状态（包含所有项目和特性）：

\`\`\`markdown
\`\`\`pm-card
id: ${feature.versionId}
expanded: true
\`\`\`

---
*创建于: ${new Date().toLocaleString('zh-CN')}*
`;
  }

  private yamlFrontmatter(feature: Feature): string {
    const lines = [
      `id: ${feature.id}`,
      `name: ${feature.name}`,
      `versionId: ${feature.versionId}`,
      `projectId: ${feature.projectId}`,
      `status: ${feature.status}`,
      `priority: ${feature.priority}`,
      `progress: ${feature.progress}`,
    ];

    if (feature.owner) {
      lines.push(`owner: ${feature.owner}`);
    }
    if (feature.dueDate) {
      lines.push(`dueDate: ${feature.dueDate}`);
    }
    if (feature.tags && feature.tags.length > 0) {
      lines.push(`tags: [${feature.tags.join(', ')}]`);
    }

    return lines.join('\n');
  }
}
