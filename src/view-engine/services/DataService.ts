import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { Entity, ViewConfig, SortConfig, EntityType } from '../types';
import type { Version, Project, Feature } from '../../types';

/**
 * 实体策略接口
 * 统一不同实体类型的操作接口
 */
export interface EntityStrategy<T = Entity> {
  list: () => Promise<T[]>;
  get: (id: string) => Promise<T | null>;
  update: (id: string, data: Partial<T>) => Promise<T | null>;
}

/**
 * 实体策略注册表
 * 集中管理各实体类型的策略实现
 */
class EntityStrategyRegistry {
  private strategies: Map<EntityType, EntityStrategy>;

  constructor(private entityManager: EntityManager) {
    this.strategies = new Map([
      ['version', {
        list: () => this.entityManager.listVersions(),
        get: (id: string) => this.entityManager.getVersion(id),
        update: (id: string, data: Partial<Version>) => this.entityManager.updateVersion(id, data),
      }],
      ['project', {
        list: () => this.entityManager.listProjects(),
        get: (id: string) => this.entityManager.getProject(id),
        update: (id: string, data: Partial<Project>) => this.entityManager.updateProject(id, data),
      }],
      ['feature', {
        list: () => this.entityManager.listFeatures(),
        get: (id: string) => this.entityManager.getFeature(id),
        update: (id: string, data: Partial<Feature>) => this.entityManager.updateFeature(id, data),
      }],
    ]);
  }

  get(type: EntityType): EntityStrategy | undefined {
    return this.strategies.get(type);
  }

  has(type: EntityType): boolean {
    return this.strategies.has(type);
  }
}

/**
 * 数据服务 - 简化版
 * 统一处理实体数据的查询、过滤和排序
 */
export class DataService {
  private strategyRegistry: EntityStrategyRegistry;

  constructor(
    private app: App,
    private entityManager: EntityManager
  ) {
    this.strategyRegistry = new EntityStrategyRegistry(entityManager);
  }

  /**
   * 加载实体数据 - 使用策略模式
   */
  async loadEntities(config: ViewConfig): Promise<Entity[]> {
    // 如果指定了特性ID，加载特定特性
    if (config.feature) {
      const feature = await this.entityManager.getFeature(config.feature);
      return feature ? [feature as Entity] : [];
    }

    // 根据 entityType 获取对应策略
    const entityType = config.entityType || 'feature';
    const strategy = this.strategyRegistry.get(entityType);

    if (!strategy) {
      return [];
    }

    // 使用策略加载数据
    const entities = await strategy.list();

    // 如果指定了特定ID，进行过滤
    if (config.project && entityType === 'project') {
      return entities.filter(e => e.id === config.project) as Entity[];
    }
    if (config.version && entityType === 'version') {
      return entities.filter(e => e.id === config.version) as Entity[];
    }

    // 特性可以根据项目ID或版本ID筛选
    if (entityType === 'feature') {
      return this.entityManager.listFeatures({
        projectId: config.project,
        versionId: config.version,
      }) as Promise<Entity[]>;
    }

    return entities as Entity[];
  }

  /**
   * 应用过滤器 - 使用扁平化的筛选字段
   */
  applyFilters(entities: Entity[], config: ViewConfig): Entity[] {
    return entities.filter((entity) => {
      // 状态过滤
      if (config.status && 'status' in entity && entity.status !== config.status) {
        return false;
      }

      // 优先级过滤
      if (config.priority && 'priority' in entity && entity.priority !== config.priority) {
        return false;
      }

      // 负责人过滤
      if (config.owner && entity.owner !== config.owner) {
        return false;
      }

      // 标签过滤
      if (config.tag && 'tags' in entity && !entity.tags?.includes(config.tag)) {
        return false;
      }

      // 版本ID过滤（项目/特性）
      if (config.version && 'versionId' in entity && entity.versionId !== config.version) {
        return false;
      }

      // 项目ID过滤（特性）
      if (config.project && 'projectId' in entity && entity.projectId !== config.project) {
        return false;
      }

      return true;
    });
  }

