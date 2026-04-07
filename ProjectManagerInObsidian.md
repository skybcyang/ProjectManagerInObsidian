# Project Manager for Obsidian

Obsidian 中的项目管理插件，支持版本、项目、特性三层结构化管理。

---

## 项目文档

| 文档 | 说明 |
|------|------|
| [需求与设计](./需求与设计.md) | 核心需求、数据模型、设计原则 |
| [CHANGELOG](./CHANGELOG.md) | 版本迭代记录 |
| [README](./README.md) | 用户手册与使用指南 |
| [docs/核心设计原则](./docs/核心设计原则.md) | 架构设计原则 |
| [docs/技术架构](./docs/技术架构.md) | 技术实现细节 |

---

## 项目结构

```
ProjectManagerInObsidian/
├── src/                    # 源代码
│   ├── core/              # 数据层（EntityManager, Stores）
│   ├── ui/                # UI 层（ViewEngine, Cards）
│   ├── types/             # 类型定义
│   └── main.ts            # 插件入口
├── tests/                 # 测试文件
├── docs/                  # 技术文档
├── 需求与设计.md          # 需求文档
├── CHANGELOG.md           # 版本记录
└── README.md              # 用户手册
```

---

## 核心功能

- 📦 **版本管理** - 规划产品版本迭代，支持 IPD 里程碑
- 📁 **项目管理** - 组织和管理项目
- ✨ **特性管理** - 跟踪开发进度，支持优先级和截止日期
- 📊 **多视图支持** - 看板、网格、级联、卡片等 8 种视图
- 🔗 **级联展示** - 展示版本→项目→特性的完整层级
- 🧭 **面包屑导航** - 层级导航，点击穿透
- 📅 **ICS 导出** - 导出特性截止日期到日历

---

## 数据存储

所有数据以 Markdown 格式存储在 `ProjectManager/` 目录下：

```
ProjectManager/
├── 总览.md              # 总览页面
├── Versions/            # 版本文件
├── Projects/            # 项目文件
└── Features/            # 特性文件
```

---

## 开发命令

```bash
npm run dev        # 开发模式
npm run build      # 构建
npm run test       # 运行测试
```
