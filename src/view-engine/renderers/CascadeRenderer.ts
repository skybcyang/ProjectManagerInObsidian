import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, EntityType, Version, Project, Feature, getEntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';
import { RendererRegistry } from '../RendererRegistry';
import { getPriorityColor, DateFormat, isOverdue } from '../design-tokens';
import { EntityCard } from '../components';
import type { EntityCardOptions } from '../components';

interface CascadeData {
  versions: Version[];
  projects: Project[];
  features: Feature[];
}

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
   * 级联视图字段显示控制
   * 未配置 cardFields 时默认显示所有字段，保持向后兼容
   */
  protected shouldShowCardField(fieldKey: string): boolean {
    if (!this.config.cardFields) {
      return true;
    }
    return super.shouldShowCardField(fieldKey);
  }

  /**
   * 构建 EntityCard 选项
   * 级联视图未配置 cardFields 时默认显示所有字段
   */
  protected buildCardOptions(overrides?: Partial<EntityCardOptions>): EntityCardOptions {
    if (!this.config.cardFields) {
      return {
        showPriority: true,
        showStatus: true,
        showOwner: true,
        showStartDate: true,
        showDueDate: true,
        showProgress: true,
        showRisk: true,
        showLatestProgress: true,
        showTags: true,
        showDescription: true,
        showParent: true,
        showTypeIcon: true,
        showStats: true,
        showActions: true,
        ...overrides
      };
    }
    return super.buildCardOptions(overrides);
  }

  /**
   * 渲染级联视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-cascade-container');

    const data = await this.prepareCascadeData();

    if (data.versions.length === 0) {
      this.createEmptyState(container, '暂无数据');
      return;
    }

    for (const version of data.versions) {
      const versionProjects = data.projects.filter(p => p.versionId === version.id);
      await this.renderVersionTree(container, version, versionProjects, data.features);
    }
  }

  /**
   * 准备级联数据
   * 1. 通过 DataService.loadEntities 应用树形筛选
   * 2. 从筛选结果反推需要显示的版本和项目
   * 3. 返回过滤后的三层数据
   */
  private async prepareCascadeData(): Promise<CascadeData> {
    const entityType = this.config.entityType || 'feature';

    // 先获取按树形筛选过滤后的实体
    const filteredEntities = await this.dataService.loadEntities(this.config);

    let versionIds = new Set<string>();
    let projectIds = new Set<string>();
    let features: Feature[] = [];

    if (entityType === 'feature') {
      features = filteredEntities as Feature[];
      features.forEach(f => {
        projectIds.add(f.projectId);
        versionIds.add(f.versionId);
      });
    } else if (entityType === 'project') {
      const projects = filteredEntities as Project[];
      projects.forEach(p => {
        projectIds.add(p.id);
        versionIds.add(p.versionId);
      });
      // 获取这些项目下的所有特性（再应用平面过滤）
      const allFeatures = await this.entityManager.listFeatures();
      features = allFeatures.filter(f => projectIds.has(f.projectId));
      features = this.dataService.applyFilters(features as any, this.config) as any;
    } else if (entityType === 'version') {
      const versions = filteredEntities as Version[];
      versions.forEach(v => versionIds.add(v.id));
      // 获取这些版本下的所有项目
      const allProjects = await this.entityManager.listProjects();
      const relevantProjects = allProjects.filter(p => versionIds.has(p.versionId));
      relevantProjects.forEach(p => projectIds.add(p.id));
      // 获取这些项目下的所有特性（再应用平面过滤）
      const allFeatures = await this.entityManager.listFeatures();
      features = allFeatures.filter(f => projectIds.has(f.projectId));
      features = this.dataService.applyFilters(features as any, this.config) as any;
    }

    // 加载并过滤版本和项目
    const allVersions = await this.entityManager.listVersions();
    const versions = this.sortEntities(
      allVersions.filter(v => versionIds.has(v.id))
    ) as Version[];

    const allProjects = await this.entityManager.listProjects();
    const projects = this.sortEntities(
      allProjects.filter(p => projectIds.has(p.id))
    ) as Project[];

    features = this.sortEntities(features) as Feature[];

    return { versions, projects, features };
  }

  /**
   * 渲染版本树
   */
  private async renderVersionTree(
    container: HTMLElement,
    version: Version,
    projects: Project[],
    allFeatures: Feature[]
  ): Promise<void> {
    // 创建版本区块
    const versionSection = container.createDiv('pm-cascade-section');

    // 渲染版本头部（带头衔和统计）
    await this.renderVersionHeader(versionSection, version, projects, allFeatures);

    if (projects.length === 0) {
      versionSection.createDiv({ cls: 'pm-cascade-empty', text: '暂无项目' });
      return;
    }

    // 渲染项目列表
    const projectsContainer = versionSection.createDiv('pm-cascade__projects');
    for (const project of projects) {
      const projectFeatures = allFeatures.filter(f => f.projectId === project.id);
      await this.renderProjectCard(projectsContainer, project, projectFeatures);
    }
  }

  /**
   * 渲染版本头部
   */
  private async renderVersionHeader(
    container: HTMLElement,
    version: Version,
    projects: Project[],
    allFeatures: Feature[]
  ): Promise<void> {
    const header = container.createDiv('pm-cascade__header');
    header.addClass('pm-cascade__header--clickable');
    header.addEventListener('click', async () => {
      await this.actionService.openEntity('version', version.id);
    });

    // 标题行
    const titleRow = header.createDiv('pm-cascade__title-row');

    // 类型图标 + 名称
    const title = titleRow.createDiv('pm-cascade__title');
    title.createSpan({ cls: 'pm-cascade__icon', text: this.getEntityTypeIcon('version') });
    title.createSpan({ text: version.name });

    // 状态标签
    if (version.status && this.shouldShowCardField('status')) {
      titleRow.createSpan({
        cls: `pm-cascade__status pm-cascade__status--${version.status}`,
        text: this.translateStatus(version.status),
      });
    }

    // 统计摘要（从传入的过滤后数据计算）
    const versionFeatures = allFeatures.filter(f =>
      projects.some(p => p.id === f.projectId)
    );
    const totalProgress = versionFeatures.reduce((sum, f) => sum + (f.progress || 0), 0);
    const avgProgress = versionFeatures.length > 0
      ? Math.round(totalProgress / versionFeatures.length)
      : 0;
    const completedCount = versionFeatures.filter(f => f.status === 'completed').length;

    const summary = header.createDiv('pm-cascade__summary');

    // 统计文本
    if (this.shouldShowCardField('stats')) {
      summary.createSpan({
        cls: 'pm-cascade__summary-text',
        text: `${projects.length} 项目 · ${versionFeatures.length} 特性 · ${completedCount} 已完成`,
      });
    }

    // 整体进度条
    if (versionFeatures.length > 0 && this.shouldShowCardField('progress')) {
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

    // 风险徽章
    if (this.shouldShowCardField('risk')) {
      const logSummary = this.entityManager.cache.getLogSummary(version.id);
      if (logSummary && logSummary.riskSummary.total > 0) {
        const rs = logSummary.riskSummary;
        const riskEl = summary.createSpan('pm-cascade__risk-badge');
        let badgeText = `⚠️ ${rs.open}`;
        if (rs.high > 0) badgeText += ` 🔴${rs.high}`;
        else if (rs.medium > 0) badgeText += ` 🟡${rs.medium}`;
        riskEl.textContent = badgeText;
        riskEl.title = `总风险: ${rs.total} | 未关闭: ${rs.open}`;
      }
    }

    // 日期
    if (version.endDate && this.shouldShowCardField('endDate')) {
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
    features: Feature[]
  ): Promise<void> {
    const totalProgress = features.reduce((sum, f) => sum + (f.progress || 0), 0);
    const avgProgress = features.length > 0 ? Math.round(totalProgress / features.length) : 0;
    const completedCount = features.filter(f => f.status === 'completed').length;

    const wrapper = container.createDiv('pm-cascade__project');
    const card = new EntityCard(this.app);

    const projectWithStats = {
      ...project,
      stats: { total: features.length, completed: completedCount },
      progress: avgProgress,
    };

    const cardOptions = this.buildCardOptions({
      showStats: this.shouldShowCardField('stats'),
      showProgress: this.shouldShowCardField('progress'),
    });

    const cardEl = card.render(wrapper, projectWithStats as any, cardOptions, {
      onOpen: () => this.actionService.openEntity('project', project.id),
    });

    // 特性列表挂载在卡片底部
    if (features.length > 0) {
      const featuresContainer = cardEl.createDiv('pm-cascade__features');

      // 限制显示数量
      const maxFeatures = 5;
      const displayFeatures = features.slice(0, maxFeatures);

      for (const feature of displayFeatures) {
        this.renderFeatureRow(featuresContainer, feature);
      }

      // 更多提示
      if (features.length > maxFeatures) {
        featuresContainer.createDiv({
          cls: 'pm-cascade__more-features',
          text: `还有 ${features.length - maxFeatures} 个特性...`,
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

    row.addEventListener('click', async () => {
      await this.actionService.openEntity('feature', feature.id);
    });

    const opts = this.buildCardOptions();

    // 优先级标记
    if (feature.priority && opts.showPriority) {
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
    if (opts.showTypeIcon) {
      row.createSpan({ cls: 'pm-cascade__feature-icon', text: '☰' });
    }

    // 名称容器
    const nameContainer = row.createDiv('pm-cascade__feature-name-container');
    nameContainer.createSpan({ cls: 'pm-cascade__feature-name', text: feature.name });

    // 进度
    if (feature.progress !== undefined && opts.showProgress) {
      row.createSpan({
        cls: 'pm-cascade__feature-progress',
        text: `${feature.progress}%`,
      });
    }

    // 结束日期
    if (feature.endDate && opts.showDueDate) {
      const isOverdueDate = isOverdue(feature.endDate, feature.status);
      const isUpcoming = !isOverdueDate && new Date(feature.endDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;

      let dueClass = 'pm-cascade__feature-due';
      if (feature.status === 'completed') dueClass += ' pm-cascade__feature-due--completed';
      else if (isOverdueDate) dueClass += ' pm-cascade__feature-due--overdue';
      else if (isUpcoming) dueClass += ' pm-cascade__feature-due--upcoming';

      row.createSpan({
        cls: dueClass,
        text: DateFormat.short(feature.endDate),
      });
    }

    // 开始日期
    if (feature.startDate && opts.showStartDate) {
      row.createSpan({
        cls: 'pm-cascade__feature-start',
        text: DateFormat.short(feature.startDate),
      });
    }

    // 负责人
    if (feature.owner && opts.showOwner) {
      row.createSpan({ cls: 'pm-cascade__feature-owner', text: `@${feature.owner}` });
    }

    // 状态
    if (feature.status && opts.showStatus) {
      row.createSpan({
        cls: `pm-cascade__feature-status pm-cascade__feature-status--${feature.status}`,
        text: this.translateStatus(feature.status),
      });
    }

    // 风险徽章
    if (opts.showRisk) {
      const logSummary = this.entityManager.cache.getLogSummary(feature.id);
      if (logSummary && logSummary.riskSummary.total > 0) {
        const rs = logSummary.riskSummary;
        row.createSpan({
          cls: 'pm-cascade__feature-risk',
          text: `⚠️ ${rs.open}`,
          attr: { title: `总风险: ${rs.total} | 未关闭: ${rs.open}` },
        });
      }
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

// 自注册到渲染器注册表
RendererRegistry.register('cascade', CascadeRenderer);
