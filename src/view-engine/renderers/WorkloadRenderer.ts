/**
 * 工作量统计渲染器
 * 展示按负责人或项目的工作量分布
 */

import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ReportService, type WorkloadData } from '../../services/ReportService';
import { BaseRenderer } from './BaseRenderer';
import { RendererRegistry } from '../RendererRegistry';

export class WorkloadRenderer extends BaseRenderer {
  private reportService: ReportService;
  private groupBy: 'owner' | 'project' = 'owner';

  constructor(
    app: App,
    entityManager: EntityManager,
    dataService: DataService,
    actionService: ActionService
  ) {
    super(app, entityManager, dataService, actionService);
    this.reportService = new ReportService(app, entityManager);
  }

  /**
   * 渲染工作量统计
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-workload-view');

    // 获取分组方式（从配置或默认按负责人）
    this.groupBy = this.config.groupBy === 'project' ? 'project' : 'owner';

    // 渲染工具栏
    this.renderToolbar(container);

    // 获取数据
    const data = await this.loadData();

    if (data.length === 0) {
      this.createEmptyState(container, '暂无数据');
      return;
    }

    // 渲染汇总统计
    this.renderSummary(container, data);

    // 渲染工作量条形图
    this.renderWorkloadBars(container, data);
  }

  /**
   * 渲染工具栏
   */
  private renderToolbar(container: HTMLElement): void {
    const toolbar = container.createDiv('pm-workload-toolbar');

    // 标题
    const titleEl = toolbar.createEl('h3', { cls: 'pm-workload-title' });
    titleEl.textContent = this.config.title || '工作量统计';

    // 分组切换按钮
    const buttonGroup = toolbar.createDiv('pm-workload-toggle');

    const ownerBtn = buttonGroup.createEl('button', {
      cls: `pm-workload-toggle__btn ${this.groupBy === 'owner' ? 'active' : ''}`,
      text: '按负责人',
    });
    ownerBtn.addEventListener('click', () => {
      if (this.groupBy !== 'owner') {
        this.groupBy = 'owner';
        this.refresh(container);
      }
    });

    const projectBtn = buttonGroup.createEl('button', {
      cls: `pm-workload-toggle__btn ${this.groupBy === 'project' ? 'active' : ''}`,
      text: '按项目',
    });
    projectBtn.addEventListener('click', () => {
      if (this.groupBy !== 'project') {
        this.groupBy = 'project';
        this.refresh(container);
      }
    });
  }

  /**
   * 加载数据
   */
  private async loadData(): Promise<WorkloadData[]> {
    const versionId = this.config.version;

    if (this.groupBy === 'project') {
      return this.reportService.calculateWorkloadByProject(versionId);
    } else {
      return this.reportService.calculateWorkloadByOwner(
        this.config.entityType || 'feature',
        this.config
      );
    }
  }

  /**
   * 刷新视图
   */
  private async refresh(container: HTMLElement): Promise<void> {
    // 保留工具栏，重新渲染其他内容
    const toolbar = container.querySelector('.pm-workload-toolbar');
    container.empty();
    if (toolbar) {
      container.appendChild(toolbar);
    } else {
      this.renderToolbar(container);
    }

    const data = await this.loadData();
    if (data.length === 0) {
      this.createEmptyState(container, '暂无数据');
      return;
    }
    this.renderSummary(container, data);
    this.renderWorkloadBars(container, data);
  }

  /**
   * 渲染汇总统计
   */
  private renderSummary(container: HTMLElement, data: WorkloadData[]): void {
    const summaryContainer = container.createDiv('pm-workload-summary');

    const totalEstimated = data.reduce((sum, d) => sum + d.estimated, 0);
    const totalActual = data.reduce((sum, d) => sum + d.actual, 0);
    const totalTasks = data.reduce((sum, d) => sum + d.taskCount, 0);

    // 总预估工时
    this.createSummaryCard(summaryContainer, '总预估工时', `${totalEstimated}h`);

    // 总实际工时
    this.createSummaryCard(summaryContainer, '总实际工时', `${totalActual}h`);

    // 平均效率
    const avgEfficiency =
      totalActual > 0 ? Math.round((totalEstimated / totalActual) * 100) : 100;
    this.createSummaryCard(summaryContainer, '平均效率', `${avgEfficiency}%`);

    // 任务总数
    this.createSummaryCard(summaryContainer, '任务总数', `${totalTasks}`);
  }

  /**
   * 创建汇总卡片
   */
  private createSummaryCard(
    container: HTMLElement,
    label: string,
    value: string
  ): void {
    const card = container.createDiv('pm-workload-summary__card');

    const valueEl = card.createEl('div', { cls: 'pm-workload-summary__value' });
    valueEl.textContent = value;

    const labelEl = card.createEl('div', { cls: 'pm-workload-summary__label' });
    labelEl.textContent = label;
  }

  /**
   * 渲染工作量条形图
   */
  private renderWorkloadBars(container: HTMLElement, data: WorkloadData[]): void {
    const barsContainer = container.createDiv('pm-workload-bars');

    // 计算最大值用于缩放
    const maxValue = Math.max(...data.map((d) => Math.max(d.estimated, d.actual)));

    for (const item of data) {
      this.renderWorkloadBar(barsContainer, item, maxValue);
    }
  }

  /**
   * 渲染单个工作量条
   */
  private renderWorkloadBar(
    container: HTMLElement,
    data: WorkloadData,
    maxValue: number
  ): void {
    const row = container.createDiv('pm-workload-bar');

    // 名称
    const nameEl = row.createDiv('pm-workload-bar__name');
    nameEl.textContent = data.name;
    nameEl.setAttribute('title', `${data.name}: ${data.taskCount}个任务`);

    // 进度条容器
    const progressContainer = row.createDiv('pm-workload-bar__progress');

    // 预估工时条（背景）
    const estimatedWidth = maxValue > 0 ? (data.estimated / maxValue) * 100 : 0;
    const estimatedBar = progressContainer.createDiv('pm-workload-bar__estimated');
    estimatedBar.style.width = `${estimatedWidth}%`;

    // 实际工时条（前景）
    const actualWidth = maxValue > 0 ? (data.actual / maxValue) * 100 : 0;
    const actualBar = progressContainer.createDiv('pm-workload-bar__actual');
    actualBar.style.width = `${actualWidth}%`;

    // 根据效率设置颜色
    if (data.efficiency > 120) {
      actualBar.classList.add('pm-workload-bar__actual--over');
    } else if (data.efficiency < 80) {
      actualBar.classList.add('pm-workload-bar__actual--under');
    }

    // 数值标签
    const valueEl = row.createDiv('pm-workload-bar__value');
    valueEl.textContent = `${data.actual}/${data.estimated}h`;

    // 效率标签
    const efficiencyEl = row.createDiv('pm-workload-bar__efficiency');
    efficiencyEl.textContent = `${data.efficiency}%`;
    if (data.efficiency > 120) {
      efficiencyEl.classList.add('pm-workload-bar__efficiency--over');
    } else if (data.efficiency < 80) {
      efficiencyEl.classList.add('pm-workload-bar__efficiency--under');
    }

    // 悬停提示
    row.addEventListener('mouseenter', () => {
      row.classList.add('pm-workload-bar--hover');
    });
    row.addEventListener('mouseleave', () => {
      row.classList.remove('pm-workload-bar--hover');
    });
  }
}

// 自注册到渲染器注册表
RendererRegistry.register("workload", WorkloadRenderer);
