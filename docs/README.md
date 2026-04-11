# Project Manager 文档中心

> 当前版本：**v0.7.3**

本文档中心包含 Project Manager for Obsidian 插件的完整技术文档。

---

## 📚 文档索引

| 文档 | 说明 | 目标读者 |
|------|------|----------|
| [需求与设计](./需求与设计.md) | 核心需求、数据模型 | 所有开发者 |
| [核心设计原则](./核心设计原则.md) | 架构设计原则与决策 | 架构师、开发者 |
| [技术架构](./技术架构.md) | 技术实现细节、目录结构 | 开发者 |
| [视图系统详细设计](./视图系统详细设计.md) | 视图引擎、渲染器设计 | 前端开发者 |
| [CHANGELOG](./CHANGELOG.md) | 版本迭代记录 | 所有用户 |
| [测试策略](./测试策略.md) | 测试方法与用例 | 测试人员、开发者 |

---

## 🚀 快速开始

### 核心概念

**三层数据管理**:
- 📦 **版本 (Version)** - 产品版本迭代
- 📁 **项目 (Project)** - 必须关联版本
- ✨ **特性 (Feature)** - 必须关联项目和版本

**数据存储**:
```
ProjectManager/
├── 总览.md              # 总览页面
├── Versions/            # 版本文件
├── Projects/            # 项目文件
└── Features/            # 特性文件
```

### 支持的视图模式 (v0.7.2)

| 模式 | 说明 | 配置示例 |
|------|------|----------|
| `kanban` | 看板视图 | `mode: kanban`<br>`type: feature`<br>`groupBy: status` |
| `list` | 列表视图 | `mode: list`<br>`type: feature` |
| `grid` | 网格视图 | `mode: grid`<br>`type: project` |
| `cascade` | 级联视图 | `mode: cascade`<br>`type: version` |
| `timeline` | 时间线视图 | `mode: timeline`<br>`type: feature` |
| `timeview` | 时间视图 | `mode: timeview`<br>`type: feature` |
| `burndown` | 燃尽图 | `mode: burndown`<br>`type: feature` |
| `workload` | 工作量统计 | `mode: workload`<br>`type: feature` |

### 常用代码块示例

```markdown
# 看板视图
```pm-view
mode: kanban
type: feature
groupBy: status
```

# 列表视图
```pm-view
mode: list
type: feature
```

# 网格视图
```pm-view
mode: grid
type: project
cols: 3
```

# 级联视图
```pm-view
mode: cascade
type: version
```

---

## 🛠️ 开发指南

### 项目结构

```
src/
├── core/                    # 核心数据层
│   ├── cache/              # 内存缓存 (EntityCache)
│   ├── stores/             # 实体存储 (Version/Project/Feature)
│   ├── filesystem/         # 文件系统封装
│   └── EntityManager.ts    # 统一实体管理入口
├── view-engine/            # 视图引擎
│   ├── renderers/          # 视图渲染器 (5种模式)
│   ├── components/         # 视图组件 (FilterBar, EntityCard)
│   ├── cells/              # 行内编辑单元格
│   └── services/           # 数据/操作服务
├── services/               # 全局服务
│   ├── TemplateService.ts  # 模板渲染服务
│   └── DashboardService.ts # 仪表盘服务
├── templates/              # 模板系统
├── settings/               # 设置面板
├── modals/                 # 模态框
├── ui/                     # UI 组件
│   ├── cards/              # 卡片组件
│   └── components/         # 通用组件
├── types/                  # 类型定义
├── constants/              # 常量定义 (状态, 优先级)
└── main.ts                 # 插件入口
```

### 开发命令

```bash
npm run dev              # 开发模式构建
npm run build            # 生产构建
npm test                 # 运行所有测试
npm run test:watch       # 测试监听模式
npm run test:coverage    # 生成测试覆盖率报告
```

---

## 📋 版本历史

查看最新版本信息请查看 [CHANGELOG](./CHANGELOG.md)。

**当前版本**: v0.7.2

主要里程碑：
- v0.7.2 - 修复看板点击跳转、燃尽图数据解析、CSS 样式优化
- v0.7.1 - 燃尽图视图、工作量统计视图、内存泄漏修复
- v0.7.0 - 删除 IPD 流程、统一日期字段、FilterBar 优化
- v0.6.0 - IPD 流程支持、TR 里程碑视图、路线图视图
- v0.5.0 - 自定义模板系统
- v0.4.0 - 统一视图引擎 pm-view
- v0.1.0 - 初始版本


