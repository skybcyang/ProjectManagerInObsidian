# Project Manager for Obsidian

在 Obsidian 中进行项目管理，支持版本、项目、特性三层结构化管理，提供看板视图、面包屑导航和日历导出功能。

## ✨ 功能特性

- 📦 **版本管理** - 规划和管理产品版本迭代
- 📁 **项目管理** - 组织和管理项目，必须关联版本
- ✨ **特性管理** - 跟踪特性开发进度，支持优先级、截止日期
- 📊 **统一视图** - 通过 `pm-view` 代码块统一展示所有视图类型

- 🔗 **级联展示** - 展示版本→项目→特性的完整层级结构和实时状态
- 🧭 **面包屑导航** - 层级导航，支持点击穿透
- 📅 **ICS导出** - 导出特性截止日期到 .ics 文件
- 📝 **自定义模板** - 支持自定义总览/版本/项目/特性的页面模板
- 🎯 **IPD 流程** - 完整的 TR 里程碑管理（TR3→TR4→TR4A→TR5→TR6）
- 📊 **TR 里程碑视图** - 可视化展示所有版本的 TR 阶段进度和风险

## 📦 安装

### 手动安装

1. 下载最新版本的 `main.js`、`manifest.json` 和 `styles.css`
2. 将它们复制到你的 Obsidian Vault 的 `.obsidian/plugins/project-manager/` 目录下
3. 在 Obsidian 设置中启用插件

### 通过 BRAT 安装

1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件
2. 添加 `skybcyang/ProjectManagerInObsidian` 到 BRAT

## 🚀 使用方法

### 初始化

1. 点击左侧边栏的 📊 图标，或执行命令"Project Manager: 打开总览页面"
2. 插件会自动创建 `ProjectManager/` 目录结构和总览页面

### 创建实体

- **创建版本** - 点击总览页面的"📦 创建版本"按钮
- **创建项目** - 点击总览页面的"📁 创建项目"按钮（需要先创建版本）
- **创建特性** - 点击总览页面的"✨ 创建特性"按钮（需要先创建项目和版本）

---

## 📊 统一视图 (pm-view)

使用 `pm-view` 代码块统一展示所有视图类型：

```markdown
```pm-view
mode: kanban
type: feature
groupBy: status
```
```

### 支持的视图模式

| 模式 | 说明 | 示例配置 |
|------|------|----------|
| `kanban` | 看板视图 | `mode: kanban`<br>`type: feature`<br>`groupBy: status` |
| `grid` | 网格视图 | `mode: grid`<br>`type: feature`<br>`cols: 3` |
| `cascade` | 级联视图 | `mode: cascade`<br>`type: version`<br>`expanded: true` |
| `timeline` | 时间线视图 | `mode: timeline`<br>`type: feature` |
| `calendar` | 日历视图 | `mode: calendar`<br>`type: feature` |
| `selector` | 选择器视图 | `mode: selector`<br>`type: version` |
| `cascade-selector` | 级联选择器 | `mode: cascade-selector` |
| `tr-milestone` | TR 里程碑视图 | `mode: tr-milestone` |

### 通用配置参数

```yaml
mode: kanban          # 视图模式（必填）
type: feature         # 实体类型：version/project/feature
id: feat-001          # 具体实体ID
groupBy: status       # 分组方式：status/priority/version/project
cols: 3               # 网格列数：1/2/3/4
filter:               # 过滤条件
  status: in-progress
  priority: high
  versionId: ver-001
  projectId: proj-001
sortBy: dueDate       # 排序字段
sortOrder: desc       # 排序方向：asc/desc
limit: 20             # 限制数量
```

---

## 📁 文件结构

插件会在你的 Vault 中创建以下结构：

```
ProjectManager/
├── 总览.md              # 总览页面，包含统计和看板
├── Versions/            # 版本文件夹
├── Projects/            # 项目文件夹
└── Features/            # 特性文件夹
```

## 🏗️ 架构设计

```
┌─────────────────────────────────────────┐
│              UI Layer                    │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │  View    │ │  Cards   │ │Breadcrumb│ │
│  │ Engine   │ │ Registry │ │          │ │
│  └────┬─────┘ └────┬─────┘ └────┬────┘ │
│       └─────────────┴────────────┘      │
│                   │                      │
│            CardRegistry                 │
└───────────────────┬─────────────────────┘
                    │
┌───────────────────┼─────────────────────┐
│              Core Layer                  │
│  ┌─────────────────────────────────┐    │
│  │        EntityManager            │    │
│  │  ┌────────┬────────┬─────────┐ │    │
│  │  │Version │ Project│ Feature │ │    │
│  │  │ Store  │ Store  │  Store  │ │    │
│  │  └───┬────┴───┬────┴────┬────┘ │    │
│  │      └────────┴─────────┘      │    │
│  │               │                │    │
│  │         FileSystem             │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

- **Core 层** - 负责文件读写和数据一致性
- **UI 层** - 通过 ViewEngine 统一处理所有视图，CardRegistry 实现卡片组件化

## 📝 数据格式

所有数据以 Markdown 格式存储，元数据放在 frontmatter 中：

```yaml
---
id: abc12345
name: 示例特性
versionId: ver12345
projectId: proj12345
status: in-progress
priority: high
progress: 50
dueDate: 2026-04-15
owner: 张三
tags:
  - 前端
  - API
