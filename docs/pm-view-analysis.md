# pm-view 与旧组件关系分析

## 一、架构演进对比

### 1.1 旧架构（分散式）

```
┌─────────────────────────────────────────────────────────────────┐
│                     main.ts 代码块处理器                          │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  pm-kanban   │   pm-grid    │   pm-card    │    pm-selector     │
│              │              │              │                    │
│ KanbanBoard  │ GridRenderer │ SingleCardR..│  EntitySelector    │
│              │              │              │                    │
├──────────────┴──────────────┴──────────────┴────────────────────┤
│  问题：各自独立的：                                              │
│  - 数据加载逻辑重复                                              │
│  - 过滤/排序实现不一致                                           │
│  - 交互操作无法复用                                              │
│  - 新增视图需要写大量重复代码                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 新架构（统一式 - view-engine）

```
┌─────────────────────────────────────────────────────────────────┐
│                    pm-view (统一入口)                             │
│                        ViewEngine                                │
│                   (配置解析 + 视图路由)                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ DataService  │  │ActionService │  │   BaseRenderer       │  │
│  │   数据服务    │  │   操作服务    │  │    (渲染基类)         │  │
│  │              │  │              │  │                      │  │
│  │ - 统一查询    │  │ - 状态变更    │  │ - 通用渲染方法        │  │
│  │ - 统一过滤    │  │ - 进度更新    │  │ - 内联操作UI          │  │
│  │ - 统一排序    │  │ - 打开文件    │  │ - 状态/进度选择器     │  │
│  │ - 统计计算    │  │ - 刷新回调    │  │ - 工具函数            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      具体渲染器实现                               │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │  Kanban  │   Grid   │ Cascade  │ Timeline │   Calendar   │  │
│  │ Renderer │ Renderer │ Renderer │ Renderer │   Renderer   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、功能映射关系

### 2.1 新旧组件对应表

| 旧组件 | 旧代码块 | 新组件 | 新模式 | 功能对比 |
|--------|----------|--------|--------|----------|
| `KanbanBoard` | `pm-kanban` | `KanbanRenderer` | `mode: kanban` | ✅ 完全替代，新增分组功能 |
| `GridRenderer` | `pm-grid` | `GridRenderer` | `mode: grid` | ✅ 完全替代，配置更统一 |
| `SingleCardRenderer` | `pm-card` | `CascadeRenderer` | `mode: cascade` | ✅ 增强替代，支持多层级 |
| `EntitySelector` | `pm-selector` | - | - | ❌ 需单独保留（交互式组件） |

### 2.2 配置对比

#### 看板视图

**旧配置 (pm-kanban)**
```yaml
view: all          # all | by-version | by-project | grid
version: ver-001   # 过滤版本
project: proj-001  # 过滤项目
owner: 张三        # 过滤负责人
tag: 前端          # 过滤标签
```

**新配置 (pm-view)**
```yaml
mode: kanban
type: feature
filter:
  versionId: ver-001
  projectId: proj-001
  owner: 张三
  tag: 前端
groupBy: status    # 新增：status | priority | version | project
```

#### 网格视图

**旧配置 (pm-grid)**
```yaml
type: feature
cols: 3
filter:
  status: in-progress
sortBy: priority
sortOrder: desc
limit: 10
```

**新配置 (pm-view)**
```yaml
mode: grid
type: feature      # 一致
cols: 3            # 一致
filter:            # 一致
  status: in-progress
sortBy: priority    # 一致
sortOrder: desc     # 一致
limit: 10          # 一致
```

#### 级联视图

**旧配置 (pm-card)**
```yaml
id: ver-001
expanded: true
maxProjects: 5
maxFeaturesPerProject: 3
```

**新配置 (pm-view)**
```yaml
mode: cascade
type: version      # 新增：可指定实体类型
id: ver-001        # 一致
expanded: true     # 一致
maxProjects: 5     # 一致
maxFeaturesPerProject: 3  # 一致
```

---

## 三、核心改进点

### 3.1 数据层统一 (DataService)

| 能力 | 旧架构 | 新架构 |
|------|--------|--------|
| 数据加载 | 各组件独立实现 | ✅ DataService 统一处理 |
| 过滤逻辑 | 实现不一致 | ✅ 统一 applyFilters |
| 排序逻辑 | 部分组件缺失 | ✅ 统一 applySort |
| 统计计算 | 各组件重复实现 | ✅ 统一 calculateStats |
| 分组功能 | 看板独有 | ✅ 所有视图可用 |

### 3.2 交互层统一 (ActionService)

