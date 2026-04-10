import type { App } from 'obsidian';
import type { Entity, EntityType } from '../types';
import { getEntityType } from '../types';
import {
  getPriorityColor,
  getStatusColor,
  getEntityIcon,
  getEntityLabel,
  translateStatus,
  DateFormat,
  isOverdue,
} from '../design-tokens';
import { StatusPicker, ProgressPicker } from './index';

/**
 * 实体卡片选项
 */
export interface EntityCardOptions {
  /** 显示操作按钮 */
  showActions?: boolean;
  /** 显示进度条 */
  showProgress?: boolean;
  /** 显示状态徽章 */
  showStatus?: boolean;
  /** 显示优先级标记 */
  showPriority?: boolean;
  /** 显示负责人 */
  showOwner?: boolean;
  /** 显示截止日期 */
  showDueDate?: boolean;
  /** 显示标签 */
  showTags?: boolean;
  /** 显示所属项目/版本 */
  showParent?: boolean;
  /** 显示描述 */
  showDescription?: boolean;
  /** 显示类型图标 */
  showTypeIcon?: boolean;
  /** 标题使用小字体（类似 compact 模式） */
  smallTitle?: boolean;
  /** 显示统计信息（仅版本/项目） */
  showStats?: boolean;
  /** 可拖拽 */
  draggable?: boolean;
  /** 选中状态 */
  selected?: boolean;
}

/**
 * 卡片操作回调
 */
export interface EntityCardCallbacks {
  /** 点击打开 */
  onOpen?: (entity: Entity) => void;
  /** 状态变更 */
  onStatusChange?: (entity: Entity, status: string) => void;
  /** 进度变更 */
  onProgressChange?: (entity: Entity, progress: number) => void;
  /** 添加进展反馈 */
  onAddNote?: (entity: Entity) => void;
  /** 拖拽开始 */
  onDragStart?: (entity: Entity, e: DragEvent) => void;
  /** 拖拽结束 */
  onDragEnd?: (entity: Entity, e: DragEvent) => void;
}

/**
 * 实体卡片组件
 * 精致极简主义设计语言
 */
export class EntityCard {
  private statusPicker?: StatusPicker;
  private progressPicker?: ProgressPicker;

  constructor(private app: App) {}

  /**
   * 渲染实体卡片
   */
  render(
    container: HTMLElement,
    entity: Entity,
    options: EntityCardOptions,
    callbacks?: EntityCardCallbacks
  ): HTMLElement {
    const entityType = getEntityType(entity);
    const card = container.createDiv('pm-entity-card');

    // 应用实体类型类
    card.addClass(`pm-entity-card--${entityType}`);

    // 选中状态
    if (options.selected) {
      card.addClass('pm-entity-card--selected');
    }

    // 可拖拽
    if (options.draggable && entityType === 'feature') {
      card.setAttribute('draggable', 'true');
      card.addClass('pm-entity-card--draggable');
      this.setupDragEvents(card, entity, callbacks);
    }

    // 渲染卡片内容
    this.renderHeader(card, entity, options);
    this.renderBody(card, entity, options);
    this.renderFooter(card, entity, options);

    // 操作按钮
    if (options.showActions) {
      this.renderActions(card, entity, options, callbacks);
    }

    // 点击事件
    card.addEventListener('click', () => {
      callbacks?.onOpen?.(entity);
    });

    return card;
  }

  /**
   * 渲染卡片头部
   */
  private renderHeader(
    card: HTMLElement,
    entity: Entity,
    options: EntityCardOptions
  ): void {
    const header = card.createDiv('pm-entity-card__header');
    const entityType = getEntityType(entity);

    // 优先级标记
    if (options.showPriority && 'priority' in entity && entity.priority) {
      const priorityEl = header.createSpan('pm-entity-card__priority');
      priorityEl.addClass(`pm-entity-card__priority--${entity.priority}`);
    }

    // 类型图标
    if (options.showTypeIcon) {
      const iconEl = header.createSpan('pm-entity-card__type-icon');
      iconEl.textContent = getEntityIcon(entityType);
    }

    // 实体名称
    const titleEl = header.createEl(options.smallTitle ? 'span' : 'h3', {
      cls: 'pm-entity-card__title',
    });
    titleEl.textContent = entity.name;

    // 状态徽章
    if (options.showStatus && 'status' in entity && entity.status) {
      const statusEl = header.createSpan('pm-entity-card__status');
      statusEl.addClass(`pm-status-badge--${entity.status}`);
      statusEl.textContent = translateStatus(entity.status);
    }
  }

