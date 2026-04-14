import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import type { ViewConfig, Entity, EntityType } from '../types';
import { getEntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';
import { RendererRegistry } from '../RendererRegistry';
import { getPriorityColor, DateFormat, isOverdue } from '../design-tokens';

/**
 * 网格渲染器 - 卡片式网格视图
 * 统一卡片设计，支持响应式布局
 */
export class GridRenderer extends BaseRenderer {
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
   * 渲染网格视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-grid-view');

    // 使用基类统一的数据准备方法（已包含 limit）
    let sorted = await this.prepareData();
    this.entities = sorted;

    // 创建网格容器
    const gridContainer = container.createDiv('pm-grid-container');

    // 设置列数
    const cols = this.config.cols || 3;
    gridContainer.style.setProperty('--grid-cols', String(cols));

    // 渲染卡片
    if (sorted.length === 0) {
      this.createEmptyState(gridContainer, '没有匹配的实体');
    } else {
      for (const entity of sorted) {
        await this.renderGridCard(gridContainer, entity);
      }
    }
  }

  /**
   * 渲染网格卡片 - 统一卡片式风格
   */
  private async renderGridCard(container: HTMLElement, entity: Entity): Promise<void> {
    const entityType = getEntityType(entity);

    // 创建卡片
    const card = container.createDiv('pm-grid-card');

    // 优先级标记条（顶部）
    if ('priority' in entity && entity.priority) {
      const priorityColor = getPriorityColor(entity.priority);
      const priorityBar = card.createDiv('pm-grid-card-priority-bar');
      priorityBar.style.background = priorityColor.bg;
    }

    // 卡片头部
    const header = card.createDiv('pm-grid-card-header');
    
    // 类型标签
    const typeLabel = header.createDiv('pm-grid-card-type');
    typeLabel.textContent = this.getEntityTypeLabel(entityType);

    // 操作按钮（悬停显示）
    const actions = header.createDiv('pm-grid-card-header-actions');
    
    if ('status' in entity) {
      const statusBtn = actions.createEl('button', { cls: 'pm-grid-action-btn' });
      statusBtn.textContent = '⚡';
      statusBtn.title = '变更状态';
      statusBtn.onclick = (e) => {
        e.stopPropagation();
        this.showStatusPicker(entity as Entity & { status: string }, statusBtn);
      };
    }

    const openBtn = actions.createEl('button', { cls: 'pm-grid-action-btn' });
    openBtn.textContent = '↗';
    openBtn.title = '打开文件';
    openBtn.onclick = (e) => {
      e.stopPropagation();
      this.actionService.openEntity(entityType, entity.id);
    };

    // 卡片主体
    const body = card.createDiv('pm-grid-card-body');

    // 标题
    body.createDiv({ cls: 'pm-grid-card-title', text: entity.name });

    // 描述（如果有）
    if ('description' in entity && entity.description && typeof entity.description === 'string' && this.shouldShowCardField('description')) {
      body.createDiv({
        cls: 'pm-grid-card-desc',
        text: entity.description
      });
    }

    // 状态标签
    if ('status' in entity && entity.status && this.shouldShowCardField('status')) {
      body.createSpan({
        cls: `pm-grid-card-status pm-status-${entity.status}`,
        text: this.translateStatus(entity.status),
      });
    }

    // 标签
    if (entity.tags && entity.tags.length > 0 && this.shouldShowCardField('tags')) {
      const tagsContainer = body.createDiv('pm-grid-card-tags');
      entity.tags.slice(0, 4).forEach(tag => {
        tagsContainer.createSpan({ cls: 'pm-grid-card-tag', text: tag });
      });
      if (entity.tags.length > 4) {
        tagsContainer.createSpan({
          cls: 'pm-grid-card-tag-more',
          text: `+${entity.tags.length - 4}`
        });
      }
    }

    // 卡片底部
    const footer = card.createDiv('pm-grid-card-footer');

    // 左侧信息
    const footerLeft = footer.createDiv('pm-grid-card-footer-left');

    if (entity.owner && this.shouldShowCardField('owner')) {
      footerLeft.createSpan({
        cls: 'pm-grid-card-owner',
        text: `@${entity.owner}`
      });
    }

    // 开始日期
    if ('startDate' in entity && entity.startDate && this.shouldShowCardField('startDate')) {
      footerLeft.createSpan({
        cls: 'pm-grid-card-start',
        text: DateFormat.short(entity.startDate),
      });
    }

    // 结束日期
    if ('endDate' in entity && entity.endDate && this.shouldShowCardField('endDate')) {
      const isOverdueDate = isOverdue(entity.endDate, entity.status as any);
      footerLeft.createSpan({
        cls: `pm-grid-card-due${isOverdueDate ? ' pm-overdue' : ''}`,
        text: DateFormat.short(entity.endDate),
      });
    }

    // 右侧：进度
    if ('progress' in entity && entity.progress !== undefined && this.shouldShowCardField('progress')) {
      const progressEl = footer.createDiv('pm-grid-card-progress');
      const progressBar = progressEl.createDiv('pm-grid-card-progress-bar');
      progressBar.createDiv({
        cls: 'pm-grid-card-progress-fill',
        attr: { style: `width: ${entity.progress}%` }
      });
      progressEl.createSpan({ text: `${entity.progress}%` });
    }

    // 点击卡片打开
    card.addEventListener('click', async () => {
      await this.actionService.openEntity(entityType, entity.id);
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
}

// 自注册到渲染器注册表
RendererRegistry.register('grid', GridRenderer);
