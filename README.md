# Project Manager for Obsidian

在 Obsidian 中进行项目管理，支持版本、项目、特性三层结构化管理，提供看板视图、面包屑导航和日历导出功能。

## ✨ 功能特性

- 📦 **版本管理** - 规划和管理产品版本迭代
- 📁 **项目管理** - 组织和管理项目，必须关联版本
- ✨ **特性管理** - 跟踪特性开发进度，支持优先级、截止日期
- 📊 **统一视图** - 通过 `pm-view` 代码块统一展示所有视图类型
- 🔄 **兼容代码块** - `pm-grid`, `pm-card`, `pm-kanban`, `pm-selector` 仍可使用
- 🔗 **级联展示** - 展示版本→项目→特性的完整层级结构和实时状态
- 🧭 **面包屑导航** - 层级导航，支持点击穿透
- 📅 **ICS导出** - 导出特性截止日期到 .ics 文件

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
| `card` | 单卡片视图 | `mode: card`<br>`type: feature`<br>`id: feat-001` |
| `timeline` | 时间线视图 | `mode: timeline`<br>`type: feature` |
| `calendar` | 日历视图 | `mode: calendar`<br>`type: feature` |
| `selector` | 选择器视图 | `mode: selector`<br>`type: version` |
| `cascade-selector` | 级联选择器 | `mode: cascade-selector` |

### 通用配置参数

```yaml
mode: kanban          # 视图模式（必填）
type: feature         # 实体类型：version/project/feature
id: feat-001          # 具体实体ID（单卡片模式用）
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

## 🔄 兼容代码块（旧版）

以下代码块仍可使用，内部自动映射到 `pm-view`：

### 看板视图 (pm-kanban)

```markdown
```pm-kanban
view: all
```
```

支持的视图类型：
- `all` - 显示所有特性按状态分组
- `by-version` - 按版本分组
- `by-project` - 按项目分组
- `grid` - 网格卡片布局

筛选参数：
```yaml
view: all
version: ver-001      # 按版本筛选
project: proj-001     # 按项目筛选
owner: 张三           # 按负责人筛选
tag: 前端             # 按标签筛选
```

### 网格视图 (pm-grid)

```markdown
```pm-grid
type: feature
cols: 3
filter:
  status: in-progress
```
```

### 单卡片 (pm-card)

嵌入单个实体卡片：

```markdown
```pm-card
id: feat-001
```
```

级联展示（显示层级结构）：

```markdown
```pm-card
id: ver-001
expanded: true
maxProjects: 5
maxFeaturesPerProject: 3
```
```

### 实体选择器 (pm-selector)

```markdown
```pm-selector
type: version
defaultId: ver-001
```
```

```markdown
```pm-selector
type: project
```
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

## 📎 依赖

- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) - 用于总览页面的统计和列表展示

## 💻 兼容性

- Obsidian v0.15.0+
- 仅支持桌面端

## 📜 版本历史

### v0.3.0 (2026-04-05)

- 新增统一视图引擎 `pm-view`，支持 8 种视图模式
- 新增 `card` 单卡片视图模式
- 新增 `cascade-selector` 级联选择器模式
- 旧代码块（pm-grid, pm-card, pm-kanban, pm-selector）内部统一映射到 ViewEngine
- 删除冗余 UI 类，简化架构
- 代码块文字"导出日历"改为"导出ICS"

### v0.2.0 (2026-04-03)

- 新增级联卡片功能（`pm-card` + `expanded: true`）
- 新增实体选择器（`pm-selector` 代码块）
- 级联卡片支持最新进展自动提取
- 级联卡片头部支持点击跳转
- 总览页面重构，简化信息展示
- 即将到期和延期特性标记

### v0.1.0 (2026-04-02)

- 初始版本
- 支持版本、项目、特性三层管理
- 看板视图（支持点击跳转）
- 独立卡片代码块 `pm-card`
- 面包屑导航
- ICS 日历导出
- 双层架构重构（Core + UI）

## 📄 许可证

MIT License

## 👤 作者

skybcyang
