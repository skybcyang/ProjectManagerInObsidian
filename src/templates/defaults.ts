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

## 📈 统计概览

\`\`\`dataviewjs
// 统计卡片数据 - 实时计算
const versions = dv.pages('"ProjectManager/Versions"');
const projects = dv.pages('"ProjectManager/Projects"');
const requirements = dv.pages('"ProjectManager/Requirements"');
const features = dv.pages('"ProjectManager/Features"');

const vCompleted = versions.filter(v => v.status === 'completed').length;
const vTotal = versions.length;
const vInProgress = versions.filter(v => v.status === 'in-progress').length;
const vBacklog = versions.filter(v => v.status === 'backlog' || v.status === 'planning').length;

const pCompleted = projects.filter(p => p.status === 'completed').length;
const pTotal = projects.length;
const pInProgress = projects.filter(p => p.status === 'in-progress').length;
const pBacklog = projects.filter(p => p.status === 'backlog').length;

const rCompleted = requirements.filter(r => r.status === 'completed').length;
const rTotal = requirements.length;
const rInProgress = requirements.filter(r => r.status === 'in-progress').length;
const rBacklog = requirements.filter(r => r.status === 'backlog' || r.status === 'todo').length;

const fCompleted = features.filter(f => f.status === 'completed').length;
const fTotal = features.length;
const fInProgress = features.filter(f => f.status === 'in-progress').length;
const fBacklog = features.filter(f => f.status === 'backlog' || f.status === 'todo').length;

dv.table(
  ["类型", "已完成", "进行中", "待开始", "总计"],
  [
    ["📦 版本", vCompleted, vInProgress, vBacklog, vTotal],
    ["📁 项目", pCompleted, pInProgress, pBacklog, pTotal],
    ["📋 需求", rCompleted, rInProgress, rBacklog, rTotal],
    ["✨ 特性", fCompleted, fInProgress, fBacklog, fTotal]
  ]
);
\`\`\`

---

## 🚀 快速操作

--- start-multi-column: ID_quick_actions
\`\`\`column-settings
Number of Columns: 5
Largest Column: standard
Border: off
\`\`\`

<span class="pm-btn pm-btn--primary" data-action="create-version">📦 创建版本</span>

--- column-break ---

<span class="pm-btn pm-btn--primary" data-action="create-project">📁 创建项目</span>

--- column-break ---

<span class="pm-btn pm-btn--primary" data-action="create-requirement">📋 创建需求</span>

--- column-break ---

<span class="pm-btn pm-btn--primary" data-action="create-feature">✨ 创建特性</span>

--- column-break ---

<span class="pm-btn" data-action="export-email-summary">📧 导出邮件</span>

--- end-multi-column

---

## ⚠️ 风险总览

\`\`\`dataviewjs
const pm = app.plugins.plugins["project-manager"];
if (pm && pm.api) {
  const risks = await pm.api.getAllRisks();
  const openRisks = risks.filter(r => r.status !== '已闭环');
  const highRisks = risks.filter(r => r.level === 'high');
  dv.paragraph(\`⚠️ 总风险: \${risks.length} | 未关闭: \${openRisks.length} | 高风险: \${highRisks.length}\`);
  if (highRisks.length > 0) {
    const container = this.container;
    const mkTable = function(headers, rows) {
      const table = container.createEl("table", { cls: "dataview table-view-table" });
      const thead = table.createEl("thead");
      const hr = thead.createEl("tr");
      headers.forEach(function(h) { hr.createEl("th", { text: h, cls: "table-view-th" }); });
      const tbody = table.createEl("tbody");
      rows.forEach(function(row) {
        const tr = tbody.createEl("tr", { cls: "table-view-tr" });
        row.forEach(function(cell, idx) {
          const td = tr.createEl("td", { cls: "table-view-td" });
          if (idx === 0 && cell && cell.path) {
            const p = cell.path.replace(/\\.md$/, "");
            const a = td.createEl("a", { text: cell.name, cls: "internal-link" });
            a.setAttribute("data-href", p);
            a.onclick = function(e) { e.preventDefault(); app.workspace.openLinkText(p, "", false); };
          } else {
            td.setText(String(cell));
          }
        });
      });
    };
    const headers = ["来源实体", "风险类型", "风险描述", "等级", "责任人", "状态"];
    const rows = highRisks.map(function(r) {
      return [r.sourcePath ? { path: r.sourcePath, name: r.sourceName } : r.sourceName, r.type, r.description, r.level, r.owner, r.status];
    });
    mkTable(headers, rows);
  }
} else {
  dv.paragraph("⏳ 插件 API 加载中...");
}
\`\`\`

---

## 📦 版本管理

\`\`\`pm-view
mode: cascade
entityType: version
\`\`\`

---

## 📁 项目管理

\`\`\`pm-view
mode: cascade
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

## 📋 需求看板

\`\`\`pm-view
mode: kanban
entityType: requirement
groupBy: status
cardFields:
  required:
    - name
    - priority
  optional:
    - status
    - owner
    - endDate
    - progress
    - tags
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

---

## 📊 人天统计

| 类型 | 预估人天 | 实际人天 | 偏差 |
|------|---------|---------|------|
| 版本总计 | {{#if estimatedDays}}{{estimatedDays}}{{else}}0{{/if}}d | {{#if actualDays}}{{actualDays}}{{else}}0{{/if}}d | {{#if estimatedDays}}{{#if actualDays}}{{daysDeviationText}}{{else}}-{{/if}}{{else}}-{{/if}} |

> 💡 **统计说明**: 自动汇总该版本下所有项目和特性的人天数据

---

## 📅 里程碑计划

| 里程碑 | 计划日期 | 实际日期 | 状态 | 备注 |
|--------|----------|----------|------|------|
| 需求冻结 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ | |
| 设计评审 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ | |
| 开发启动 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ | |
| 开发完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ | |
| 联调完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ | |
| 测试完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ | |
| 版本发布 | {{#if endDate}}{{endDate}}{{/if}} | <!-- YYYY-MM-DD --> | ⬜ | |

---

## 🚀 快速操作

--- start-multi-column: ID_quick_actions
\`\`\`column-settings
Number of Columns: 2
Largest Column: standard
Border: off
\`\`\`

<span class="pm-btn pm-btn--primary" data-action="create-project" data-version-id="{{id}}">📁 创建项目</span>

--- column-break ---

<span class="pm-btn pm-btn--primary" data-action="create-feature" data-version-id="{{id}}">✨ 创建特性</span>

--- end-multi-column

---

## 📈 进展反馈

| 时间 | 反馈内容 | 记录人 |
|------|---------|--------|

---

## ⚠️ 风险跟踪

| 风险类型 | 风险描述 | 风险等级 | 责任人 | 发现时间 | 闭环时间 | 状态 |
|---------|---------|---------|--------|----------|----------|------|

---

## 🚀 快速操作

--- start-multi-column: ID_quick_actions
\`\`\`column-settings
Number of Columns: 2
Largest Column: standard
Border: off
\`\`\`

<span class="pm-btn" data-action="add-progress" data-entity-type="version" data-entity-id="{{id}}">📝 添加进展</span>

--- column-break ---

<span class="pm-btn" data-action="add-risk" data-entity-type="version" data-entity-id="{{id}}">⚠️ 添加风险</span>

--- end-multi-column

---

## 📊 进度概览

\`\`\`pm-view
mode: cascade
versionId: {{id}}
\`\`\`

---

## 📁 关联项目

\`\`\`pm-view
mode: cascade
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

## 📋 版本需求

\`\`\`pm-view
mode: kanban
entityType: requirement
versionId: {{id}}
groupBy: status
cardFields:
  required:
    - name
    - priority
  optional:
    - status
    - owner
    - endDate
    - progress
    - tags
\`\`\`

---

## ⚠️ 版本风险汇总

\`\`\`dataviewjs
const pm = app.plugins.plugins["project-manager"];
const versionId = dv.current().id;
if (pm && pm.api) {
  const risks = await pm.api.getRisksByVersion(versionId);
  if (risks.length > 0) {
    const container = this.container;
    const mkTable = function(headers, rows) {
      const table = container.createEl("table", { cls: "dataview table-view-table" });
      const thead = table.createEl("thead");
      const hr = thead.createEl("tr");
      headers.forEach(function(h) { hr.createEl("th", { text: h, cls: "table-view-th" }); });
      const tbody = table.createEl("tbody");
      rows.forEach(function(row) {
        const tr = tbody.createEl("tr", { cls: "table-view-tr" });
        row.forEach(function(cell, idx) {
          const td = tr.createEl("td", { cls: "table-view-td" });
          if (idx === 0 && cell && cell.path) {
            const p = cell.path.replace(/\\.md$/, "");
            const a = td.createEl("a", { text: cell.name, cls: "internal-link" });
            a.setAttribute("data-href", p);
            a.onclick = function(e) { e.preventDefault(); app.workspace.openLinkText(p, "", false); };
          } else {
            td.setText(String(cell));
          }
        });
      });
    };
    const headers = ["来源实体", "风险类型", "风险描述", "等级", "责任人", "状态"];
    const rows = risks.map(function(r) {
      return [r.sourcePath ? { path: r.sourcePath, name: r.sourceName } : r.sourceName, r.type, r.description, r.level, r.owner, r.status];
    });
    mkTable(headers, rows);
  } else {
    dv.paragraph("✅ 当前版本下暂无风险记录");
  }
} else {
  dv.paragraph("⏳ 插件 API 加载中...");
}
\`\`\`

---

## 📝 其他备注

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
{{/if}}{{#if startDate}}startDate: {{startDate}}
{{/if}}{{#if endDate}}endDate: {{endDate}}
{{/if}}tags:
{{#each tags}}  - {{this}}
{{/each}}---

# {{priorityEmoji}} {{name}}

---

## 📊 人天统计

| 类型 | 预估人天 | 实际人天 | 偏差 |
|------|---------|---------|------|
| 项目总计 | {{#if estimatedDays}}{{estimatedDays}}{{else}}0{{/if}}d | {{#if actualDays}}{{actualDays}}{{else}}0{{/if}}d | {{#if estimatedDays}}{{#if actualDays}}{{daysDeviationText}}{{else}}-{{/if}}{{else}}-{{/if}} |

> 💡 **统计说明**: 自动汇总该项目下所有特性的人天数据

---

## 🔗 HiALM 项目链接

- **HiALM 项目主页**: <!-- 填写 HiALM 项目链接 -->
- **需求跟踪**: <!-- 填写需求跟踪链接 -->
- **缺陷跟踪**: <!-- 填写缺陷跟踪链接 -->
- **项目 Wiki**: <!-- 填写项目 Wiki 链接 -->

---

## 📅 里程碑计划

| 里程碑 | 计划日期 | 实际日期 | 状态 | 负责人 |
|--------|----------|----------|------|--------|
| 需求评审 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ | <!-- @姓名 --> |
| 设计评审 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ | <!-- @姓名 --> |
| 开发完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ | <!-- @姓名 --> |
| 联调完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ | <!-- @姓名 --> |
| 测试完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ | <!-- @姓名 --> |
| 上线发布 | {{#if endDate}}{{endDate}}{{/if}} | <!-- YYYY-MM-DD --> | ⬜ | <!-- @姓名 --> |

---

## 👥 相关人员

| 角色 | 姓名 | 工号 | 联系方式 |
|------|------|------|----------|
| 项目经理 | <!-- 姓名 --> | <!-- xxxxx --> | <!-- 邮箱/IM --> |
| 系统工程师(SE) | <!-- 姓名 --> | <!-- xxxxx --> | <!-- 邮箱/IM --> |
| 开发负责人 | <!-- 姓名 --> | <!-- xxxxx --> | <!-- 邮箱/IM --> |
| 测试负责人 | <!-- 姓名 --> | <!-- xxxxx --> | <!-- 邮箱/IM --> |
| 算法接口人 | <!-- 姓名 --> | <!-- xxxxx --> | <!-- 邮箱/IM --> |
| 产品经理 | <!-- 姓名 --> | <!-- xxxxx --> | <!-- 邮箱/IM --> |

---

## 🧪 测试报告

### 测试概况
- **测试负责人**: <!-- @姓名 -->
- **测试时间**: <!-- YYYY-MM-DD ~ YYYY-MM-DD -->
- **测试结论**: ⬜ 通过 / ⬜ 有条件通过 / ⬜ 不通过

### Bug 统计
| 级别 | 阻塞数 | 已修复 | 遗留 |
|------|--------|--------|------|
| P0 阻塞 | 0 | 0 | 0 |
| P1 严重 | 0 | 0 | 0 |
| P2 一般 | 0 | 0 | 0 |
| P3 轻微 | 0 | 0 | 0 |

### 测试报告链接
- [功能测试报告]()
- [性能测试报告]()
- [安全测试报告]()
- [兼容性测试报告]()

---

## 🚀 快速操作

--- start-multi-column: ID_quick_actions
\`\`\`column-settings
Number of Columns: 1
Largest Column: standard
Border: off
\`\`\`

<span class="pm-btn pm-btn--primary" data-action="create-feature" data-project-id="{{id}}" data-version-id="{{versionId}}">✨ 创建特性</span>

--- end-multi-column

---

## 📈 进展反馈

| 时间 | 反馈内容 | 记录人 |
|------|---------|--------|

---

## ⚠️ 风险跟踪

| 风险类型 | 风险描述 | 风险等级 | 责任人 | 发现时间 | 闭环时间 | 状态 |
|---------|---------|---------|--------|----------|----------|------|

---

## 🚀 快速操作

--- start-multi-column: ID_quick_actions
\`\`\`column-settings
Number of Columns: 2
Largest Column: standard
Border: off
\`\`\`

<span class="pm-btn" data-action="add-progress" data-entity-type="project" data-entity-id="{{id}}">📝 添加进展</span>

--- column-break ---

<span class="pm-btn" data-action="add-risk" data-entity-type="project" data-entity-id="{{id}}">⚠️ 添加风险</span>

--- end-multi-column

---

## 📊 进度统计

\`\`\`pm-view
mode: cascade
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

## 📋 项目需求

\`\`\`pm-view
mode: kanban
entityType: requirement
projectId: {{id}}
groupBy: status
cardFields:
  required:
    - name
    - priority
  optional:
    - status
    - owner
    - endDate
    - progress
    - tags
\`\`\`

---

## ⚠️ 项目风险汇总

\`\`\`dataviewjs
const pm = app.plugins.plugins["project-manager"];
const projectId = dv.current().id;
if (pm && pm.api) {
  const risks = await pm.api.getRisksByProject(projectId);
  if (risks.length > 0) {
    const container = this.container;
    const mkTable = function(headers, rows) {
      const table = container.createEl("table", { cls: "dataview table-view-table" });
      const thead = table.createEl("thead");
      const hr = thead.createEl("tr");
      headers.forEach(function(h) { hr.createEl("th", { text: h, cls: "table-view-th" }); });
      const tbody = table.createEl("tbody");
      rows.forEach(function(row) {
        const tr = tbody.createEl("tr", { cls: "table-view-tr" });
        row.forEach(function(cell, idx) {
          const td = tr.createEl("td", { cls: "table-view-td" });
          if (idx === 0 && cell && cell.path) {
            const p = cell.path.replace(/\\.md$/, "");
            const a = td.createEl("a", { text: cell.name, cls: "internal-link" });
            a.setAttribute("data-href", p);
            a.onclick = function(e) { e.preventDefault(); app.workspace.openLinkText(p, "", false); };
          } else {
            td.setText(String(cell));
          }
        });
      });
    };
    const headers = ["来源实体", "风险类型", "风险描述", "等级", "责任人", "状态"];
    const rows = risks.map(function(r) {
      return [r.sourcePath ? { path: r.sourcePath, name: r.sourceName } : r.sourceName, r.type, r.description, r.level, r.owner, r.status];
    });
    mkTable(headers, rows);
  } else {
    dv.paragraph("✅ 当前项目下暂无风险记录");
  }
} else {
  dv.paragraph("⏳ 插件 API 加载中...");
}
\`\`\`

---

## 📝 其他备注

<!-- 记录项目相关的重要信息、决策、会议纪要等 -->
`;

