# 📁 项目开发看板

> 项目维度的看板示例

---

## 特定项目详情

```pm-view
mode: cascade
type: project
id: proj-001
title: 用户认证系统详情
```

---

## 项目特性看板

```pm-view
mode: kanban
type: feature
filter:
  projectId: proj-001
groupBy: status
title: 用户认证 - 特性状态
```

---

## 项目特性网格

```pm-view
mode: grid
type: feature
filter:
  projectId: proj-001
cols: 2
title: 用户认证 - 特性列表
```

---

## 跨项目进行中特性

```pm-view
mode: kanban
type: feature
filter:
  status: in-progress
groupBy: project
title: 各项目进行中特性
```
