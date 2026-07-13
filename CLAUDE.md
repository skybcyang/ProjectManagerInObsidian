# CLAUDE.md

本文档为 Claude Code 提供项目开发指导。

## 项目概述

**ProjectManagerInObsidian** 是一个 Obsidian 插件，提供**版本 → 项目 → 特性**三层结构的项目管理能力。

## 快速开始

```bash
cd ProjectManagerInObsidian
npm run dev        # 开发构建
npm run build      # 生产构建
npm run test       # 运行测试
```

## 文档索引

| 文档 | 说明 |
|------|------|
| [核心设计原则](docs/核心设计原则.md) | 架构原则、设计决策、双层架构 |
| [技术架构](docs/技术架构.md) | 详细架构设计、目录结构、核心机制、扩展指南 |
| [视图系统详细设计](docs/视图系统详细设计.md) | 6种视图详解、ToolbarController、数据流、样式规范 |
| [Dataview集成计划](docs/Dataview集成计划.md) | Dataview 集成方案 |
| [测试策略](docs/测试策略.md) | 测试规范 |
| [CHANGELOG](docs/CHANGELOG.md) | 完整版本历史 |

## 开发流程

### 代码修改后

```bash
# 1. 构建
npm run dev

# 2. 复制到 Obsidian 插件目录（替换为你的 Vault 路径）
cp main.js styles.css manifest.json /path/to/vault/.obsidian/plugins/project-manager/

# 3. 在 Obsidian 中重载插件（命令面板 → "Reload app without saving"）

# 4. 运行测试
npm test
```

### Storybook 组件测试

```bash
npm run storybook         # 启动 Storybook 开发服务器 http://localhost:6006
npm run build-storybook   # 构建静态 Storybook
```

Storybook 用于：
- **可视化测试** - 独立展示 UI 组件，确保样式正确
- **组件文档** - 查看组件各种状态和变体
- **开发调试** - 快速迭代和调试组件样式

### 新增视图渲染器步骤

1. 在 `src/view-engine/renderers/` 创建渲染器类，继承 `BaseRenderer`
2. 在文件末尾注册：`RendererRegistry.register('modeName', NewRenderer)`
3. 在 `ViewMode` 类型中添加新模式
4. 在 `VIEW_MODE_LABELS` 中添加显示名称

## 架构设计

> 详细架构设计、核心机制、扩展指南见 [技术架构](docs/技术架构.md)

### 三层数据模型

| 层级 | 存储位置 | 核心字段 | 说明 |
|------|---------|---------|------|
| **版本** | `Versions/*.md` | id, name, status, startDate, endDate, owner, tags | 产品版本迭代 |
| **项目** | `Projects/*.md` | id, name, status, priority, versionId, owner, tags | 必须关联版本 |
| **特性** | `Features/*.md` | id, name, status, priority, versionId, projectId, progress, owner, tags | 必须关联项目 |

### 目录结构

```
src/
├── core/                    # 数据层
│   ├── cache/EntityCache.ts # 内存缓存与文件监听
│   ├── stores/              # VersionStore, ProjectStore, FeatureStore
│   ├── filesystem/          # 文件系统抽象
│   └── EntityManager.ts     # 统一 API 入口
├── view-engine/             # 视图系统
│   ├── renderers/           # 3 种视图渲染器
│   ├── components/          # EntityCard, EntityTreeSelector, DropdownMenu 等组件
│   ├── cells/               # 行内编辑单元格
│   ├── services/            # DataService, ActionService
│   ├── controllers/         # ToolbarController, SortMenuController, PropertyPanelController
│   └── ViewEngine.ts        # 视图引擎主类
├── services/                # 业务服务
│   ├── TemplateService.ts   # 模板渲染服务
│   ├── InitService.ts       # 初始化服务
│   ├── CodeBlockConfigService.ts  # 代码块配置服务
│   └── ChangeLogService.ts  # 变更日志服务
├── settings/                # 设置面板
├── modals/                  # 创建/编辑模态框
├── ui/                      # UI 组件
├── types/                   # TypeScript 类型定义
├── constants/               # 状态、优先级等常量
├── utils/                   # 工具函数
└── stories/                 # Storybook 组件测试
```

## 视图模式

插件通过 `pm-view` 代码块支持 3 种视图模式。所有视图均为**只读视图**，仅用于展示和导航，不支持拖拽、内联编辑、状态变更等修改操作。

| 模式 | 渲染器 | 说明 |
|------|--------|------|
| `kanban` | KanbanRenderer | 类 Trello 看板，按状态/优先级分组 |
| `cascade` | CascadeRenderer | 层级展示 版本→项目→特性 |
| `timeview` | TimeViewRenderer | 甘特图，按负责人/项目分组 |

**重要设计原则**：视图内不允许修改数据。需要编辑时，点击卡片跳转到对应 Markdown 文件进行修改。

> 详细视图配置、FilterBar 设计、样式规范见 [视图系统详细设计](docs/视图系统详细设计.md)

## 核心模式

### EntityManager 使用

```typescript
const entityManager = new EntityManager(app, settings);
await entityManager.initialize();

// CRUD 操作
const version = await entityManager.createVersion(data);
const project = await entityManager.createProject(data);
const feature = await entityManager.createFeature(data);

// 查询
const versions = await entityManager.listVersions();
const projects = await entityManager.getVersionProjects(versionId);
const features = await entityManager.getProjectFeatures(projectId);

// 缓存优化查询
const owners = entityManager.getOwners(); // O(1) 从缓存获取
```

