import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import type { EntityManager } from '../core';
import type { CardRegistry } from './cards';
import type { Version, Project, Feature } from '../types';

export interface SingleCardConfig {
  id: string;
  expanded?: boolean;  // 启用级联展示
  maxProjects?: number;  // 限制显示项目数量
  maxFeaturesPerProject?: number;  // 每个项目显示特性数量限制
}

interface FeatureWithProgress extends Feature {
  latestProgress?: string;  // 最新进展内容
  progressTime?: string;    // 最新进展时间
}

interface CascadeProjectData {
  entity: Project;
  features: FeatureWithProgress[];
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    testing: number;
    todo: number;
    averageProgress: number;
    overdue: number;
    upcoming: number;
  };
}

interface CascadeVersionData {
  type: 'version';
  entity: Version;
  projects: CascadeProjectData[];
  stats: {
    totalProjects: number;
    totalFeatures: number;
    completedProjects: number;
    completedFeatures: number;
  };
}

interface CascadeProjectViewData {
  type: 'project';
  entity: Project;
  features: FeatureWithProgress[];
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    testing: number;
    todo: number;
    highPriority: number;
    overdue: number;
    averageProgress: number;
  };
}

type CascadeData = CascadeVersionData | CascadeProjectViewData;

/**
 * 单个卡片渲染器
 * 支持在 Markdown 中通过代码块渲染单个实体卡片
 * 支持级联状态展示（版本→项目→特性）
 * 
 * 使用方式：
 * ```pm-card
 * id: abc123
 * expanded: true  # 启用级联展示
 * maxProjects: 5  # 限制项目数量
 * maxFeaturesPerProject: 3  # 限制每个项目的特性数量
 * ```
 */
export class SingleCardRenderer {
  constructor(
    private app: App,
    private entityManager: EntityManager,
    private cardRegistry: CardRegistry
  ) {}

  /**
   * 渲染单个卡片
   */
  async render(container: HTMLElement, config: SingleCardConfig): Promise<void> {
    container.empty();
    container.addClass('pm-single-card');

    if (!config.id) {
      this.renderError(container, '请提供实体 ID');
      return;
    }

    // 查找实体
    const result = await this.entityManager.findById(config.id);

    if (!result) {
      this.renderError(container, `未找到 ID 为 "${config.id}" 的实体`);
      return;
    }

    // 如果启用级联展示，加载级联数据
    if (config.expanded && result.type !== 'feature') {
      await this.renderCascade(container, result as { type: 'version' | 'project'; entity: Version | Project }, config);
      return;
    }

    // 标准卡片渲染
    await this.renderStandard(container, result);
  }

  /**
   * 渲染标准卡片（非级联模式）
   */
  private async renderStandard(
    container: HTMLElement,
    result: { type: 'version' | 'project' | 'feature'; entity: Version | Project | Feature }
  ): Promise<void> {
    const cardRenderer = this.cardRegistry.findRenderer(result.entity);

    if (!cardRenderer) {
      this.renderError(container, `无法渲染该实体类型: ${result.type}`);
      return;
    }

    const onClick = async () => {
      const path = await this.entityManager.getEntityPath(result.type, result.entity.id);
      if (!path) return;
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf().openFile(file);
      }
    };

