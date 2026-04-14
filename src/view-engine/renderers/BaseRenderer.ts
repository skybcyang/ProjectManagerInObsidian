import type { App, MarkdownPostProcessorContext } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ViewConfig, ViewContext, Entity, EntityType, getEntityType } from '../types';
import {
  STATUS_COLORS,
  FEATURE_STATUS_OPTIONS,
  getStatusColor,
  getEntityIcon,
  translateStatus,
  translatePriority,
} from '../design-tokens';
import { StatusPicker, ProgressPicker } from '../components';

/**
 * 渲染器基类
 * 所有视图渲染器的基础
 */
export abstract class BaseRenderer {
  protected config!: ViewConfig;
  protected context!: ViewContext;

  constructor(
    protected app: App,
    protected entityManager: EntityManager,
    protected dataService: DataService,
    protected actionService: ActionService
  ) {}

  /**
   * 初始化渲染器
   */
  init(config: ViewConfig, context: ViewContext): void {
    this.config = config;
    this.context = context;
  }

  /**
   * 准备数据 - 统一的数据加载、过滤、排序流程
   * 子类可以重写此方法以自定义数据准备逻辑
   */
  protected async prepareData(): Promise<Entity[]> {
    // 1. 加载数据
    const entities = await this.dataService.loadEntities(this.config);

    // 2. 应用过滤
    const filtered = this.dataService.applyFilters(entities, this.config);

    // 3. 应用排序
    const sorted = this.dataService.applySort(
      filtered,
      this.config.sortBy,
      this.config.sortOrder
    );

    // 4. 应用数量限制
    if (this.config.limit && this.config.limit > 0) {
      return sorted.slice(0, this.config.limit);
    }

    return sorted;
  }

  /**
   * 判断卡片字段是否应该显示
   */
  protected shouldShowCardField(fieldKey: string): boolean {
    const cardFields = this.config.cardFields || {
      required: ['name', 'priority'],
      optional: ['status', 'owner', 'progress']
    };
    const allFields = [...(cardFields.required || []), ...(cardFields.optional || [])];
    return allFields.includes(fieldKey);
  }

  /**
   * 渲染视图（子类必须实现）
   * 推荐使用 renderData 模式：
   * 1. 子类重写 render 方法，调用 prepareData() 获取数据
   * 2. 然后调用 renderData(container, data) 渲染具体内容
   */
  abstract render(container: HTMLElement): Promise<void>;

  /**
   * 创建视图容器
   */
  protected createContainer(parent: HTMLElement): HTMLElement {
    const container = parent.createDiv('pm-view-container');
    return container;
  }

  /**
   * 创建工具栏
   */
  protected createToolbar(
    container: HTMLElement,
    title: string,
    stats?: { total: number; filtered: number }
  ): HTMLElement {
    const toolbar = container.createDiv('pm-view-toolbar');
    
    // 标题
    const titleEl = toolbar.createDiv('pm-view-title');
    titleEl.textContent = title;

    // 统计信息
    if (stats) {
      const statsEl = toolbar.createDiv('pm-view-stats');
      if (stats.filtered !== stats.total) {
        statsEl.textContent = `${stats.filtered} / ${stats.total}`;
        statsEl.setAttribute('title', `显示 ${stats.filtered} 项 / 共 ${stats.total} 项`);
      } else {
        statsEl.textContent = `${stats.total} 项`;
      }
    }

    return toolbar;
  }

  /**
   * 创建空状态
   */
  protected createEmptyState(container: HTMLElement, message: string = '暂无数据'): HTMLElement {
    const empty = container.createDiv('pm-view-empty');
    empty.createEl('div', { cls: 'pm-empty-icon', text: '📭' });
    empty.createEl('div', { cls: 'pm-empty-text', text: message });
    return empty;
  }

  /**
   * 创建加载状态
   */
  protected createLoadingState(container: HTMLElement): HTMLElement {
    const loading = container.createDiv('pm-view-loading');
    loading.createEl('div', { cls: 'pm-loading-spinner' });
    loading.createEl('div', { cls: 'pm-loading-text', text: '加载中...' });
    return loading;
  }

  /**
   * 创建错误状态
   */
  protected createErrorState(container: HTMLElement, error: string): HTMLElement {
    const errorEl = container.createDiv('pm-view-error');
    errorEl.createEl('div', { cls: 'pm-error-icon', text: '⚠️' });
    errorEl.createEl('div', { cls: 'pm-error-text', text: '加载失败' });
    errorEl.createEl('div', { cls: 'pm-error-detail', text: error });
    return errorEl;
  }

  /**
   * 渲染实体卡片
   */
  protected async renderEntityCard(
    container: HTMLElement,
    entity: Entity,
    options?: { compact?: boolean; showActions?: boolean }
  ): Promise<void> {
    const cardEl = container.createDiv('pm-card');
    cardEl.classList.add(`pm-card-${getEntityType(entity)}`);

    // 卡片内容区域
    const content = cardEl.createDiv('pm-card-content');

    // 实体类型图标
    const typeIcon = this.getEntityTypeIcon(getEntityType(entity));
    content.createEl('span', { cls: 'pm-card-type-icon', text: typeIcon });

    // 实体名称
    content.createEl('span', { cls: 'pm-card-name', text: entity.name });

    // 状态徽章（如果有）
    if ('status' in entity && entity.status) {
      const statusBadge = content.createSpan('pm-card-status');
      statusBadge.textContent = this.translateStatus(entity.status);
      statusBadge.dataset.status = entity.status;
    }

    // 操作按钮（如果启用）
    if (options?.showActions !== false) {
      await this.renderCardActions(cardEl, entity);
    }

    // 点击打开文件
    cardEl.addEventListener('click', () => {
      this.actionService.openEntity(getEntityType(entity), entity.id);
    });
  }

