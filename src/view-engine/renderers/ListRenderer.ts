import type { App, TFile } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, EntityType, getEntityType, EntityField, getEntityFields, LIST_COLUMN_DEFINITIONS } from '../types';
import { BaseRenderer } from './BaseRenderer';
import { RendererRegistry } from '../RendererRegistry';
import { getPriorityColor, DateFormat, isOverdue } from '../design-tokens';
import { TextCell, SelectCell, DateCell, ProgressCell, MultiSelectCell } from '../cells';

/**
 * 列表渲染器 - 卡片列表风格
 * 卡片式列表视图，支持行内编辑
 */
export class ListRenderer extends BaseRenderer {
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
    const currentColumns = this.config.listColumns || ['name', 'status', 'priority', 'owner'];

    // 第一行：统计信息
    const info = header.createDiv('pm-list-info');
    info.createSpan({
      cls: 'pm-list-count',
      text: `共 ${this.entities.length} 个实体`
    });

    // 第二行：列标题（与卡片内容区域对齐）
    const columnsRow = header.createDiv('pm-list-header-columns');

    // 名称列（固定）
    const mainCol = columnsRow.createDiv('pm-list-header-main');
    mainCol.textContent = '名称';

    // 元信息列（按卡片 meta 顺序）
    const metaCol = columnsRow.createDiv('pm-list-header-meta');
    const metaFields = ['status', 'priority', 'progress', 'risk', 'latestProgress', 'owner', 'endDate', 'tags'];

