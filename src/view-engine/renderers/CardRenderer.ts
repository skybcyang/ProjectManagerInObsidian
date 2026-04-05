import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { CardRegistry } from '../../ui/cards';
import type { DataService, ActionService } from '../services';
import type { ViewConfig, Entity } from '../types';
import { BaseRenderer } from './BaseRenderer';

/**
 * 卡片渲染器
 * 单实体卡片展示模式
 */
export class CardRenderer extends BaseRenderer {
  constructor(
    app: App,
    entityManager: EntityManager,
    cardRegistry: CardRegistry,
    dataService: DataService,
    actionService: ActionService
  ) {
    super(app, entityManager, cardRegistry, dataService, actionService);
  }

  /**
   * 渲染单卡片视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-card-view');

    // 加载实体
    const entities = await this.dataService.loadEntities(this.config);

    if (entities.length === 0) {
      this.createEmptyState(container, '未找到实体');
      return;
    }

    // 只展示第一个实体
    const entity = entities[0];
    
    // 创建卡片容器（居中显示）
    const cardWrapper = container.createDiv('pm-card-single-wrapper');
    cardWrapper.style.cssText = `
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    `;
    
    // 使用基类的 renderEntityCard 方法
    await this.renderEntityCard(cardWrapper, entity, { showActions: true });
  }
}