### 视图引擎使用

```typescript
const viewEngine = new ViewEngine(app, entityManager);

// 解析代码块配置
const config = viewEngine.parseConfig(yamlSource);

// 渲染到容器
await viewEngine.render(container, config, context, codeBlockIndex);

// 卸载时清理
viewEngine.destroy();
```

### 错误处理

统一使用 `ErrorHandler` 工具：

```typescript
import { ErrorHandler } from './utils';

try {
  await operation();
  ErrorHandler.handleSuccess('操作成功');
} catch (error) {
  ErrorHandler.handle(error, '上下文信息', { category: 'user' });
}
```

### 配置验证

使用 `ConfigValidator` 验证视图配置：

```typescript
import { ConfigValidator } from './utils';

const validation = ConfigValidator.validate(parsedConfig);
if (!validation.valid) {
  validation.errors.forEach(err => console.warn(err));
}
```

## 代码块配置服务

集中式服务用于保存/读取代码块配置：

```typescript
const configService = new CodeBlockConfigService(app);

// 保存配置更新
await configService.saveConfig(sourcePath, codeBlockIndex, updates);

// 读取配置
const config = await configService.readConfig(sourcePath, codeBlockIndex);
```

## 重要实现注意事项

### 缓存同步

- `EntityCache` 监听 Obsidian 文件事件（create/modify/delete/rename）
- 插件加载时重建缓存
- 维护负责人索引供 ToolbarController 快速查询

### 内存管理

- 必须在 `onunload()` 中调用 `ViewEngine.destroy()` 防止内存泄漏
- 清理内容包括：事件监听器、全屏遮罩、ToolbarController、待执行定时器、`currentConfigs` 配置状态

### 文件命名

文件使用显示名称命名（非 ID）。关系通过 frontmatter 中的 `versionId` 和 `projectId` 存储。

### 模板系统

模板支持类 Handlebars 语法：
- 变量：`{{name}}`, `{{status}}`
- 条件：`{{#if owner}}...{{/if}}`
- 循环：`{{#each tags}}...{{/each}}`

## 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 覆盖率
npm run test:coverage
```

## 开发规范

1. **禁用 `any` 类型** - 使用严格 TypeScript
2. **错误处理** - 使用 `ErrorHandler` 替代 `console.error`
3. **事件清理** - 全局监听器必须提供清理函数
4. **优先使用缓存** - 优先从 `EntityCache` 查询
5. **服务抽象** - 将可复用逻辑提取到服务层

## 版本与变更

当前版本：**v0.8.2**（见 `manifest.json`）

### v0.8.1 主要变更
- **删除**: 列表视图与 workload 工作量统计视图
  - 统一使用级联视图承载信息密度与进展/风险展示
  - 移除 `ListRenderer`、`WorkloadRenderer` 及相关 stories、样式
  - `ReportService` 保留工作量计算，继续服务邮件摘要
- **增强**: 级联视图展示状态、负责人、起止日期、进度、风险、预估/实际人天、标签及详情面板
- **重构**: `BaseRenderer` 提取共享字段渲染方法

### v0.7.6 主要变更
- **重构**: 删除 ListRenderer 内联排序 UI，统一使用工具栏排序
- **修复**: ViewEngine `currentConfigs` 机制，消除闭包陷阱和内存泄漏
- **修复**: EntityTreeSelector / FilterBar 切换实体类型时的状态同步
- **修复**: 工作量统计视图支持 `ViewConfig` 树形筛选
- **修复**: 级联视图支持树形筛选，保持三层 UI 结构不变

### v0.7.5 主要变更
- **修复**: 树形筛选器级联勾选与半选状态（`indeterminate`）
- **修复**: 树形下拉框点击不立即关闭，支持多选
- **修复**: 清空树形筛选后视图正确恢复全部内容

### v0.7.4 主要变更
- **Dataview 集成**: 深度集成 Dataview 插件
  - 新增 `DataviewService` 封装 Dataview API
  - `EntityManager` 集成 Dataview 查询
  - 注册 6 个自定义 Dataview 函数（`pmVersionProjects`、`pmProjectFeatures` 等）
  - 支持降级方案（Dataview 未安装时使用手动遍历）

### v0.7.3 主要变更
- **代码清理**: 移除所有调试日志，修复类型安全问题，统一版本号
- **修复**: FilterBar 和 SelectCell 事件处理问题
- **优化**: 删除重复样式文件，使用统一 CSS 变量

### v0.7.2 主要变更
- **修复**: 看板/列表/网格视图点击跳转问题（`getEntityType` 逻辑修复）
- **修复**: 工作量统计无数据问题（`EntityCache` 字段解析修复）
- **优化**: 工作量统计样式与其他视图保持一致

### v0.7.1 主要变更
- **新增**: 工作量统计视图 (`workload`)
- **重构**: CodeBlockConfigService 统一处理代码块配置
- **修复**: 内存泄漏问题（ViewEngine/FilterBar 事件监听清理）

### v0.7.0 主要变更
- **删除**: IPD 流程支持（TR 里程碑、路线图视图）
- **优化**: FilterBar 统一使用 SelectCell 风格
- **变更**: 日期字段统一为 `startDate`/`endDate`
