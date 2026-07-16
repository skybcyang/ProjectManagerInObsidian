import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, Version, Project, Feature, getEntityType } from '../types';
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
 * 卡片式层级视图：版本 → 项目 → 特性，只读展示
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
        showActions: false,
        showEstimatedDays: true,
        showActualDays: true,
        smallTitle: true,
        ...overrides
      };
    }
    return super.buildCardOptions(overrides);
  }

  /**
   * 渲染级联视图
   */
  async render(container: HTMLElement): Promise<void> {
    // 显示加载状态，等待数据准备完成
    this.showLoading(container);

    const data = await this.prepareCascadeData();

    container.empty();
    container.addClass('pm-cascade-container');

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
      this.renderStatusBadge(titleRow, version.status).addClass('pm-cascade__status');
    }

    // 展开详情按钮
    this.createExpandToggle(header, container, version);

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

    // 负责人
    if (version.owner && this.shouldShowCardField('owner')) {
      summary.createSpan({
        cls: 'pm-cascade__summary-owner',
        text: `@${version.owner}`,
      });
    }

    // 日期范围
    if (this.shouldShowCardField('startDate') && version.startDate) {
      summary.createSpan({
        cls: 'pm-cascade__summary-date',
        text: DateFormat.medium(version.startDate),
      });
    }
    if (this.shouldShowCardField('endDate') && version.endDate) {
      const overdue = isOverdue(version.endDate, version.status);
      const dateEl = summary.createSpan({
        cls: 'pm-cascade__summary-date',
        text: DateFormat.medium(version.endDate),
      });
      if (overdue) {
        dateEl.addClass('pm-cascade__summary-date--overdue');
      }
    }

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

    const logSummary = this.entityManager.cache.getLogSummary(project.id);
    const cardEl = card.render(wrapper, projectWithStats as any, cardOptions, {
      onOpen: () => this.actionService.openEntity('project', project.id),
    }, logSummary);

    // 展开详情按钮
    this.createExpandToggle(cardEl, wrapper, project);

    // 特性列表挂载在卡片底部
    if (features.length > 0) {
      const featuresContainer = cardEl.createDiv('pm-cascade__features');

      // 默认展示全部特性，可通过 maxFeaturesPerProject 手动限制
      const maxFeatures = this.config.maxFeaturesPerProject ?? this.config.options?.maxFeaturesPerProject ?? features.length;
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
    const wrapper = container.createDiv('pm-cascade__feature-wrapper');
    const row = wrapper.createDiv('pm-cascade__feature');
    if (isHighlighted) {
      row.addClass('pm-cascade__feature--highlighted');
    }

    row.addEventListener('click', async () => {
      await this.actionService.openEntity('feature', feature.id);
    });

    const opts = this.buildCardOptions();

    // 左侧：优先级标记 + 图标 + 名称
    const main = row.createDiv('pm-cascade__feature-main');

    if (feature.priority && opts.showPriority) {
      const priorityColors: Record<string, string> = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#22c55e',
      };
      main.createSpan({
        cls: 'pm-cascade__feature-priority',
        attr: { style: `color: ${priorityColors[feature.priority] || '#9ca3af'}` },
        text: '●',
      });
    }

    if (opts.showTypeIcon) {
      main.createSpan({ cls: 'pm-cascade__feature-icon', text: '☰' });
    }

    main.createSpan({ cls: 'pm-cascade__feature-name', text: feature.name });

    // 右侧：元信息
    const meta = row.createDiv('pm-cascade__feature-meta');

    if (feature.status && opts.showStatus) {
      this.renderStatusBadge(meta, feature.status).addClass('pm-cascade__feature-status');
    }

    if (feature.priority && opts.showPriority) {
      this.renderPriorityBadge(meta, feature.priority).addClass('pm-cascade__feature-priority-badge');
    }

    if (feature.progress !== undefined && opts.showProgress) {
      this.renderProgressBar(meta, feature.progress).addClass('pm-cascade__feature-progress-bar');
    }

    if (feature.startDate && opts.showStartDate) {
      const isOverdueDate = isOverdue(feature.startDate, feature.status);
      const el = this.renderDate(meta, feature.startDate);
      el.addClass('pm-cascade__feature-start');
      if (isOverdueDate) {
        el.addClass('pm-cascade__feature-date--overdue');
      }
    }

    if (feature.endDate && opts.showDueDate) {
      const isOverdueDate = isOverdue(feature.endDate, feature.status);
      const isUpcoming = !isOverdueDate && new Date(feature.endDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;

      const el = this.renderDate(meta, feature.endDate);
      el.addClass('pm-cascade__feature-due');
      if (feature.status === 'completed') el.addClass('pm-cascade__feature-due--completed');
      else if (isOverdueDate) el.addClass('pm-cascade__feature-due--overdue');
      else if (isUpcoming) el.addClass('pm-cascade__feature-due--upcoming');
    }

    if (feature.owner && opts.showOwner) {
      meta.createSpan({ cls: 'pm-cascade__feature-owner', text: `@${feature.owner}` });
    }

    if (feature.estimatedDays !== undefined && opts.showEstimatedDays) {
      this.renderDays(meta, feature.estimatedDays, '预').addClass('pm-cascade__feature-days');
    }

    if (feature.actualDays !== undefined && opts.showActualDays) {
      this.renderDays(meta, feature.actualDays, '实').addClass('pm-cascade__feature-days');
    }

    if (feature.tags && feature.tags.length > 0 && opts.showTags) {
      this.renderTags(meta, feature.tags, 3).addClass('pm-cascade__feature-tags');
    }

    if (opts.showRisk) {
      const logSummary = this.entityManager.cache.getLogSummary(feature.id);
      if (logSummary && logSummary.riskSummary.total > 0) {
        const rs = logSummary.riskSummary;
        meta.createSpan({
          cls: 'pm-cascade__feature-risk',
          text: `⚠️ ${rs.open}`,
          attr: { title: `总风险: ${rs.total} | 未关闭: ${rs.open}` },
        });
      }
    }

    // 展开详情按钮
    this.createExpandToggle(row, wrapper, feature);

    return wrapper;
  }

  /**
   * 创建展开/收起详情按钮
   */
  private createExpandToggle(
    triggerContainer: HTMLElement,
    detailContainer: HTMLElement,
    entity: Entity
  ): void {
    const btn = triggerContainer.createSpan({
      cls: 'pm-cascade__expand-btn',
      text: '▾',
      attr: { title: '展开详情' },
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const existing = detailContainer.querySelector('.pm-list-card-detail');
      if (existing) {
        existing.remove();
        btn.textContent = '▾';
        btn.setAttribute('title', '展开详情');
      } else {
        this.renderDetailPanel(detailContainer, entity);
        btn.textContent = '▴';
        btn.setAttribute('title', '收起详情');
      }
    });
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
