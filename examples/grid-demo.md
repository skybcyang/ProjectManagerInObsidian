---
pm-dashboard: true
---

# 📊 pm-grid 网格布局演示

> 本页面展示了 Project Manager 的 `pm-grid` 代码块功能

💡 **提示**: 请先安装示例数据，否则页面会显示为空。

---

## 📦 安装示例数据

### 方式一：使用安装脚本（推荐）

```bash
cd ProjectManagerInObsidian/project-manager/examples/sample-data
./install.sh ~/Documents/你的笔记库
```

### 方式二：手动复制

将 `sample-data/ProjectManager` 目录复制到你的 Obsidian 笔记库根目录。

---

## 1️⃣ 基础特性网格（默认 3 列）

显示所有特性（20个）：

```pm-grid
type: feature
```

---

## 2️⃣ 版本概览（2 列）

```pm-grid
type: version
cols: 2
```

---

## 3️⃣ 项目网格（4 列）

```pm-grid
type: project
cols: 4
```

---

## 4️⃣ 高优先级进行中的特性

```pm-grid
type: feature
filter:
  status: in-progress
  priority: high
sortBy: dueDate
sortOrder: asc
```

---

## 5️⃣ 紧急标签的特性

```pm-grid
type: feature
filter:
  tag: 紧急
cols: 2
```

---

## 6️⃣ 按进度排序（前 6 个）

```pm-grid
type: feature
sortBy: progress
sortOrder: desc
limit: 6
cols: 3
```

---

## 7️⃣ 指定版本的项目（ver-001）

```pm-grid
type: project
filter:
  versionId: ver-001
cols: 3
```

---

## 8️⃣ 指定项目的特性（proj-003）

```pm-grid
type: feature
filter:
  projectId: proj-003
cols: 2
```

---

## 9️⃣ 低优先级任务（单列表）

```pm-grid
type: feature
filter:
  priority: low
cols: 1
limit: 5
```

---

## 🔟 已完成特性

```pm-grid
type: feature
filter:
  status: completed
sortBy: name
cols: 4
```

---

## ⏸️ 待办特性

```pm-grid
type: feature
filter:
  status: todo
sortBy: priority
cols: 2
```

---

## 🧪 测试中特性

```pm-grid
type: feature
filter:
  status: testing
cols: 2
```

---

## 📋 使用说明

### 基础语法

```yaml
type: feature      # 实体类型：version/project/feature
cols: 3            # 列数：1-4（默认 3）
limit: 10          # 最多显示数量（可选）
```

### 过滤参数

```yaml
filter:
  status: in-progress      # 状态过滤
  priority: high           # 优先级过滤
  owner: 张三               # 负责人过滤
  tag: 紧急                 # 标签过滤
  versionId: ver-001       # 版本 ID 过滤
  projectId: proj-001      # 项目 ID 过滤
```

### 排序参数

```yaml
sortBy: name       # 排序字段：name/dueDate/priority/progress/created
sortOrder: asc     # 排序方向：asc/desc
```

---

## 📊 示例数据统计

| 类型 | 数量 | 说明 |
|-----|------|------|
| 版本 | 4 | 已完成、进行中、规划中各阶段 |
| 项目 | 8 | 不同版本、不同状态、不同优先级 |
| 特性 | 20 | 包含各种状态、优先级、标签、进度 |

### 特性状态分布
- ✅ completed: 6 个
- 🔄 in-progress: 5 个
- 📝 todo: 4 个
- 🧪 testing: 1 个
- 📋 backlog: 4 个

### 特性优先级分布
- 🔴 critical: 5 个
- 🟠 high: 7 个
- 🔵 medium: 5 个
- 🟢 low: 3 个

### 标签分布
- 紧急、架构、核心业务、UI、数据、报表、性能、安全、功能、工具等

---

*Powered by Project Manager Plugin*