  /**
   * 渲染卡片主体
   */
  private renderBody(
    card: HTMLElement,
    entity: Entity,
    options: EntityCardOptions
  ): void {
    // 如果没有需要显示的主体内容，跳过
    if (!options.showParent && !options.showDescription && !options.showTags) return;

    const body = card.createDiv('pm-entity-card__body');
    const entityType = getEntityType(entity);

    // 所属项目/版本
    if (options.showParent && entityType === 'feature') {
      const feature = entity as any;
      if (feature.projectId || feature.versionId) {
        const parentEl = body.createDiv('pm-entity-card__parent');
        if (feature.projectId) {
          parentEl.textContent = feature.projectId;
        } else if (feature.versionId) {
          parentEl.textContent = feature.versionId;
        }
      }
    }

    // 描述
    if (options.showDescription && 'description' in entity && entity.description) {
      const descEl = body.createDiv('pm-entity-card__description');
      const descText = String(entity.description);
      descEl.textContent = descText.length > 100 ? descText.substring(0, 100) + '...' : descText;
    }

    // 标签
    if (options.showTags && 'tags' in entity && entity.tags && entity.tags.length > 0) {
      const tagsEl = body.createDiv('pm-entity-card__tags');
      const limit = 3;
      entity.tags.slice(0, limit).forEach((tag) => {
        tagsEl.createSpan({ cls: 'pm-entity-card__tag', text: tag });
      });
      if (entity.tags.length > limit) {
        tagsEl.createSpan({
          cls: 'pm-entity-card__tag-more',
          text: `+${entity.tags.length - limit}`,
        });
      }
    }
  }

  /**
   * 渲染卡片底部
   */
  private renderFooter(
    card: HTMLElement,
    entity: Entity,
    options: EntityCardOptions
  ): void {
    const footer = card.createDiv('pm-entity-card__footer');
    const entityType = getEntityType(entity);

    // 左侧元信息
    const metaLeft = footer.createDiv('pm-entity-card__meta-left');

    // 负责人
    if (options.showOwner && entity.owner) {
      const ownerEl = metaLeft.createDiv('pm-entity-card__owner');
      ownerEl.textContent = entity.owner;
    }

    // 结束日期
    if (options.showDueDate && 'endDate' in entity && entity.endDate) {
      const overdue = isOverdue(entity.endDate, 'status' in entity ? entity.status : undefined);
      const dueEl = metaLeft.createDiv('pm-entity-card__due');
      dueEl.textContent = DateFormat.medium(entity.endDate);
      if (overdue) {
        dueEl.addClass('pm-entity-card__due--overdue');
      }
    }

    // 右侧元信息
    const metaRight = footer.createDiv('pm-entity-card__meta-right');

    // 进度条（仅特性）
    if (options.showProgress && entityType === 'feature' && 'progress' in entity) {
      const progress = entity.progress || 0;
      const progressEl = metaRight.createDiv('pm-entity-card__progress');

      const trackEl = progressEl.createDiv('pm-entity-card__progress-track');
      const fillEl = trackEl.createDiv('pm-entity-card__progress-fill');
      fillEl.style.width = `${progress}%`;

      progressEl.createSpan({
        cls: 'pm-entity-card__progress-text',
        text: `${progress}%`
      });
    }

    // 统计信息（版本/项目）
    if (options.showStats && (entityType === 'version' || entityType === 'project')) {
      if ('stats' in entity && entity.stats) {
        const stats = entity.stats as { total: number; completed: number };
        if (stats.total > 0) {
          const statsEl = metaRight.createDiv('pm-entity-card__stats');
          statsEl.textContent = `${stats.completed || 0}/${stats.total}`;
        }
      }
    }

    // 如果右侧没有内容，移除它
    if (!metaRight.hasChildNodes()) {
      metaRight.remove();
    }
    // 如果左侧没有内容，移除它
    if (!metaLeft.hasChildNodes()) {
      metaLeft.remove();
    }
  }

