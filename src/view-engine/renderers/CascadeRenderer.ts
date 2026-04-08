import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, EntityType, Version, Project, Feature, getEntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';
import { getPriorityColor, DateFormat, isOverdue } from '../design-tokens';

/**
 * 级联渲染器
 * 卡片式层级视图：版本 → 项目 → 特性
 */
export class CascadeRenderer extends BaseRenderer {
  constructor(
    app: App,
    entityManager: EntityManager,
    dataService: DataService,
    actionService: ActionService
  ) {
    super(app, entityManager, dataService, actionService);
  }

  /**
   * 渲染级联视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-cascade-container');

    // 根据配置决定渲染方式
    if ((this.config as any).id) {
      await this.renderEntityTree(container, (this.config as any).id);
    } else {
      await this.renderAllVersions(container);
    }
  }

  /**
   * 渲染单个实体的级联树
   */
  private async renderEntityTree(container: HTMLElement, entityId: string): Promise<void> {
    if (this.config.feature) {
      await this.renderFeatureTree(container, entityId, 0);
    } else if (this.config.project) {
      await this.renderProjectTree(container, entityId, 0);
    } else {
      await this.renderVersionTree(container, entityId, 0);
    }
  }

  /**
   * 渲染版本树
   */
  private async renderVersionTree(
    container: HTMLElement,
    versionId: string,
    level: number
  ): Promise<void> {
    const version = await this.entityManager.getVersion(versionId);
    if (!version) return;

    // 创建版本区块
    const versionSection = container.createDiv('pm-cascade-section');
    
    // 渲染版本头部（带头衔和统计）
    await this.renderVersionHeader(versionSection, version);

    // 加载项目
    const projects = await this.entityManager.listProjects({ versionId });

    if (projects.length === 0) {
      versionSection.createDiv({ cls: 'pm-cascade-empty', text: '暂无项目' });
      return;
    }

    // 应用排序
    const sortedProjects = this.sortEntities(projects) as Project[];

    // 渲染项目列表
    const projectsContainer = versionSection.createDiv('pm-cascade__projects');
    for (const project of sortedProjects) {
      await this.renderProjectCard(projectsContainer, project);
    }
  }

  /**
   * 渲染项目树
   */
  private async renderProjectTree(
    container: HTMLElement,
    projectId: string,
    level: number
  ): Promise<void> {
    const project = await this.entityManager.getProject(projectId);
    if (!project) return;

    // 单项目视图
    const section = container.createDiv('pm-cascade-section');
    await this.renderProjectCard(section, project, true);
  }

  /**
   * 渲染特性树
   */
  private async renderFeatureTree(
    container: HTMLElement,
    featureId: string,
    level: number
  ): Promise<void> {
    const feature = await this.entityManager.getFeature(featureId);
    if (!feature) return;

    // 加载项目和版本信息
    const project = feature.projectId ? 
      await this.entityManager.getProject(feature.projectId) : null;
    const version = project?.versionId ? 
      await this.entityManager.getVersion(project.versionId) : null;

    // 创建层级结构
    const section = container.createDiv('pm-cascade-section');
    
    if (version) {
      await this.renderVersionHeader(section, version, true);
    }
    
    if (project) {
      await this.renderProjectCard(section, project, true, feature);
    } else {
      // 单独特性
      this.renderFeatureRow(section.createDiv('pm-cascade__features'), feature);
    }
  }

  /**
   * 渲染所有版本
   */
  private async renderAllVersions(container: HTMLElement): Promise<void> {
    const versions = await this.entityManager.listVersions();

    if (versions.length === 0) {
      container.createDiv({ cls: 'pm-cascade-empty', text: '暂无版本' });
      return;
    }

    // 应用排序
    const sortedVersions = this.sortEntities(versions) as Version[];

    for (const version of sortedVersions) {
      await this.renderVersionTree(container, version.id, 0);
    }
  }

  /**
   * 渲染版本头部
   */
  private async renderVersionHeader(
    container: HTMLElement, 
    version: Version,
    isPlaceholder: boolean = false
  ): Promise<void> {
    const header = container.createDiv('pm-cascade__header');
    if (!isPlaceholder) {
      header.addClass('pm-cascade__header--clickable');
      header.addEventListener('click', () => {
        this.actionService.openEntity('version', version.id);
      });
    } else {
      header.addClass('pm-cascade__header--placeholder');
    }

    // 标题行
    const titleRow = header.createDiv('pm-cascade__title-row');
    
    // 类型图标 + 名称
    const title = titleRow.createDiv('pm-cascade__title');
    title.createSpan({ cls: 'pm-cascade__icon', text: this.getEntityTypeIcon('version') });
    title.createSpan({ text: version.name });

    // 状态标签
    if (version.status) {
      titleRow.createSpan({
        cls: `pm-cascade__status pm-cascade__status--${version.status}`,
        text: this.translateStatus(version.status),
      });
    }

    // 统计摘要
    const projects = await this.entityManager.listProjects({ versionId: version.id });
    const allFeatures: Feature[] = [];
    let totalProgress = 0;
    let completedCount = 0;

    for (const project of projects) {
      const features = await this.entityManager.listFeatures({ projectId: project.id });
      allFeatures.push(...features);
      for (const f of features) {
        totalProgress += f.progress || 0;
        if (f.status === 'completed') completedCount++;
      }
    }

    const avgProgress = allFeatures.length > 0 ? Math.round(totalProgress / allFeatures.length) : 0;

    const summary = header.createDiv('pm-cascade__summary');
    
    // 统计文本
    summary.createSpan({
      cls: 'pm-cascade__summary-text',
      text: `${projects.length} 项目 · ${allFeatures.length} 特性 · ${completedCount} 已完成`,
    });

    // 整体进度条
    if (allFeatures.length > 0) {
      const progressBar = summary.createDiv('pm-cascade__main-progress');
      progressBar.createDiv({
        cls: 'pm-cascade__main-progress-fill',
        attr: { style: `width: ${avgProgress}%` },
      });
      summary.createSpan({
        cls: 'pm-cascade__main-progress-text',
        text: `${avgProgress}%`,
      });
    }

    // 日期
    if (version.endDate) {
      summary.createSpan({
        cls: 'pm-cascade__summary-date',
        text: DateFormat.medium(version.endDate),
      });
    }
  }

