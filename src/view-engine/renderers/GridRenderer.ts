import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { CardRegistry } from '../../ui/cards';
import type { DataService, ActionService } from '../services';
import type { ViewConfig, Entity, EntityType } from '../types';
import { getEntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';

/**
 * 网格渲染器
 * 卡片网格视图
 */
export class GridRenderer extends BaseRenderer {
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
   * 渲染网格视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-grid-view');

    // 加载数据
    this.entities = await this.dataService.loadEntities(this.config);

    // 应用过滤和排序
    const filtered = this.dataService.applyFilters(this.entities, this.config.filter);
    const sorted = this.dataService.applySort(
      filtered,
      this.config.sortBy,
      this.config.sortOrder
    );

    // 限制数量
    const limited = this.config.limit ? sorted.slice(0, this.config.limit) : sorted;

    // 创建工具栏（如果不是在 cascade-selector 中）
    if (!(this.config as any)._hideToolbar) {
      this.createToolbar(container, (this.config as any).title || '网格视图', {
        total: this.entities.length,
        filtered: limited.length,
      });
    }

    // 创建网格容器
    const gridContainer = container.createDiv('pm-grid-container');
    
    // 设置列数
    const cols = this.config.cols || 3;
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridContainer.style.gap = '16px';

    // 渲染卡片
    if (limited.length === 0) {
      this.createEmptyState(gridContainer, '没有匹配的实体');
    } else {
      for (const entity of limited) {
        await this.renderGridCard(gridContainer, entity);
      }
    }
  }

  /**
   * 渲染网格卡片
   */
  private async renderGridCard(container: HTMLElement, entity: Entity): Promise<void> {
    const card = container.createDiv('pm-grid-card');

    // 卡片头部
    const header = card.createDiv('pm-grid-card-header');

    const entityType = getEntityType(entity);
    
    // 类型标签
    const typeLabel = header.createSpan('pm-grid-card-type');
    typeLabel.textContent = this.getEntityTypeLabel(entityType);

    // 优先级标记
    if ('priority' in entity && entity.priority) {
      const priorityColors: Record<string, string> = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#22c55e',
      };
      header.createSpan({
        cls: 'pm-grid-card-priority',
        attr: { style: `background: ${priorityColors[entity.priority] || '#9ca3af'}` },
      });
    }

    // 卡片主体
    const body = card.createDiv('pm-grid-card-body');

    // 名称
    body.createEl('h3', { cls: 'pm-grid-card-title', text: entity.name });

    // 描述（版本/项目有描述）
    if ('description' in entity && entity.description) {
      const desc = body.createDiv('pm-grid-card-desc');
      const descText = String(entity.description);
      desc.textContent = descText.substring(0, 100);
      if (descText.length > 100) {
        desc.textContent += '...';
      }
    }

    // 状态标签
    if ('status' in entity && entity.status) {
      const statusColors: Record<string, string> = {
        backlog: '#9ca3af',
        todo: '#3b82f6',
        'in-progress': '#f59e0b',
        testing: '#8b5cf6',
        completed: '#22c55e',
        archived: '#6b7280',
      };
      const statusEl = body.createDiv('pm-grid-card-status');
      statusEl.createSpan({
        cls: 'pm-status-dot',
        attr: { style: `background: ${statusColors[entity.status] || '#9ca3af'}` },
      });
      statusEl.createSpan({ text: this.translateStatus(entity.status) });
    }

    // 标签
    if ('tags' in entity && entity.tags && entity.tags.length > 0) {
      const tagsEl = body.createDiv('pm-grid-card-tags');
      entity.tags.slice(0, 4).forEach((tag) => {
        tagsEl.createSpan({ cls: 'pm-grid-card-tag', text: tag });
      });
    }

    // 卡片底部
    const footer = card.createDiv('pm-grid-card-footer');

    // 负责人
    if (entity.owner) {
      footer.createDiv({
        cls: 'pm-grid-card-owner',
        text: `👤 ${entity.owner}`,
      });
    }

    // 截止日期
    if ('dueDate' in entity && entity.dueDate) {
      const isOverdue = new Date(entity.dueDate) < new Date() && 
                        'status' in entity && 
                        entity.status !== 'completed';
      footer.createDiv({
        cls: `pm-grid-card-due${isOverdue ? ' pm-overdue' : ''}`,
        text: `📅 ${this.formatDate(entity.dueDate)}`,
      });
    }

    // 进度条（仅特性）
    if (entityType === 'feature' && 'progress' in entity) {
      const progress = entity.progress || 0;
      const progressEl = footer.createDiv('pm-grid-card-progress');
      progressEl.createDiv({
        cls: 'pm-progress-bar',
        attr: { style: `width: ${progress}%` },
      });
      progressEl.createSpan({ cls: 'pm-progress-text', text: `${progress}%` });
    }

    // 统计信息（版本/项目）
    if (entityType === 'version' || entityType === 'project') {
      const statsEl = footer.createDiv('pm-grid-card-stats');
      
      if ('stats' in entity && entity.stats) {
        const stats = entity.stats as { total: number; completed: number };
        statsEl.createSpan({ text: `📊 ${stats.total} 特性` });
        if (stats.completed > 0) {
          statsEl.createSpan({ text: `✅ ${stats.completed} 完成` });
        }
      }
    }

    // 快速操作
    const actions = card.createDiv('pm-grid-card-actions');
    actions.style.display = 'none';

    // 状态选择
    if ('status' in entity) {
      const statusBtn = actions.createEl('button', { cls: 'pm-action-btn' });
      statusBtn.textContent = '状态';
      statusBtn.onclick = (e) => {
        e.stopPropagation();
        this.showStatusPicker(entity);
      };
    }

    // 进度（仅特性）
    if (getEntityType(entity) === 'feature') {
      const progressBtn = actions.createEl('button', { cls: 'pm-action-btn' });
      progressBtn.textContent = '进度';
      progressBtn.onclick = (e) => {
        e.stopPropagation();
        this.showProgressPicker(entity);
      };
    }

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
   * 获取实体类型标签
   */
  private getEntityTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      version: '版本',
      project: '项目',
      feature: '特性',
    };
    return labels[type] || type;
  }

  /**
   * 格式化日期
   */
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  }
}
