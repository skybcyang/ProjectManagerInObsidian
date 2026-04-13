import type { EntityManager } from '../../core';
import type { EntityType } from '../types';
import type { Version, Project, Feature } from '../../types';

/**
 * 实体策略接口
 * 统一不同实体类型的操作接口
 */
export interface EntityStrategy {
  list: () => Promise<Entity[]>;
  get: (id: string) => Promise<Entity | null>;
  update: (id: string, data: Partial<Entity>) => Promise<Entity | null>;
}

/**
 * 统一实体类型（版本/项目/特性的并集）
 */
export type Entity = Version | Project | Feature;

/**
 * 实体策略注册表
 * 集中管理各实体类型的策略实现
 */
export class EntityStrategyRegistry {
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

  /**
   * 获取指定类型的策略
   */
  get(type: EntityType): EntityStrategy | undefined {
    return this.strategies.get(type);
  }

  /**
   * 检查是否支持某类型
   */
  has(type: EntityType): boolean {
    return this.strategies.has(type);
  }

  /**
   * 获取所有支持的类型
   */
  getSupportedTypes(): EntityType[] {
    return Array.from(this.strategies.keys());
  }
}
