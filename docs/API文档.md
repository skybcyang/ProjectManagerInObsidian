# API 文档

> **适用版本**: v0.8.4
>
> 本文档面向开发者和高级用户，介绍 Project Manager 插件的公开 API、视图配置与模板变量。

---

## 1. EntityManager API

`EntityManager` 是插件对外暴露的统一数据入口，协调 Version / Project / Requirement / Feature 四个 Store。

### 1.1 初始化

```typescript
import { EntityManager } from './src/core/EntityManager';

const entityManager = new EntityManager(app, settings);
await entityManager.initialize();
```

### 1.2 版本操作

| 方法 | 签名 | 说明 |
|------|------|------|
| `createVersion` | `(data: CreateVersionData) => Promise<Version>` | 创建版本 |
| `updateVersion` | `(id, data: UpdateVersionData) => Promise<Version \| null>` | 更新版本 |
| `deleteVersion` | `(id, cascade?: boolean) => Promise<boolean>` | 删除版本；`cascade=true` 时级联删除关联需求和项目 |
| `getVersion` | `(id) => Promise<Version \| null>` | 按 ID 获取版本 |
| `getVersionPath` | `(id) => Promise<string \| null>` | 获取版本文件路径 |
| `listVersions` | `() => Promise<Version[]>` | 获取所有版本 |
| `getVersionProjects` | `(versionId) => Promise<Project[]>` | 获取版本下的项目 |

### 1.3 项目操作

| 方法 | 签名 | 说明 |
|------|------|------|
| `createProject` | `(data: CreateProjectData) => Promise<Project>` | 创建项目（必须关联版本） |
| `updateProject` | `(id, data: UpdateProjectData) => Promise<Project \| null>` | 更新项目 |
| `deleteProject` | `(id, cascade?: boolean) => Promise<boolean>` | 删除项目；`cascade=true` 时级联删除关联需求和特性 |
| `getProject` | `(id) => Promise<Project \| null>` | 按 ID 获取项目 |
| `getProjectPath` | `(id) => Promise<string \| null>` | 获取项目文件路径 |
| `listProjects` | `(filters?) => Promise<Project[]>` | 获取项目，支持 `versionId` 过滤 |
| `getProjectFeatures` | `(projectId) => Promise<Feature[]>` | 获取项目下的特性 |

### 1.4 需求操作

需求是**独立管理实体**，可选关联版本 / 项目 / 特性，不纳入 `版本→项目→特性` 级联层级。

| 方法 | 签名 | 说明 |
|------|------|------|
| `createRequirement` | `(data: CreateRequirementData) => Promise<Requirement>` | 创建需求 |
| `updateRequirement` | `(id, data: UpdateRequirementData) => Promise<Requirement \| null>` | 更新需求 |
| `deleteRequirement` | `(id) => Promise<boolean>` | 删除需求 |
| `getRequirement` | `(id) => Promise<Requirement \| null>` | 按 ID 获取需求 |
| `getRequirementPath` | `(id) => Promise<string \| null>` | 获取需求文件路径 |
| `listRequirements` | `(filters?) => Promise<Requirement[]>` | 获取需求，支持 `versionId` / `projectId` / `status` 过滤 |
| `getProjectRequirements` | `(projectId) => Promise<Requirement[]>` | 获取项目下的需求 |
| `getVersionRequirements` | `(versionId) => Promise<Requirement[]>` | 获取版本下的需求 |

### 1.5 特性操作

| 方法 | 签名 | 说明 |
|------|------|------|
| `createFeature` | `(data: CreateFeatureData) => Promise<Feature>` | 创建特性（必须关联版本和项目） |
| `updateFeature` | `(id, data: UpdateFeatureData) => Promise<Feature \| null>` | 更新特性 |
| `deleteFeature` | `(id) => Promise<boolean>` | 删除特性 |
| `getFeature` | `(id) => Promise<Feature \| null>` | 按 ID 获取特性 |
| `getFeaturePath` | `(id) => Promise<string \| null>` | 获取特性文件路径 |
| `listFeatures` | `(filters?) => Promise<Feature[]>` | 获取特性，支持 `versionId` / `projectId` / `status` 过滤 |

