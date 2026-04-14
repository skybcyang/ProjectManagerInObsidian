# Dataview 集成示例

> 本文档展示如何使用 Dataview 查询 Project Manager 数据

---

## 基础查询

### 1. 列出所有版本

```dataview
TABLE status, startDate, endDate, owner
FROM "ProjectManager/Versions"
SORT startDate DESC
```

### 2. 列出进行中的项目

```dataview
TABLE versionId, status, priority, owner, endDate
FROM "ProjectManager/Projects"
WHERE status = "in-progress"
SORT priority ASC
```

### 3. 列出高优先级特性

```dataview
TABLE projectId, status, progress, owner
FROM "ProjectManager/Features"
WHERE priority = "critical"
SORT progress DESC
```

---

## 使用自定义函数

### 4. 计算项目进度

使用 `pmProjectProgress()` 函数自动计算项目进度（基于特性完成情况）：

```dataview
TABLE
  status,
  priority,
  pmProjectProgress(id) AS "进度%",
  owner
FROM "ProjectManager/Projects"
SORT pmProjectProgress(id) DESC
```

### 5. 计算版本进度

```dataview
TABLE
  status,
  startDate,
  endDate,
  pmVersionProgress(id) AS "进度%",
  owner
FROM "ProjectManager/Versions"
SORT pmVersionProgress(id) DESC
```

### 6. 获取版本下的项目

使用 `pmVersionProjects()` 函数在 DataviewJS 中查询：

```dataviewjs
const versionId = "ver-001"; // 替换为实际版本ID
const projects = dv.pages('"ProjectManager/Projects"')
  .filter(p => p.versionId === versionId);

dv.table(
  ["项目", "状态", "优先级"],
  projects.map(p => [p.name, p.status, p.priority])
);
```

---

## 高级查询

### 7. 逾期项目/特性

使用 `pmOverdueItems()` 函数：

```dataview
TABLE status, endDate, owner
FROM "ProjectManager/Features"
WHERE endDate < date(today) AND status != "completed"
SORT endDate ASC
```

### 8. 本周截止的特性

```dataview
TABLE projectId, status, progress, owner, endDate
FROM "ProjectManager/Features"
WHERE endDate >= date(today) AND endDate <= date(today) + dur(7 days)
SORT endDate ASC
```

### 9. 按负责人统计工作量

```dataviewjs
const features = dv.pages('"ProjectManager/Features"')
  .where(f => f.owner);

const workload = {};
features.forEach(f => {
  const owner = f.owner;
  if (!workload[owner]) {
    workload[owner] = { count: 0, totalProgress: 0 };
  }
  workload[owner].count++;
  workload[owner].totalProgress += f.progress || 0;
});

const rows = Object.entries(workload).map(([owner, data]) => [
  owner,
  data.count,
  Math.round(data.totalProgress / data.count) + "%"
]);

dv.table(["负责人", "特性数", "平均进度"], rows);
```

---

## 项目看板（按状态分组）

### 10. 项目状态分布

```dataviewjs
const projects = dv.pages('"ProjectManager/Projects"');

const byStatus = {};
projects.forEach(p => {
  const status = p.status || "unknown";
  if (!byStatus[status]) byStatus[status] = [];
  byStatus[status].push(p);
});

for (const [status, items] of Object.entries(byStatus)) {
  dv.header(3, status.toUpperCase());
  dv.list(items.map(p => p.file.link));
}
```

---

## 使用说明

### 可用的自定义函数

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `pmVersionProjects` | `versionId: string` | Project[] | 获取版本下的项目 |
| `pmProjectFeatures` | `projectId: string` | Feature[] | 获取项目下的特性 |
| `pmVersionProgress` | `versionId: string` | number | 计算版本进度 0-100 |
| `pmProjectProgress` | `projectId: string` | number | 计算项目进度 0-100 |
| `pmEntityStatus` | `id: string` | string | 获取实体状态 |
| `pmOverdueItems` | `type?: string` | Entity[] | 获取逾期项目/特性 |

### 注意事项

1. **Dataview 插件**: 需要安装并启用 Dataview 插件才能使用上述功能
2. **性能**: 使用 Dataview 索引查询比手动遍历文件更快
3. **降级**: 如果 Dataview 未安装，Project Manager 会自动回退到手动遍历

---

*生成时间: `=date(today)`*
