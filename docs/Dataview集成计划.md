# Project Manager + Dataview 深度集成计划

## Context

当前 Project Manager 插件已具备完整的项目管理系统（版本→项目→特性三层结构），但在与 Dataview 的集成方面较为浅层：

1. **现状**：仅在特性模板中硬编码了 Dataview 查询，用于展示同项目的其他特性
2. **问题**：
   - 用户无法灵活使用 Dataview 查询 Project Manager 数据
   - 每次数据查询都需要手动遍历文件系统，性能较差
   - 缺乏 Dataview 自定义函数支持
   - 无法实现 DataviewJS 级别的自动化

3. **目标**：通过深度集成 Dataview API，让用户可以像使用原生 Dataview 一样灵活查询 Project Manager 数据，同时提供更丰富的视图交互

## 方案对比

| 方案 | 描述 | 优点 | 缺点 | 推荐度 |
|------|------|------|------|--------|
| **A. Dataview API 查询** | 复用 Dataview 的索引进行查询 | 性能好，代码简洁 | 依赖 Dataview 插件 | ⭐⭐⭐⭐⭐ |
| **B. 自定义 Dataview 函数** | 注册自定义函数如 `pmVersionProjects()` | 用户体验好，功能强大 | 需要 Dataview 支持插件 API | ⭐⭐⭐⭐ |
| **C. DataviewJS API 暴露** | 导出 EntityManager 到 DataviewJS | 高度灵活，适合高级用户 | 安全风险较高 | ⭐⭐⭐ |

**推荐方案**：先实现 A（基础集成），再实现 B（功能增强），C 作为可选增强

## 详细实施方案

### Phase 1: Dataview API 基础集成（核心功能）

#### 1.1 创建 DataviewService
**文件**: `src/services/DataviewService.ts`

封装 Dataview API 的调用，提供以下方法：

```typescript
export class DataviewService {
  private app: App;
  private get dataview() {
    // @ts-ignore
    return this.app.plugins.getPlugin('dataview');
  }

  isAvailable(): boolean {
    return !!this.dataview;
  }

  // 使用 Dataview 索引查询特性
  async queryFeatures(filters?: FeatureFilters): Promise<Feature[]> {
    if (!this.isAvailable()) {
      // 降级：使用手动遍历
      return this.fallbackQueryFeatures(filters);
    }
    // 使用 Dataview API 查询
  }

  // 获取 Dataview 页面元数据
  getPageMetadata(path: string): Record<string, unknown> | null {
    if (!this.isAvailable()) return null;
    return this.dataview.api.page(path);
  }
}
```

#### 1.2 改造 EntityManager 支持 Dataview 查询
**文件**: `src/core/EntityManager.ts`

- 添加 DataviewService 依赖
- 在 `listFeatures()`、`getVersionProjects()` 等方法中优先使用 Dataview 查询
- 提供降级方案（当 Dataview 未安装时回退到手动遍历）

#### 1.3 视图引擎集成
**文件**: `src/view-engine/ViewEngine.ts`

- 在渲染视图前检测 Dataview 可用性
- 如果 Dataview 可用，使用其索引数据进行渲染（减少文件 IO）
- 添加加载状态提示

### Phase 2: 自定义 Dataview 函数（用户体验）

#### 2.1 注册自定义函数
**文件**: `src/services/DataviewFunctionRegistry.ts`

注册以下 Dataview 函数：

| 函数名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `pmVersionProjects` | versionId: string | Project[] | 获取版本下的项目 |
| `pmProjectFeatures` | projectId: string | Feature[] | 获取项目下的特性 |
| `pmVersionProgress` | versionId: string | number | 计算版本进度 |
| `pmProjectProgress` | projectId: string | number | 计算项目进度 |
| `pmEntityStatus` | id: string | string | 获取实体状态 |
| `pmOverdueItems` | type?: string | Entity[] | 获取逾期项目/特性 |

使用方式示例：

```dataview
TABLE pmProjectProgress(id) as "进度", status, priority
FROM "ProjectManager/Projects"
WHERE versionId = "ver-xxx"
SORT pmProjectProgress(id) DESC
```

#### 2.2 函数实现
- 通过 Dataview 的 `api.registerFunction()` API 注册
- 函数内部调用 EntityManager 获取数据
- 缓存计算结果（如进度）避免重复计算

