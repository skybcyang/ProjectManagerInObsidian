# 版本迭代记录

## v0.7.3 (2026-04-12)

### 修复

- **全屏视图交互失效** - 修复全屏模式下所有交互失效的问题
  - `ViewEngine.ts`：移除 `cloneNode(true)` 方式实现全屏（克隆的节点丢失事件监听器）
  - 改用 CSS 类方式：`pm-view-fullscreen` 类 + 移动 DOM 到 body
  - 退出全屏时恢复 DOM 到原始位置
  - 修复以下5个问题：
    1. 看板渲染重叠
    2. 视图切换失效
    3. 筛选/排序/属性下拉栏点击无响应
    4. FilterBar 下拉栏无响应
    5. 卡片点击不跳转

---

## v0.7.2 (2026-04-12)

### 修复

- **看板/列表/网格视图点击无法跳转** - 修复实体类型检测逻辑
  - `types.ts`：`getEntityType()` 函数优先检查 `projectId`（特性同时有 projectId 和 versionId）
  - 避免特性被错误识别为项目，导致跳转失败

- **燃尽图/工作量统计无数据** - 修复 EntityCache 字段解析
  - `EntityCache.ts`：`parseFeatureFile()` 添加 `estimatedHours` 和 `actualHours` 字段解析
  - 燃尽图和工作量视图现在能正确读取工时数据

### 优化

- **燃尽图/工作量统计样式** - 优化统计卡片 CSS 样式
  - `styles.css`：添加 `.pm-burndown-stats`、`.pm-stat-card`、`.pm-workload-summary` 等样式
  - 统计卡片风格与其他视图保持一致

### 新增

- **示例数据** - 新增交错分配的示例特性文件
  - 在 `ProjectManager/Features/` 创建 8 个示例文件
  - 不同负责人和项目交错分配，便于测试工作量统计分组功能

---

## v0.7.1 (2026-04-11)

### 新增

- **燃尽图视图** (`mode: burndown`) - 跟踪项目进度趋势
  - 展示计划进度 vs 实际进度
  - 支持按版本/项目筛选
  - 自动计算完成率趋势

- **工作量统计视图** (`mode: workload`) - 工作量分布分析
  - 按负责人统计任务分布
  - 展示预估工时 vs 实际工时
  - 计算工作效率指标

### 重构

- **CodeBlockConfigService** - 提取代码块配置服务
  - 统一处理代码块配置的保存和读取
  - 简化 ViewEngine 和 FilterBar 的代码
  - 删除重复代码约 70 行

### 优化

- **FilterBar 负责人列表性能** - 使用缓存索引，查询性能提升 10x
  - EntityCache 添加 ownerIndex Set 索引
  - O(n) 扫描改为 O(1) 查询

### 修复

- **内存泄漏问题** - 修复多个组件的事件监听未清理问题
  - ViewEngine: 清理全屏键盘监听、遮罩元素、防抖定时器
  - FilterBar: 添加 destroy() 方法清理事件监听
  - main.ts: 在 onunload() 中调用 viewEngine.destroy()

- **FilterBar entityType 同步问题** - 修复筛选栏与配置不同步
  - `FilterBar.ts` 第 76-80 行：同步 `initialFilters.entityType` 到 `currentEntityType`
  - 确保代码块配置 `entityType: project` 时，筛选栏正确显示"📂 项目"

- **看板/列表/网格/级联/时间视图点击无法跳转** - 修复异步事件处理
  - `ActionService.ts` 第 218-227 行：添加错误日志和 `getLeaf('tab')` 确保在新标签页打开
  - `KanbanRenderer.ts`、`GridRenderer.ts`、`ListRenderer.ts`、`CascadeRenderer.ts` (3处)、`TimelineRenderer.ts`、`TimeViewRenderer.ts` (5处)
  - 将所有点击事件回调从 `() => { this.actionService.openEntity(...) }` 改为 `async () => { await this.actionService.openEntity(...) }`

---

## v0.7.0 (2026-04-10)

### ⚠️ 重大变更

- **删除 IPD 流程支持** - 完全移除 TR 里程碑管理系统（TR3→TR4→TR4A→TR5→TR6）
  - 删除版本中的 `phase`、`trCheckpoints`、`targetDate` 字段
  - 删除特性中的 `trPhase` 字段
  - 删除 `mode: roadmap` 和 `mode: tr-milestone` 视图
  - 删除 TRMilestoneRenderer、RoadmapRenderer
  - 删除所有 IPD 相关常量和类型定义

### 新增

