# pm-grid 代码块使用指南

`pm-grid` 是 Project Manager 插件新增的代码块类型，用于在 Markdown 中渲染实体卡片网格布局。

## 基础用法

### 显示所有特性（默认 3 列）

```markdown
```pm-grid
```
```

### 显示指定类型的实体

```markdown
```pm-grid
type: version
```
```

```markdown
```pm-grid
type: project
```
```

```markdown
```pm-grid
type: feature
```
```

## 布局配置

### 指定列数（1-4）

```markdown
```pm-grid
type: feature
cols: 4
```
```

### 限制显示数量

```markdown
```pm-grid
type: feature
limit: 10
```
```

## 过滤功能

### 按状态过滤

```markdown
```pm-grid
type: feature
filter:
  status: in-progress
```
```

### 按优先级过滤

```markdown
```pm-grid
type: feature
filter:
  priority: high
```
```

### 按负责人过滤

```markdown
```pm-grid
type: feature
filter:
  owner: 张三
```
```

### 按标签过滤

```markdown
```pm-grid
type: feature
filter:
  tag: 紧急
```
```

### 组合过滤

```markdown
```pm-grid
type: feature
filter:
  status: in-progress
  priority: high
  owner: 张三
```
```

### 按版本/项目过滤

```markdown
```pm-grid
type: project
filter:
  versionId: ver-001
```
```

```markdown
```pm-grid
type: feature
filter:
  projectId: proj-001
```
```

## 排序功能

### 按名称排序

```markdown
```pm-grid
type: feature
sortBy: name
sortOrder: asc
```
```

### 按截止日期排序（特性有效）

```markdown
```pm-grid
type: feature
sortBy: dueDate
sortOrder: desc
```
```

### 按优先级排序

```markdown
```pm-grid
type: feature
sortBy: priority
sortOrder: asc
```
```

### 按进度排序（特性有效）

```markdown
```pm-grid
type: feature
sortBy: progress
sortOrder: desc
```
```

### 按创建时间排序

```markdown
```pm-grid
type: feature
sortBy: created
sortOrder: desc
```
```

## 完整示例

### 项目仪表盘：显示高优先级进行中的特性

```markdown
# 我的项目仪表盘

## 高优先级任务

```pm-grid
type: feature
filter:
  status: in-progress
  priority: high
sortBy: dueDate
sortOrder: asc
limit: 6
```

## 项目概览

```pm-grid
type: project
cols: 4
sortBy: priority
```

## 版本时间线

```pm-grid
type: version
cols: 2
sortBy: created
sortOrder: desc
```
```

## 与现有功能的对比

| 功能 | 适用场景 |
|-----|---------|
| `pm-kanban` | 按状态分组的看板视图，适合拖拽管理工作流 |
| `pm-card` | 渲染单个实体卡片，适合详情页嵌入 |
| `pm-selector` | 带搜索和筛选的实体选择器，适合快速查找 |
| `pm-grid` | 网格布局展示多个卡片，适合概览和仪表盘 |

## 注意事项

1. **数据自动同步**：网格中的卡片数据来自 ProjectManager 的实体文件，会自动同步更新
2. **点击跳转**：点击卡片会直接打开对应的实体文件
3. **响应式布局**：网格会自动适应不同屏幕宽度
4. **空状态处理**：当过滤条件没有匹配结果时，会显示友好的空状态提示
