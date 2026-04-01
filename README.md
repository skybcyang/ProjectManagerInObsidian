# Project Manager for Obsidian

在 Obsidian 中进行项目管理，支持版本、项目、特性三层结构化管理，提供看板视图、面包屑导航和日历导出功能。

## 功能特性

- 📦 **版本管理** - 规划和管理产品版本迭代
- 📁 **项目管理** - 组织和管理项目，必须关联版本
- ✨ **特性管理** - 跟踪特性开发进度，支持优先级、截止日期
- 📊 **看板视图** - 通过 `pm-kanban` 代码块展示特性状态
- 🧭 **面包屑导航** - 层级导航，支持点击穿透
- 📅 **日历导出** - 导出特性截止日期到 .ics 文件

## 安装

### 手动安装

1. 下载最新版本的 `main.js`、`manifest.json` 和 `styles.css`
2. 将它们复制到你的 Obsidian Vault 的 `.obsidian/plugins/project-manager/` 目录下
3. 在 Obsidian 设置中启用插件

### 通过 BRAT 安装

1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件
2. 添加 `skybcyang/ProjectManagerInObsidian` 到 BRAT

## 使用方法

### 初始化

1. 点击左侧边栏的 📊 图标，或执行命令"Project Manager: 打开总览页面"
2. 插件会自动创建 `ProjectManager/` 目录结构和总览页面

### 创建实体

- **创建版本** - 点击总览页面的"📦 创建版本"按钮
- **创建项目** - 点击总览页面的"📁 创建项目"按钮（需要先创建版本）
- **创建特性** - 点击总览页面的"✨ 创建特性"按钮（需要先创建项目和版本）

### 看板视图

在任意 Markdown 文件中添加以下代码块：

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

### 筛选看板

```markdown
```pm-kanban
view: all
version: xxx       # 按版本筛选
project: xxx       # 按项目筛选
owner: 张三        # 按负责人筛选
tag: 前端          # 按标签筛选
```
```

## 文件结构

插件会在你的 Vault 中创建以下结构：

```
ProjectManager/
├── 总览.md              # 总览页面，包含统计和看板
├── Versions/            # 版本文件夹
├── Projects/            # 项目文件夹
└── Features/            # 特性文件夹
```

## 数据格式

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

## 快捷键和命令

| 命令 | 说明 |
|------|------|
| 打开总览页面 | 打开项目管理总览 |
| 创建版本 | 创建新版本 |
| 创建项目 | 创建新项目 |
| 创建特性 | 创建新特性 |
| 导出截止日期到日历 | 导出 .ics 文件 |

## 右键菜单

在版本/项目/特性文件上右键：
- **变更状态** - 快速修改状态
- **快速编辑**（仅特性）- 编辑特性信息

## 依赖

- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) - 用于总览页面的统计和列表展示

## 兼容性

- Obsidian v0.15.0+
- 仅支持桌面端

## 版本历史

### v0.1.0 (2026-04-01)

- 初始版本
- 支持版本、项目、特性三层管理
- 看板视图
- 面包屑导航
- ICS 日历导出

## 许可证

MIT License

## 作者

skybcyang
