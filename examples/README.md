# pm-view 示例集

本目录包含 `pm-view` 统一视图组件的各种使用示例。

## 文件说明

| 文件 | 说明 |
|------|------|
| `dashboard.md` | 仪表板总览示例 |
| `version-tracking.md` | 版本进度追踪示例 |
| `project-kanban.md` | 项目看板示例 |
| `feature-tracking.md` | 特性追踪示例 |

## 快速开始

复制以下代码块到你的 Obsidian 笔记中：

### 网格视图

```pm-view
mode: grid
type: feature
cols: 3
```

### 看板视图

```pm-view
mode: kanban
type: feature
groupBy: status
```

### 级联视图

```pm-view
mode: cascade
type: version
```

## 完整配置参考

```yaml
mode: grid          # 必需: kanban | grid | cascade | timeline | calendar
type: feature       # 可选: version | project | feature (默认: feature)
id: ver-001         # 可选: 特定实体ID（用于级联视图）
title: 我的视图     # 可选: 自定义标题

# 过滤条件
filter:
  status: in-progress      # 状态过滤
  priority: high           # 优先级过滤
  owner: 张三             # 负责人过滤
  tag: 前端               # 标签过滤
  versionId: ver-001      # 版本ID过滤
  projectId: proj-001     # 项目ID过滤

# 排序
sortBy: dueDate     # 排序字段: name | dueDate | priority | progress | created
sortOrder: asc      # 排序顺序: asc | desc

# 限制数量
limit: 10           # 最大显示数量

# 网格特有
cols: 3             # 列数: 1 | 2 | 3 | 4

# 看板特有
groupBy: status     # 分组方式: status | priority | version | project

# 级联特有
expanded: true      # 是否默认展开

# 时间线特有
direction: horizontal  # 方向: horizontal | vertical
```
