import type { App, MarkdownPostProcessorContext } from 'obsidian';
import type { EntityManager } from '../../core';
import type { CardRegistry } from '../../ui/cards';
import type { DataService, ActionService } from '../services';
import { ViewConfig, ViewContext, Entity, EntityType, getEntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';

/**
 * 看板渲染器
 * Trello 风格的看板视图
 */
export class KanbanRenderer extends BaseRenderer {
  // 状态列定义
  private static readonly STATUS_COLUMNS = [
    { id: 'backlog', label: '待处理', color: '#9ca3af' },
    { id: 'todo', label: '待开始', color: '#3b82f6' },
    { id: 'in-progress', label: '进行中', color: '#f59e0b' },
    { id: 'testing', label: '测试中', color: '#8b5cf6' },
    { id: 'completed', label: '已完成', color: '#22c55e' },
  ];

  private entities: Entity[] = [];

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
   * 渲染看板视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-kanban-view');

    // 加载数据
    this.entities = await this.dataService.loadEntities(this.config);
    
    // 应用过滤和排序
    const filtered = this.dataService.applyFilters(this.entities, this.config.filter);
    const sorted = this.dataService.applySort(
      filtered,
      this.config.sortBy,
      this.config.sortOrder
    );

    // 创建工具栏（如果不是在 cascade-selector 中）
    if (!(this.config as any)._hideToolbar) {
      this.createToolbar(container, (this.config as any).title || '看板视图', {
        total: this.entities.length,
        filtered: sorted.length,
      });
    }

    // 创建看板容器
    const boardContainer = container.createDiv('pm-kanban-container');

    console.log('[KanbanRenderer] 渲染', sorted.length, '个实体');

    // 根据 groupBy 决定如何分组
    if (this.config.groupBy === 'status' || !this.config.groupBy) {
      // 按状态分组（默认）
      this.renderStatusBoard(boardContainer, sorted);
    } else if (this.config.groupBy === 'version') {
      // 按版本分组
      this.renderGroupedBoard(boardContainer, sorted, 'versionId', '版本');
    } else if (this.config.groupBy === 'project') {
      // 按项目分组
      this.renderGroupedBoard(boardContainer, sorted, 'projectId', '项目');
    } else if (this.config.groupBy === 'priority') {
      // 按优先级分组
      this.renderPriorityBoard(boardContainer, sorted);
    }
  }

  /**
   * 按状态渲染看板
   */
  private renderStatusBoard(container: HTMLElement, entities: Entity[]): void {
    const board = container.createDiv('pm-kanban-board');

    KanbanRenderer.STATUS_COLUMNS.forEach((column) => {
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
    const priorities = [
      { id: 'critical', label: '紧急', color: '#ef4444' },
      { id: 'high', label: '高', color: '#f97316' },
      { id: 'medium', label: '中', color: '#f59e0b' },
      { id: 'low', label: '低', color: '#22c55e' },
    ];

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
   * 按字段分组渲染看板（版本/项目等）
   */
  private renderGroupedBoard(
    container: HTMLElement,
    entities: Entity[],
    groupField: string,
    groupLabel: string
  ): void {
    // 按字段分组
    const groups = this.dataService.groupByField(entities, groupField);

    // 渲染每个分组
    groups.forEach((groupEntities, groupKey) => {
      const section = container.createDiv('pm-kanban-section');
      
      // 分组标题
      const header = section.createDiv('pm-kanban-section-header');
      header.createSpan({ text: `${groupLabel}: ${groupKey}` });
      header.createSpan({ cls: 'pm-kanban-section-count', text: `(${groupEntities.length})` });

      // 分组内的看板
      const board = section.createDiv('pm-kanban-board pm-kanban-board-nested');

      KanbanRenderer.STATUS_COLUMNS.forEach((column) => {
        const columnEl = this.createColumn(board, column.label, column.color, true);

        const columnEntities = groupEntities.filter(
          (e) => 'status' in e && e.status === column.id
        );

        const countEl = columnEl.querySelector('.pm-kanban-column-count');
        if (countEl) {
          countEl.textContent = String(columnEntities.length);
        }

        const cardsContainer = columnEl.querySelector('.pm-kanban-cards') as HTMLElement;
        if (cardsContainer) {
          columnEntities.forEach((entity) => {
            this.renderKanbanCard(cardsContainer, entity, { compact: true });
          });
        }
      });
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
    header.style.borderLeftColor = color;

    const titleEl = header.createDiv('pm-kanban-column-title');
    titleEl.createSpan({ cls: 'pm-kanban-column-dot', attr: { style: `background: ${color}` } });
    titleEl.createSpan({ text: title });

    header.createSpan({ cls: 'pm-kanban-column-count', text: '0' });

    // 卡片容器
    column.createDiv('pm-kanban-cards');

    return column;
  }

  /**
   * 渲染看板卡片
   */
  private renderKanbanCard(
    container: HTMLElement,
    entity: Entity,
    options?: { compact?: boolean }
  ): void {
    const card = container.createDiv('pm-kanban-card');
    if (options?.compact) {
      card.addClass('pm-kanban-card-compact');
    }

    // 卡片头部
    const header = card.createDiv('pm-kanban-card-header');
    
    // 优先级标记（如果有）
    if ('priority' in entity && entity.priority) {
      const priorityColors: Record<string, string> = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#22c55e',
      };
      header.createSpan({
        cls: 'pm-kanban-card-priority',
        attr: { style: `background: ${priorityColors[entity.priority] || '#9ca3af'}` },
      });
    }

    // 实体名称
    header.createEl('span', { cls: 'pm-kanban-card-title', text: entity.name });

    // 卡片内容
    const content = card.createDiv('pm-kanban-card-content');

    // 标签（如果有）
    if ('tags' in entity && entity.tags && entity.tags.length > 0 && !options?.compact) {
      const tags = content.createDiv('pm-kanban-card-tags');
      entity.tags.slice(0, 3).forEach((tag) => {
        tags.createSpan({ cls: 'pm-kanban-card-tag', text: tag });
      });
      if (entity.tags.length > 3) {
        tags.createSpan({ cls: 'pm-kanban-card-tag-more', text: `+${entity.tags.length - 3}` });
      }
    }

    // 底部信息
    const footer = card.createDiv('pm-kanban-card-footer');

    // 负责人
    if (entity.owner) {
      footer.createSpan({ cls: 'pm-kanban-card-owner', text: entity.owner });
    }

    // 截止日期
    if ('dueDate' in entity && entity.dueDate && !options?.compact) {
      const isOverdue = new Date(entity.dueDate) < new Date() && 
                        'status' in entity && 
                        entity.status !== 'completed';
      footer.createSpan({
        cls: `pm-kanban-card-due${isOverdue ? ' pm-overdue' : ''}`,
        text: this.formatDate(entity.dueDate),
      });
    }

    // 进度（仅特性）
    if (getEntityType(entity) === 'feature' && 'progress' in entity && !options?.compact) {
      const progress = entity.progress || 0;
      const progressBar = footer.createDiv('pm-kanban-card-progress');
      progressBar.createDiv({
        cls: 'pm-kanban-card-progress-bar',
        attr: { style: `width: ${progress}%` },
      });
      progressBar.createSpan({ cls: 'pm-kanban-card-progress-text', text: `${progress}%` });
    }

    // 快速操作（悬停显示）
    const actions = card.createDiv('pm-kanban-card-actions');
    actions.style.display = 'none';

    // 状态快速切换
    if ('status' in entity) {
      const nextStatus = this.getNextStatus(entity.status);
      if (nextStatus) {
        const btn = actions.createEl('button', { cls: 'pm-action-btn-small' });
        btn.textContent = '→';
        btn.title = `移动到: ${nextStatus.label}`;
        btn.onclick = (e) => {
          e.stopPropagation();
          this.actionService.changeStatus(getEntityType(entity) as EntityType, entity.id, nextStatus.id);
        };
      }
    }

    // 打开文件按钮
    const openBtn = actions.createEl('button', { cls: 'pm-action-btn-small' });
    openBtn.textContent = '↗';
    openBtn.title = '打开文件';
    openBtn.onclick = (e) => {
      e.stopPropagation();
      this.actionService.openEntity(getEntityType(entity) as EntityType, entity.id);
    };

    // 悬停显示操作
    card.addEventListener('mouseenter', () => {
      actions.style.display = 'flex';
    });
    card.addEventListener('mouseleave', () => {
      actions.style.display = 'none';
    });

    // 点击打开文件
    card.addEventListener('click', () => {
      this.actionService.openEntity(getEntityType(entity) as EntityType, entity.id);
    });
  }

  /**
   * 获取下一个状态（用于快速切换）
   */
  private getNextStatus(currentStatus: string): { id: string; label: string } | null {
    const flow: Record<string, string> = {
      backlog: 'todo',
      todo: 'in-progress',
      'in-progress': 'testing',
      testing: 'completed',
    };

    const nextId = flow[currentStatus];
    if (!nextId) return null;

    const column = KanbanRenderer.STATUS_COLUMNS.find((c) => c.id === nextId);
    return column ? { id: nextId, label: column.label } : null;
  }

  /**
   * 格式化日期
   */
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
}
