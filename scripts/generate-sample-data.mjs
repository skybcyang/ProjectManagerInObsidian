/**
 * 生成示例项目管理数据
 * 使用与插件一致的默认模板渲染
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const BASE_DIR = 'ProjectManager';

// 确保目录存在
mkdirSync(`${BASE_DIR}/Versions`, { recursive: true });
mkdirSync(`${BASE_DIR}/Projects`, { recursive: true });
mkdirSync(`${BASE_DIR}/Features`, { recursive: true });
mkdirSync(`${BASE_DIR}/.changelog`, { recursive: true });

// ===== 默认模板（与 src/templates/defaults.ts 保持一致）=====

const DEFAULT_VERSION_TEMPLATE = `---
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
| 版本总计 | {{estimatedDays}}d | {{actualDays}}d | {{daysDeviationText}} |

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

const DEFAULT_PROJECT_TEMPLATE = `---
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
| 项目总计 | {{estimatedDays}}d | {{actualDays}}d | {{daysDeviationText}} |

> 💡 **统计说明**: 自动汇总该项目下所有特性的人天数据

---

## 🔗 项目链接

- **项目主页**: <!-- 填写项目主页链接 -->
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

| 角色 | 姓名 | 联系方式 |
|------|------|----------|
| 项目经理 | <!-- 姓名 --> | <!-- 邮箱/IM --> |
| 开发负责人 | <!-- 姓名 --> | <!-- 邮箱/IM --> |
| 测试负责人 | <!-- 姓名 --> | <!-- 邮箱/IM --> |
| 产品经理 | <!-- 姓名 --> | <!-- 邮箱/IM --> |

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

## 📝 其他备注

<!-- 记录项目相关的重要信息、决策、会议纪要等 -->
`;

const DEFAULT_FEATURE_TEMPLATE = `---
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
<!-- 填写需求提出方 -->

### 背景
<!-- 描述需求产生的背景和业务痛点 -->

### 目标产品范围
<!-- 明确本次需求覆盖的产品范围和边界 -->

---

## 2️⃣ 相关人员

### 开发接口人
- **姓名**: <!-- 李四 -->

### 测试接口人
- **姓名**: <!-- 王五 -->

---

## 3️⃣ 项目链接

### 需求链接
- [需求文档1]() <!-- 填写需求文档链接 -->

---

## 4️⃣ 联调问题记录

### 问题1
- **描述**: <!-- 联调中遇到的问题 -->
- **状态**: ⬜ 待解决 / 🟡 处理中 / 🟢 已解决
- **负责人**: <!-- @负责人 -->

---

## 5️⃣ 测试报告

### 测试概况
- **测试负责人**: <!-- @测试人员 -->
- **测试结论**: ⬜ 通过 / ⬜ 有条件通过 / ⬜ 不通过

### Bug 统计
| 级别 | 阻塞数 | 已修复 | 遗留 |
|------|--------|--------|------|
| P0 阻塞 | 0 | 0 | 0 |
| P1 严重 | 0 | 0 | 0 |
| P2 一般 | 0 | 0 | 0 |
| P3 轻微 | 0 | 0 | 0 |

---

## 6️⃣ 合入链接

### 开发分支
- **开发分支**: \`feature/{{id}}\`
- **合入状态**: ⬜ 未合入 / 🟡 合入中 / 🟢 已合入
- **MR 链接**: <!-- 填写 MR 链接 -->

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

// ===== 模板渲染（与 TemplateService.renderTemplate 保持一致）=====

const PRIORITY_EMOJI = {
  critical: '🔴',
  high: '🟠',
  medium: '🔵',
  low: '🟢',
};

const STATUS_EMOJI = {
  backlog: '📋',
  todo: '📝',
  'in-progress': '🔄',
  testing: '🧪',
  completed: '✅',
  archived: '📦',
};

function enrichContext(context) {
  const enriched = { ...context };
  if ('priority' in context) {
    enriched.priorityEmoji = PRIORITY_EMOJI[context.priority] || '⚪';
  }
  if ('status' in context) {
    enriched.statusEmoji = STATUS_EMOJI[context.status] || '⚪';
  }
  enriched.createTime = new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  if ('estimatedDays' in context || 'actualDays' in context) {
    const est = Number(context.estimatedDays) || 0;
    const act = Number(context.actualDays) || 0;
    enriched.daysDeviation = act - est;
    if (est === 0) {
      enriched.daysDeviationText = '-';
    } else {
      enriched.daysDeviationText = act >= est ? `+${act - est}d` : `${act - est}d`;
    }
  }
  return enriched;
}

function processEachBlocks(template, context) {
  const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  return template.replace(eachRegex, (match, variable, content) => {
    const array = context[variable];
    if (!Array.isArray(array)) return '';
    return array.map((item, index) => {
      let itemContent = content;
      if (typeof item === 'object' && item !== null) {
        const itemContext = item;
        itemContent = itemContent.replace(/\{\{(\w+)\}\}/g, (_m, varName) => {
          const value = itemContext[varName];
          return value !== undefined && value !== null ? String(value) : '';
        });
      }
      itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
      itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
      return itemContent;
    }).join('');
  });
}

function processIfBlocks(template, context) {
  let result = template;
  let prev;
  let depth = 0;
  const maxDepth = 10;
  do {
    prev = result;
    result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, variable, content) => {
      const value = context[variable];
      const hasValue = value !== undefined && value !== null && value !== '' &&
        !(Array.isArray(value) && value.length === 0);
      return hasValue ? content : '';
    });
    depth++;
  } while (prev !== result && depth < maxDepth);
  return result;
}

function processVariables(template, context) {
  return template.replace(/\{\{([\w.]+)\}\}/g, (match, variable) => {
    const parts = variable.split('.');
    let value = context;
    for (const part of parts) {
      if (value === null || value === undefined) return '';
      value = value[part];
    }
    return value !== undefined && value !== null ? String(value) : '';
  });
}

function renderTemplate(template, context) {
  const enriched = enrichContext(context);
  let result = processIfBlocks(template, enriched);
  result = processEachBlocks(result, enriched);
  result = processVariables(result, enriched);
  return result;
}

// ===== 数据生成 =====

const OWNERS = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '冯十二'];
const TAGS = ['前端', '后端', 'API', '数据库', 'UI设计', '移动端', '测试', 'DevOps', '安全', '性能'];
const STATUSES = ['backlog', 'todo', 'in-progress', 'testing', 'completed'];
const STATUS_WEIGHTS = [0.15, 0.20, 0.30, 0.15, 0.20];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const PRIORITY_WEIGHTS = [0.10, 0.30, 0.45, 0.15];

function weightedRandom(items, weights) {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return items[i];
  }
  return items[items.length - 1];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset(arr, min, max) {
  const count = randomInt(min, Math.min(max, arr.length));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function id(prefix) {
  return `${prefix}-${Math.random().toString(36).substring(2, 10)}`;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const versions = [
  { name: '2026-Q1 春季迭代', startOffset: -180, endOffset: -90, status: 'completed' },
  { name: '2026-Q2 夏季迭代', startOffset: -90, endOffset: 0, status: 'in-progress' },
  { name: '2026-Q3 秋季迭代', startOffset: 0, endOffset: 90, status: 'planning' },
  { name: '2026-Q4 冬季迭代', startOffset: 90, endOffset: 180, status: 'backlog' },
];

const today = new Date();

const versionData = versions.map((v, idx) => {
  const startDate = addDays(today, v.startOffset);
  const endDate = addDays(today, v.endOffset);
  const versionId = id('ver');
  return {
    id: versionId,
    name: v.name,
    status: v.status,
    owner: randomItem(OWNERS),
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    tags: randomSubset(TAGS, 2, 4),
    estimatedDays: 0,
    actualDays: 0,
  };
});

const projectTemplates = [
  { name: '官网重构', tags: ['前端', 'UI设计'] },
  { name: '后台管理系统', tags: ['前端', '后端'] },
  { name: '移动端 App', tags: ['移动端', 'API'] },
  { name: '支付网关', tags: ['后端', '安全'] },
  { name: '数据中台', tags: ['数据库', 'DevOps'] },
  { name: '用户认证中心', tags: ['后端', '安全'] },
  { name: '消息推送平台', tags: ['后端', '移动端'] },
  { name: '性能优化专项', tags: ['性能', 'DevOps'] },
];

const projectData = [];
versionData.forEach((version) => {
  const projectCount = randomInt(3, 5);
  const selectedProjects = randomSubset(projectTemplates, projectCount, projectCount);
  selectedProjects.forEach((template, pIdx) => {
    const versionStart = new Date(version.startDate);
    const versionEnd = new Date(version.endDate);
    const rangeDays = (versionEnd - versionStart) / (1000 * 60 * 60 * 24);
    const startOffset = randomInt(0, Math.max(1, Math.floor(rangeDays * 0.2)));
    const duration = randomInt(Math.floor(rangeDays * 0.4), Math.floor(rangeDays * 0.8));

    projectData.push({
      id: id('proj'),
      name: `${version.name.split(' ')[1]}-${template.name}`,
      versionId: version.id,
      status: version.status === 'backlog' ? 'backlog' : weightedRandom(STATUSES, STATUS_WEIGHTS),
      priority: weightedRandom(PRIORITIES, PRIORITY_WEIGHTS),
      owner: randomItem(OWNERS),
      startDate: formatDate(addDays(versionStart, startOffset)),
      endDate: formatDate(addDays(versionStart, startOffset + duration)),
      tags: [...new Set([...template.tags, ...randomSubset(TAGS, 1, 2)])],
      estimatedDays: 0,
      actualDays: 0,
    });
  });
});

const featureTemplates = [
  { name: '首页 Hero 设计', tags: ['前端', 'UI设计'] },
  { name: '导航栏重构', tags: ['前端', 'UI设计'] },
  { name: '页脚开发', tags: ['前端'] },
  { name: '登录页开发', tags: ['前端', '安全'] },
  { name: '仪表盘开发', tags: ['前端', '后端'] },
  { name: '权限管理', tags: ['后端', '安全'] },
  { name: 'API 接口开发', tags: ['后端', 'API'] },
  { name: '数据库设计', tags: ['数据库'] },
  { name: '单元测试覆盖', tags: ['测试'] },
  { name: '集成测试', tags: ['测试'] },
  { name: 'JWT 鉴权', tags: ['后端', '安全'] },
  { name: '限流模块', tags: ['后端', '性能'] },
  { name: '推送功能', tags: ['移动端', '后端'] },
  { name: '用户认证', tags: ['移动端', '安全'] },
  { name: '缓存优化', tags: ['性能', 'DevOps'] },
  { name: 'CI/CD 流水线', tags: ['DevOps'] },
  { name: '日志监控', tags: ['DevOps'] },
  { name: '数据迁移', tags: ['数据库'] },
  { name: '接口文档', tags: ['API'] },
  { name: '埋点统计', tags: ['前端', '后端'] },
];

const featureData = [];
projectData.forEach((project) => {
  const featureCount = randomInt(5, 10);
  const selectedFeatures = randomSubset(featureTemplates, featureCount, featureCount);
  selectedFeatures.forEach((template) => {
    const projectStart = new Date(project.startDate);
    const projectEnd = new Date(project.endDate);
    const rangeDays = (projectEnd - projectStart) / (1000 * 60 * 60 * 24);
    const startOffset = randomInt(0, Math.max(1, Math.floor(rangeDays * 0.3)));
    const duration = randomInt(Math.floor(rangeDays * 0.2), Math.floor(rangeDays * 0.6));
    const status = project.status === 'backlog' ? 'backlog' : weightedRandom(STATUSES, STATUS_WEIGHTS);
    const priority = weightedRandom(PRIORITIES, PRIORITY_WEIGHTS);
    const progress = status === 'completed' ? 100 :
      status === 'backlog' ? 0 :
      status === 'todo' ? 0 :
      status === 'testing' ? randomInt(80, 95) :
      randomInt(10, 75);
    const estimatedDays = randomInt(1, 10);
    const actualDays = status === 'completed' ? Math.round(estimatedDays * randomInt(80, 130) / 100) :
      status === 'in-progress' || status === 'testing' ? Math.round(estimatedDays * randomInt(40, 90) / 100) : 0;

    featureData.push({
      id: id('feat'),
      name: template.name,
      versionId: project.versionId,
      projectId: project.id,
      status,
      priority,
      progress,
      owner: randomItem(OWNERS),
      startDate: formatDate(addDays(projectStart, startOffset)),
      endDate: formatDate(addDays(projectStart, startOffset + duration)),
      estimatedDays,
      actualDays,
      isMilestone: false,
      tags: [...new Set([...template.tags, ...randomSubset(TAGS, 0, 2)])],
    });
  });
});

// 为每个项目添加 1-2 个里程碑特性
projectData.forEach((project) => {
  const milestoneCount = randomInt(1, 2);
  for (let i = 0; i < milestoneCount; i++) {
    const projectStart = new Date(project.startDate);
    const projectEnd = new Date(project.endDate);
    const rangeDays = (projectEnd - projectStart) / (1000 * 60 * 60 * 24);
    const startOffset = Math.floor(rangeDays * 0.5);
    const duration = randomInt(1, 7);
    const status = project.status === 'backlog' ? 'backlog' : weightedRandom(STATUSES, STATUS_WEIGHTS);
    const progress = status === 'completed' ? 100 : status === 'backlog' || status === 'todo' ? 0 : randomInt(20, 80);

    featureData.push({
      id: id('feat'),
      name: `${project.name.split('-').pop()} 里程碑 ${i + 1}`,
      versionId: project.versionId,
      projectId: project.id,
      status,
      priority: 'high',
      progress,
      owner: project.owner,
      startDate: formatDate(addDays(projectStart, startOffset)),
      endDate: formatDate(addDays(projectStart, startOffset + duration)),
      estimatedDays: randomInt(3, 8),
      actualDays: 0,
      isMilestone: true,
      tags: ['里程碑', ...randomSubset(TAGS, 1, 2)],
    });
  }
});

// 汇总人天到项目和版本
projectData.forEach((project) => {
  const features = featureData.filter(f => f.projectId === project.id);
  project.estimatedDays = features.reduce((sum, f) => sum + (f.estimatedDays || 0), 0);
  project.actualDays = features.reduce((sum, f) => sum + (f.actualDays || 0), 0);
});

versionData.forEach((version) => {
  const projects = projectData.filter(p => p.versionId === version.id);
  version.estimatedDays = projects.reduce((sum, p) => sum + (p.estimatedDays || 0), 0);
  version.actualDays = projects.reduce((sum, p) => sum + (p.actualDays || 0), 0);
});

// ===== 生成文件 =====

versionData.forEach((version) => {
  const content = renderTemplate(DEFAULT_VERSION_TEMPLATE, version);
  const fileName = `${version.name}.md`;
  writeFileSync(`${BASE_DIR}/Versions/${fileName}`, content);
  console.log(`生成版本: ${fileName}`);
});

projectData.forEach((project) => {
  const content = renderTemplate(DEFAULT_PROJECT_TEMPLATE, project);
  const fileName = `${project.name}.md`;
  writeFileSync(`${BASE_DIR}/Projects/${fileName}`, content);
  console.log(`生成项目: ${fileName}`);
});

featureData.forEach((feature) => {
  const content = renderTemplate(DEFAULT_FEATURE_TEMPLATE, feature);
  const projectName = projectData.find(p => p.id === feature.projectId).name;
  const fileName = `${projectName}-${feature.name}.md`;
  const safeFileName = fileName.replace(/\//g, '-');
  writeFileSync(`${BASE_DIR}/Features/${safeFileName}`, content);
  console.log(`生成特性: ${safeFileName}`);
});

// ===== 生成总览 =====

const overviewContent = `---
pm-dashboard: true
---

# 📊 项目管理总览

> 最后更新: ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}

---

## 📈 统计概览

\`\`\`dataviewjs
const versions = dv.pages('"ProjectManager/Versions"');
const projects = dv.pages('"ProjectManager/Projects"');
const features = dv.pages('"ProjectManager/Features"');

const vCompleted = versions.filter(v => v.status === 'completed').length;
const vTotal = versions.length;
const vInProgress = versions.filter(v => v.status === 'in-progress').length;
const vBacklog = versions.filter(v => v.status === 'backlog' || v.status === 'planning').length;

const pCompleted = projects.filter(p => p.status === 'completed').length;
const pTotal = projects.length;
const pInProgress = projects.filter(p => p.status === 'in-progress').length;
const pBacklog = projects.filter(p => p.status === 'backlog').length;

const fCompleted = features.filter(f => f.status === 'completed').length;
const fTotal = features.length;
const fInProgress = features.filter(f => f.status === 'in-progress').length;
const fBacklog = features.filter(f => f.status === 'backlog' || f.status === 'todo').length;

dv.table(
  ["类型", "已完成", "进行中", "待开始", "总计"],
  [
    ["📦 版本", vCompleted, vInProgress, vBacklog, vTotal],
    ["📁 项目", pCompleted, pInProgress, pBacklog, pTotal],
    ["✨ 特性", fCompleted, fInProgress, fBacklog, fTotal]
  ]
);
\`\`\`

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

## ✨ 特性看板

\`\`\`pm-view
mode: kanban
entityType: feature
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
    - risk
    - tags
\`\`\`

---

## 🗓️ 时间视图

\`\`\`pm-view
mode: timeview
entityType: feature
timeViewMode: month
timeGroupBy: project
\`\`\`

---

*Powered by Project Manager Plugin*
`;

writeFileSync(`${BASE_DIR}/总览.md`, overviewContent);
console.log('生成总览: 总览.md');

console.log('\n===== 生成统计 =====');
console.log(`版本: ${versionData.length}`);
console.log(`项目: ${projectData.length}`);
console.log(`特性: ${featureData.length}`);
console.log('示例数据生成完成！');
