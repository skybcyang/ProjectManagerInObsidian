/**
 * 默认模板定义
 * 优化版 - 使用 pm-view 统一视图
 */

import type { TemplateConfig } from '../types/template';

/** 默认总览模板 */
export const DEFAULT_OVERVIEW_TEMPLATE = `---
pm-dashboard: true
---

# 📊 项目管理总览

> 最后更新: {{createTime}}

---

## 🚀 快速操作

- [[#📦 版本管理|📦 创建版本]]
- [[#📁 项目管理|📁 创建项目]]
- [[#✨ 特性管理|✨ 创建特性]]

---

## 📦 版本管理

\`\`\`pm-view
mode: list
entityType: version
\`\`\`

---

## 📁 项目管理

\`\`\`pm-view
mode: grid
entityType: project
\`\`\`

---

## ✨ 特性管理

\`\`\`pm-view
mode: kanban
entityType: feature
groupBy: status
\`\`\`

---

*Powered by Project Manager Plugin*
`;

/** 默认版本模板 */
export const DEFAULT_VERSION_TEMPLATE = `---
id: {{id}}
name: {{name}}
type: version
status: {{status}}
{{#if owner}}owner: {{owner}}
{{/if}}{{#if startDate}}startDate: {{startDate}}
{{/if}}{{#if endDate}}endDate: {{endDate}}
{{/if}}tags:
{{#each tags}}  - {{this}}
{{/each}}---

# 📦 {{name}}

> **状态**: {{status}} | **ID**: {{id}}
{{#if owner}}> **负责人**: @{{owner}}
{{/if}}{{#if startDate}}> **开始日期**: {{startDate}}
{{/if}}{{#if endDate}}> **目标日期**: {{endDate}}
{{/if}}
---

## 🎯 版本目标

<!-- 描述本版本的核心目标和预期成果 -->

### 关键指标

- [ ] 指标1: 描述
- [ ] 指标2: 描述
- [ ] 指标3: 描述

---

## 📊 进度概览

\`\`\`pm-view
mode: cascade
versionId: {{id}}
\`\`\`

---

## 📁 关联项目

\`\`\`pm-view
mode: grid
entityType: project
versionId: {{id}}
\`\`\`

---

## ✨ 版本特性

\`\`\`pm-view
mode: kanban
entityType: feature
versionId: {{id}}
groupBy: status
\`\`\`

---

## 📝 版本备注

<!-- 记录版本相关的重要信息 -->
`;

/** 默认项目模板 */
export const DEFAULT_PROJECT_TEMPLATE = `---
id: {{id}}
name: {{name}}
type: project
versionId: {{versionId}}
status: {{status}}
priority: {{priority}}
{{#if owner}}owner: {{owner}}
{{/if}}tags:
{{#each tags}}  - {{this}}
{{/each}}---

# {{priorityEmoji}} {{name}}

> **状态**: {{status}} | **优先级**: {{priority}} | **ID**: {{id}}
{{#if owner}}> **负责人**: @{{owner}}
{{/if}}
---

## 📋 项目概览

<!-- 在此描述项目的背景、目标和范围 -->

### 目标描述

<!-- 项目的核心目标 -->

### 范围边界

<!-- 项目的范围边界，包含什么和不包含什么 -->

---

## 📊 进度统计

\`\`\`pm-view
mode: list
entityType: feature
projectId: {{id}}
\`\`\`

---

## ✨ 关联特性

\`\`\`pm-view
mode: kanban
entityType: feature
projectId: {{id}}
groupBy: status
\`\`\`

---

## 📝 项目备注

<!-- 记录项目相关的重要信息、决策、会议纪要等 -->
`;

/** 默认特性模板 */
export const DEFAULT_FEATURE_TEMPLATE = `---
id: {{id}}
name: {{name}}
type: feature
versionId: {{versionId}}
projectId: {{projectId}}
status: {{status}}
priority: {{priority}}
progress: {{progress}}
{{#if owner}}owner: {{owner}}
{{/if}}{{#if dueDate}}dueDate: {{dueDate}}
{{/if}}tags:
{{#each tags}}  - {{this}}
{{/each}}---

# {{priorityEmoji}} {{statusEmoji}} {{name}}

> **状态**: {{status}} | **优先级**: {{priority}} | **进度**: {{progress}}%
> **ID**: {{id}}
{{#if owner}}> **负责人**: @{{owner}}
{{/if}}{{#if dueDate}}> **截止日期**: {{dueDate}}
{{/if}}
---

## 📋 需求描述

<!-- 详细描述本特性的需求背景、用户故事、验收标准 -->

### 用户故事

作为 [角色]，我希望 [功能]，以便 [价值]

### 验收标准

- [ ] 验收标准1
- [ ] 验收标准2
- [ ] 验收标准3

---

## 📝 进展记录

### 历史记录
- [{{createTime}}] 特性创建

### 最新进展
<!-- 记录最新进展 -->

---

## 📅 里程碑计划

| 节点 | 计划日期 | 实际日期 | 状态 |
|------|----------|----------|------|
| 需求评审 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 设计评审 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 开发完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 联调完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 测试完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 上线发布 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |

---

## 👥 团队与协作

### 核心团队

| 角色 | 负责人 | 备注 |
|------|--------|------|
| 产品经理 | <!-- @姓名 --> | |
| 开发负责人 | <!-- @姓名 --> | |
| 测试负责人 | <!-- @姓名 --> | |

### 依赖协作

- [ ] 协作方1 - <!-- 协作事项 -->
- [ ] 协作方2 - <!-- 协作事项 -->

---

## 💻 开发状态

### 代码信息

- **开发分支**: \`feature/{{id}}\`
- **MR/PR 链接**: <!-- 填入链接 -->

### 各阶段状态

- **开发**: ⬜ 未开始 / 🟡 进行中 / 🟢 已完成
- **联调**: ⬜ 未开始 / 🟡 进行中 / 🟢 已完成
- **测试**: ⬜ 未开始 / 🟡 进行中 / 🟢 已完成
- **文档**: ⬜ 未开始 / 🟡 进行中 / 🟢 已完成
- **代码检视**: ⬜ 未开始 / 🟡 进行中 / 🟢 已通过
- **合入**: ⬜ 未合并 / 🟡 合并中 / 🟢 已合并

---

## 🐛 问题记录

| 问题 | 优先级 | 状态 | 备注 |
|------|--------|------|------|
| <!-- 问题描述 --> | P0/P1/P2 | 待处理/处理中/已解决 | |

---

## 🏷️ 标签

{{#if tags}}{{#each tags}}#{{this}} {{/each}}{{/if}}

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