---
```

## ⌨️ 快捷键和命令

| 命令 | 说明 |
|------|------|
| 打开总览页面 | 打开项目管理总览 |
| 创建版本 | 创建新版本 |
| 创建项目 | 创建新项目 |
| 创建特性 | 创建新特性 |
| 导出ICS | 导出 .ics 文件 |

## 🖱️ 右键菜单

在版本/项目/特性文件上右键：
- **变更状态** - 快速修改状态
- **快速编辑**（仅特性）- 编辑特性信息

---

## 📝 自定义模板

插件支持自定义以下四种模板：

| 模板类型 | 说明 | 使用场景 |
|---------|------|----------|
| **总览** | 项目管理总览页面 | 初始化时创建 |
| **版本** | 版本详情页面 | 创建新版本时 |
| **项目** | 项目详情页面 | 创建新项目时 |
| **特性** | 特性详情页面 | 创建新特性时 |

### 配置方法

1. 打开 Obsidian 设置 → 社区插件 → Project Manager → 模板设置
2. 开启「启用自定义模板」开关
3. 点击对应模板类型的「编辑模板」按钮
4. 使用模板语法编辑后保存

### 模板语法

支持以下模板变量和语法：

```markdown
---
id: {{id}}
name: {{name}}
status: {{status}}
{{#if owner}}owner: {{owner}}
{{/if}}---

# {{priorityEmoji}} {{name}}

> 创建时间: {{createTime}}

## 标签
{{#each tags}}#{{this}} {{/each}}
```

#### 通用变量（所有模板）

| 变量 | 说明 |
|------|------|
| `{{id}}` | 实体唯一标识 |
| `{{name}}` | 实体名称 |
| `{{status}}` | 状态 |
| `{{priorityEmoji}}` | 优先级表情（🔴🟠🔵🟢） |
| `{{statusEmoji}}` | 状态表情（📋📝🔄🧪✅） |
| `{{createTime}}` | 创建时间 |

#### 各类型特有变量

**版本模板：**
- `{{owner}}`, `{{startDate}}`, `{{endDate}}`, `{{tags}}`

**项目模板：**
- `{{versionId}}`, `{{owner}}`, `{{priority}}`, `{{tags}}`

**特性模板：**
- `{{versionId}}`, `{{projectId}}`, `{{owner}}`, `{{priority}}`, `{{progress}}`, `{{dueDate}}`, `{{tags}}`

**总览模板：**
- `{{date}}`

#### 条件语法

```markdown
{{#if owner}}负责人: {{owner}}{{/if}}
```

#### 循环语法

```markdown
{{#each tags}}- {{this}}
{{/each}}
```

### 模板文件存储

设置中的模板存储在浏览器的 localStorage 中。你也可以：

1. **导出模板到文件** - 在设置中点击「导出所有模板到文件」，模板将保存到 `ProjectManager/.templates/` 目录
2. **使用文件模板** - 在设置中指定「模板文件夹路径」，插件会优先从该文件夹加载 `.md` 模板文件

### 恢复默认

点击「重置」按钮可将单个或所有模板恢复为默认值。

---

## 📎 依赖

- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) - 用于总览页面的统计和列表展示

## 💻 兼容性

- Obsidian v0.15.0+
- 仅支持桌面端

## 📜 版本历史

### v0.6.0 (2026-04-08)

- **新增**：IPD 流程支持，完整的 TR 里程碑管理（TR3→TR4→TR4A→TR5→TR6）
- **新增**：TR 里程碑视图（`mode: tr-milestone`），可视化展示所有版本的 TR 阶段进度
- **新增**：版本右键菜单，支持快速推进阶段、设置 TR 日期、查看交付件清单
- **优化**：修复面包屑导航出现在 pm-view 表格内部的问题
- **优化**：模板渲染支持嵌套属性（如 `{{tr3.status}}`）

### v0.5.1 (2026-04-07)

- 修复模板渲染问题

### v0.4.0 (2026-04-07)

- 新增自定义模板功能，支持自定义总览/版本/项目/特性页面模板
- 在插件设置中添加「模板设置」页面
- 支持模板变量（`{{variable}}`）、条件（`{{#if}}`）和循环（`{{#each}}`）语法
- 支持导出模板到文件和从文件加载模板

### v0.3.0 (2026-04-05)

- 新增统一视图引擎 `pm-view`，支持 7 种视图模式
- 新增 `cascade-selector` 级联选择器模式

- 删除冗余 UI 类，简化架构
- 代码块文字"导出日历"改为"导出ICS"

### v0.2.0 (2026-04-03)


- 新增实体选择器（`pm-selector` 代码块）
- 级联卡片支持最新进展自动提取
- 级联卡片头部支持点击跳转
- 总览页面重构，简化信息展示
- 即将到期和延期特性标记

### v0.1.0 (2026-04-02)

- 初始版本
- 支持版本、项目、特性三层管理
- 看板视图（支持点击跳转）

- 面包屑导航
- ICS 日历导出
- 双层架构重构（Core + UI）

## 📄 许可证

MIT License

## 👤 作者

skybcyang