  /**
   * 渲染项目卡片
   */
  private async renderProjectCard(
    container: HTMLElement,
    project: Project,
    isSingleView: boolean = false,
    highlightFeature?: Feature
  ): Promise<void> {
    const card = container.createDiv('pm-cascade__project');

    // 项目头部
    const header = card.createDiv('pm-cascade__project-header');
    header.addEventListener('click', () => {
      this.actionService.openEntity('project', project.id);
    });

    header.createSpan({ cls: 'pm-cascade__icon', text: this.getEntityTypeIcon('project') });
    header.createSpan({ cls: 'pm-cascade__project-name', text: project.name });

    // 加载特性统计
    const features = await this.entityManager.listFeatures({ projectId: project.id });
    
    // 应用排序
    const sortedFeatures = this.sortEntities(features) as Feature[];
    
    const totalProgress = sortedFeatures.reduce((sum, f) => sum + (f.progress || 0), 0);
    const avgProgress = features.length > 0 ? Math.round(totalProgress / features.length) : 0;
    const completedCount = features.filter(f => f.status === 'completed').length;

    // 迷你进度条
    if (features.length > 0) {
      const progressContainer = header.createDiv('pm-cascade__project-progress');
      const progressBar = progressContainer.createDiv('pm-cascade__mini-progress');
      progressBar.createDiv({
        cls: 'pm-cascade__mini-progress-fill',
        attr: { style: `width: ${avgProgress}%` },
      });
      progressContainer.createSpan({
        cls: 'pm-cascade__progress-text',
        text: `${avgProgress}%`,
      });
    }

    // 统计文本
    if (features.length > 0) {
      card.createDiv({
        cls: 'pm-cascade__project-stats',
        text: `${features.length} 特性 · ${completedCount} 已完成`,
      });
    }

    // 特性列表
    if (sortedFeatures.length > 0) {
      const featuresContainer = card.createDiv('pm-cascade__features');
      
      // 限制显示数量
      const maxFeatures = isSingleView ? 50 : 5;
      const displayFeatures = sortedFeatures.slice(0, maxFeatures);
      
      for (const feature of displayFeatures) {
        const isHighlighted = highlightFeature && feature.id === highlightFeature.id;
        this.renderFeatureRow(featuresContainer, feature, isHighlighted);
      }

      // 更多提示
      if (sortedFeatures.length > maxFeatures) {
        featuresContainer.createDiv({
          cls: 'pm-cascade__more-features',
          text: `还有 ${sortedFeatures.length - maxFeatures} 个特性...`,
        });
      }
    }
  }

  /**
   * 渲染特性行
   */
  private renderFeatureRow(
    container: HTMLElement,
    feature: Feature,
    isHighlighted: boolean = false
  ): HTMLElement {
    const row = container.createDiv('pm-cascade__feature');
    if (isHighlighted) {
      row.addClass('pm-cascade__feature--highlighted');
    }

    row.addEventListener('click', () => {
      this.actionService.openEntity('feature', feature.id);
    });

    // 优先级标记
    if (feature.priority) {
      const priorityColors: Record<string, string> = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#22c55e',
      };
      row.createSpan({
        cls: 'pm-cascade__feature-priority',
        attr: { style: `color: ${priorityColors[feature.priority] || '#9ca3af'}` },
        text: '●',
      });
    }

    // 类型图标
    row.createSpan({ cls: 'pm-cascade__feature-icon', text: '☰' });

    // 名称容器
    const nameContainer = row.createDiv('pm-cascade__feature-name-container');
    nameContainer.createSpan({ cls: 'pm-cascade__feature-name', text: feature.name });

    // 进度
    if (feature.progress !== undefined) {
      row.createSpan({
        cls: 'pm-cascade__feature-progress',
        text: `${feature.progress}%`,
      });
    }

    // 截止日期
    if (feature.dueDate) {
      const isOverdueDate = isOverdue(feature.dueDate, feature.status);
      const isUpcoming = !isOverdueDate && new Date(feature.dueDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;
      
      let dueClass = 'pm-cascade__feature-due';
      if (feature.status === 'completed') dueClass += ' pm-cascade__feature-due--completed';
      else if (isOverdueDate) dueClass += ' pm-cascade__feature-due--overdue';
      else if (isUpcoming) dueClass += ' pm-cascade__feature-due--upcoming';

      row.createSpan({
        cls: dueClass,
        text: DateFormat.short(feature.dueDate),
      });
    }

    // 负责人
    if (feature.owner) {
      row.createSpan({ cls: 'pm-cascade__feature-owner', text: `@${feature.owner}` });
    }

    return row;
  }

  /**
   * 对实体列表进行排序
   */
  private sortEntities(entities: Entity[]): Entity[] {
    return this.dataService.applySort(
      entities,
      this.config.sortBy,
      this.config.sortOrder
    );
  }
}
