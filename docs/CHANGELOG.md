# 版本迭代记录

## v0.8.2 (2026-07-14)

### 设计原则

- **视图只读化**
  - 明确 `pm-view` 代码块为只读视图，仅用于信息展示与导航
  - 视图内不再支持拖拽改状态、卡片内快捷编辑、添加风险/进展等修改操作
  - 所有数据变更通过点击卡片跳转到对应 Markdown 文件进行编辑
  - 更新 `docs/核心设计原则.md`、`docs/视图系统详细设计.md`、`CLAUDE.md`

### 重大变更

- **看板视图移除拖拽与编辑交互**
  - `KanbanRenderer` 删除 `setupDropZone` 拖拽改状态逻辑
  - 删除快速创建特性模态框入口
  - 卡片仅保留点击跳转，不再渲染操作按钮和拖拽属性

### 改进

- **Storybook 示例与真实代码同步**
  - 新增 `src/stories/utils.ts` 提供基于真实 Renderer 的渲染辅助函数
  - `KanbanView.stories.ts`、`CascadeView.stories.ts`、`TimeView.stories.ts` 改用真实渲染器
  - 移除 `TimeView.stories.ts` 中不存在的 `quarter` 粒度
  - `EntityCard.stories.ts` 看板卡片示例改为只读模式

- **时间视图状态持久化**
  - 移除 `TimeViewRenderer` 中全局共享的 `static sharedState`，消除多代码块状态污染
  - `ViewConfig` 新增 `timeViewMode`、`timeGroupBy`、`timeViewDate`、`collapsedGroups` 字段
  - 粒度、分组、日期导航、分组展开/折叠状态均持久化到 YAML 代码块
  - `PropertyPanelController` 增加时间视图默认粒度和默认分组配置项
  - `ConfigValidator` 增加时间视图相关字段校验

- **统一加载状态**
  - `BaseRenderer` 新增 `showLoading()` 和 `saveConfig()` 能力
  - `ViewEngine` 向渲染器注入配置保存回调
  - `KanbanRenderer`、`CascadeRenderer`、`TimeViewRenderer` 在数据准备前统一显示加载状态

---

## v0.8.1 (2026-06-20)

### 重大变更

- **移除列表视图，统一使用级联视图**
  - 删除 `ListRenderer.ts` 和 `ListView.stories.ts`
  - 从 `ViewMode`、`VIEW_MODE_LABELS` 中移除 `list`
  - 从 `RendererRegistry` 中注销 `list` 渲染器
  - 移除 `LIST_COLUMN_DEFINITIONS`、`ListColumnField` 及 `ViewConfig.listColumns` 配置项
  - 清理 `PropertyPanelController` 中的列表列选择器
  - 清理 `ConfigValidator` 中关于 `listColumns` 的验证逻辑
  - 清理 `styles.css` 中只用于列表视图的专有样式

- **移除工作量统计视图**
  - 删除 `WorkloadRenderer.ts` 和 `WorkloadView.stories.ts`
  - 从 `ViewMode`、`VIEW_MODE_LABELS` 中移除 `workload`
  - 从 `RendererRegistry` 中注销 `workload` 渲染器
  - 清理 `PropertyPanelController` 中工作量视图相关配置
  - 清理 `styles.css` 中只用于工作量视图的专有样式
  - `ReportService` 保留工作量计算能力，继续为邮件摘要服务提供数据

### 改进

- **级联视图信息密度增强**
  - 版本头部新增状态徽章、负责人、起止日期、逾期提示、风险数量
  - 项目卡片默认显示开始/结束日期、预估/实际人天、标签、风险徽章、最新进展摘要
  - 特性行改造为类列表卡片紧凑布局，展示优先级、状态、进度、起止日期、负责人、预估/实际人天、标签、风险
  - 版本/项目/特性均支持展开/收起详情面板，展示最近一条进展与最近一条未关闭风险

- **提取共享字段渲染方法**
  - `BaseRenderer` 新增 `renderStatusBadge`、`renderPriorityBadge`、`renderProgressBar`、`renderTags`、`renderDate`、`renderDays`、`renderDetailPanel`
  - `EntityCard` 新增 `showEstimatedDays`/`showActualDays` 选项
  - 统一状态/优先级徽章、进度条、标签、日期、人天的渲染风格

---

## v0.8.0 (2026-06-06)

### 重大变更

