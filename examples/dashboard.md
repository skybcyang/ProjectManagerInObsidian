---
pm-dashboard: true
---

# 📊 项目管理总览

> 使用 pm-view 统一视图组件的仪表板示例

---

## 🚀 快速操作

- [创建版本](#)
- [创建项目](#)
- [创建特性](#)

---

## 📦 版本概览

```pm-view
mode: grid
type: version
cols: 2
title: 版本列表
```

---

## 📁 项目概览

```pm-view
mode: grid
type: project
cols: 2
title: 项目列表
```

---

## 📋 特性状态看板

```pm-view
mode: kanban
type: feature
groupBy: status
title: 特性开发状态
```

---

## 📅 开发时间线

```pm-view
mode: timeline
type: feature
sortBy: dueDate
title: 近期截止日期
```

---

## 🗓️ 任务日历

```pm-view
mode: calendar
type: feature
title: 特性截止日期
```
