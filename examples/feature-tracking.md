# ✨ 特性开发追踪

> 特性维度的追踪示例

---

## 全部特性网格

```pm-view
mode: grid
type: feature
cols: 3
sortBy: priority
sortOrder: desc
title: 全部特性
```

---

## 状态看板

```pm-view
mode: kanban
type: feature
groupBy: status
title: 特性状态分布
```

---

## 紧急任务

```pm-view
mode: grid
type: feature
filter:
  priority: critical
cols: 2
title: 🔴 紧急任务
```

---

## 即将到期

```pm-view
mode: timeline
type: feature
sortBy: dueDate
sortOrder: asc
limit: 10
title: ⏰ 即将到期的任务
```

---

## 截止日期日历

```pm-view
mode: calendar
type: feature
title: 特性截止日期
```

---

## 按优先级分组

```pm-view
mode: kanban
type: feature
groupBy: priority
title: 按优先级分组
```