- **合并时间线视图与时间视图**
  - 删除 `TimelineRenderer`（时间线视图）和 `TimelineView.stories.ts`
  - 完全重写 `TimeViewRenderer`，统一为甘特图形态
  - 支持按 **负责人** 或 **项目** 分组，分组行可展开/折叠，默认全部展开
  - 支持四种时间粒度：**周视图 / 月视图 / 年度视图 / 全部时间**
  - 时间轴采用百分比定位，优先级颜色决定条形颜色
  - 进度通过未完成部分叠加暗色遮罩表示，文字始终白色清晰可读
  - 工具栏"今天"按钮文案跟随粒度变化：本周/本月/本年度/全部
  - 跨年度视图自动显示 `YYYY年M月` 格式刻度

- **删除燃尽图视图**
  - 移除 `BurndownRenderer`、相关 stories、样式和报表服务

### 改进

- **看板卡片简化与丰富**
  - 移除卡片悬停时的流转/进度反馈/跳转小图标，点击卡片本身即可跳转
  - 默认展示字段增加 `endDate`（截止日期）、`tags`（标签）、`risk`（风险徽章）

---

## v0.7.7 (2026-04-16)

### 重构

- **统一实体卡片渲染**
  - 所有视图（Kanban、Cascade）统一使用 `EntityCard` 组件渲染卡片
  - `BaseRenderer` 新增 `buildCardOptions()` 方法，将 `cardFields` 配置映射为 `EntityCardOptions`
  - `EntityCard` 新增 `showStartDate` 支持，补全属性面板勾选字段
  - 清理旧的 Kanban/Cascade 硬编码卡片 DOM 和冗余 CSS

- **删除 GridRenderer 与 FilterBar 内联组件**
  - 移除 `GridRenderer` 及 `GridView.stories.ts`
  - 移除内联 `FilterBar` 组件，筛选逻辑完全由 `ToolbarController` + `EntityTreeSelector` 接管
  - 简化视图渲染器职责，消除重复代码

- **ToolbarController 重构**
  - 统一工具栏渲染：视图切换、排序、筛选、属性面板、全屏
  - 删除 `ListRenderer` 内联排序 UI，列表视图统一使用工具栏排序

### 新增

- **风险管理服务**
  - 新增 `RiskService`：统一的风险 CRUD 操作
  - 新增 `RiskParser`：从 Markdown 正文解析风险表格和日志摘要
  - 新增 `LogWriterService`：自动追加进展/风险日志到实体文件
  - 新增 `AddRiskModal` / `AddProgressModal`：添加风险和进展的专用模态框
  - `EntityCard` 支持显示风险徽章和最新进展摘要

### 修复

- **TimelineRenderer 日期解析与样式覆盖**
  - `EntityCache.parseFrontmatterFromContent()` 保留 `startDate`/`endDate` 为字符串，避免 `2026-04-20` 被截断成数字
  - `TimelineRenderer` 新增 `parseDateValue()` 容错解析：支持字符串、Date、时间戳、`YYYYMMDD` 数字
  - 使用 `style.setProperty('background-color', ..., 'important')` 防止主题 CSS 覆盖条形背景色

---

## v0.7.6 (2026-04-15)

### 重构

- **删除 ListRenderer 内联排序 UI**
  - 移除 `ListRenderer` 表头内的 `<select>` 排序下拉和 ↑/↓ 按钮
  - 列表视图统一使用工具栏的 `SortMenuController` 进行排序
  - 在 `SortMenuController` 中补全「状态」排序字段，避免功能回退
  - 清理 `.pm-list-sort` 等相关废弃 CSS 样式

### 修复

- **ViewEngine 内存泄漏与闭包陷阱**
  - `renderContent()` 每次重绘前先取消旧的 `actionService.onRefresh` 订阅
  - 新增 `currentConfigs: Map<string, ViewConfig>` 保存每个代码块的最新配置
  - 所有配置变更回调（视图切换、筛选、排序、属性面板）统一读写 `currentConfigs`
  - 修复切换视图模式后再次修改筛选会导致视图 revert 的问题

- **EntityTreeSelector 与 FilterBar 状态同步**
  - `EntityTreeSelector.updateEntityType()` 清空选择后主动回调 `onSelect(null)`
  - `FilterBar` 切换实体类型时同时清空 `versions`/`projects`/`features` 数组字段
  - 避免切换实体类型后旧筛选残留导致的视图与 UI 不一致

- **燃尽图/工作量统计支持树形筛选**
  - `ReportService` 新增 `applyFeatureFilters()` 统一支持 `versions[]`/`projects[]`/`features[]`
  - `BurndownRenderer` 和 `WorkloadRenderer` 改为传入完整 `ViewConfig`
  - 燃尽图和工作量视图现在能正确响应树形下拉栏的范围筛选

