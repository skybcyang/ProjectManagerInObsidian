import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { CardRegistry } from '../../ui/cards';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, EntityType, Version, Project, Feature, getEntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';

/**
 * 级联渲染器
 * 层级级联视图：版本 → 项目 → 特性
 */
export class CascadeRenderer extends BaseRenderer {
  constructor(
    app: App,
    entityManager: EntityManager,
    cardRegistry: CardRegistry,
    dataService: DataService,
    actionService: ActionService
  ) {
    super(app, entityManager, cardRegistry, dataService, actionService);
  }

  /**
   * 渲染级联视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-cascade-view');

    // 创建工具栏
    this.createToolbar(container, (this.config as any).title || '级联视图');

    // 创建级联容器
    const cascadeContainer = container.createDiv('pm-cascade-container');

    // 根据配置决定渲染方式
    if ((this.config as any).id) {
      // 渲染单个实体及其级联关系
      await this.renderEntityCascade(cascadeContainer, (this.config as any).id);
    } else {
      // 渲染所有版本
      await this.renderAllVersions(cascadeContainer);
    }
  }

  /**
   * 渲染单个实体的级联视图
   */
  private async renderEntityCascade(container: HTMLElement, entityId: string): Promise<void> {
    const type = this.config.type || 'version';

    switch (type) {
      case 'version':
        await this.renderVersionCascade(container, entityId);
        break;
      case 'project':
        await this.renderProjectCascade(container, entityId);
        break;
      case 'feature':
        await this.renderFeatureDetail(container, entityId);
        break;
    }
  }

  /**
   * 渲染版本级联
   */
  private async renderVersionCascade(container: HTMLElement, versionId: string): Promise<void> {
    const version = await this.entityManager.getVersion(versionId);
    if (!version) {
      this.createEmptyState(container, '版本不存在');
      return;
    }

    // 创建版本卡片
    const versionCard = this.createEntityCard(container, version as Entity, 0);

    // 加载项目
    const projects = await this.entityManager.listProjects({ versionId });
    
    if (projects.length === 0) {
      versionCard.createDiv({ cls: 'pm-cascade-empty', text: '暂无项目' });
      return;
    }

    // 渲染每个项目的级联
    const projectsContainer = versionCard.createDiv('pm-cascade-children');
    for (const project of projects) {
      await this.renderProjectNode(projectsContainer, project, 1);
    }
  }

  /**
   * 渲染项目级联
   */
  private async renderProjectCascade(container: HTMLElement, projectId: string): Promise<void> {
    const project = await this.entityManager.getProject(projectId);
    if (!project) {
      this.createEmptyState(container, '项目不存在');
      return;
    }

    // 加载版本信息
    const version = project.versionId ? 
      await this.entityManager.getVersion(project.versionId) : null;

    // 创建版本占位（如果有）
    if (version) {
      const versionCard = this.createEntityCard(container, version as Entity, 0);
      versionCard.classList.add('pm-cascade-placeholder');
      
      const projectsContainer = versionCard.createDiv('pm-cascade-children');
      await this.renderProjectNode(projectsContainer, project, 1);
    } else {
      await this.renderProjectNode(container, project, 0);
    }
  }

  /**
   * 渲染项目节点
   */
  private async renderProjectNode(
    container: HTMLElement,
    project: Project,
    level: number
  ): Promise<void> {
    const projectCard = this.createEntityCard(container, project as Entity, level);

    // 加载特性
    const features = await this.entityManager.listFeatures({ projectId: project.id });

    if (features.length === 0) {
      projectCard.createDiv({ cls: 'pm-cascade-empty', text: '暂无特性' });
      return;
    }

    // 渲染特性
    const featuresContainer = projectCard.createDiv('pm-cascade-children');
    for (const feature of features) {
      this.createFeatureCard(featuresContainer, feature, level + 1);
    }
  }

  /**
   * 渲染特性详情
   */
  private async renderFeatureDetail(container: HTMLElement, featureId: string): Promise<void> {
    const feature = await this.entityManager.getFeature(featureId);
    if (!feature) {
      this.createEmptyState(container, '特性不存在');
      return;
    }

    // 加载项目和版本信息
    const project = feature.projectId ? 
      await this.entityManager.getProject(feature.projectId) : null;
    const version = project?.versionId ? 
      await this.entityManager.getVersion(project.versionId) : null;

    // 创建层级结构
    if (version) {
      const versionCard = this.createEntityCard(container, version as Entity, 0);
      versionCard.classList.add('pm-cascade-placeholder');

      if (project) {
        const projectsContainer = versionCard.createDiv('pm-cascade-children');
        const projectCard = this.createEntityCard(projectsContainer, project as Entity, 1);
        projectCard.classList.add('pm-cascade-placeholder');

        const featuresContainer = projectCard.createDiv('pm-cascade-children');
        this.createFeatureDetailCard(featuresContainer, feature, 2);
      } else {
        const featuresContainer = versionCard.createDiv('pm-cascade-children');
        this.createFeatureDetailCard(featuresContainer, feature, 1);
      }
    } else if (project) {
      const projectCard = this.createEntityCard(container, project as Entity, 0);
      projectCard.classList.add('pm-cascade-placeholder');

      const featuresContainer = projectCard.createDiv('pm-cascade-children');
      this.createFeatureDetailCard(featuresContainer, feature, 1);
    } else {
      this.createFeatureDetailCard(container, feature, 0);
    }
  }

