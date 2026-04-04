import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { Entity, EntityType, ViewConfig } from '../types';

/**
 * 数据服务
 * 统一处理实体数据的查询、过滤和排序
 */
export class DataService {
  constructor(
    private app: App,
    private entityManager: EntityManager
  ) {}

  /**
   * 加载实体数据
   */
  async loadEntities(config: ViewConfig): Promise<Entity[]> {
    const type = config.type || 'feature';
    console.log('[DataService] loadEntities:', type, 'filter:', config.filter);

    // 如果指定了 id，加载特定实体
    if (config.id) {
      switch (type) {
        case 'version': {
          const version = await this.entityManager.getVersion(config.id);
          return version ? [version as Entity] : [];
        }
        case 'project': {
          const project = await this.entityManager.getProject(config.id);
          return project ? [project as Entity] : [];
        }
        case 'feature':
        default: {
          const feature = await this.entityManager.getFeature(config.id);
          return feature ? [feature as Entity] : [];
        }
      }
    }

    // 否则加载列表
    let entities: Entity[];
    switch (type) {
      case 'version':
        entities = await this.entityManager.listVersions() as Entity[];
        break;
      case 'project':
        entities = await this.entityManager.listProjects({
          versionId: config.filter?.versionId,
        }) as Entity[];
        break;
      case 'feature':
      default:
        entities = await this.entityManager.listFeatures({
          versionId: config.filter?.versionId,
          projectId: config.filter?.projectId,
          status: config.filter?.status as any,
        }) as Entity[];
        break;
    }
    console.log('[DataService] loaded', entities.length, type + 's');
    return entities;
  }

  /**
   * 应用过滤器
   */
  applyFilters(entities: Entity[], filter?: ViewConfig['filter']): Entity[] {
    if (!filter) return entities;

    return entities.filter((entity) => {
      // 状态过滤
      if (filter.status && 'status' in entity && entity.status !== filter.status) {
        return false;
      }

      // 优先级过滤
      if (filter.priority && 'priority' in entity && entity.priority !== filter.priority) {
        return false;
      }

      // 负责人过滤
      if (filter.owner && entity.owner !== filter.owner) {
        return false;
      }

      // 标签过滤
      if (filter.tag && 'tags' in entity && !entity.tags?.includes(filter.tag)) {
        return false;
      }

      // 版本ID过滤（项目/特性）
      if (filter.versionId && 'versionId' in entity && entity.versionId !== filter.versionId) {
        return false;
      }

      // 项目ID过滤（特性）
      if (filter.projectId && 'projectId' in entity && entity.projectId !== filter.projectId) {
        return false;
      }

      return true;
    });
  }

  /**
   * 应用排序
   */
  applySort(
    entities: Entity[],
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Entity[] {
    if (!sortBy) return entities;

    const sorted = [...entities].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'dueDate':
          if ('dueDate' in a && 'dueDate' in b) {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            comparison = dateA - dateB;
          }
          break;
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          if ('priority' in a && 'priority' in b) {
            const orderA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 99;
            const orderB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 99;
            comparison = orderA - orderB;
          }
          break;
        case 'progress':
          if ('progress' in a && 'progress' in b) {
            comparison = (a.progress || 0) - (b.progress || 0);
          }
          break;
        case 'created':
          comparison = a.id.localeCompare(b.id);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
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
      if ('dueDate' in entity && entity.dueDate && 'status' in entity) {
        if (entity.status !== 'completed' && new Date(entity.dueDate) < now) {
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
