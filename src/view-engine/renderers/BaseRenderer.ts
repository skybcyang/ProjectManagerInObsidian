import type { App, MarkdownPostProcessorContext } from 'obsidian';
import type { EntityManager } from '../../core';
import type { CardRegistry } from '../../ui/cards';
import type { DataService, ActionService } from '../services';
import { ViewConfig, ViewContext, Entity, EntityType, getEntityType } from '../types';

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
    protected cardRegistry: CardRegistry,
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
   * 渲染视图（子类必须实现）
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

    // 进度按钮（仅特性）
    if (getEntityType(entity) === 'feature') {
      const progressBtn = actions.createEl('button', { cls: 'pm-action-btn' });
      progressBtn.textContent = '进度';
      progressBtn.onclick = (e) => {
        e.stopPropagation();
        this.showProgressPicker(entity);
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
   * 显示状态选择器
   */
  protected showStatusPicker(entity: Entity & { status?: string }, triggerEl?: HTMLElement): void {
    const statuses = [
      { value: 'backlog', label: '待处理', color: '#9ca3af' },
      { value: 'todo', label: '待开始', color: '#3b82f6' },
      { value: 'in-progress', label: '进行中', color: '#f59e0b' },
      { value: 'testing', label: '测试中', color: '#8b5cf6' },
      { value: 'completed', label: '已完成', color: '#22c55e' },
      { value: 'archived', label: '已归档', color: '#6b7280' },
    ];

    const menu = document.createElement('div');
    menu.className = 'pm-status-picker';
    menu.style.cssText = `
      position: fixed;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 4px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    statuses.forEach(status => {
      const item = menu.createEl('div', { cls: 'pm-status-item' });
      item.style.cssText = `
        padding: 6px 12px;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      item.innerHTML = `
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${status.color};"></span>
        <span>${status.label}</span>
      `;
      item.onclick = () => {
        this.actionService.changeStatus(getEntityType(entity), entity.id, status.value);
        menu.remove();
      };
      item.onmouseenter = () => {
        item.style.background = 'var(--background-modifier-hover)';
      };
      item.onmouseleave = () => {
        item.style.background = '';
      };
    });

    document.body.appendChild(menu);

    // 定位菜单
    const targetEl = triggerEl || document.activeElement?.closest('.pm-card') as HTMLElement;
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      menu.style.left = `${rect.left}px`;
      menu.style.top = `${rect.bottom + 4}px`;
    }

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
   * 显示进度选择器
   */
  protected showProgressPicker(entity: Entity, triggerEl?: HTMLElement): void {
    const menu = document.createElement('div');
    menu.className = 'pm-progress-picker';
    menu.style.cssText = `
      position: fixed;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 8px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 150px;
    `;

    const currentProgress = (entity as any).progress || 0;

    // 标题
    menu.createEl('div', {
      text: '更新进度',
      cls: 'pm-picker-title',
    }).style.cssText = 'font-size: 12px; color: var(--text-muted); margin-bottom: 8px;';

    // 滑块
    const sliderContainer = menu.createDiv();
    sliderContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    const slider = sliderContainer.createEl('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(currentProgress);
    slider.style.cssText = 'flex: 1;';

    const valueDisplay = sliderContainer.createEl('span');
    valueDisplay.textContent = `${currentProgress}%`;
    valueDisplay.style.cssText = 'min-width: 35px; text-align: right; font-size: 12px;';

    slider.oninput = () => {
      valueDisplay.textContent = `${slider.value}%`;
    };

    // 按钮
    const btnContainer = menu.createDiv();
    btnContainer.style.cssText = 'display: flex; justify-content: flex-end; margin-top: 8px;';

    const confirmBtn = btnContainer.createEl('button');
    confirmBtn.textContent = '更新';
    confirmBtn.onclick = () => {
      this.actionService.updateProgress(getEntityType(entity), entity.id, parseInt(slider.value));
      menu.remove();
    };

    document.body.appendChild(menu);

    // 定位菜单
    const targetEl = triggerEl || document.activeElement?.closest('.pm-card') as HTMLElement;
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      menu.style.left = `${rect.left}px`;
      menu.style.top = `${rect.bottom + 4}px`;
    }

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
    const icons: Record<string, string> = {
      version: '📦',
      project: '📁',
      feature: '📝',
    };
    const type = typeof entityOrType === 'string' ? entityOrType : getEntityType(entityOrType as Entity);
    return icons[type] || '📄';
  }

  /**
   * 翻译状态
   */
  protected translateStatus(status: string): string {
    const translations: Record<string, string> = {
      backlog: '待处理',
      todo: '待开始',
      'in-progress': '进行中',
      testing: '测试中',
      completed: '已完成',
      archived: '已归档',
      active: '进行中',
      suspended: '已暂停',
    };
    return translations[status] || status;
  }

  /**
   * 翻译优先级
   */
  protected translatePriority(priority: string): string {
    const translations: Record<string, string> = {
      critical: '紧急',
      high: '高',
      medium: '中',
      low: '低',
    };
    return translations[priority] || priority;
  }
}