  /**
   * 渲染所有版本
   */
  private async renderAllVersions(container: HTMLElement): Promise<void> {
    const versions = await this.entityManager.listVersions();

    if (versions.length === 0) {
      this.createEmptyState(container, '暂无版本');
      return;
    }

    for (const version of versions) {
      await this.renderVersionCascade(container, version.id);
    }
  }

  /**
   * 创建实体卡片（通用）
   */
  private createEntityCard(container: HTMLElement, entity: Entity, level: number): HTMLElement {
    const card = container.createDiv('pm-cascade-card');
    card.classList.add(`pm-cascade-level-${level}`);
    card.dataset.entityType = getEntityType(entity);
    card.dataset.entityId = entity.id;

    // 缩进线
    if (level > 0) {
      const indent = card.createDiv('pm-cascade-indent');
      indent.style.width = `${level * 24}px`;
    }

    // 卡片内容
    const content = card.createDiv('pm-cascade-card-content');

    // 类型图标
    const icon = this.getEntityTypeIcon(getEntityType(entity));
    content.createSpan({ cls: 'pm-cascade-icon', text: icon });

    // 信息区域
    const info = content.createDiv('pm-cascade-info');

    // 名称
    info.createEl('h4', { cls: 'pm-cascade-name', text: entity.name });

    // 元信息
    const meta = info.createDiv('pm-cascade-meta');

    if (entity.owner) {
      meta.createSpan({ cls: 'pm-cascade-owner', text: `👤 ${entity.owner}` });
    }

    if ('status' in entity && entity.status) {
      meta.createSpan({
        cls: `pm-cascade-status pm-status-${entity.status}`,
        text: this.translateStatus(entity.status),
      });
    }

    if ('dueDate' in entity && entity.dueDate) {
      const isOverdue = new Date(entity.dueDate) < new Date() && 
                        'status' in entity && 
                        entity.status !== 'completed';
      meta.createSpan({
        cls: `pm-cascade-due${isOverdue ? ' pm-overdue' : ''}`,
        text: `📅 ${this.formatDate(entity.dueDate)}`,
      });
    }

    // 进度（版本/项目有汇总进度）
    if ('stats' in entity && entity.stats) {
      const stats = (entity as any).stats;
      const progress = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
      
      const progressEl = content.createDiv('pm-cascade-progress');
      progressEl.createDiv({
        cls: 'pm-progress-ring',
        attr: { style: `--progress: ${progress}` },
      });
      progressEl.createSpan({ text: `${progress}%` });
    }

    // 点击展开/收起（如果有子元素）
    card.addEventListener('click', (e) => {
      // 如果点击的是操作按钮，不触发折叠
      if ((e.target as HTMLElement).closest('.pm-cascade-actions')) return;

      const children = card.querySelector('.pm-cascade-children') as HTMLElement;
      if (children) {
        children.style.display = children.style.display === 'none' ? 'block' : 'none';
        card.classList.toggle('pm-cascade-collapsed');
      } else {
        // 没有子元素则打开文件
        this.actionService.openEntity(getEntityType(entity) as EntityType, entity.id);
      }
    });

    return card;
  }

  /**
   * 创建特性卡片（简化版）
   */
  private createFeatureCard(container: HTMLElement, feature: Feature, level: number): HTMLElement {
    const card = container.createDiv('pm-cascade-card pm-cascade-card-feature');
    card.classList.add(`pm-cascade-level-${level}`);

    // 缩进线
    if (level > 0) {
      const indent = card.createDiv('pm-cascade-indent');
      indent.style.width = `${level * 24}px`;
    }

    // 内容
    const content = card.createDiv('pm-cascade-card-content');

    // 优先级标记
    const priorityColors: Record<string, string> = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#f59e0b',
      low: '#22c55e',
    };
    if (feature.priority) {
      content.createSpan({
        cls: 'pm-cascade-priority',
        attr: { style: `background: ${priorityColors[feature.priority] || '#9ca3af'}` },
      });
    }

