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

## 架构设计

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
│   ├── renderers/           # 8 种视图渲染器
│   ├── components/          # FilterBar, EntityCard 等组件
│   ├── cells/               # 行内编辑单元格
│   ├── services/            # DataService, ActionService
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
└── utils/                   # 工具函数
```

## 视图模式

插件通过 `pm-view` 代码块支持 8 种视图模式：

| 模式 | 渲染器 | 说明 |
|------|--------|------|
| `kanban` | KanbanRenderer | 类 Trello 看板，按状态/优先级分组 |
| `list` | ListRenderer | 表格视图，支持行内编辑 |
| `grid` | GridRenderer | 卡片网格布局 |
| `cascade` | CascadeRenderer | 层级展示 版本→项目→特性 |
| `timeline` | TimelineRenderer | 水平/垂直时间轴 |
| `timeview` | TimeViewRenderer | 日历视图 |
| `burndown` | BurndownRenderer | 燃尽图 |
| `workload` | WorkloadRenderer | 工作量分布统计 |

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
- 维护负责人索引供 FilterBar 快速查询

### 内存管理

- 必须在 `onunload()` 中调用 `ViewEngine.destroy()` 防止内存泄漏
- 清理内容包括：事件监听器、全屏遮罩、FilterBar、待执行定时器

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

当前版本：**v0.7.3**（见 `manifest.json`）

### v0.7.3 主要变更
- **修复**: 全屏视图交互失效（改用 CSS 类方式实现全屏，保留事件监听器）

### v0.7.2 主要变更
- **修复**: 看板/列表/网格视图点击跳转问题（`getEntityType` 逻辑修复）
- **修复**: 燃尽图/工作量统计无数据问题（`EntityCache` 字段解析修复）
- **优化**: 燃尽图/工作量统计样式与其他视图保持一致

### v0.7.1 主要变更
- **新增**: 燃尽图视图 (`burndown`)、工作量统计视图 (`workload`)
- **重构**: CodeBlockConfigService 统一处理代码块配置
- **修复**: 内存泄漏问题（ViewEngine/FilterBar 事件监听清理）

### v0.7.0 主要变更
- **删除**: IPD 流程支持（TR 里程碑、路线图视图）
- **优化**: FilterBar 统一使用 SelectCell 风格
- **变更**: 日期字段统一为 `startDate`/`endDate`
