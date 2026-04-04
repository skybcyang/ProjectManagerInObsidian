import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { CardRegistry } from '../../ui/cards';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, EntityType, Version, Project, Feature, getEntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';

/**
 * 级联渲染器
 * 树形层级视图：版本 → 项目 → 特性（使用缩进而非卡片）
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
    container.addClass('pm-cascade-tree-view');

    // 创建树形容器
    const treeContainer = container.createDiv('pm-cascade-tree');

    // 根据配置决定渲染方式
    if ((this.config as any).id) {
      // 渲染单个实体及其级联关系
      await this.renderEntityTree(treeContainer, (this.config as any).id);
    } else {
      // 渲染所有版本
      await this.renderAllVersions(treeContainer);
    }
  }

  /**
   * 渲染单个实体的级联树
   */
  private async renderEntityTree(container: HTMLElement, entityId: string): Promise<void> {
    const type = this.config.type || 'version';

    switch (type) {
      case 'version':
        await this.renderVersionTree(container, entityId, 0);
        break;
      case 'project':
        await this.renderProjectTree(container, entityId, 0);
        break;
      case 'feature':
        await this.renderFeatureTree(container, entityId, 0);
        break;
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

    // 渲染版本节点
    const versionNode = this.createTreeNode(container, version, level);

    // 加载项目
    const projects = await this.entityManager.listProjects({ versionId });

    if (projects.length === 0) {
      this.createEmptyNode(versionNode, '暂无项目', level + 1);
      return;
    }

    // 渲染每个项目的树
    for (const project of projects) {
      await this.renderProjectTree(versionNode, project.id, level + 1);
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

    // 渲染项目节点
    const projectNode = this.createTreeNode(container, project, level);

    // 加载特性
    const features = await this.entityManager.listFeatures({ projectId });

    if (features.length === 0) {
      this.createEmptyNode(projectNode, '暂无特性', level + 1);
      return;
    }

    // 渲染特性
    for (const feature of features) {
      this.createFeatureNode(projectNode, feature, level + 1);
    }
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
    if (version) {
      const versionNode = this.createTreeNode(container, version, level);
      versionNode.classList.add('pm-tree-node-placeholder');

      if (project) {
        const projectNode = this.createTreeNode(versionNode, project, level + 1);
        projectNode.classList.add('pm-tree-node-placeholder');
        this.createFeatureNode(projectNode, feature, level + 2);
      } else {
        this.createFeatureNode(versionNode, feature, level + 1);
      }
    } else if (project) {
      const projectNode = this.createTreeNode(container, project, level);
      projectNode.classList.add('pm-tree-node-placeholder');
      this.createFeatureNode(projectNode, feature, level + 1);
    } else {
      this.createFeatureNode(container, feature, level);
    }
  }

  /**
   * 渲染所有版本
   */
  private async renderAllVersions(container: HTMLElement): Promise<void> {
    const versions = await this.entityManager.listVersions();

    if (versions.length === 0) {
      this.createEmptyNode(container, '暂无版本', 0);
      return;
    }

    for (const version of versions) {
      await this.renderVersionTree(container, version.id, 0);
    }
  }

  /**
   * 创建树节点（通用）
   */
  private createTreeNode(container: HTMLElement, entity: Entity, level: number): HTMLElement {
    const node = container.createDiv('pm-tree-node');
    node.classList.add(`pm-tree-level-${level}`);
    node.dataset.entityType = getEntityType(entity);
    node.dataset.entityId = entity.id;

    // 缩进
    if (level > 0) {
      node.style.paddingLeft = `${level * 20}px`;
    }

    // 节点内容行
    const content = node.createDiv('pm-tree-node-content');

    // 展开/折叠图标（如果有子元素）
    const toggle = content.createSpan('pm-tree-toggle');
    toggle.textContent = '▼';

    // 类型图标
    const icon = content.createSpan('pm-tree-icon');
    icon.textContent = this.getEntityTypeIcon(getEntityType(entity));

    // 名称
    content.createSpan({ cls: 'pm-tree-name', text: entity.name });

    // 元信息
    const meta = content.createDiv('pm-tree-meta');

    if (entity.owner) {
      meta.createSpan({ cls: 'pm-tree-owner', text: entity.owner });
    }

    if ('status' in entity && entity.status) {
      meta.createSpan({
        cls: `pm-tree-status pm-status-${entity.status}`,
        text: this.translateStatus(entity.status),
      });
    }

    if ('dueDate' in entity && entity.dueDate) {
      const isOverdue = new Date(entity.dueDate) < new Date() && 
                        'status' in entity && 
                        entity.status !== 'completed';
      meta.createSpan({
        cls: `pm-tree-due${isOverdue ? ' pm-overdue' : ''}`,
        text: this.formatDate(entity.dueDate),
      });
    }

    // 进度（特性）
    if (getEntityType(entity) === 'feature' && 'progress' in entity) {
      const progress = entity.progress || 0;
      const progressEl = meta.createDiv('pm-tree-progress');
      progressEl.createDiv({
        cls: 'pm-tree-progress-bar',
        attr: { style: `width: ${progress}%` },
      });
      progressEl.createSpan({ text: `${progress}%` });
    }

    // 统计（版本/项目）
    if ('stats' in entity && entity.stats) {
      const stats = (entity as any).stats;
      if (stats.total > 0) {
        meta.createSpan({
          cls: 'pm-tree-stats',
          text: `${stats.completed || 0}/${stats.total}`,
        });
      }
    }

    // 子元素容器
    const childrenContainer = node.createDiv('pm-tree-children');

    // 点击展开/收起
    content.addEventListener('click', (e) => {
      // 如果点击的是操作按钮，不触发折叠
      if ((e.target as HTMLElement).closest('.pm-tree-actions')) return;

      if (childrenContainer.hasChildNodes()) {
        const isHidden = childrenContainer.style.display === 'none';
        childrenContainer.style.display = isHidden ? 'block' : 'none';
        toggle.textContent = isHidden ? '▼' : '▶';
        node.classList.toggle('pm-tree-collapsed', !isHidden);
      } else {
        // 没有子元素则打开文件
        this.actionService.openEntity(getEntityType(entity) as EntityType, entity.id);
      }
    });

    return childrenContainer;
  }

  /**
   * 创建特性节点（简化版）
   */
  private createFeatureNode(container: HTMLElement, feature: Feature, level: number): HTMLElement {
    const node = container.createDiv('pm-tree-node pm-tree-node-feature');
    node.classList.add(`pm-tree-level-${level}`);
    node.style.paddingLeft = `${level * 20}px`;

    const content = node.createDiv('pm-tree-node-content');

    // 占位（无展开图标）
    content.createSpan('pm-tree-toggle pm-tree-toggle-empty');

    // 优先级标记
    const priorityColors: Record<string, string> = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#f59e0b',
      low: '#22c55e',
    };
    if (feature.priority) {
      content.createSpan({
        cls: 'pm-tree-priority',
        attr: { style: `background: ${priorityColors[feature.priority] || '#9ca3af'}` },
      });
    }

    // 名称
    content.createSpan({ cls: 'pm-tree-name', text: feature.name });

    // 元信息
    const meta = content.createDiv('pm-tree-meta');

    if (feature.status) {
      meta.createSpan({
        cls: `pm-tree-status pm-status-${feature.status}`,
        text: this.translateStatus(feature.status),
      });
    }

    const progress = feature.progress || 0;
    const progressEl = meta.createDiv('pm-tree-progress');
    progressEl.createDiv({
      cls: 'pm-tree-progress-bar',
      attr: { style: `width: ${progress}%` },
    });

    // 点击打开
    content.addEventListener('click', () => {
      this.actionService.openEntity('feature', feature.id);
    });

    return node;
  }

  /**
   * 创建空节点
   */
  private createEmptyNode(container: HTMLElement, message: string, level: number): void {
    const node = container.createDiv('pm-tree-node pm-tree-node-empty');
    node.style.paddingLeft = `${level * 20}px`;
    node.textContent = message;
  }

  /**
   * 格式化日期
   */
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
}
