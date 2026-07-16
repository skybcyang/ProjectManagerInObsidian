# Project Manager for Obsidian

在 Obsidian 中进行项目管理，支持版本、项目、特性三层结构化管理，提供看板视图、级联视图、时间视图三种可视化方式。

## ✨ 功能特性

### 核心功能
- 📦 **版本管理** - 规划和管理产品版本迭代，支持开始/结束日期
- 📁 **项目管理** - 组织和管理项目，必须关联版本，支持开始/结束日期
- ✨ **特性管理** - 跟踪特性开发进度，支持优先级、进度、里程碑标记

### 视图系统
- 📊 **看板视图** (`mode: kanban`) - 按状态/优先级分组展示
- 🌲 **级联视图** (`mode: cascade`) - 版本→项目→特性的层级展示，支持进展/风险详情
- 🗓️ **时间视图** (`mode: timeview`) - 甘特图形式，支持按负责人/项目分组，可展开子特性

### 交互特性
- 🔗 **级联展示** - 展示版本→项目→特性的完整层级结构和实时状态
- 🧭 **面包屑导航** - 层级导航，支持点击穿透
- 🎯 **统一筛选栏** - SelectCell 风格的筛选器，支持树形层级选择
- 📅 **ICS导出** - 导出特性时间到 .ics 文件
- 📝 **自定义模板** - 支持自定义总览/版本/项目/特性的页面模板

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
| `cascade` | 级联视图 | `mode: cascade`<br>`type: version`<br>`expanded: true` |
| `timeview` | 时间视图 | `mode: timeview`<br>`type: feature` |

### 通用配置参数

```yaml
mode: kanban          # 视图模式（必填）
type: feature         # 实体类型：version/project/feature
version: ver-001      # 筛选特定版本
project: proj-001     # 筛选特定项目
status: in-progress   # 按状态筛选
priority: high        # 按优先级筛选
owner: 张三           # 按负责人筛选
groupBy: status       # 分组方式：status/priority/version/project
sortBy: endDate       # 排序字段
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
│  │  View    │ │  Filter  │ │Breadcrumb│ │
│  │ Engine   │ │   Bar    │ │          │ │
│  └────┬─────┘ └────┬─────┘ └────┬────┘ │
│       └─────────────┴────────────┘      │
│                   │                      │
│            EntityTreeSelector           │
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
- **UI 层** - 通过 ViewEngine 统一处理所有视图，ToolbarController 提供统一筛选

## 📝 数据格式

所有数据以 Markdown 格式存储，元数据放在 frontmatter 中：

### 版本
```yaml
---
id: ver-abc123
name: v1.0 第一季度
type: version
status: planning
owner: 张三
startDate: 2026-04-01
endDate: 2026-06-30
tags:
  - 重要
  - 移动端
---
```

### 项目
```yaml
---
id: proj-abc123
name: 官网重构
type: project
versionId: ver-abc123
status: in-progress
priority: high
owner: 李四
startDate: 2026-04-01
endDate: 2026-05-15
tags:
  - 前端
  - UI
---
```

### 特性
```yaml
---
id: feat-abc123
name: 登录功能优化
type: feature
versionId: ver-abc123
projectId: proj-abc123
status: in-progress
priority: critical
progress: 65
owner: 王五
startDate: 2026-04-01
endDate: 2026-04-15
isMilestone: false
tags:
  - 后端
  - 安全
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
{{/if}}{{#if startDate}}startDate: {{startDate}}
{{/if}}{{#if endDate}}endDate: {{endDate}}
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
- `{{versionId}}`, `{{owner}}`, `{{priority}}`, `{{startDate}}`, `{{endDate}}`, `{{tags}}`

**特性模板：**
- `{{versionId}}`, `{{projectId}}`, `{{owner}}`, `{{priority}}`, `{{progress}}`, `{{startDate}}`, `{{endDate}}`, `{{isMilestone}}`, `{{tags}}`

**总览模板：**
- `{{date}}`

#### 条件语法

```markdown
{{#if owner}}负责人: {{owner}}{{/if}}
{{#if startDate}}开始日期: {{startDate}}{{/if}}
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

### v0.8.4 (2026-07-16)

- **新增**：需求（Requirement）实体正式上线，支持自由需求与项目/特性可选关联
- **新增**：总览/版本/项目默认模板新增「需求看板」，支持按状态/优先级分组
- **新增**：创建需求模态框，修复总览页面「创建需求」按钮无响应问题
- **优化**：精简需求默认模板，仅保留描述、进展反馈、备注等核心字段
- **测试**：新增需求实体相关单元/集成测试，覆盖率达 100 个用例

### v0.8.1 (2026-06-20)

- **⚠️ 重大变更**：移除列表视图和 workload 工作量统计视图，统一使用级联视图展示信息
- **新增**：级联视图整合原列表视图的信息密度，支持进展/风险详情面板
- **优化**：统一使用三种视图模式：`kanban` / `cascade` / `timeview`

### v0.7.1 (2026-04-11)

- **重构**：提取 `CodeBlockConfigService` 统一处理代码块配置
- **优化**：`FilterBar` 负责人列表使用缓存索引，性能提升 10x
- **修复**：内存泄漏问题（事件监听未清理）

### v0.7.0 (2026-04-10)

- **⚠️ 重大变更**：删除 IPD 流程支持（TR 里程碑管理系统）
- **新增**：项目类型支持 `startDate` 和 `endDate` 字段
- **新增**：FilterBar 统一使用 SelectCell 风格
- **新增**：特性类型新增 `isMilestone` 里程碑标记
- **优化**：所有实体统一使用 `startDate`/`endDate` 日期字段
- **优化**：用树形层级选择器替代三个独立下拉框

查看完整 [CHANGELOG](./docs/CHANGELOG.md)

## 📄 许可证

MIT License

## 👤 作者

skybcyang
