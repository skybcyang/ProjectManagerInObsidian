import type { App } from 'obsidian';
import type { EntityManager } from '../core';
import type { DataService, ActionService } from './services';
import type { ViewMode } from './types';
import { BaseRenderer } from './renderers/BaseRenderer';

/**
 * 渲染器注册表
 * 使用注册表模式管理渲染器，避免 switch 语句，支持扩展
 */
export class RendererRegistry {
  private static renderers = new Map<ViewMode, RendererConstructor>();

  /**
   * 注册渲染器
   */
  static register(mode: ViewMode, constructor: RendererConstructor): void {
    this.renderers.set(mode, constructor);
  }

  /**
   * 创建渲染器实例
   */
  static create(
    mode: ViewMode,
    app: App,
    entityManager: EntityManager,
    dataService: DataService,
    actionService: ActionService
  ): BaseRenderer | null {
    const Ctor = this.renderers.get(mode);
    if (!Ctor) return null;

    return new (Ctor as RendererConstructor)(app, entityManager, dataService, actionService);
  }

  /**
   * 获取所有注册的视图模式
   */
  static getRegisteredModes(): ViewMode[] {
    return Array.from(this.renderers.keys());
  }

  /**
   * 检查模式是否已注册
   */
  static has(mode: ViewMode): boolean {
    return this.renderers.has(mode);
  }
}

/**
 * 渲染器构造函数类型
 */
type RendererConstructor = new (
  app: App,
  entityManager: EntityManager,
  dataService: DataService,
  actionService: ActionService
) => BaseRenderer;
