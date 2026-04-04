import { App, TFile } from 'obsidian';
import type { EntityManager } from '../core';
import type { CardRegistry } from './cards';
import type { Version, Project, Feature } from '../types';

export interface GridConfig {
  type?: 'version' | 'project' | 'feature';
  cols?: 1 | 2 | 3 | 4;
  filter?: {
    status?: string;
    priority?: string;
    versionId?: string;
    projectId?: string;
    owner?: string;
    tag?: string;
  };
  sortBy?: 'name' | 'dueDate' | 'priority' | 'progress' | 'created';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * 网格渲染器
 * 用于在 Markdown 中渲染实体卡片网格
 */
export class GridRenderer {
  constructor(
    private app: App,
    private entityManager: EntityManager,
    private cardRegistry: CardRegistry
  ) {}

  /**
   * 渲染网格
   */
  async render(container: HTMLElement, config: GridConfig): Promise<void> {
    container.empty();
    container.addClass('pm-grid-block');

    // 加载数据
    const entities = await this.loadEntities(config);
    
    // 应用过滤
    const filtered = this.applyFilters(entities, config.filter);
    
    // 应用排序
    const sorted = this.applySort(filtered, config.sortBy, config.sortOrder);
    
    // 应用限制
    const limited = config.limit ? sorted.slice(0, config.limit) : sorted;

    // 渲染工具栏
    this.renderToolbar(container, config, limited.length, sorted.length);

    // 渲染网格
    if (limited.length === 0) {
      this.renderEmpty(container);
    } else {
      await this.renderGrid(container, limited, config);
    }
  }

  /**
   * 加载实体数据
   */
  private async loadEntities(config: GridConfig): Promise<(Version | Project | Feature)[]> {
    const type = config.type || 'feature';

    switch (type) {
      case 'version':
        return this.entityManager.listVersions();
      case 'project':
        return this.entityManager.listProjects({
          versionId: config.filter?.versionId,
        });
      case 'feature':
      default:
        return this.entityManager.listFeatures({
          versionId: config.filter?.versionId,
          projectId: config.filter?.projectId,
          status: config.filter?.status as any,
        });
    }
  }

  /**
   * 应用过滤器
   */
  private applyFilters(
    entities: (Version | Project | Feature)[],
    filter?: GridConfig['filter']
  ): (Version | Project | Feature)[] {
    if (!filter) return entities;

    return entities.filter((entity) => {
      // 状态过滤
      if (filter.status && 'status' in entity && entity.status !== filter.status) {
        return false;
      }

      // 优先级过滤
      if (filter.priority && 'priority' in entity && entity.priority !== filter.priority) {
        return false;
      }

      // 负责人过滤
      if (filter.owner && entity.owner !== filter.owner) {
        return false;
      }

      // 标签过滤
      if (filter.tag && 'tags' in entity && !entity.tags?.includes(filter.tag)) {
        return false;
      }

      return true;
    });
  }

  /**
   * 应用排序
   */
  private applySort(
    entities: (Version | Project | Feature)[],
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): (Version | Project | Feature)[] {
    if (!sortBy) return entities;

    const sorted = [...entities].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'dueDate':
          if ('dueDate' in a && 'dueDate' in b) {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            comparison = dateA - dateB;
          }
          break;
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          if ('priority' in a && 'priority' in b) {
            const orderA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 99;
            const orderB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 99;
            comparison = orderA - orderB;
          }
          break;
        case 'progress':
          if ('progress' in a && 'progress' in b) {
            comparison = (a.progress || 0) - (b.progress || 0);
          }
          break;
        case 'created':
          // 使用 id 作为创建时间的近似（假设 id 是按顺序生成的）
          comparison = a.id.localeCompare(b.id);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  /**
   * 渲染工具栏
   */
  private renderToolbar(
    container: HTMLElement,
    config: GridConfig,
    displayCount: number,
    totalCount: number
  ): void {
    const toolbar = container.createDiv({ cls: 'pm-grid-block__toolbar' });

    // 标题
    const titleEl = toolbar.createDiv({ cls: 'pm-grid-block__title' });
    const typeLabel = this.getTypeLabel(config.type);
    titleEl.createEl('span', { text: `${typeLabel}网格` });
    
    if (displayCount !== totalCount) {
      titleEl.createEl('span', {
        text: `(${displayCount}/${totalCount})`,
        cls: 'pm-badge pm-badge--version',
      });
    } else {
      titleEl.createEl('span', {
        text: `(${displayCount})`,
        cls: 'pm-badge pm-badge--version',
      });
    }

    // 刷新按钮
    if (displayCount > 0) {
      const actionsEl = toolbar.createDiv({ cls: 'pm-grid-block__actions' });
      const refreshBtn = actionsEl.createEl('button', {
        text: '🔄',
        cls: 'pm-btn pm-btn--sm pm-btn--ghost',
        title: '刷新',
      });
      refreshBtn.addEventListener('click', () => {
        container.empty();
        this.render(container, config);
      });
    }
  }

  /**
   * 渲染网格
   */
  private async renderGrid(
    container: HTMLElement,
    entities: (Version | Project | Feature)[],
    config: GridConfig
  ): Promise<void> {
    const grid = container.createDiv({ cls: 'pm-card-grid' });

    // 应用列数
    const cols = config.cols || 3;
    if (cols >= 2 && cols <= 4) {
      grid.classList.add(`pm-card-grid--${cols}col`);
    }

    // 获取对应的卡片渲染器
    const type = config.type || 'feature';
    const cardRenderer = this.cardRegistry.get(type);

    if (!cardRenderer) {
      grid.createEl('div', {
        cls: 'pm-error',
        text: `未找到 ${type} 类型的卡片渲染器`,
      });
      return;
    }

    // 渲染每个实体
    for (const entity of entities) {
      const onClick = () => this.openEntityFile(entity, type);
      const card = cardRenderer.render(entity, onClick);
      grid.appendChild(card);
    }
  }

  /**
   * 渲染空状态
   */
  private renderEmpty(container: HTMLElement): void {
    const empty = container.createDiv({ cls: 'pm-empty' });
    empty.createEl('div', {
      cls: 'pm-empty__icon',
      text: '📭',
    });
    empty.createEl('div', {
      cls: 'pm-empty__title',
      text: '暂无数据',
    });
    empty.createEl('div', {
      cls: 'pm-empty__description',
      text: '当前过滤条件下没有找到任何实体',
    });
  }

  /**
   * 打开实体文件
   */
  private async openEntityFile(
    entity: Version | Project | Feature,
    type: string
  ): Promise<void> {
    const path = await this.entityManager.getEntityPath(
      type as 'version' | 'project' | 'feature',
      entity.id
    );
    if (!path) return;

    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf().openFile(file);
    }
  }

  /**
   * 获取类型标签
   */
  private getTypeLabel(type?: string): string {
    const labels: Record<string, string> = {
      version: '版本',
      project: '项目',
      feature: '特性',
    };
    return labels[type || 'feature'] || '实体';
  }
}
