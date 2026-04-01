import { App, TFile } from 'obsidian';
import type { ProjectService } from '../services/ProjectService';
import type { FeatureService } from '../services/FeatureService';
import type { VersionService } from '../services/VersionService';
import type { Feature, Project, Version } from '../types';
import { FEATURE_STATUSES, getStatusLabel, getPriorityLabel, getStatusColor } from '../constants';
import { ConfirmModal } from '../modals/ConfirmModal';
import { needsStatusConfirmation } from '../utils';

interface KanbanConfig {
  view?: 'all' | 'by-version' | 'by-project' | 'grid';
  version?: string;
  project?: string;
  owner?: string;
  tag?: string;
  cardStyle?: 'default' | 'compact';
  columns?: number;
}

export class KanbanRenderer {
  constructor(
    private app: App,
    private versionService: VersionService,
    private projectService: ProjectService,
    private featureService: FeatureService
  ) {}

  async render(container: HTMLElement, config: KanbanConfig): Promise<void> {
    container.empty();
    container.addClass('pm-kanban-block');

    // 加载数据
    const features = await this.loadFeatures(config);
    const projects = await this.loadProjects();
    const versions = await this.loadVersions();
    const projectMap = new Map(projects.map(p => [p.id, p]));
    const versionMap = new Map(versions.map(v => [v.id, v]));

    // 渲染工具栏
    this.renderToolbar(container, config, features.length);

    // 根据视图类型渲染
    switch (config.view) {
      case 'by-version':
        await this.renderByVersion(container, features, projectMap, versionMap, config);
        break;
      case 'by-project':
        await this.renderByProject(container, features, projectMap, config);
        break;
      case 'grid':
        await this.renderGrid(container, features, projectMap, config);
        break;
      case 'all':
      default:
        await this.renderAll(container, features, projectMap, config);
        break;
    }
  }

  private async loadFeatures(config: KanbanConfig): Promise<Feature[]> {
    const allFeatures = await this.featureService.listFeatures();
    
    return allFeatures.filter(f => {
      if (config.version && f.versionId !== config.version) return false;
      if (config.project && f.projectId !== config.project) return false;
      if (config.owner && f.owner !== config.owner) return false;
      if (config.tag && !f.tags.includes(config.tag)) return false;
      return true;
    });
  }

  private async loadProjects(): Promise<Project[]> {
    return this.projectService.listProjects();
  }

  private async loadVersions(): Promise<Version[]> {
    return this.versionService.listVersions();
  }

  private renderToolbar(container: HTMLElement, config: KanbanConfig, count: number): void {
    const toolbar = container.createDiv({ cls: 'pm-kanban-block__toolbar' });

    // 标题
    const titleEl = toolbar.createDiv({ cls: 'pm-kanban-block__title' });
    
    let title = '特性看板';
    if (config.project) title = '项目特性';
    if (config.version) title = '版本特性';
    
    titleEl.createEl('span', { text: title });
    titleEl.createEl('span', { 
      text: `(${count})`,
      cls: 'pm-badge pm-badge--version' 
    });

    // 视图切换按钮（可选）
    const actionsEl = toolbar.createDiv({ cls: 'pm-kanban-block__actions' });
    
    if (count > 0) {
      const refreshBtn = actionsEl.createEl('button', { 
        text: '🔄',
        cls: 'pm-btn pm-btn--sm pm-btn--ghost',
        title: '刷新'
      });
      refreshBtn.addEventListener('click', () => {
        container.empty();
        this.render(container, config);
      });
    }
  }

  /**
   * 渲染全部特性（按状态分组）
   */
  private async renderAll(
    container: HTMLElement,
    features: Feature[],
    projectMap: Map<string, Project>,
    config: KanbanConfig
  ): Promise<void> {
    const board = container.createDiv({ cls: 'pm-kanban-block__board' });
    const columns = this.groupByStatus(features);
    const statuses = FEATURE_STATUSES.map(s => s.value);
    const isCompact = config.cardStyle === 'compact';

    for (const status of statuses) {
      const column = this.createColumn(board, status, columns[status] ?? [], projectMap, isCompact);
      board.appendChild(column);
    }
  }

