/**
 * 默认模板定义
 * 当用户未启用自定义模板或模板为空时，使用这些默认模板
 */

import type { TemplateConfig } from '../types/template';

/** 默认总览模板 */
export const DEFAULT_OVERVIEW_TEMPLATE = `---
pm-dashboard: true
---

# 📊 项目管理总览

> 最后更新: {{date}} · 系统状态: 正常运行

---

## 🚀 快速操作

--- start-multi-column: ID_quick_actions
\`\`\`column-settings
Number of Columns: 4
Largest Column: standard
Border: off
\`\`\`

<span class="pm-btn pm-btn--primary" data-action="create-version">📦 创建版本</span>

--- column-break ---

<span class="pm-btn pm-btn--primary" data-action="create-project">📁 创建项目</span>

--- column-break ---

<span class="pm-btn pm-btn--primary" data-action="create-feature">✨ 创建特性</span>

--- column-break ---

<span class="pm-btn" data-action="export-ics">📅 导出ICS</span>

--- end-multi-column

---

## 📦 版本概览

\`\`\`pm-selector
type: version
\`\`\`

---

## 📁 项目概览

\`\`\`pm-selector
type: project
\`\`\`

---

*Powered by Project Manager Plugin*
`;

/** 默认版本模板 */
export const DEFAULT_VERSION_TEMPLATE = `---
id: {{id}}
name: {{name}}
status: {{status}}
{{#if owner}}owner: {{owner}}
{{/if}}{{#if startDate}}startDate: {{startDate}}
{{/if}}{{#if endDate}}endDate: {{endDate}}
{{/if}}tags:
{{#each tags}}  - {{this}}
{{/each}}---

# 📦 {{name}}

> 版本 ID: {{id}} | 状态: {{status}}

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
const projects = dv.pages('"ProjectManager/Projects"').filter(p => p.versionId === "{{id}}");
const features = dv.pages('"ProjectManager/Features"').filter(f => f.versionId === "{{id}}");
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
    <div style="font-size: 12px; color: var(--text-muted);">完成度</div>
  </div>
</div>
\`);
\`\`\`

---

## 📁 关联项目

\`\`\`pm-view
mode: grid
type: project
filter:
  versionId: {{id}}
\`\`\`

---

## ✨ 版本特性

\`\`\`pm-view
mode: kanban
type: feature
filter:
  versionId: {{id}}
groupBy: status
\`\`\`
`;

/** 默认项目模板 */
export const DEFAULT_PROJECT_TEMPLATE = `---
id: {{id}}
name: {{name}}
versionId: {{versionId}}
status: {{status}}
{{#if owner}}owner: {{owner}}
{{/if}}priority: {{priority}}
tags:
{{#each tags}}  - {{this}}
{{/each}}---

# {{priorityEmoji}} {{name}}

> 项目 ID: {{id}} | 状态: {{status}} | 优先级: {{priority}}

---

## 📋 项目概览

<!-- 在此描述项目的背景、目标和范围 -->

---

## 📊 进度统计

\`\`\`dataviewjs
const features = dv.pages('"ProjectManager/Features"').filter(f => f.projectId === "{{id}}");
const total = features.length;
const completed = features.filter(f => f.status === 'completed').length;
const inProgress = features.filter(f => f.status === 'in-progress' || f.status === 'testing').length;
const avgProgress = total > 0 ? Math.round(features.reduce((sum, f) => sum + (f.progress || 0), 0) / total) : 0;

dv.el('div', \`
<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0;">
  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">
    <div style="font-size: 28px; font-weight: 700;">\${total}</div>
    <div style="font-size: 11px; color: var(--text-muted);">总特性</div>
  </div>
  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">
    <div style="font-size: 28px; font-weight: 700; color: var(--text-success);">\${completed}</div>
    <div style="font-size: 11px; color: var(--text-muted);">已完成</div>
  </div>
  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">
    <div style="font-size: 28px; font-weight: 700; color: var(--text-accent);">\${inProgress}</div>
    <div style="font-size: 11px; color: var(--text-muted);">进行中</div>
  </div>
  <div style="text-align: center; padding: 16px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);">
    <div style="font-size: 28px; font-weight: 700; color: var(--interactive-accent);">\${avgProgress}%</div>
    <div style="font-size: 11px; color: var(--text-muted);">平均进度</div>
  </div>
</div>
\`);
\`\`\`

---

## ✨ 关联特性

\`\`\`pm-view
mode: kanban
type: feature
filter:
  projectId: {{id}}
groupBy: status
\`\`\`
`;

/** 默认特性模板 */
export const DEFAULT_FEATURE_TEMPLATE = `---
id: {{id}}
name: {{name}}
versionId: {{versionId}}
projectId: {{projectId}}
status: {{status}}
priority: {{priority}}
progress: {{progress}}
{{#if owner}}owner: {{owner}}
{{/if}}{{#if dueDate}}dueDate: {{dueDate}}
{{/if}}{{#if tags}}tags: [{{#each tags}}{{#unless @first}}, {{/unless}}{{this}}{{/each}}]
{{/if}}---

# {{priorityEmoji}} {{statusEmoji}} {{name}}

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
- [{{createTime}}] 特性创建

### 添加新进展
<input class="pm-progress-input" data-feature-id="{{id}}" placeholder="输入当前进展，按 Enter 保存...">

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
- **开发分支**: \`feature/{{id}}\`
- **目标分支**: \`main\`
- **MR/PR 链接**: <!-- 填入 Merge Request 或 Pull Request 链接 -->

### 各阶段状态

#### 🔨 开发阶段
- **状态**: ⬜ 未开始 / 🟡 进行中 / 🟢 已完成
- **负责人**: <!-- @开发人员 -->
- **完成度**: {{progress}}%
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
const projects = dv.pages('"ProjectManager/Projects"').filter(p => p.id === "{{projectId}}");
if (projects.length > 0) {
  dv.paragraph("> 📁 所属项目: [[" + projects[0].file.path + "|" + projects[0].name + "]]");
} else {
  dv.paragraph("> ⚠️ 未关联项目");
}
\`\`\`

### 所属版本
\`\`\`dataviewjs
const versions = dv.pages('"ProjectManager/Versions"').filter(v => v.id === "{{versionId}}");
if (versions.length > 0) {
  dv.paragraph("> 📦 所属版本: [[" + versions[0].file.path + "|" + versions[0].name + "]]");
} else {
  dv.paragraph("> ⚠️ 未关联版本");
}
\`\`\`

## 🏷️ 标签

{{#if tags}}{{#each tags}}#{{this}} {{/each}}{{else}}<!-- 添加标签 -->{{/if}}

---
*创建于: {{createTime}}*
`;

/** 默认模板配置 */
export const DEFAULT_TEMPLATES: TemplateConfig = {
  overview: DEFAULT_OVERVIEW_TEMPLATE,
  version: DEFAULT_VERSION_TEMPLATE,
  project: DEFAULT_PROJECT_TEMPLATE,
  feature: DEFAULT_FEATURE_TEMPLATE,
};

/** 优先级表情映射 */
export const PRIORITY_EMOJI: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🔵',
  low: '🟢',
};

/** 状态表情映射 */
export const STATUS_EMOJI: Record<string, string> = {
  backlog: '📋',
  todo: '📝',
  'in-progress': '🔄',
  testing: '🧪',
  completed: '✅',
  archived: '📦',
};
