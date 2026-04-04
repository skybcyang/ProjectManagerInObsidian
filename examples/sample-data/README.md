# 📦 Project Manager 示例数据

本目录包含一套完整的示例数据，用于演示 `pm-grid` 网格布局功能。

## 数据结构

```
ProjectManager/
├── 总览.md                 # 总览页面（包含多个 pm-grid 示例）
├── Versions/               # 版本数据
│   ├── v1.0.0-春季迭代.md
│   ├── v1.1.0-夏季迭代.md
│   ├── v2.0.0-秋季大版本.md
│   └── v2.1.0-冬季迭代.md
├── Projects/               # 项目数据
│   ├── proj-001-用户系统重构.md
│   ├── proj-002-订单管理系统.md
│   ├── proj-003-仪表盘重构.md
│   ├── proj-004-报表系统.md
│   ├── proj-005-性能优化.md
│   ├── proj-006-多租户架构.md
│   ├── proj-007-国际化支持.md
│   └── proj-008-API网关.md
└── Features/               # 特性数据
    ├── feat-001-OAuth2.0登录.md
    ├── feat-002-手机号验证码登录.md
    ├── feat-003-权限管理RBAC.md
    ├── feat-004-订单创建流程.md
    ├── feat-005-订单状态机.md
    ├── feat-006-支付接口集成.md
    ├── feat-007-数据可视化组件.md
    ├── feat-008-自定义仪表盘布局.md
    ├── feat-009-实时数据推送.md
    ├── feat-010-日报报表.md
    ├── feat-011-周报报表.md
    ├── feat-012-数据导出PDF.md
    ├── feat-013-Redis缓存优化.md
    ├── feat-014-数据库索引优化.md
    ├── feat-015-租户隔离方案设计.md
    ├── feat-016-租户配置管理.md
    ├── feat-017-中英文切换.md
    ├── feat-018-文案提取工具.md
    ├── feat-019-API限流策略.md
    └── feat-020-API认证中间件.md
```

## 数据分布

### 版本（4个）
| 版本 | 状态 | 负责人 |
|-----|------|-------|
| v1.0.0 春季迭代 | completed | 张三 |
| v1.1.0 夏季迭代 | in-progress | 李四 |
| v2.0.0 秋季大版本 | planning | 王五 |
| v2.1.0 冬季迭代 | planning | 赵六 |

### 项目（8个）
| 项目 | 版本 | 状态 | 优先级 |
|-----|------|------|-------|
| 用户系统重构 | ver-001 | completed | critical |
| 订单管理系统 | ver-001 | completed | high |
| 仪表盘重构 | ver-002 | in-progress | high |
| 报表系统 | ver-002 | in-progress | medium |
| 性能优化 | ver-002 | backlog | medium |
| 多租户架构 | ver-003 | todo | critical |
| 国际化支持 | ver-003 | todo | low |
| API网关 | ver-004 | backlog | high |

### 特性（20个）
| 状态 | 数量 |
|-----|------|
| completed | 6 |
| in-progress | 5 |
| todo | 4 |
| testing | 1 |
| backlog | 4 |

| 优先级 | 数量 |
|-------|------|
| critical | 5 |
| high | 7 |
| medium | 5 |
| low | 3 |

| 标签 | 数量 |
|-----|------|
| 紧急 | 5 |
| 架构 | 3 |
| 核心业务 | 2 |
| UI | 1 |
| 数据 | 1 |
| 报表 | 2 |
| 性能 | 2 |
| 安全 | 2 |
| 功能 | 2 |
| 工具 | 1 |

## 使用方法

### 方式一：复制到笔记库

```bash
# 将 sample-data/ProjectManager 复制到你的 Obsidian 笔记库
cp -r "ProjectManagerInObsidian/project-manager/examples/sample-data/ProjectManager" "你的笔记库/"
```

### 方式二：使用示例文件

打开 `总览.md` 或参考 `grid-demo.md` 查看各种 pm-grid 用法。

## 示例查询

### 高优先级进行中
```yaml
type: feature
filter:
  status: in-progress
  priority: high
```

### 指定版本项目
```yaml
type: project
filter:
  versionId: ver-001
```

### 指定项目特性
```yaml
type: feature
filter:
  projectId: proj-003
```

### 按进度排序
```yaml
type: feature
sortBy: progress
sortOrder: desc
limit: 6
```

### 带标签筛选
```yaml
type: feature
filter:
  tag: 紧急
```

## 预览效果

在 Obsidian 中打开 `总览.md`，切换到阅读模式即可看到各种网格布局效果。