  /**
   * 按版本渲染（分组看板）
   */
  private async renderByVersion(
    container: HTMLElement,
    features: Feature[],
    projectMap: Map<string, Project>,
    versionMap: Map<string, Version>,
    config: KanbanConfig
  ): Promise<void> {
    // 按版本分组
    const versionGroups = new Map<string, Feature[]>();
    
    for (const feature of features) {
      const versionId = feature.versionId || '未分配';
      if (!versionGroups.has(versionId)) {
        versionGroups.set(versionId, []);
      }
      versionGroups.get(versionId)!.push(feature);
    }

    // 渲染每个版本的看板
    for (const [versionId, versionFeatures] of versionGroups) {
      const section = container.createDiv({ cls: 'pm-kanban-block__section' });
      
      const version = versionMap.get(versionId);
      const titleEl = section.createEl('h4', { 
        text: version?.name ?? '未分配版本',
        cls: 'pm-kanban-block__section-title'
      });

      // 添加版本统计
      const statsEl = titleEl.createEl('span', { 
        text: `${versionFeatures.length} 个特性`,
        cls: 'pm-section__count'
      });

      // 该版本的看板
      const board = section.createDiv({ cls: 'pm-kanban-block__board' });
      const columns = this.groupByStatus(versionFeatures);
      const statuses = FEATURE_STATUSES.map(s => s.value);

      for (const status of statuses) {
        const column = this.createColumn(board, status, columns[status] ?? [], projectMap, true);
        board.appendChild(column);
      }
    }
  }

  /**
   * 按项目渲染（分组看板）
   */
  private async renderByProject(
    container: HTMLElement,
    features: Feature[],
    projectMap: Map<string, Project>,
    config: KanbanConfig
  ): Promise<void> {
    // 按项目分组
    const projectGroups = new Map<string, Feature[]>();
    
    for (const feature of features) {
      const projectId = feature.projectId || '未分配';
      if (!projectGroups.has(projectId)) {
        projectGroups.set(projectId, []);
      }
      projectGroups.get(projectId)!.push(feature);
    }

    // 渲染每个项目的看板
    for (const [projectId, projectFeatures] of projectGroups) {
      const section = container.createDiv({ cls: 'pm-kanban-block__section' });
      
      const project = projectMap.get(projectId);
      const titleEl = section.createEl('h4', { 
        text: project?.name ?? '未分配项目',
        cls: 'pm-kanban-block__section-title'
      });

      const statsEl = titleEl.createEl('span', { 
        text: `${projectFeatures.length} 个特性`,
        cls: 'pm-section__count'
      });

      const board = section.createDiv({ cls: 'pm-kanban-block__board' });
      const columns = this.groupByStatus(projectFeatures);
      const statuses = FEATURE_STATUSES.map(s => s.value);

      for (const status of statuses) {
        const column = this.createColumn(board, status, columns[status] ?? [], projectMap, true);
        board.appendChild(column);
      }
    }
  }

  /**
   * 网格布局渲染
   */
  private async renderGrid(
    container: HTMLElement,
    features: Feature[],
    projectMap: Map<string, Project>,
    config: KanbanConfig
  ): Promise<void> {
    const grid = container.createDiv({ cls: 'pm-card-grid' });
    
    if (config.columns) {
      grid.classList.add(`pm-card-grid--${config.columns}col`);
    }

    for (const feature of features) {
      const card = this.createCard(feature, projectMap, false);
      grid.appendChild(card);
    }

    if (features.length === 0) {
      grid.createEl('div', {
        cls: 'pm-empty',
        text: '暂无特性'
      });
    }
  }