### Phase 3: DataviewJS 集成（高级功能）

#### 3.1 安全暴露 API
**文件**: `src/services/DataviewJSBridge.ts`

仅在 DataviewJS 执行上下文中暴露安全的 API：

```typescript
export class DataviewJSBridge {
  // 只暴露查询方法，不暴露修改方法
  static exposeToDataviewJS(app: App): void {
    const api = {
      query: {
        versions: () => entityManager.listVersions(),
        projects: (versionId?: string) => {...},
        features: (projectId?: string) => {...},
      },
      stats: {
        versionProgress: (id: string) => {...},
        workloadByOwner: () => {...},
      }
    };
    // 注册到 DataviewJS 全局
  }
}
```

#### 3.2 使用示例
用户可以在 DataviewJS 代码块中：

```dataviewjs
const pm = app.plugins.getPlugin('project-manager');
const features = await pm.dataviewApi.query.features('proj-xxx');

// 自定义统计
dv.table(
  ["特性", "进度", "状态"],
  features.map(f => [f.name, f.progress + '%', f.status])
);
```

### Phase 4: 视图增强

#### 4.1 pm-view 代码块支持 Dataview 查询作为数据源
**配置示例**：

```yaml
mode: kanban
# 使用 Dataview 查询作为数据源
dataviewQuery: |
  FROM "ProjectManager/Features"
  WHERE status != "completed"
  AND endDate < date(today) + dur(7 days)
```

#### 4.2 渲染器适配
**文件**: `src/view-engine/renderers/KanbanRenderer.ts` 等

- 支持从 Dataview 查询结果渲染看板
- 保持现有卡片交互功能（点击跳转、状态修改等）

## 关键文件变更

| 文件路径 | 变更类型 | 说明 |
|----------|----------|------|
| `src/services/DataviewService.ts` | 新增 | 核心服务，封装 Dataview API |
| `src/services/DataviewFunctionRegistry.ts` | 新增 | 注册自定义 Dataview 函数 |
| `src/services/DataviewJSBridge.ts` | 新增 | DataviewJS API 暴露（可选） |
| `src/core/EntityManager.ts` | 修改 | 集成 DataviewService |
| `src/view-engine/ViewEngine.ts` | 修改 | 检测 Dataview 可用性 |
| `src/view-engine/renderers/*.ts` | 修改 | 支持 Dataview 查询数据源 |
| `src/main.ts` | 修改 | 初始化 Dataview 集成 |
| `manifest.json` | 修改 | 添加 Dataview 作为可选依赖 |

## 测试计划

### 功能测试
1. **Dataview 未安装场景**：验证降级方案正常工作
2. **Dataview 已安装场景**：验证 API 调用成功
3. **自定义函数测试**：在 Dataview 查询中验证自定义函数
4. **性能对比**：对比集成前后的查询性能

### 测试代码示例
```typescript
// DataviewService 测试
describe('DataviewService', () => {
  it('should fallback when dataview is not installed', async () => {
    const service = new DataviewService(mockAppWithoutDataview);
    const features = await service.queryFeatures();
    expect(features).toEqual(mockFeatures);
  });

  it('should use dataview api when available', async () => {
    const service = new DataviewService(mockAppWithDataview);
    const features = await service.queryFeatures();
    expect(dataviewApi.query).toHaveBeenCalled();
  });
});
```

## 回滚策略

1. **功能开关**：在设置中添加 "启用 Dataview 集成" 选项
2. **降级机制**：所有功能在 Dataview 不可用时自动降级到现有实现
3. **版本兼容**：保持对旧版本 Dataview 的兼容

## 预期收益

1. **性能提升**：利用 Dataview 的索引系统，查询速度提升 5-10x
2. **用户体验**：用户可以使用熟悉的 Dataview 语法自定义查询
3. **生态整合**：与 Obsidian 生态更好地融合
4. **扩展性**：为后续高级功能（自动化、报表）打下基础

## 实施顺序

1. **Week 1**: Phase 1 - DataviewService + EntityManager 集成
2. **Week 2**: Phase 2 - 自定义 Dataview 函数
3. **Week 3**: Phase 4 - 视图增强
4. **Week 4**: Phase 3 - DataviewJS 集成（可选）
