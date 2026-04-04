---
id: proj003
name: 移动端重构
versionId: ver002
status: in-progress
priority: high
owner: 移动端负责人
tags: [移动端, 重构]
---

# 🟠 📁 移动端重构

<!-- 项目元数据已在上方 YAML 中定义 -->

## 📋 项目概览

对现有移动端进行全面重构，提升用户体验和性能。

## 🚦 阶段状态

### 阶段 1: 开工准备
- [x] 需求对齐完成
- [x] 技术方案确定
- [x] 资源到位确认
- **开工日期**: 2026-06-01

### 阶段 2: 开发进行
- [x] 设计稿确认
- [ ] 核心功能开发
- [ ] 代码评审通过
- **当前进度**: 50%

### 阶段 3: 联调测试
- [ ] 前后端联调
- [ ] 测试用例评审
- [ ] Bug 修复完成
- **阻塞问题**: 

### 阶段 4: 验收交付
- [ ] 产品验收
- [ ] 文档齐全确认
- [ ] 上线检查完成
- **验收日期**: 

## 📊 特性进度汇总

```dataviewjs
const features = dv.pages('"ProjectManager/Features"').filter(f => f.projectId === "proj003");
const total = features.length;

if (total === 0) {
  dv.paragraph("> 📋 暂无关联特性");
} else {
  const completed = features.filter(f => f.status === 'completed').length;
  const inProgress = features.filter(f => f.status === 'in-progress').length;
  const testing = features.filter(f => f.status === 'testing').length;
  const todo = features.filter(f => f.status === 'todo' || f.status === 'backlog').length;
  const progress = Math.round((completed / total) * 100);
  
  dv.paragraph(
    "> 📈 **总进度: " + progress + "%** (" + completed + "/" + total + ")\\n\\n" +
    "> | 状态 | 数量 |\\n" +
    "> |------|------|\\n" +
    "> | ✅ 已完成 | " + completed + " |\\n" +
    "> | 🔄 开发中 | " + inProgress + " |\\n" +
    "> | 🧪 测试中 | " + testing + " |\\n" +
    "> | 📋 待处理 | " + todo + " |"
  );
}
```

### 特性列表
```dataviewjs
const features = dv.pages('"ProjectManager/Features"').filter(f => f.projectId === "proj003");
if (features.length > 0) {
  dv.table(
    ["特性", "状态", "优先级", "进度", "负责人", "截止日期"],
    features.map(f => [
      "[[" + f.file.path + "|" + f.name + "]]",
      f.status,
      f.priority,
      f.progress + "%",
      f.owner || "-",
      f.dueDate || "-"
    ])
  );
} else {
  dv.paragraph("> 📋 暂无特性");
}
```

## ⚠️ 风险跟踪

| 风险项 | 等级 | 应对措施 | 负责人 | 状态 |
|--------|------|----------|--------|------|
| 移动端适配复杂度 | 中 | 增加测试覆盖 | 移动端负责人 | 开放 |

## 🔗 关联版本

```dataviewjs
const versions = dv.pages('"ProjectManager/Versions"').filter(v => v.id === "ver002");
if (versions.length > 0) {
  dv.paragraph("> 📦 所属版本: [[" + versions[0].file.path + "|" + versions[0].name + "]]");
} else {
  dv.paragraph("> ⚠️ 未关联版本");
}
```

## 🔧 快捷操作

<span class="pm-btn pm-btn--primary" data-action="create-feature" data-project-id="proj003" data-version-id="ver002">✨ 新建特性</span>

---

## 📎 关联展示

### 使用 pm-card 展示本项目级联状态

```markdown
```pm-card
id: proj003
expanded: true
```

### 示例：级联卡片预览

```pm-card
id: proj003
expanded: true
```

---
*创建于: 2026/4/3 02:15:00*