  private createColumn(
    container: HTMLElement,
    status: string,
    features: Feature[],
    projectMap: Map<string, Project>,
    isCompact: boolean
  ): HTMLElement {
    const column = container.createDiv({ cls: 'pm-kanban-block__column' });
    if (isCompact) {
      column.addClass('pm-kanban-block__column--compact');
    }
    column.dataset.status = status;

    // 列标题
    const header = column.createDiv({ cls: 'pm-kanban-block__header' });
    const statusInfo = FEATURE_STATUSES.find(s => s.value === status);
    
    const statusDot = header.createEl('span', { cls: 'pm-status-dot' });
    statusDot.style.backgroundColor = statusInfo?.color ?? 'var(--text-muted)';
    
    header.createEl('span', { 
      text: getStatusLabel(status),
      cls: 'pm-kanban-block__column-title',
    });
    
    header.createEl('span', { 
      text: String(features.length),
      cls: 'pm-kanban-block__column-count',
    });

    // 卡片列表
    const cardList = column.createDiv({ cls: 'pm-kanban-block__card-list' });
    
    for (const feature of features) {
      const card = this.createCard(feature, projectMap, isCompact);
      cardList.appendChild(card);
    }

    return column;
  }

  private createCard(feature: Feature, projectMap: Map<string, Project>, isCompact: boolean): HTMLElement {
    const card = document.createElement('div');
    card.className = `pm-card pm-card--feature ${isCompact ? 'pm-card--compact' : ''}`;
    card.dataset.priority = feature.priority;
    card.dataset.status = feature.status;

    // 点击打开文件
    card.addEventListener('click', () => {
      this.openFeatureFile(feature);
    });

    // Header: 优先级 + 进度
    const header = card.createDiv({ cls: 'pm-card__header' });
    
    const priorityBadge = header.createEl('span', { 
      text: getPriorityLabel(feature.priority),
      cls: `pm-badge pm-badge--priority-${feature.priority}`,
    });

    if (feature.progress > 0) {
      header.createEl('span', { 
        text: `${feature.progress}%`,
        cls: 'pm-progress-text'
      });
    }

    // 标题
    card.createEl('div', { 
      text: feature.name,
      cls: 'pm-card__title',
    });

    // 所属项目（如果不是紧凑模式）
    if (!isCompact) {
      const project = projectMap.get(feature.projectId);
      if (project) {
        const metaEl = card.createEl('div', { cls: 'pm-card__meta' });
        metaEl.createEl('span', { 
          text: project.name,
          cls: 'pm-card__meta-link'
        });
      }
    }

    // 进度条
    if (feature.progress > 0 && !isCompact) {
      const progressBar = card.createDiv({ cls: 'pm-progress' });
      const fill = progressBar.createDiv({ cls: 'pm-progress__fill' });
      fill.style.width = `${feature.progress}%`;
    }

    // Footer: 负责人 + 截止日期
    if (!isCompact) {
      const footer = card.createDiv({ cls: 'pm-card__footer' });

      if (feature.owner) {
        footer.createEl('span', { 
          text: `👤 ${feature.owner}`,
          cls: 'pm-card__owner',
        });
      }

      if (feature.dueDate) {
        const dueEl = footer.createEl('span', { 
          text: `📅 ${feature.dueDate}`,
          cls: 'pm-card__due',
        });
        if (new Date(feature.dueDate) < new Date() && feature.status !== 'completed') {
          dueEl.addClass('pm-card__due--overdue');
        }
      }
    }

    return card;
  }

  private groupByStatus(features: Feature[]): Record<Feature['status'], Feature[]> {
    const result: Record<Feature['status'], Feature[]> = {
      backlog: [],
      todo: [],
      'in-progress': [],
      testing: [],
      completed: [],
      archived: [],
    };
    for (const feature of features) {
      if (result[feature.status]) {
        result[feature.status].push(feature);
      }
    }
    return result;
  }

  private async openFeatureFile(feature: Feature): Promise<void> {
    const path = await this.featureService.getFeaturePath(feature.id);
    if (!path) return;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf().openFile(file);
    }
  }
}