/** 默认需求模板 */
export const DEFAULT_REQUIREMENT_TEMPLATE = `---
id: {{id}}
name: {{name}}
type: requirement
versionId: {{versionId}}
{{#if projectId}}projectId: {{projectId}}
{{/if}}status: {{status}}
priority: {{priority}}
progress: {{progress}}
{{#if owner}}owner: {{owner}}
{{/if}}{{#if startDate}}startDate: {{startDate}}
{{/if}}{{#if endDate}}endDate: {{endDate}}
{{/if}}{{#if estimatedDays}}estimatedDays: {{estimatedDays}}
{{/if}}{{#if actualDays}}actualDays: {{actualDays}}
{{/if}}{{#if description}}description: {{description}}
{{/if}}{{#if featureId}}featureId: {{featureId}}
{{/if}}tags:
{{#each tags}}  - {{this}}
{{/each}}---

# {{priorityEmoji}} {{name}}

---

## 📝 需求描述

{{#if description}}{{description}}
{{else}}<!-- 描述需求的背景、目标和范围 -->
{{/if}}

---

## 📈 进展反馈

| 时间 | 反馈内容 | 记录人 |
|------|---------|--------|
| {{createTime}} | 需求创建 | |

---

## 📝 其他备注

<!-- 记录需求相关的重要信息、决策、会议纪要等 -->
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
{{/if}}{{#if startDate}}startDate: {{startDate}}
{{/if}}{{#if endDate}}endDate: {{endDate}}
{{/if}}{{#if estimatedDays}}estimatedDays: {{estimatedDays}}
{{/if}}{{#if actualDays}}actualDays: {{actualDays}}
{{/if}}{{#if requirementIds}}requirementIds:
{{#each requirementIds}}  - {{this}}
{{/each}}{{/if}}{{#if projectLink}}projectLink: {{projectLink}}
{{/if}}isMilestone: {{isMilestone}}
tags:
{{#each tags}}  - {{this}}
{{/each}}---

# {{priorityEmoji}} {{name}}

<input class="pm-progress-input" data-feature-id="{{id}}" placeholder="输入当前进展，按 Enter 保存...">

---

## 📈 进展反馈

| 时间 | 反馈内容 | 记录人 |
|------|---------|--------|
| {{createTime}} | 特性创建 | |

---

## ⚠️ 风险跟踪

| 风险类型 | 风险描述 | 风险等级 | 责任人 | 发现时间 | 闭环时间 | 状态 |
|---------|---------|---------|--------|----------|----------|------|

---

## 🚀 快速操作

--- start-multi-column: ID_quick_actions
\`\`\`column-settings
Number of Columns: 2
Largest Column: standard
Border: off
\`\`\`

<span class="pm-btn" data-action="add-progress" data-entity-type="feature" data-entity-id="{{id}}">📝 添加进展</span>

--- column-break ---

<span class="pm-btn" data-action="add-risk" data-entity-type="feature" data-entity-id="{{id}}">⚠️ 添加风险</span>

--- end-multi-column

---

## 1️⃣ 需求背景和来源

### 需求提出方
<!-- 填写需求提出方，如：产品团队、业务部门、客户等 -->

### 背景
<!-- 描述需求产生的背景和业务痛点 -->

### 目标产品范围
<!-- 明确本次需求覆盖的产品范围和边界 -->

---

## 2️⃣ 相关人员

### 系统工程师（SE）
- **姓名**: <!-- 张三 -->
- **工号**: <!-- xxxxx -->

### 开发接口人
- **姓名**: <!-- 李四 -->
- **工号**: <!-- xxxxx -->

### 测试接口人
- **姓名**: <!-- 王五 -->
- **工号**: <!-- xxxxx -->

### 算法接口人
- **姓名**: <!-- 赵六 -->
- **工号**: <!-- xxxxx -->

### 其他相关人员
- **角色**: <!-- 产品经理/项目经理等 -->
- **姓名**: <!-- 姓名 -->
- **工号**: <!-- xxxxx -->

---

## 3️⃣ 项目链接

### 需求链接
- [需求文档1]() <!-- 填写需求文档链接 -->
- [需求文档2]() <!-- 填写需求文档链接 -->

### DBox 归档路径
\`\`\`
<!-- 填写 DBox 归档路径，如：/产品/2024/Q1/需求文档/ -->
\`\`\`

### 其他链接
- [PRD 文档]()
- [原型图]()
- [UI 设计稿]()

---

## 4️⃣ 联调问题记录

### 问题1
- **描述**: <!-- 联调中遇到的问题 -->
- **影响范围**: <!-- 影响的功能/模块 -->
- **解决方案**: <!-- 解决方案 -->
- **状态**: ⬜ 待解决 / 🟡 处理中 / 🟢 已解决
- **负责人**: <!-- @负责人 -->

### 问题2
- **描述**:
- **影响范围**:
- **解决方案**:
- **状态**:
- **负责人**:

---

## 5️⃣ 测试报告红线报告

### 测试概况
- **测试负责人**: <!-- @测试人员 -->
- **测试时间**: <!-- YYYY-MM-DD ~ YYYY-MM-DD -->
- **测试结论**: ⬜ 通过 / ⬜ 有条件通过 / ⬜ 不通过

### Bug 统计
| 级别 | 阻塞数 | 已修复 | 遗留 |
|------|--------|--------|------|
| P0 阻塞 | 0 | 0 | 0 |
| P1 严重 | 0 | 0 | 0 |
| P2 一般 | 0 | 0 | 0 |
| P3 轻微 | 0 | 0 | 0 |

### 红线问题
- [ ] 红线1: <!-- 描述红线问题 -->
- [ ] 红线2: <!-- 描述红线问题 -->

### 测试报告链接
- [测试报告]()
- [性能测试报告]()
- [安全测试报告]()

---

## 6️⃣ 合入链接

### HiCamera 分支
- **开发分支**: \`feature/{{id}}\`
- **合入状态**: ⬜ 未合入 / 🟡 合入中 / 🟢 已合入
- **MR 链接**: <!-- 填写 MR 链接 -->
- **合入 Commit**: <!-- 填写 Commit ID -->

### 主干分支
- **目标分支**: \`master/main\`
- **合入状态**: ⬜ 未合入 / 🟡 合入中 / 🟢 已合入
- **MR 链接**:
- **合入 Commit**:

### 商用分支
- **目标分支**: \`release/xxx\`
- **合入状态**: ⬜ 未合入 / 🟡 合入中 / 🟢 已合入
- **MR 链接**:
- **合入 Commit**:
- **版本号**: <!-- v.x.x.x -->

### 商分材料
- [商分文档]()
- [上线检查清单]()
- [回滚方案]()

---



## 📅 里程碑计划

| 里程碑 | 计划日期 | 实际日期 | 状态 |
|--------|----------|----------|------|
| 需求评审 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 设计评审 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 开发完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 联调完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 测试完成 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |
| 上线发布 | <!-- YYYY-MM-DD --> | <!-- YYYY-MM-DD --> | ⬜ |

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
  requirement: DEFAULT_REQUIREMENT_TEMPLATE,
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