- **级联视图支持树形筛选**
  - `CascadeRenderer` 重写数据加载逻辑，通过 `DataService.loadEntities()` 获取筛选后实体
  - 从筛选结果反推需要显示的版本和项目，保持三层 UI 结构不变
  - 版本头部的统计信息改为从过滤后数据计算，确保与实际渲染内容一致

---

## v0.7.5 (2026-04-14)

### 修复

- **树形筛选器级联行为修复** - 重构 `EntityTreeSelector` 三态级联逻辑
  - 新增 `getNodeState()` 替代旧 `isNodeSelected()`，支持 `checked`/`indeterminate`/`unchecked` 三态
  - 勾选子节点时父节点正确显示**半选横杠**（`indeterminate`）
  - 勾选父节点时向下级联勾选所有子节点
  - 当所有兄弟节点都被勾选时，自动向上级联勾选父节点
  - "全部" 头部复选框支持三态显示与全选/清空操作

- **树形下拉框多选保持开启** - 优化多选交互体验
  - 勾选树形节点时**不再立即关闭下拉框**
  - 选择状态仅在关闭下拉框时统一触发并保存到代码块
  - 避免频繁 `app.vault.modify()` 导致 Obsidian 重新渲染代码块、下拉框强制关闭

- **筛选清空失效修复** - 修复树形选择器全部清空后视图不更新的问题
  - `FilterBar.onFilterChange()` 中显式将 `versions`/`projects`/`features` 设为 `undefined`
  - `saveFiltersToCodeBlock()` 同步显式删除旧层级字段，确保 YAML 中残留键被清除

### 优化

- **内存管理** - `EntityTreeSelector` 新增 `destroy()` 方法，清理 dropdown DOM 和事件监听
  - `FilterBar.destroy()` 中调用 `treeSelector?.destroy()`，防止内存泄漏

---

## v0.7.4 (2026-04-13)

### Dataview 集成

- **新增 DataviewService** - 封装 Dataview API 调用
  - `src/services/DataviewService.ts`：提供查询版本/项目/特性的统一接口
  - 自动检测 Dataview 插件是否安装
  - 提供降级方案：当 Dataview 未安装时使用手动遍历

- **EntityManager 集成 Dataview**
  - 添加 `dataview` 成员变量
  - `getVersionProjects()`：使用 Dataview 查询版本下的项目
  - `getProjectFeatures()`：使用 Dataview 查询项目下的特性
  - 新增便捷方法：`getVersionProgress()`、`getProjectProgress()`、`getOverdueItems()`

- **注册自定义 Dataview 函数**
  - `src/services/DataviewFunctionRegistry.ts`：注册以下函数
    - `pmVersionProjects(versionId)` - 获取版本下的项目
    - `pmProjectFeatures(projectId)` - 获取项目下的特性
    - `pmVersionProgress(versionId)` - 计算版本进度
    - `pmProjectProgress(projectId)` - 计算项目进度
    - `pmEntityStatus(id)` - 获取实体状态
    - `pmOverdueItems(type?)` - 获取逾期项

- **manifest.json 更新**
  - 添加 Dataview 作为可选依赖

### 修复

- **修复 stories 文件类型错误**
  - 修复 `'planning'` 状态类型错误（改为 `'backlog'` 或 `'archived'`）
  - 移除不存在的 `description` 属性
  - 修复 `TimeViewProps.items` 类型定义

---

## v0.7.3 (2026-04-13)

### 代码清理与优化

- **移除调试代码** - 清理所有 `console.log` 调试语句
  - `ViewEngine.ts`：移除 9 处调试日志
  - `FilterBar.ts`：移除 4 处调试日志

- **修复类型安全问题**
  - 新增 `EntityBase` 接口（`src/types/index.ts`），定义实体共享字段
  - `ActionService.ts`：`(entity as any).status` → `(entity as EntityBase).status`
  - `ViewEngine.ts`：`NodeJS.Timeout` → `ReturnType<typeof setTimeout>`
  - 修复 4 处 `as any` 类型转换

- **统一版本号** - `package.json` 版本号与 `manifest.json` 保持一致（0.7.3）

- **删除重复样式文件** - 删除 `src/view-engine/styles.css`（内容已合并到根目录）

- **修复事件处理问题**
  - `FilterBar.ts`：移除下拉选项点击事件的 `e.stopPropagation()`
  - `SelectCell.ts`：同上，避免下拉菜单关闭异常

- **统一 CSS 变量** - 使用 `--pm-z-dropdown` 替代硬编码 z-index

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
