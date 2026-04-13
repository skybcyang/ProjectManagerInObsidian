import type { App, TFile } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, EntityType, getEntityType, EntityField, getEntityFields } from '../types';
import { BaseRenderer } from './BaseRenderer';
import { RendererRegistry } from '../RendererRegistry';
import { getPriorityColor, DateFormat, isOverdue } from '../design-tokens';
import type { CodeBlockConfigService } from '../../services';

/**
 * 列表渲染器 - 卡片列表风格
 * 卡片式列表视图，支持列排序和筛选
 */
export class ListRenderer extends BaseRenderer {
  private entities: Entity[] = [];

  constructor(
    app: App,
    entityManager: EntityManager,
    dataService: DataService,
    actionService: ActionService,
    private configService: CodeBlockConfigService
  ) {
    super(app, entityManager, dataService, actionService);
  }

  /**
   * 渲染列表视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-list-view');

    // 使用基类统一的数据准备方法
    const sorted = await this.prepareData();
    this.entities = sorted;

    // 创建列表容器
    const listContainer = container.createDiv('pm-list-container');
    
    if (sorted.length === 0) {
      this.createEmptyState(listContainer, '没有符合条件的实体');
      return;
    }

    // 渲染列表头部（排序控制）
    this.renderListHeader(listContainer);

    // 渲染卡片列表
    const cardsContainer = listContainer.createDiv('pm-list-cards');
    for (const entity of sorted) {
      await this.renderListCard(cardsContainer, entity);
    }
  }

  /**
   * 渲染列表头部
   */
  private renderListHeader(container: HTMLElement): void {
    const header = container.createDiv('pm-list-header');
    
    const info = header.createDiv('pm-list-info');
    info.createSpan({ 
      cls: 'pm-list-count', 
      text: `共 ${this.entities.length} 个实体` 
    });

    // 排序控制
    const sortControl = header.createDiv('pm-list-sort');
    
    const sortSelect = sortControl.createEl('select', { cls: 'pm-list-sort-select' });
    const sortOptions = [
      { value: 'name', label: '名称' },
      { value: 'status', label: '状态' },
      { value: 'priority', label: '优先级' },
      { value: 'startDate', label: '开始日期' },
      { value: 'endDate', label: '结束日期' },
      { value: 'progress', label: '进度' },
    ];
    
    sortOptions.forEach(opt => {
      const option = sortSelect.createEl('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === (this.config.sortBy || 'name')) option.selected = true;
    });

    sortSelect.addEventListener('change', async () => {
      const newConfig: ViewConfig = { ...this.config, sortBy: sortSelect.value as any };
      await this.saveSortConfig(newConfig);
      this.render(container.closest('.pm-list-view') as HTMLElement);
    });

    // 排序方向按钮
    const currentSortOrder = this.config.sortOrder || 'asc';
    const orderBtn = sortControl.createEl('button', { 
      cls: 'pm-list-sort-order',
      attr: { title: currentSortOrder === 'asc' ? '升序' : '降序' }
    });
    orderBtn.textContent = currentSortOrder === 'asc' ? '↑' : '↓';
    orderBtn.addEventListener('click', async () => {
      const newOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      const newConfig: ViewConfig = { ...this.config, sortOrder: newOrder };
      await this.saveSortConfig(newConfig);
      this.render(container.closest('.pm-list-view') as HTMLElement);
    });
  }

  /**
   * 渲染列表卡片
   */
  private async renderListCard(container: HTMLElement, entity: Entity): Promise<void> {
    const entityType = getEntityType(entity);
    
    const card = container.createDiv('pm-list-card');
    card.dataset.entityId = entity.id;
    card.dataset.entityType = entityType;

    // 优先级标记条
    if ('priority' in entity && entity.priority) {
      const priorityColor = getPriorityColor(entity.priority);
      const priorityBar = card.createDiv('pm-list-card-priority-bar');
      priorityBar.style.background = priorityColor.bg;
    }

    // 卡片内容
    const content = card.createDiv('pm-list-card-content');

    // 左侧：类型图标 + 标题
    const main = content.createDiv('pm-list-card-main');
    
    const typeIcon = main.createDiv('pm-list-card-type-icon');
    typeIcon.textContent = this.getEntityTypeIcon(entityType);

    const titleSection = main.createDiv('pm-list-card-title-section');
    titleSection.createDiv({ cls: 'pm-list-card-title', text: entity.name });
    
    // 父实体信息
    if ('projectId' in entity && entity.projectId) {
      const projectName = await this.getEntityName('projectId', entity.projectId);
      titleSection.createDiv({ 
        cls: 'pm-list-card-subtitle', 
        text: `隶属于: ${projectName || entity.projectId}` 
      });
    } else if ('versionId' in entity && entity.versionId) {
      const versionName = await this.getEntityName('versionId', entity.versionId);
      titleSection.createDiv({ 
        cls: 'pm-list-card-subtitle', 
        text: `版本: ${versionName || entity.versionId}` 
      });
    }

    // 中间：元信息
    const meta = content.createDiv('pm-list-card-meta');

    // 状态
    if ('status' in entity && entity.status) {
      meta.createSpan({
        cls: `pm-list-card-status pm-status-${entity.status}`,
        text: this.translateStatus(entity.status),
      });
    }

    // 进度
    if ('progress' in entity && entity.progress !== undefined) {
      const progressEl = meta.createDiv('pm-list-card-progress');
      const progressBar = progressEl.createDiv('pm-list-card-progress-bar');
      progressBar.createDiv({
        cls: 'pm-list-card-progress-fill',
        attr: { style: `width: ${entity.progress}%` }
      });
      progressEl.createSpan({ text: `${entity.progress}%` });
    }

    // 负责人
    if (entity.owner) {
      meta.createSpan({ cls: 'pm-list-card-owner', text: `@${entity.owner}` });
    }

    // 结束日期
    if ('endDate' in entity && entity.endDate) {
      const isOverdueDate = isOverdue(entity.endDate, entity.status as any);
      meta.createSpan({
        cls: `pm-list-card-due${isOverdueDate ? ' pm-overdue' : ''}`,
        text: DateFormat.short(entity.endDate),
      });
    }

    // 标签
    if (entity.tags && entity.tags.length > 0) {
      const tagsEl = meta.createDiv('pm-list-card-tags');
      entity.tags.slice(0, 2).forEach(tag => {
        tagsEl.createSpan({ cls: 'pm-list-card-tag', text: tag });
      });
    }

    // 右侧：操作按钮
    const actions = content.createDiv('pm-list-card-actions');
    
    if ('status' in entity) {
      const statusBtn = actions.createEl('button', {
        cls: 'pm-list-action-btn',
        attr: { title: '变更状态' }
      });
      statusBtn.textContent = '⚡';
      statusBtn.onclick = (e) => {
        e.stopPropagation();
        this.showStatusPicker(entity as Entity & { status: string }, statusBtn);
      };
    }

    const openBtn = actions.createEl('button', {
      cls: 'pm-list-action-btn',
      attr: { title: '打开文件' }
    });
    openBtn.textContent = '↗';
    openBtn.onclick = (e) => {
      e.stopPropagation();
      this.actionService.openEntity(entityType, entity.id);
    };

    // 点击卡片打开
    card.addEventListener('click', async () => {
      await this.actionService.openEntity(entityType, entity.id);
    });
  }

  /**
   * 获取实体名称
   */
  private async getEntityName(fieldName: string, entityId: string): Promise<string | null> {
    try {
      if (fieldName === 'versionId') {
        const version = await this.entityManager.getVersion(entityId);
        return version?.name || null;
      } else if (fieldName === 'projectId') {
        const project = await this.entityManager.getProject(entityId);
        return project?.name || null;
      }
    } catch (error) {
      console.error('获取实体名称失败:', error);
    }
    return null;
  }

  /**
   * 保存排序配置到代码块 - 使用 CodeBlockConfigService
   */
  private async saveSortConfig(newConfig: ViewConfig): Promise<void> {
    if (!this.context.sourcePath || this.context.codeBlockIndex === undefined) return;

    try {
      await this.configService.saveConfig(
        this.context.sourcePath,
        this.context.codeBlockIndex,
        {
          sortBy: newConfig.sortBy,
          sortOrder: newConfig.sortOrder
        }
      );

      // 更新本地配置
      this.config = newConfig;
    } catch (error) {
      console.error('保存排序配置失败:', error);
    }
  }
}

// 自注册到渲染器注册表
RendererRegistry.register('list', ListRenderer);
