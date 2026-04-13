import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, EntityType, getEntityType } from '../types';
import type { CreateFeatureData, FeatureStatus } from '../../types';
import { BaseRenderer } from './BaseRenderer';
import { RendererRegistry } from '../RendererRegistry';
import {
  KANBAN_COLUMNS,
  PRIORITY_OPTIONS,
  getPriorityColor,
  getNextStatus,
  DateFormat,
} from '../design-tokens';

/**
 * 看板渲染器 - 卡片式风格
 * Trello 风格的看板视图，统一卡片设计
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
    container.empty();
    container.addClass('pm-kanban-view');

    // 使用基类统一的数据准备方法
    const sorted = await this.prepareData();
    this.entities = sorted;

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
      const columnEl = this.createColumn(board, column.label, column.color, false, column.id);
      
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
    compact: boolean = false,
    statusId?: string
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

    // 设置拖放区域（仅状态列）
    if (statusId) {
      this.setupDropZone(cardsContainer, statusId);
    }

    return column;
  }

  /**
   * 设置拖放区域
   */
  private setupDropZone(container: HTMLElement, statusId: string): void {
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      container.addClass('pm-kanban-drag-over');
    });

    container.addEventListener('dragleave', () => {
      container.removeClass('pm-kanban-drag-over');
    });

    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      container.removeClass('pm-kanban-drag-over');

      const entityId = e.dataTransfer?.getData('text/plain');
      const entityType = e.dataTransfer?.getData('entity-type') as EntityType;

      if (entityId && entityType) {
        await this.actionService.changeStatus(entityType, entityId, statusId);
        const boardContainer = container.closest('.pm-kanban-view') as HTMLElement;
        if (boardContainer) {
          this.render(boardContainer);
        }
      }
    });
  }

  /**
   * 显示快速创建模态框
   */
  private async showQuickCreateModal(status: string): Promise<void> {
    const { QuickCreateModal } = await import('../../modals/QuickCreateModal');

    new QuickCreateModal(
      this.app,
      this.entityManager,
      new Date().toISOString().split('T')[0],
      async (data: CreateFeatureData) => {
        try {
          const featureData = { ...data, status: status as FeatureStatus };
          await this.entityManager.createFeature(featureData);
          this.render(document.querySelector('.pm-kanban-view') as HTMLElement);
        } catch (error) {
          console.error('创建特性失败:', error);
        }
      }
    ).open();
  }

  /**
   * 渲染看板卡片 - 卡片式风格
   */
  private renderKanbanCard(
    container: HTMLElement,
    entity: Entity
  ): void {
    const entityType = getEntityType(entity);

    // 创建卡片
    const card = container.createDiv('pm-kanban-card');
    card.draggable = entityType === 'feature' && 'status' in entity;
    
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', entity.id);
      e.dataTransfer?.setData('entity-type', entityType);
      card.addClass('pm-kanban-card-dragging');
    });
    
    card.addEventListener('dragend', () => {
      card.removeClass('pm-kanban-card-dragging');
    });

    // 优先级标记条
    if ('priority' in entity && entity.priority) {
      const priorityColor = getPriorityColor(entity.priority);
      const priorityBar = card.createDiv('pm-kanban-card-priority-bar');
      priorityBar.style.background = priorityColor.bg;
    }

    // 卡片头部
    const header = card.createDiv('pm-kanban-card-header');
    
    // 标题
    const titleEl = header.createDiv('pm-kanban-card-title');
    titleEl.textContent = entity.name;

    // 悬停操作按钮
    const actions = header.createDiv('pm-kanban-card-actions');
    
    // 状态快速流转按钮
    if ('status' in entity) {
      const nextStatus = this.getNextStatus(entity.status);
      if (nextStatus) {
        const btn = actions.createEl('button', { cls: 'pm-kanban-action-btn' });
        btn.textContent = '→';
        btn.title = `移动到: ${nextStatus.label}`;
        btn.onclick = (e) => {
          e.stopPropagation();
          this.actionService.changeStatus(entityType, entity.id, nextStatus.id);
        };
      }
    }

    // 添加进展按钮
    if (entityType === 'feature') {
      const noteBtn = actions.createEl('button', { cls: 'pm-kanban-action-btn' });
      noteBtn.textContent = '📝';
      noteBtn.title = '添加进展反馈';
      noteBtn.onclick = (e) => {
        e.stopPropagation();
        this.showProgressNoteInput(entity, card);
      };
    }

    // 打开文件按钮
    const openBtn = actions.createEl('button', { cls: 'pm-kanban-action-btn' });
    openBtn.textContent = '↗';
    openBtn.title = '打开文件';
    openBtn.onclick = (e) => {
      e.stopPropagation();
      this.actionService.openEntity(entityType, entity.id);
    };

    // 卡片内容区
    const content = card.createDiv('pm-kanban-card-content');

    // 标签
    if (entity.tags && entity.tags.length > 0) {
      const tagsContainer = content.createDiv('pm-kanban-card-tags');
      entity.tags.slice(0, 3).forEach((tag: string) => {
        tagsContainer.createSpan({ cls: 'pm-kanban-card-tag', text: tag });
      });
      if (entity.tags.length > 3) {
        tagsContainer.createSpan({
          cls: 'pm-kanban-card-tag-more',
          text: `+${entity.tags.length - 3}`
        });
      }
    }

    // 卡片底部信息
    const footer = card.createDiv('pm-kanban-card-footer');

    // 左侧：负责人
    if (entity.owner) {
      footer.createSpan({ cls: 'pm-kanban-card-owner', text: `@${entity.owner}` });
    }

    // 中间：进度
    if ('progress' in entity && entity.progress !== undefined) {
      const progressEl = footer.createDiv('pm-kanban-card-progress');
      const progressBar = progressEl.createDiv('pm-kanban-card-progress-bar');
      progressBar.createDiv({
        cls: 'pm-kanban-card-progress-fill',
        attr: { style: `width: ${entity.progress}%` }
      });
      progressEl.createSpan({
        cls: 'pm-kanban-card-progress-text',
        text: `${entity.progress}%`
      });
    }

    // 右侧：结束日期
    if ('endDate' in entity && entity.endDate) {
      const isOverdue = new Date(entity.endDate) < new Date() &&
                        'status' in entity &&
                        entity.status !== 'completed';
      footer.createSpan({
        cls: `pm-kanban-card-due${isOverdue ? ' pm-overdue' : ''}`,
        text: DateFormat.short(entity.endDate),
      });
    }

    // 点击卡片打开
    card.addEventListener('click', async (e) => {
      e.stopPropagation();
      console.log('[KanbanRenderer] Card clicked:', entity.name, entityType, entity.id);
      await this.actionService.openEntity(entityType, entity.id);
    });
  }

  /**
   * 获取下一个状态（用于快速切换）
   */
  private getNextStatus(currentStatus: string): { id: string; label: string } | null {
    return getNextStatus(currentStatus);
  }
}

// 自注册到渲染器注册表
RendererRegistry.register('kanban', KanbanRenderer);
