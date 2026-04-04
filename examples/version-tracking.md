# 📦 版本进度追踪

> 版本维度的进度追踪示例

---

## 版本级联视图

展示版本 → 项目 → 特性的层级结构：

```pm-view
mode: cascade
type: version
title: 版本规划总览
```

---

## 特定版本详情

显示指定版本的详细信息：

```pm-view
mode: cascade
type: version
id: ver-001
title: v1.0.0 进度详情
```

---

## 版本特性看板

按版本过滤的特性看板：

```pm-view
mode: kanban
type: feature
filter:
  versionId: ver-001
groupBy: status
title: v1.0.0 特性状态
```

---

## 版本截止日期时间线

```pm-view
mode: timeline
type: feature
filter:
  versionId: ver-001
sortBy: dueDate
title: v1.0.0 时间线
```
