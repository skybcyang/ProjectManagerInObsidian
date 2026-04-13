import type { App } from 'obsidian';
import type { EntityManager } from '../core';
import type { DataService, ActionService } from './services';
import type { ViewMode } from './types';
import type { CodeBlockConfigService } from '../services';
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
    actionService: ActionService,
    configService?: CodeBlockConfigService
  ): BaseRenderer | null {
    const Ctor = this.renderers.get(mode);
    if (!Ctor) return null;

    // 检查构造函数是否需要 configService
    if (Ctor.length >= 5 && configService) {
      return new (Ctor as RendererConstructor5)(app, entityManager, dataService, actionService, configService);
    }
    return new (Ctor as RendererConstructor4)(app, entityManager, dataService, actionService);
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
 * 渲染器构造函数类型（4参数版本）
 */
type RendererConstructor4 = new (
  app: App,
  entityManager: EntityManager,
  dataService: DataService,
  actionService: ActionService
) => BaseRenderer;

/**
 * 渲染器构造函数类型（5参数版本）
 */
type RendererConstructor5 = new (
  app: App,
  entityManager: EntityManager,
  dataService: DataService,
  actionService: ActionService,
  configService: CodeBlockConfigService
) => BaseRenderer;

/**
 * 渲染器构造函数类型
 */
type RendererConstructor = RendererConstructor4 | RendererConstructor5;