- **项目日期字段** - 项目类型新增 `startDate` 和 `endDate` 字段
  - 创建项目模态框支持设置开始/结束日期
  - 项目模板支持日期变量渲染
  - 与版本、特性保持一致的日期体系

- **FilterBar 统一风格** - 所有筛选器使用 SelectCell 风格
  - 实体类型选择器：彩色 badge（版本紫/项目蓝/特性绿）
  - 状态选择器：对应状态颜色的 badge
  - 优先级选择器：对应优先级颜色的 badge
  - 负责人选择器：紫色 badge
  - 树形层级选择器：保持 EntityTreeSelector 风格
  - 移除下拉框前的文字标签

- **isMilestone 字段** - 特性类型新增里程碑标记字段

### 优化

- **日期字段统一** - 所有实体类型统一使用 `startDate` 和 `endDate`
  - 特性类型：`dueDate` 改为 `endDate`
  - 版本类型：保持 `startDate` 和 `endDate`
  - 项目类型：新增 `startDate` 和 `endDate`

- **FilterBar 简化** - 用树形层级选择器替代三个独立下拉框
  - 版本、项目、特性筛选合并为统一的树形勾选组件
  - 支持展开/折叠层级
  - 勾选父级自动勾选所有子级

- **看板视图优化** - 删除列底部的 "+ 新建特性" 按钮

### 修复

- 修复 KanbanRenderer 中的 IPD 依赖问题
- 修复 FilterBar 类型定义问题
- 修复项目模板字段缺失问题

### 技术改进

- 删除 `src/constants/ipd.ts` 及相关导出
- 删除 `src/view-engine/renderers/TRMilestoneRenderer.ts`
- 删除 `src/view-engine/renderers/RoadmapRenderer.ts`
- 简化 EntityCache 中的版本解析逻辑
- 统一 SelectCell 风格的组件实现

---

## v0.6.0 (2026-04-08)

### 新增
- **IPD 流程支持** - 完整的 TR 里程碑管理（TR3→TR4→TR4A→TR5→TR6）
- **路线图视图** - 新增 `mode: roadmap` 视图，可视化展示 TR 里程碑和项目/特性时间线
- **TR 检查点** - 每个版本自动创建 5 个 TR 检查点，支持状态、计划日期、实际日期、交付物、风险管理
- **版本右键菜单** - 快速推进阶段、设置 TR 日期、查看交付件清单
- **模板变量嵌套支持** - 支持 `{{tr3.status}}` 格式的嵌套属性访问

### 优化
- **面包屑导航修复** - 修复面包屑出现在 pm-view 表格内部的问题
- **版本模板优化** - TR 里程碑表格改为硬编码 5 行，避免嵌套循环渲染问题
- **交付物管理** - 每个 TR 阶段预置默认交付物清单，支持自定义

### 技术改进
- 模板渲染引擎支持点号分隔的嵌套属性访问
- 面包屑渲染增加容器校验，防止插入到代码块内部

---

## v0.5.1 (2026-04-07)

### 修复
- 模板渲染问题修复

---

## v0.5.0 (2026-04-07)

### 新增
- 自定义模板系统，支持总览/版本/项目/特性页面模板
- 模板设置页面，支持编辑/预览/重置模板
- 模板变量语法（`{{variable}}`、`{{#if}}`、`{{#each}}`）
- 模板导出到文件功能

### 变更
- **移除**：单卡片视图模式（`mode: card`）
- 设置持久化改为使用 Obsidian data.json（替代 localStorage）

---

## v0.4.0 (2026-04-06)

### 新增
- 统一视图引擎 `pm-view`，支持 6 种视图模式 (kanban/list/cascade/timeline/timeview/roadmap)
- `cascade-selector` 级联选择器模式

### 优化
- 删除冗余 UI 类，简化架构
- 代码块文字"导出日历"改为"导出ICS"

---

## v0.3.0 (2026-04-05)

### 新增
- 级联卡片支持最新进展自动提取
- 级联卡片头部支持点击跳转

### 优化
- 总览页面重构，简化信息展示
- 即将到期和延期特性标记

---

## v0.2.0 (2026-04-03)

### 新增
- 实体选择器（`pm-selector` 代码块）
- IPD 里程碑（5个阶段：概念→计划→开发→验证→发布）
- 日期选择器（日历 + 快捷按钮）

### 优化
- 总览页面重构，简化信息展示
- 即将到期和延期特性标记

---

## v0.1.0 (2026-04-02)

### 新增
- 支持版本、项目、特性三层管理
- 看板视图（支持点击跳转）
- 面包屑导航
- ICS 日历导出
- 双层架构重构（Core + UI）