### 1.6 通用方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `getEntityPath` | `(type, id) => Promise<string \| null>` | 获取指定类型实体的文件路径 |
| `findById` | `(id) => Promise<{ type, entity } \| null>` | 按 ID 查找任意实体 |
| `getOwners` | `() => string[]` | 从缓存获取所有负责人列表 |
| `isDataviewAvailable` | `() => boolean` | 检查 Dataview 插件是否可用 |
| `getVersionProgress` | `(versionId) => Promise<number>` | 计算版本进度（0-100） |
| `getProjectProgress` | `(projectId) => Promise<number>` | 计算项目进度（0-100） |
| `getOverdueItems` | `(type?) => Promise<Entity[]>` | 获取逾期实体 |

---

## 2. 视图配置参考

所有视图通过 `pm-view` 代码块定义。

### 2.1 通用配置

```yaml
mode: kanban              # 必填：kanban / cascade / timeview
entityType: feature       # 实体类型：version / project / requirement / feature

# 标题
title: 我的视图

# 单个实体筛选（旧版兼容）
version: ver-xxx
project: proj-xxx
feature: feat-xxx

# 多实体筛选
versions: [ver-xxx, ver-yyy]
projects: [proj-xxx]
features: [feat-xxx]
requirements: [req-xxx]

# 属性筛选
status: in-progress
priority: high
owner: 张三
tag: 重要

# 分组（看板/级联）
groupBy: status           # status / priority / version / project

# 排序
sortBy: endDate
sortOrder: desc
sorts:
  - field: priority
    order: asc

# 限制数量
limit: 20

# 视图选项
options:
  expanded: true
  maxProjects: 10
  maxFeaturesPerProject: 5

# 卡片字段
cardFields:
  required: [name, priority]
  optional: [status, owner, progress, endDate, tags]

# 时间视图配置
timeViewMode: month       # week / month / year / all
timeGroupBy: owner        # owner / project
timeViewDate: 2026-07-01
collapsedGroups: []
```

### 2.2 看板视图（kanban）

按状态或优先级分栏展示卡片。

```yaml
mode: kanban
entityType: requirement   # 或 feature / project / version
groupBy: status
cardFields:
  required: [name, priority]
  optional: [status, owner, endDate, progress, tags]
```

### 2.3 级联视图（cascade）

仅支持 `entityType: feature`（默认），展示 `版本 → 项目 → 特性` 三层层级。**需求不纳入级联视图**。

```yaml
mode: cascade
groupBy: status
options:
  expanded: true
  maxProjects: 10
  maxFeaturesPerProject: 5
```

### 2.4 时间视图（timeview）

按负责人或项目分组展示甘特图，仅支持 `project` / `feature`。

```yaml
mode: timeview
entityType: feature
timeViewMode: month
timeGroupBy: project
```

---

## 3. 模板变量参考

插件支持自定义总览、版本、项目、需求、特性五种模板。

### 3.1 通用变量

| 变量 | 说明 |
|------|------|
| `{{id}}` | 实体唯一标识 |
| `{{name}}` | 实体名称 |
| `{{status}}` | 状态 |
| `{{priority}}` | 优先级 |
| `{{priorityEmoji}}` | 优先级表情 🔴🟠🔵🟢 |
| `{{statusEmoji}}` | 状态表情 |
| `{{owner}}` | 负责人 |
| `{{startDate}}` | 开始日期 |
| `{{endDate}}` | 结束日期 |
| `{{tags}}` | 标签数组 |
| `{{createTime}}` | 创建时间 |

### 3.2 各类型特有变量

**版本模板**
- `{{owner}}`, `{{startDate}}`, `{{endDate}}`, `{{tags}}`

**项目模板**
- `{{versionId}}`, `{{owner}}`, `{{priority}}`, `{{startDate}}`, `{{endDate}}`, `{{tags}}`

**需求模板**
- `{{versionId}}`（可选）, `{{projectId}}`（可选）, `{{featureId}}`（可选）
- `{{owner}}`, `{{priority}}`, `{{progress}}`, `{{startDate}}`, `{{endDate}}`
- `{{estimatedDays}}`, `{{actualDays}}`, `{{description}}`, `{{tags}}`

