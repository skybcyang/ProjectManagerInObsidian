import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, getEntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';
import { RendererRegistry } from '../RendererRegistry';
import {
  KANBAN_COLUMNS,
  PRIORITY_OPTIONS,
} from '../design-tokens';
import { EntityCard } from '../components';

/**
 * 看板渲染器 - 卡片式风格
 * Trello 风格的看板视图，统一卡片设计，只读展示
 */
export class KanbanRenderer extends BaseRenderer {
  private entities: Entity[] = [];

  constructor(
    app: App,
    entityManager: EntityManager,
    dataService: DataService,
    actionService: ActionService
  ) {
    super(app, entityManager, dataService, actionService);
  }

  /**
   * 渲染看板视图
   */
  async render(container: HTMLElement): Promise<void> {
    // 显示加载状态，等待数据准备完成
    this.showLoading(container);

    // 使用基类统一的数据准备方法
    const sorted = await this.prepareData();
    this.entities = sorted;

    container.empty();
    container.addClass('pm-kanban-view');

    // 创建看板容器
    const boardContainer = container.createDiv('pm-kanban-container');

    // 根据 groupBy 决定如何分组
    if (this.config.groupBy === 'priority') {
      this.renderPriorityBoard(boardContainer, sorted);
    } else {
      this.renderStatusBoard(boardContainer, sorted);
    }
  }

  /**
   * 按状态渲染看板
   */
  private renderStatusBoard(container: HTMLElement, entities: Entity[]): void {
    const board = container.createDiv('pm-kanban-board');

    KANBAN_COLUMNS.forEach((column) => {
      const columnEl = this.createColumn(board, column.label, column.color);

      // 过滤该状态的实体
      const columnEntities = entities.filter(
        (e) => 'status' in e && e.status === column.id
      );

      // 渲染列标题计数
      const countEl = columnEl.querySelector('.pm-kanban-column-count');
      if (countEl) {
        countEl.textContent = String(columnEntities.length);
      }

      // 渲染实体卡片
      const cardsContainer = columnEl.querySelector('.pm-kanban-cards') as HTMLElement;
      if (cardsContainer) {
        columnEntities.forEach((entity) => {
          this.renderKanbanCard(cardsContainer, entity);
        });
      }
    });
  }

  /**
   * 按优先级渲染看板
   */
  private renderPriorityBoard(container: HTMLElement, entities: Entity[]): void {
    const priorities = PRIORITY_OPTIONS.map(opt => ({
      id: opt.id,
      label: opt.label,
      color: opt.color,
    }));

    const board = container.createDiv('pm-kanban-board');

    priorities.forEach((priority) => {
      const columnEl = this.createColumn(board, priority.label, priority.color);

      const columnEntities = entities.filter(
        (e) => 'priority' in e && e.priority === priority.id
      );

      const countEl = columnEl.querySelector('.pm-kanban-column-count');
      if (countEl) {
        countEl.textContent = String(columnEntities.length);
      }

      const cardsContainer = columnEl.querySelector('.pm-kanban-cards') as HTMLElement;
      if (cardsContainer) {
        columnEntities.forEach((entity) => {
          this.renderKanbanCard(cardsContainer, entity);
        });
      }
    });
  }

  /**
   * 创建看板列
   */
  private createColumn(
    board: HTMLElement,
    title: string,
    color: string,
    compact: boolean = false
  ): HTMLElement {
    const column = board.createDiv('pm-kanban-column');
    if (compact) {
      column.addClass('pm-kanban-column-compact');
    }

    // 列标题
    const header = column.createDiv('pm-kanban-column-header');

    const titleEl = header.createDiv('pm-kanban-column-title');
    titleEl.createSpan({ cls: 'pm-kanban-column-dot', attr: { style: `background: ${color}` } });
    titleEl.createSpan({ text: title });

    header.createSpan({ cls: 'pm-kanban-column-count', text: '0' });

    // 卡片容器
    const cardsContainer = column.createDiv('pm-kanban-cards');

    return column;
  }

  /**
   * 渲染看板卡片 - 使用 EntityCard 组件，只读模式
   */
  private renderKanbanCard(
    container: HTMLElement,
    entity: Entity
  ): void {
    const entityType = getEntityType(entity);
    const wrapper = container.createDiv('pm-kanban-card-wrapper');
    const logSummary = this.entityManager.cache.getLogSummary(entity.id);

    const card = new EntityCard(this.app);
    card.render(
      wrapper,
      entity,
      {
        ...this.buildCardOptions(),
        draggable: false,
        smallTitle: true,
        showActions: false,
      },
      {
        onOpen: () => this.actionService.openEntity(entityType, entity.id),
      },
      logSummary || undefined
    );
  }
}

// 自注册到渲染器注册表
RendererRegistry.register('kanban', KanbanRenderer);