    // 名称
    content.createSpan({ cls: 'pm-cascade-feature-name', text: feature.name });

    // 进度
    const progress = feature.progress || 0;
    const progressEl = content.createDiv('pm-cascade-progress-mini');
    progressEl.createDiv({
      cls: 'pm-progress-bar-mini',
      attr: { style: `width: ${progress}%` },
    });

    // 状态
    if (feature.status) {
      content.createSpan({
        cls: `pm-cascade-status-mini pm-status-${feature.status}`,
        text: this.translateStatus(feature.status),
      });
    }

    // 点击打开
    card.addEventListener('click', () => {
      this.actionService.openEntity('feature', feature.id);
    });

    return card;
  }

  /**
   * 创建特性详情卡片（完整信息）
   */
  private createFeatureDetailCard(
    container: HTMLElement,
    feature: Feature,
    level: number
  ): HTMLElement {
    const card = container.createDiv('pm-cascade-card pm-cascade-card-detail');
    card.classList.add(`pm-cascade-level-${level}`);

    // 内容区域
    const content = card.createDiv('pm-cascade-detail-content');

    // 头部
    const header = content.createDiv('pm-cascade-detail-header');
    header.createSpan({ cls: 'pm-cascade-icon', text: '📝' });
    header.createEl('h3', { text: feature.name });

    // 优先级
    if (feature.priority) {
      header.createSpan({
        cls: `pm-priority-badge pm-priority-${feature.priority}`,
        text: this.translatePriority(feature.priority),
      });
    }

    // 描述
    if ((feature as any).description) {
      content.createDiv({
        cls: 'pm-cascade-detail-desc',
        text: String((feature as any).description),
      });
    }

    // 属性网格
    const props = content.createDiv('pm-cascade-detail-props');

    // 状态
    const statusRow = props.createDiv('pm-prop-row');
    statusRow.createSpan({ cls: 'pm-prop-label', text: '状态' });
    const statusVal = statusRow.createSpan({ cls: 'pm-prop-value' });
    statusVal.createSpan({
      cls: `pm-status-badge pm-status-${feature.status}`,
      text: this.translateStatus(feature.status),
    });

    // 负责人
    if (feature.owner) {
      const ownerRow = props.createDiv('pm-prop-row');
      ownerRow.createSpan({ cls: 'pm-prop-label', text: '负责人' });
      ownerRow.createSpan({ cls: 'pm-prop-value', text: feature.owner });
    }

    // 进度
    const progressRow = props.createDiv('pm-prop-row');
    progressRow.createSpan({ cls: 'pm-prop-label', text: '进度' });
    const progressVal = progressRow.createDiv({ cls: 'pm-prop-value' });
    const progress = feature.progress || 0;
    progressVal.createDiv({
      cls: 'pm-progress-bar',
      attr: { style: `width: ${progress}%` },
    });
    progressVal.createSpan({ text: ` ${progress}%` });

    // 截止日期
    if (feature.dueDate) {
      const dueRow = props.createDiv('pm-prop-row');
      dueRow.createSpan({ cls: 'pm-prop-label', text: '截止日期' });
      dueRow.createSpan({ cls: 'pm-prop-value', text: this.formatDate(feature.dueDate) });
    }

    // 标签
    if (feature.tags && feature.tags.length > 0) {
      const tagsRow = props.createDiv('pm-prop-row');
      tagsRow.createSpan({ cls: 'pm-prop-label', text: '标签' });
      const tagsVal = tagsRow.createDiv({ cls: 'pm-prop-value' });
      feature.tags!.forEach((tag: string) => {
        tagsVal.createSpan({ cls: 'pm-tag', text: tag });
      });
    }

    // 快速操作
    const actions = content.createDiv('pm-cascade-detail-actions');

    // 状态切换
    const statusBtn = actions.createEl('button', { cls: 'pm-action-btn' });
    statusBtn.textContent = '更改状态';
    statusBtn.onclick = (e) => {
      e.stopPropagation();
      this.showStatusPicker(feature as Entity);
    };

    // 进度更新
    const progressBtn = actions.createEl('button', { cls: 'pm-action-btn' });
    progressBtn.textContent = '更新进度';
    progressBtn.onclick = (e) => {
      e.stopPropagation();
      this.showProgressPicker(feature as Entity);
    };

    // 打开文件
    const openBtn = actions.createEl('button', { cls: 'pm-action-btn pm-action-btn-primary' });
    openBtn.textContent = '打开文件';
    openBtn.onclick = (e) => {
      e.stopPropagation();
      this.actionService.openEntity('feature', feature.id);
    };

    return card;
  }

  /**
   * 格式化日期
   */
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  }
}