    for (const fieldKey of metaFields) {
      if (currentColumns.includes(fieldKey as any)) {
        const cell = metaCol.createDiv('pm-list-header-cell');
        cell.style.width = this.getColumnWidth(fieldKey);
        cell.style.minWidth = this.getColumnWidth(fieldKey);
        const def = LIST_COLUMN_DEFINITIONS.find(d => d.key === fieldKey);
        cell.textContent = def?.label || fieldKey;
      }
    }
  }

  /**
   * 渲染列表卡片
   */
  private async renderListCard(container: HTMLElement, entity: Entity): Promise<void> {
    const entityType = getEntityType(entity);
    const currentColumns = this.config.listColumns || ['name', 'status', 'priority', 'owner'];

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
    if (currentColumns.includes('projectId') && 'projectId' in entity && entity.projectId) {
      const projectName = await this.getEntityName('projectId', entity.projectId);
      titleSection.createDiv({
        cls: 'pm-list-card-subtitle',
        text: `隶属于: ${projectName || entity.projectId}`
      });
    }
    if (currentColumns.includes('versionId') && 'versionId' in entity && entity.versionId) {
      const versionName = await this.getEntityName('versionId', entity.versionId);
      titleSection.createDiv({
        cls: 'pm-list-card-subtitle',
        text: `版本: ${versionName || entity.versionId}`
      });
    }

    // 点击标题区域打开实体（避免与行内编辑冲突）
    main.addEventListener('click', async () => {
      await this.actionService.openEntity(entityType, entity.id);
    });

    // 中间：元信息（使用行内编辑单元格）
    const meta = content.createDiv('pm-list-card-meta');

    const metaFields = ['status', 'priority', 'progress', 'risk', 'latestProgress', 'owner', 'endDate', 'tags'];
    for (const fieldKey of metaFields) {
      if (!currentColumns.includes(fieldKey as any)) continue;

      const cellContainer = meta.createDiv('pm-list-card-cell');
      cellContainer.style.width = this.getColumnWidth(fieldKey);
      cellContainer.style.minWidth = this.getColumnWidth(fieldKey);

      if (fieldKey === 'risk') {
        const logSummary = this.entityManager.cache.getLogSummary(entity.id);
        if (logSummary && logSummary.riskSummary.total > 0) {
          const summary = logSummary.riskSummary;
          const riskEl = cellContainer.createSpan('pm-list-card-risk');
          let badgeText = `⚠️ ${summary.open}`;
          if (summary.high > 0) {
            riskEl.addClass('pm-list-card-risk--high');
            badgeText += ` 🔴${summary.high}`;
          } else if (summary.medium > 0) {
            riskEl.addClass('pm-list-card-risk--medium');
            badgeText += ` 🟡${summary.medium}`;
          }
          riskEl.textContent = badgeText;
          riskEl.title = `总风险: ${summary.total} | 未关闭: ${summary.open} | 高: ${summary.high} 中: ${summary.medium} 低: ${summary.low}`;
        }
      } else if (fieldKey === 'latestProgress') {
        const logSummary = this.entityManager.cache.getLogSummary(entity.id);
        if (logSummary?.latestProgress) {
          const progressText = logSummary.latestProgress.length > 10
            ? logSummary.latestProgress.substring(0, 10) + '...'
            : logSummary.latestProgress;
          const progressEl = cellContainer.createSpan('pm-list-card-latest-progress');
          progressEl.textContent = `📝 ${progressText}`;
          progressEl.title = logSummary.latestProgress;
        }
      } else {
        this.renderCellForField(cellContainer, entity, fieldKey);
      }
    }

    // 右侧：操作按钮
    const actions = content.createDiv('pm-list-card-actions');

    const openBtn = actions.createEl('button', {
      cls: 'pm-list-action-btn',
      attr: { title: '打开文件' }
    });
    openBtn.textContent = '↗';
    openBtn.onclick = (e) => {
      e.stopPropagation();
      this.actionService.openEntity(entityType, entity.id);
    };
  }

  /**
   * 为指定字段渲染行内编辑单元格
   */
  private renderCellForField(
    container: HTMLElement,
    entity: Entity,
    field: string
  ): void {
    const entityType = getEntityType(entity);
    const fields = getEntityFields(entityType);
    const fieldDef = fields.find(f => f.name === field);
    const value = (entity as any)[field];

    if (!fieldDef) {
      // 实体类型不支持该字段：有值则显示原始文本，否则留空占位
      if (value !== undefined && value !== null && value !== '') {
        container.createSpan({ cls: 'pm-cell-readonly', text: String(value) });
      }
      return;
    }

    if (!fieldDef.editable) {
      container.createSpan({
        cls: 'pm-cell-readonly',
        text: Array.isArray(value) && value.length === 0 ? '' : String(value ?? '')
      });
      return;
    }

    const cellValue = value ?? (fieldDef.type === 'multi-select' ? [] : '');

    const onChange = async (newValue: any) => {
      if (field === 'progress' && entityType === 'feature') {
        await this.actionService.updateProgress(entityType, entity.id, newValue);
      } else {
        await this.actionService.updateField(entityType, entity.id, field, newValue);
      }
    };

    let cell;
    switch (fieldDef.type) {
      case 'text':
        cell = new TextCell(this.app, this.entityManager, entity.id, entityType, field, value, onChange);
        break;
      case 'select':
        cell = new SelectCell(this.app, this.entityManager, entity.id, entityType, field, value, onChange, fieldDef.options);
        break;
      case 'date':
        cell = new DateCell(this.app, this.entityManager, entity.id, entityType, field, value, onChange);
        break;
      case 'progress':
        cell = new ProgressCell(this.app, this.entityManager, entity.id, entityType, field, value, onChange);
        break;
      case 'multi-select':
        cell = new MultiSelectCell(this.app, this.entityManager, entity.id, entityType, field, value, onChange, fieldDef.options);
        break;
      default:
        return;
    }

    cell.render(container);
  }

  /**
   * 获取列宽
   */
  private getColumnWidth(field: string): string {
    const widths: Record<string, string> = {
      status: '72px',
      priority: '60px',
      progress: '90px',
      risk: '90px',
      latestProgress: '100px',
      owner: '80px',
      endDate: '80px',
      tags: '100px',
    };
    return widths[field] || 'auto';
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
}

// 自注册到渲染器注册表
RendererRegistry.register('list', ListRenderer);