  /**
   * 应用排序 - 支持单字段或多字段排序
   */
  applySort(
    entities: Entity[],
    sortBy?: string | SortConfig[],
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Entity[] {
    // 如果是数组，使用多字段排序
    if (Array.isArray(sortBy) && sortBy.length > 0) {
      return this.applyMultiFieldSort(entities, sortBy);
    }

    // 单字段排序
    if (!sortBy || typeof sortBy !== 'string') return entities;

    const sorted = [...entities].sort((a, b) => {
      const comparison = this.compareField(a, b, sortBy as string);
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  /**
   * 多字段排序
   */
  private applyMultiFieldSort(entities: Entity[], sorts: SortConfig[]): Entity[] {
    const sorted = [...entities].sort((a, b) => {
      for (const sort of sorts) {
        const comparison = this.compareField(a, b, sort.field);
        if (comparison !== 0) {
          return sort.order === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
    return sorted;
  }

  /**
   * 比较两个实体的单个字段
   */
  private compareField(a: Entity, b: Entity, field: string): number {
    switch (field) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'endDate':
        if ('endDate' in a && 'endDate' in b) {
          const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
          const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
          return dateA - dateB;
        }
        return 0;
      case 'startDate':
        if ('startDate' in a && 'startDate' in b) {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateA - dateB;
        }
        return 0;
      case 'priority':
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if ('priority' in a && 'priority' in b) {
          const orderA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 99;
          const orderB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 99;
          return orderA - orderB;
        }
        return 0;
      case 'progress':
        if ('progress' in a && 'progress' in b) {
          return (a.progress || 0) - (b.progress || 0);
        }
        return 0;
      case 'status':
        const statusOrder = { backlog: 0, todo: 1, 'in-progress': 2, testing: 3, completed: 4, archived: 5 };
        if ('status' in a && 'status' in b) {
          const orderA = statusOrder[a.status as keyof typeof statusOrder] ?? 99;
          const orderB = statusOrder[b.status as keyof typeof statusOrder] ?? 99;
          return orderA - orderB;
        }
        return 0;
      case 'created':
        return a.id.localeCompare(b.id);
      case 'owner':
        const ownerA = a.owner || '';
        const ownerB = b.owner || '';
        return ownerA.localeCompare(ownerB);
      default:
        return 0;
    }
  }

  /**
   * 按字段分组
   */
  groupByField(entities: Entity[], field: string): Map<string, Entity[]> {
    const groups = new Map<string, Entity[]>();

    for (const entity of entities) {
      const key = (entity as any)[field] || '未分配';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entity);
    }

    return groups;
  }

  /**
   * 计算统计数据
   */
  calculateStats(entities: Entity[]): {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    completed: number;
    inProgress: number;
    averageProgress: number;
    overdue: number;
  } {
    const now = new Date();

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let completed = 0;
    let inProgress = 0;
    let totalProgress = 0;
    let progressCount = 0;
    let overdue = 0;

    for (const entity of entities) {
      // 状态统计
      if ('status' in entity) {
        byStatus[entity.status] = (byStatus[entity.status] || 0) + 1;
        if (entity.status === 'completed') completed++;
        if (entity.status === 'in-progress') inProgress++;
      }

      // 优先级统计
      if ('priority' in entity) {
        byPriority[entity.priority] = (byPriority[entity.priority] || 0) + 1;
      }

      // 进度统计
      if ('progress' in entity && entity.progress !== undefined) {
        totalProgress += entity.progress;
        progressCount++;
      }

      // 逾期统计
      if ('endDate' in entity && entity.endDate && 'status' in entity) {
        if (entity.status !== 'completed' && new Date(entity.endDate) < now) {
          overdue++;
        }
      }
    }

    return {
      total: entities.length,
      byStatus,
      byPriority,
      completed,
      inProgress,
      averageProgress: progressCount > 0 ? Math.round(totalProgress / progressCount) : 0,
      overdue,
    };
  }
}