    const card = cardRenderer.render(result.entity, onClick);
    container.appendChild(card);
  }

  /**
   * 渲染级联卡片
   */
  private async renderCascade(
    container: HTMLElement,
    result: { type: 'version' | 'project'; entity: Version | Project } | { type: 'feature'; entity: Feature },
    config: SingleCardConfig
  ): Promise<void> {
    // 特性不支持级联展示，回退到标准模式
    if (result.type === 'feature') {
      await this.renderStandard(container, result);
      return;
    }

    // 加载级联数据
    const cascadeData = await this.loadCascadeData(result, config);

    if (!cascadeData) {
      this.renderError(container, '加载级联数据失败');
      return;
    }

    // 渲染级联视图
    const card = this.createCascadeCard(cascadeData, config);
    container.appendChild(card);
  }

  /**
   * 加载级联数据
   */
  private async loadCascadeData(
    result: { type: 'version' | 'project'; entity: Version | Project },
    config: SingleCardConfig
  ): Promise<CascadeData | null> {
    if (result.type === 'version') {
      return this.loadVersionCascade(result.entity as Version, config);
    } else {
      return this.loadProjectCascade(result.entity as Project, config);
    }
  }

  /**
   * 加载版本级联数据
   */
  private async loadVersionCascade(
    version: Version,
    config: SingleCardConfig
  ): Promise<CascadeVersionData | null> {
    // 获取该版本下的所有项目
    const projects = await this.entityManager.listProjects({ versionId: version.id });
    
    const cascadeProjects: CascadeProjectData[] = [];
    let totalFeatures = 0;
    let completedFeatures = 0;

    // 限制项目数量
    const maxProjects = config.maxProjects || 10;
    const limitedProjects = projects.slice(0, maxProjects);

    for (const project of limitedProjects) {
      // 获取每个项目下的特性（包含最新进展）
      const features = await this.loadFeaturesWithProgress(project.id);
      
      // 限制每个项目的特性数量
      const maxFeatures = config.maxFeaturesPerProject || 5;
      const limitedFeatures = features.slice(0, maxFeatures);

      const now = new Date();
      const completed = features.filter(f => f.status === 'completed').length;
      const inProgress = features.filter(f => f.status === 'in-progress').length;
      const testing = features.filter(f => f.status === 'testing').length;
      const todo = features.filter(f => f.status === 'todo' || f.status === 'backlog').length;
      const overdue = features.filter(f => {
        if (!f.dueDate || f.status === 'completed') return false;
        return new Date(f.dueDate) < now;
      }).length;
      const upcoming = features.filter(f => {
        if (!f.dueDate || f.status === 'completed') return false;
        const due = new Date(f.dueDate);
        const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      }).length;
      
      const averageProgress = features.length > 0
        ? Math.round(features.reduce((sum, f) => sum + f.progress, 0) / features.length)
        : 0;

      cascadeProjects.push({
        entity: project,
        features: limitedFeatures,
        stats: {
          total: features.length,
          completed,
          inProgress,
          testing,
          todo,
          averageProgress,
          overdue,
          upcoming,
        },
      });

      totalFeatures += features.length;
      completedFeatures += completed;
    }

    const completedProjects = projects.filter(p => p.status === 'completed').length;

    return {
      type: 'version',
      entity: version,
      projects: cascadeProjects,
      stats: {
        totalProjects: projects.length,
        totalFeatures,
        completedProjects,
        completedFeatures,
      },
    };
  }

  /**
   * 加载项目级联数据
   */
  private async loadProjectCascade(
    project: Project,
    config: SingleCardConfig
  ): Promise<CascadeProjectViewData | null> {
    // 获取该项目下的所有特性（包含最新进展）
    const features = await this.loadFeaturesWithProgress(project.id);
    
    const completed = features.filter(f => f.status === 'completed').length;
    const inProgress = features.filter(f => f.status === 'in-progress').length;
    const testing = features.filter(f => f.status === 'testing').length;
    const todo = features.filter(f => f.status === 'todo' || f.status === 'backlog').length;
    const highPriority = features.filter(f => f.priority === 'critical' || f.priority === 'high').length;
    
    const now = new Date();
    const overdue = features.filter(f => {
      if (!f.dueDate || f.status === 'completed') return false;
      return new Date(f.dueDate) < now;
    }).length;

    const averageProgress = features.length > 0
      ? Math.round(features.reduce((sum, f) => sum + f.progress, 0) / features.length)
      : 0;

    return {
      type: 'project',
      entity: project,
      features,
      stats: {
        total: features.length,
        completed,
        inProgress,
        testing,
        todo,
        highPriority,
        overdue,
        averageProgress,
      },
    };
  }

  /**
   * 加载特性并提取最新进展
   */
  private async loadFeaturesWithProgress(projectId: string): Promise<FeatureWithProgress[]> {
    const features = await this.entityManager.listFeatures({ projectId });
    
    const featuresWithProgress: FeatureWithProgress[] = [];
    
    for (const feature of features) {
      const progress = await this.extractLatestProgress(feature.id);
      featuresWithProgress.push({
        ...feature,
        latestProgress: progress.content,
        progressTime: progress.time,
      });
    }
    
    return featuresWithProgress;
  }

  /**
   * 从特性文件中提取最新进展
   */
  private async extractLatestProgress(featureId: string): Promise<{ content?: string; time?: string }> {
    try {
      const path = await this.entityManager.getEntityPath('feature', featureId);
      if (!path) return {};
      
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) return {};
      
      const content = await this.app.vault.read(file);
      
      // 匹配进展反馈历史记录
      // 格式: - [MM/DD HH:mm] 进展内容
      const progressRegex = /^-\s*\[(\d{2}\/\d{2}\s+\d{2}:\d{2})\]\s*(.+)$/gm;
      const matches: Array<{ time: string; content: string }> = [];
      
      let match;
      while ((match = progressRegex.exec(content)) !== null) {
        matches.push({
          time: match[1],
          content: match[2].trim(),
        });
      }
      
      // 返回最新的进展（最后一条）
      if (matches.length > 0) {
        const latest = matches[matches.length - 1];
        return {
          time: latest.time,
          content: latest.content,
        };
      }
      
      return {};
    } catch (error) {
      console.error('提取最新进展失败:', error);
      return {};
    }
  }

  /**
   * 创建级联卡片
   */
  private createCascadeCard(data: CascadeData, config: SingleCardConfig): HTMLElement {
    const card = document.createElement('div');
    card.className = 'pm-card pm-card--cascade';

    if (data.type === 'version') {
      this.renderVersionCascade(card, data, config);
    } else {
      this.renderProjectCascade(card, data, config);
    }

    return card;
  }

  /**
   * 渲染版本级联视图
   */
  private renderVersionCascade(
    container: HTMLElement,
    data: CascadeVersionData,
    config: SingleCardConfig
  ): void {
    const version = data.entity;

    // 头部：版本信息（可点击跳转）
    const header = container.createDiv({ cls: 'pm-cascade__header pm-cascade__header--clickable' });
    header.createEl('div', {
      text: `📦 ${version.name}`,
      cls: 'pm-cascade__title',
    });

    // 状态徽章
    const statusEl = header.createEl('span', {
      text: this.getStatusLabel(version.status),
      cls: `pm-cascade__status pm-cascade__status--${version.status}`,
    });

    // 头部点击跳转
    header.style.cursor = 'pointer';
    header.addEventListener('click', async (e) => {
      // 防止点击子元素时触发
      if ((e.target as HTMLElement).closest('.pm-cascade__projects')) return;
      
      const path = await this.entityManager.getEntityPath('version', version.id);
      if (!path) return;
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf().openFile(file);
      }
    });

    // 整体统计
    const summary = container.createDiv({ cls: 'pm-cascade__summary' });
    summary.createEl('span', {
      text: `📁 ${data.stats.totalProjects} 项目 · ✨ ${data.stats.completedFeatures}/${data.stats.totalFeatures} 特性`,
      cls: 'pm-cascade__summary-text',
    });

    // 项目列表
    const projectsList = container.createDiv({ cls: 'pm-cascade__projects' });
    
    for (const projectData of data.projects) {
      this.renderProjectItem(projectsList, projectData, config);
    }

    // 如果还有更多项目
    if (data.stats.totalProjects > data.projects.length) {
      const moreEl = projectsList.createDiv({ cls: 'pm-cascade__more' });
      moreEl.createEl('span', {
        text: `+${data.stats.totalProjects - data.projects.length} 更多项目...`,
      });
    }
  }

  /**
   * 渲染项目条目（在版本级联中）
   */
  private renderProjectItem(
    container: HTMLElement,
    projectData: CascadeProjectData,
    config: SingleCardConfig
  ): void {
    const project = projectData.entity;
    const item = container.createDiv({ cls: 'pm-cascade__project' });

    // 项目头部
    const header = item.createDiv({ cls: 'pm-cascade__project-header' });
    
    // 优先级图标
    const priorityEmoji = { critical: '🔴', high: '🟠', medium: '🔵', low: '🟢' }[project.priority] || '⚪';
    header.createEl('span', { text: `${priorityEmoji} 📁`, cls: 'pm-cascade__icon' });
    
    // 项目名称
    header.createEl('span', {
      text: project.name,
      cls: 'pm-cascade__project-name',
    });

    // 迷你进度条
    const progressBar = header.createDiv({ cls: 'pm-cascade__mini-progress' });
    const progressFill = progressBar.createDiv({ cls: 'pm-cascade__mini-progress-fill' });
    progressFill.style.width = `${projectData.stats.averageProgress}%`;

    // 进度百分比
    header.createEl('span', {
      text: `${projectData.stats.averageProgress}%`,
      cls: 'pm-cascade__progress-text',
    });

    // 项目统计
    const stats = item.createDiv({ cls: 'pm-cascade__project-stats' });
    let statsText = `✅ ${projectData.stats.completed} · 🔄 ${projectData.stats.inProgress} · 📋 ${projectData.stats.todo}`;
    
    // 添加即将到期和延期标记
    if (projectData.stats.overdue > 0) {
      statsText += ` · <span class="pm-cascade__risk-high">⚠️ ${projectData.stats.overdue} 延期</span>`;
    }
    if (projectData.stats.upcoming > 0) {
      statsText += ` · <span class="pm-cascade__risk-medium">⏰ ${projectData.stats.upcoming} 即将到期</span>`;
    }
    
    const statsEl = stats.createEl('span', {
      cls: 'pm-cascade__stats-text',
    });
    statsEl.innerHTML = statsText;

    // 特性列表（缩进）
    if (projectData.features.length > 0) {
      const featuresList = item.createDiv({ cls: 'pm-cascade__features' });
      
      for (const feature of projectData.features) {
        this.renderFeatureItem(featuresList, feature);
      }

      // 如果还有更多特性
      const totalFeatures = projectData.stats.total;
      if (totalFeatures > projectData.features.length) {
        const moreEl = featuresList.createDiv({ cls: 'pm-cascade__more-features' });
        moreEl.createEl('span', {
          text: `+${totalFeatures - projectData.features.length} 更多...`,
        });
      }
    }

    // 点击跳转
    item.style.cursor = 'pointer';
    item.addEventListener('click', async (e) => {
      // 如果点击的是子元素，不触发跳转
      if ((e.target as HTMLElement).closest('.pm-cascade__features')) return;
      
      const path = await this.entityManager.getEntityPath('project', project.id);
      if (!path) return;
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf().openFile(file);
      }
    });
  }

  /**
   * 渲染项目级联视图
   */
  private renderProjectCascade(
    container: HTMLElement,
    data: CascadeProjectViewData,
    config: SingleCardConfig
  ): void {
    const project = data.entity;

    // 头部：项目信息（可点击跳转）
    const header = container.createDiv({ cls: 'pm-cascade__header pm-cascade__header--clickable' });
    
    const priorityEmoji = { critical: '🔴', high: '🟠', medium: '🔵', low: '🟢' }[project.priority] || '⚪';
    header.createEl('div', {
      text: `${priorityEmoji} 📁 ${project.name}`,
      cls: 'pm-cascade__title',
    });

    // 整体进度条
    const mainProgress = header.createDiv({ cls: 'pm-cascade__main-progress' });
    const mainProgressFill = mainProgress.createDiv({ cls: 'pm-cascade__main-progress-fill' });
    mainProgressFill.style.width = `${data.stats.averageProgress}%`;

    header.createEl('span', {
      text: `${data.stats.averageProgress}%`,
      cls: 'pm-cascade__main-progress-text',
    });

    // 头部点击跳转
    header.style.cursor = 'pointer';
    header.addEventListener('click', async (e) => {
      // 防止点击子元素时触发
      if ((e.target as HTMLElement).closest('.pm-cascade__features-list')) return;
      
      const path = await this.entityManager.getEntityPath('project', project.id);
      if (!path) return;
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf().openFile(file);
      }
    });

    // 统计摘要
    const summary = container.createDiv({ cls: 'pm-cascade__summary' });
    summary.createEl('span', {
      text: `✨ ${data.stats.total} 特性 · ✅ ${data.stats.completed} · 🔄 ${data.stats.inProgress} · 🧪 ${data.stats.testing}`,
      cls: 'pm-cascade__summary-text',
    });

    // 风险警告
    if (data.stats.overdue > 0) {
      const riskEl = summary.createEl('span', {
        text: ` ⚠️ ${data.stats.overdue} 延期`,
        cls: 'pm-cascade__risk-high',
      });
    }
    if (data.stats.highPriority > 0) {
      summary.createEl('span', {
        text: ` 🔴 ${data.stats.highPriority} 高优`,
        cls: 'pm-cascade__risk-medium',
      });
    }

    // 特性列表（按状态分组）
    const featuresList = container.createDiv({ cls: 'pm-cascade__features-list' });

    // 进行中
    const inProgressFeatures = data.features.filter(f => f.status === 'in-progress');
    if (inProgressFeatures.length > 0) {
      this.renderFeatureGroup(featuresList, '🔄 进行中', inProgressFeatures, 'in-progress');
    }

    // 测试中
    const testingFeatures = data.features.filter(f => f.status === 'testing');
    if (testingFeatures.length > 0) {
      this.renderFeatureGroup(featuresList, '🧪 测试中', testingFeatures, 'testing');
    }

    // 待处理
    const todoFeatures = data.features.filter(f => f.status === 'todo' || f.status === 'backlog');
    if (todoFeatures.length > 0) {
      this.renderFeatureGroup(featuresList, '📋 待处理', todoFeatures, 'todo');
    }

    // 已完成
    const completedFeatures = data.features.filter(f => f.status === 'completed');
    if (completedFeatures.length > 0) {
      this.renderFeatureGroup(featuresList, '✅ 已完成', completedFeatures, 'completed');
    }
  }

  /**
   * 渲染特性分组
   */
  private renderFeatureGroup(
    container: HTMLElement,
    title: string,
    features: Feature[],
    status: string
  ): void {
    const group = container.createDiv({ cls: 'pm-cascade__feature-group' });
    
    group.createEl('div', {
      text: `${title} (${features.length})`,
      cls: `pm-cascade__group-title pm-cascade__group-title--${status}`,
    });

    for (const feature of features) {
      this.renderFeatureItem(group, feature);
    }
  }

  /**
   * 渲染特性条目
   */
  private renderFeatureItem(container: HTMLElement, feature: FeatureWithProgress): void {
    const item = container.createDiv({ cls: 'pm-cascade__feature' });

    // 优先级图标
    const priorityEmoji = { critical: '🔴', high: '🟠', medium: '🔵', low: '🟢' }[feature.priority] || '⚪';
    item.createEl('span', { text: priorityEmoji, cls: 'pm-cascade__feature-priority' });

    // 特性图标
    item.createEl('span', { text: '✨', cls: 'pm-cascade__feature-icon' });

    // 名称和进展容器
    const nameContainer = item.createDiv({ cls: 'pm-cascade__feature-name-container' });
    
    // 名称
    nameContainer.createEl('span', {
      text: feature.name,
      cls: 'pm-cascade__feature-name',
    });

    // 最新进展（如果有）
    if (feature.latestProgress) {
      const progressText = feature.latestProgress.length > 20 
        ? feature.latestProgress.slice(0, 20) + '...' 
        : feature.latestProgress;
      nameContainer.createEl('span', {
        text: `💬 ${progressText}`,
        cls: 'pm-cascade__feature-latest-progress',
        title: `[${feature.progressTime}] ${feature.latestProgress}`,
      });
    }

    // 进度
    if (feature.progress > 0) {
      item.createEl('span', {
        text: `${feature.progress}%`,
        cls: 'pm-cascade__feature-progress',
      });
    }

    // 截止日期
    if (feature.dueDate && feature.status !== 'completed') {
      const now = new Date();
      const due = new Date(feature.dueDate);
      const isOverdue = due < now;
      const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isUpcoming = diffDays >= 0 && diffDays <= 7;
      
      const dueEl = item.createEl('span', {
        text: feature.dueDate.slice(5),  // 显示 MM-DD
        cls: `pm-cascade__feature-due ${isOverdue ? 'pm-cascade__feature-due--overdue' : ''} ${isUpcoming ? 'pm-cascade__feature-due--upcoming' : ''}`,
      });
      
      // 添加即将到期标记
      if (isUpcoming) {
        dueEl.setAttribute('title', `⏰ ${diffDays === 0 ? '今天' : diffDays + '天后'}到期`);
      } else if (isOverdue) {
        dueEl.setAttribute('title', `⚠️ 已延期 ${Math.abs(diffDays)} 天`);
      }
    } else if (feature.dueDate) {
      // 已完成的特性只显示日期
      item.createEl('span', {
        text: feature.dueDate.slice(5),
        cls: 'pm-cascade__feature-due pm-cascade__feature-due--completed',
      });
    }

    // 负责人
    if (feature.owner) {
      item.createEl('span', {
        text: `@${feature.owner}`,
        cls: 'pm-cascade__feature-owner',
      });
    }

    // 点击跳转
    item.style.cursor = 'pointer';
    item.addEventListener('click', async () => {
      const path = await this.entityManager.getEntityPath('feature', feature.id);
      if (!path) return;
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf().openFile(file);
      }
    });
  }

  /**
   * 获取状态标签
   */
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      planning: '规划中',
      'in-progress': '进行中',
      completed: '已完成',
      archived: '已归档',
      backlog: '待办',
      todo: '待开始',
      testing: '测试中',
    };
    return labels[status] || status;
  }

  /**
   * 渲染错误信息
   */
  private renderError(container: HTMLElement, message: string): void {
    const errorEl = container.createDiv({ cls: 'pm-error' });
    errorEl.createEl('span', { text: '⚠️ ' });
    errorEl.createEl('span', { text: message });
  }
}