  /**
   * 渲染卡片操作按钮
   */
  protected async renderCardActions(cardEl: HTMLElement, entity: Entity): Promise<void> {
    const actions = cardEl.createDiv('pm-card-actions');
    actions.style.display = 'none';

    // 快速状态变更按钮
    if ('status' in entity) {
      const statusBtn = actions.createEl('button', { cls: 'pm-action-btn' });
      statusBtn.textContent = '状态';
      statusBtn.onclick = (e) => {
        e.stopPropagation();
        this.showStatusPicker(entity);
      };
    }

    // 进展反馈按钮（仅特性）
    if (getEntityType(entity) === 'feature') {
      const noteBtn = actions.createEl('button', { cls: 'pm-action-btn' });
      noteBtn.textContent = '进展';
      noteBtn.onclick = (e) => {
        e.stopPropagation();
        this.showProgressNoteInput(entity);
      };
    }

    // 鼠标悬停显示操作
    cardEl.addEventListener('mouseenter', () => {
      actions.style.display = 'flex';
    });
    cardEl.addEventListener('mouseleave', () => {
      actions.style.display = 'none';
    });
  }

  /**
   * 状态选择器实例（延迟创建）
   */
  private statusPicker?: StatusPicker;

  /**
   * 进度选择器实例（延迟创建）
   */
  private progressPicker?: ProgressPicker;

  /**
   * 显示状态选择器
   * 使用 StatusPicker 组件
   */
  protected showStatusPicker(entity: Entity & { status?: string }, triggerEl?: HTMLElement): void {
    if (!this.statusPicker) {
      this.statusPicker = new StatusPicker();
    }

    const targetEl = triggerEl || document.activeElement?.closest('.pm-card') as HTMLElement;
    if (!targetEl) return;

    this.statusPicker.show(
      targetEl,
      entity.status,
      (status) => {
        this.actionService.changeStatus(getEntityType(entity), entity.id, status);
      }
    );
  }

  /**
   * 显示进度选择器
   * 使用 ProgressPicker 组件
   */
  protected showProgressPicker(entity: Entity, triggerEl?: HTMLElement): void {
    if (!this.progressPicker) {
      this.progressPicker = new ProgressPicker();
    }

    const targetEl = triggerEl || document.activeElement?.closest('.pm-card') as HTMLElement;
    if (!targetEl) return;

    const currentProgress = (entity as any).progress || 0;

    this.progressPicker.show(
      targetEl,
      currentProgress,
      (progress) => {
        this.actionService.updateProgress(getEntityType(entity), entity.id, progress);
      }
    );
  }

  /**
   * 显示进展反馈输入框
   */
  protected showProgressNoteInput(entity: Entity, triggerEl?: HTMLElement): void {
    const menu = document.createElement('div');
    menu.className = 'pm-progress-note-input';
    menu.style.cssText = `
      position: fixed;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 12px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 280px;
    `;

    // 标题
    menu.createEl('div', {
      text: '添加进展反馈',
      cls: 'pm-picker-title',
    }).style.cssText = 'font-size: 13px; font-weight: 500; margin-bottom: 8px;';

    // 输入框
    const textarea = menu.createEl('textarea');
    textarea.placeholder = '输入当前进展...';
    textarea.style.cssText = `
      width: 100%;
      min-height: 60px;
      padding: 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      color: var(--text-normal);
      font-size: 13px;
      resize: vertical;
      box-sizing: border-box;
    `;

    // 按钮容器
    const btnContainer = menu.createDiv();
    btnContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;';

    // 取消按钮
    const cancelBtn = btnContainer.createEl('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = `
      padding: 4px 12px;
      font-size: 12px;
      border: 1px solid var(--background-modifier-border);
      background: var(--background-secondary);
      border-radius: 4px;
      cursor: pointer;
    `;
    cancelBtn.onclick = () => menu.remove();

    // 确认按钮
    const confirmBtn = btnContainer.createEl('button');
    confirmBtn.textContent = '保存';
    confirmBtn.style.cssText = `
      padding: 4px 12px;
      font-size: 12px;
      border: none;
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      border-radius: 4px;
      cursor: pointer;
    `;
    confirmBtn.onclick = () => {
      const content = textarea.value.trim();
      if (content) {
        this.actionService.addProgressNote(getEntityType(entity), entity.id, content);
      }
      menu.remove();
    };

    // 回车保存
    textarea.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const content = textarea.value.trim();
        if (content) {
          this.actionService.addProgressNote(getEntityType(entity), entity.id, content);
        }
        menu.remove();
      }
    };

    const { getOverlayContainer } = require('../../utils');
    getOverlayContainer().appendChild(menu);

    // 定位菜单
    const targetEl = triggerEl || document.activeElement?.closest('.pm-card') as HTMLElement;
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      menu.style.left = `${rect.left}px`;
      menu.style.top = `${rect.bottom + 4}px`;
    }

    // 自动聚焦
    textarea.focus();

    // 点击外部关闭
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }

  /**
   * 获取实体类型图标
   */
  protected getEntityTypeIcon(entityOrType: Entity | string): string {
    const type = typeof entityOrType === 'string' ? entityOrType : getEntityType(entityOrType as Entity);
    return getEntityIcon(type);
  }

  /**
   * 翻译状态（使用设计令牌）
   */
  protected translateStatus(status: string): string {
    return translateStatus(status);
  }

  /**
   * 翻译优先级（使用设计令牌）
   */
  protected translatePriority(priority: string): string {
    return translatePriority(priority);
  }
}