  /**
   * 渲染操作按钮
   */
  private renderActions(
    card: HTMLElement,
    entity: Entity,
    options: EntityCardOptions,
    callbacks?: EntityCardCallbacks
  ): void {
    const actions = card.createDiv('pm-entity-card__actions');

    // 状态变更按钮
    if ('status' in entity) {
      const statusBtn = actions.createEl('button', {
        cls: 'pm-entity-card__action-btn',
        attr: { title: '变更状态' },
      });
      statusBtn.textContent = '⚡';
      statusBtn.onclick = (e) => {
        e.stopPropagation();
        this.showStatusPicker(entity, statusBtn, callbacks);
      };
    }

    // 进度编辑按钮（仅特性）
    if (getEntityType(entity) === 'feature' && options.showProgress) {
      const progressBtn = actions.createEl('button', {
        cls: 'pm-entity-card__action-btn',
        attr: { title: '更新进度' },
      });
      progressBtn.textContent = '📊';
      progressBtn.onclick = (e) => {
        e.stopPropagation();
        this.showProgressPicker(entity, progressBtn, callbacks);
      };
    }

    // 进展反馈按钮（仅特性）
    if (getEntityType(entity) === 'feature') {
      const noteBtn = actions.createEl('button', {
        cls: 'pm-entity-card__action-btn',
        attr: { title: '添加进展反馈' },
      });
      noteBtn.textContent = '📝';
      noteBtn.onclick = (e) => {
        e.stopPropagation();
        callbacks?.onAddNote?.(entity);
      };
    }

    // 打开按钮
    const openBtn = actions.createEl('button', {
      cls: 'pm-entity-card__action-btn',
      attr: { title: '打开文件' },
    });
    openBtn.textContent = '↗';
    openBtn.onclick = (e) => {
      e.stopPropagation();
      callbacks?.onOpen?.(entity);
    };
  }

  /**
   * 设置拖拽事件
   */
  private setupDragEvents(
    card: HTMLElement,
    entity: Entity,
    callbacks?: EntityCardCallbacks
  ): void {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', entity.id);
      e.dataTransfer?.setData('entity-type', getEntityType(entity));
      card.addClass('pm-entity-card--dragging');
      callbacks?.onDragStart?.(entity, e);
    });

    card.addEventListener('dragend', (e) => {
      card.removeClass('pm-entity-card--dragging');
      callbacks?.onDragEnd?.(entity, e);
    });
  }

  /**
   * 显示状态选择器
   */
  private showStatusPicker(
    entity: Entity,
    triggerEl: HTMLElement,
    callbacks?: EntityCardCallbacks
  ): void {
    if (!this.statusPicker) {
      this.statusPicker = new StatusPicker();
    }

    this.statusPicker.show(
      triggerEl,
      'status' in entity ? entity.status : undefined,
      (status) => {
        callbacks?.onStatusChange?.(entity, status);
      }
    );
  }

  /**
   * 显示进度选择器
   */
  private showProgressPicker(
    entity: Entity,
    triggerEl: HTMLElement,
    callbacks?: EntityCardCallbacks
  ): void {
    if (!this.progressPicker) {
      this.progressPicker = new ProgressPicker();
    }

    const currentProgress = (entity as any).progress || 0;

    this.progressPicker.show(
      triggerEl,
      currentProgress,
      (progress) => {
        callbacks?.onProgressChange?.(entity, progress);
      }
    );
  }
}

/**
 * 便捷函数：渲染实体卡片
 */
export function renderEntityCard(
  app: App,
  container: HTMLElement,
  entity: Entity,
  options: EntityCardOptions,
  callbacks?: EntityCardCallbacks
): HTMLElement {
  const card = new EntityCard(app);
  return card.render(container, entity, options, callbacks);
}