| 功能 | 旧架构 | 新架构 |
|------|--------|--------|
| 打开文件 | 各组件单独实现 | ✅ 统一 openEntity |
| 状态变更 | 不支持/需打开文件 | ✅ 内联状态选择器 |
| 进度更新 | 不支持/需打开文件 | ✅ 内联进度滑块 |
| 刷新机制 | 手动刷新 | ✅ 自动刷新回调 |
| 操作确认 | 无 | ✅ 确认对话框 |

### 3.3 渲染层统一 (BaseRenderer)

| 功能 | 旧架构 | 新架构 |
|------|--------|--------|
| 工具栏 | 各组件单独实现 | ✅ 基类提供 createToolbar |
| 空状态 | 实现不一致 | ✅ 基类提供 createEmptyState |
| 错误状态 | 部分组件缺失 | ✅ 基类提供 createErrorState |
| 状态选择器 | 无 | ✅ showStatusPicker |
| 进度选择器 | 无 | ✅ showProgressPicker |
| 类型图标 | 各组件单独维护 | ✅ getEntityTypeIcon |

---

## 四、新增能力

### 4.1 全新视图模式

| 新模式 | 说明 | 对应旧组件 |
|--------|------|------------|
| `timeline` | 时间线视图（水平/垂直） | ❌ 全新功能 |
| `calendar` | 月历视图 | ❌ 全新功能 |

### 4.2 增强功能

| 功能 | 说明 |
|------|------|
| 统一分组 | `groupBy` 支持 status/priority/version/project |
| 内联编辑 | 卡片上直接修改状态和进度 |
| 配置继承 | 所有视图共享 filter/sortBy/sortOrder 配置 |
| 扩展性 | 新增视图只需添加 Renderer 类 |

---

## 五、保留的独立组件

### EntitySelector (pm-selector)

**为什么保留？**
- 它是交互式组件（下拉选择 + 动态渲染）
- 与 pm-view 的声明式渲染模式不同
- 有独特的使用场景（总览页快速切换）

**使用场景对比**
```yaml
# pm-selector - 交互式
下拉选择版本 → 动态显示该版本的级联卡片

# pm-view cascade - 声明式
直接渲染指定版本的级联结构
或渲染所有版本的级联结构
```

---

## 六、迁移建议

### 6.1 逐步迁移策略

```
阶段 1: 并行运行（当前）
├── pm-kanban → pm-view mode: kanban
├── pm-grid → pm-view mode: grid  
├── pm-card → pm-view mode: cascade
└── pm-selector 保留

阶段 2: 文档引导
├── 更新文档推荐 pm-view
├── 在示例中展示 pm-view 用法
└── 标记旧组件为 deprecated

阶段 3: 可选移除
├── 移除旧组件注册（main.ts 中注释掉）
├── 保留代码供用户自定义恢复
└── 完全迁移到 view-engine 架构
```

### 6.2 配置迁移对照表

| 场景 | 旧代码块 | 新代码块 |
|------|----------|----------|
| 特性看板 | `pm-kanban` | `pm-view` + `mode: kanban` + `type: feature` |
| 版本看板 | `pm-kanban` + `view: by-version` | `pm-view` + `mode: kanban` + `groupBy: version` |
| 网格展示 | `pm-grid` | `pm-view` + `mode: grid` |
| 单卡片 | `pm-card` + `id: xxx` | `pm-view` + `mode: cascade` + `id: xxx` |
| 级联展示 | `pm-card` + `expanded: true` | `pm-view` + `mode: cascade` |

### 6.3 代码复用分析

**可复用的旧代码：**
- `CardRegistry` - 卡片模板系统（pm-view 中仍使用）
- `EntityManager` - 数据管理（完全复用）
- 样式文件 - 大部分 CSS 类名保持一致

**需要废弃的代码：**
- `KanbanBoard.renderAll()` 等渲染逻辑 → 迁移到 `KanbanRenderer`
- `GridRenderer.applyFilters()` → 使用 `DataService`
- `SingleCardRenderer` 的级联逻辑 → 迁移到 `CascadeRenderer`

---

## 七、架构优势总结

### 7.1 开发效率
- 新增视图模式只需实现一个 Renderer 类
- 数据操作自动获得内联编辑能力
- 统一的配置解析减少重复代码

### 7.2 维护性
- 数据逻辑集中，bug 修复一处生效
- 交互逻辑统一，用户体验一致
- 样式统一管理，主题切换更容易

### 7.3 扩展性
- 支持自定义 Renderer 扩展
- 支持自定义 ViewMode 注册
- 服务层可独立测试

---

*分析日期: 2026-04-05*
*版本: view-engine v1.0*