**特性模板**
- `{{versionId}}`, `{{projectId}}`
- `{{owner}}`, `{{priority}}`, `{{progress}}`, `{{startDate}}`, `{{endDate}}`
- `{{estimatedDays}}`, `{{actualDays}}`, `{{isMilestone}}`, `{{tags}}`

### 3.3 模板语法

```markdown
{{#if owner}}负责人: {{owner}}{{/if}}
{{#each tags}}#{{this}} {{/each}}
```

---

## 4. 实体字段定义

### 4.1 版本字段

| 字段 | 类型 | 可编辑 | 可筛选 |
|------|------|--------|--------|
| name | text | ✅ | ✅ |
| status | select | ✅ | ✅ |
| owner | text | ✅ | ✅ |
| startDate | date | ✅ | ✅ |
| endDate | date | ✅ | ✅ |
| tags | multi-select | ✅ | ✅ |

### 4.2 项目字段

| 字段 | 类型 | 可编辑 | 可筛选 |
|------|------|--------|--------|
| name | text | ✅ | ✅ |
| status | select | ✅ | ✅ |
| priority | select | ✅ | ✅ |
| owner | text | ✅ | ✅ |
| startDate | date | ✅ | ✅ |
| endDate | date | ✅ | ✅ |
| tags | multi-select | ✅ | ✅ |
| versionId | entity | ✅ | ✅ |

### 4.3 需求字段

| 字段 | 类型 | 可编辑 | 可筛选 |
|------|------|--------|--------|
| name | text | ✅ | ✅ |
| status | select | ✅ | ✅ |
| priority | select | ✅ | ✅ |
| owner | text | ✅ | ✅ |
| startDate | date | ✅ | ✅ |
| endDate | date | ✅ | ✅ |
| progress | progress | ✅ | ❌ |
| estimatedDays | number | ✅ | ❌ |
| actualDays | number | ✅ | ❌ |
| tags | multi-select | ✅ | ✅ |
| versionId | entity | ✅ | ✅ |
| projectId | entity | ✅ | ✅ |
| featureId | entity | ✅ | ✅ |

### 4.4 特性字段

| 字段 | 类型 | 可编辑 | 可筛选 |
|------|------|--------|--------|
| name | text | ✅ | ✅ |
| status | select | ✅ | ✅ |
| priority | select | ✅ | ✅ |
| owner | text | ✅ | ✅ |
| startDate | date | ✅ | ✅ |
| endDate | date | ✅ | ✅ |
| progress | progress | ✅ | ❌ |
| estimatedDays | number | ✅ | ❌ |
| actualDays | number | ✅ | ❌ |
| tags | multi-select | ✅ | ✅ |
| versionId | entity | ✅ | ✅ |
| projectId | entity | ✅ | ✅ |
| isMilestone | boolean | ✅ | ✅ |

---

## 5. 状态与优先级枚举

### 5.1 版本状态

`planning` | `in-progress` | `completed` | `archived`

### 5.2 项目/需求/特性状态

`backlog` | `todo` | `in-progress` | `testing` | `completed` | `archived`

### 5.3 优先级

`critical` | `high` | `medium` | `low`

---

## 6. 文件命名规则

| 实体 | 文件名格式 | 示例 |
|------|-----------|------|
| 版本 | `{版本名}.md` | `2026-Q1 春季迭代.md` |
| 项目 | `{项目名}.md` | `春季迭代-官网重构.md` |
| 需求 | `{版本名-(项目名-)需求名}.md` | `2026-Q1 春季迭代-会员权益中心.md` |
| 特性 | `{特性名}.md` | `春季迭代-官网重构-登录页开发.md` |

---

## 7. Dataview 集成函数

当 Dataview 插件可用时，EntityManager 内部优先使用 Dataview 索引查询以下数据：

| 函数/方法 | 说明 |
|-----------|------|
| `queryProjects({ versionId })` | 获取版本下项目 |
| `queryFeatures({ projectId })` | 获取项目下特性 |
| `getVersionProgress(versionId)` | 根据特性完成度计算版本进度 |
| `getProjectProgress(projectId)` | 根据特性完成度计算项目进度 |
| `getOverdueItems(type?)` | 获取逾期实体 |

> 注意：当前版本未向 DataviewJS 公开自定义函数，集成在 EntityManager / DataService 内部完成。
