/**
 * 燃尽图渲染器
 * 展示剩余工作量随时间变化的趋势
 */

import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ReportService, type BurndownDataPoint } from '../../services/ReportService';
import { BaseRenderer } from './BaseRenderer';
import { RendererRegistry } from '../RendererRegistry';

export class BurndownRenderer extends BaseRenderer {
  private reportService: ReportService;

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
   * 渲染燃尽图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-burndown-view');

    // 获取数据
    const versionId = this.config.version;
    const data = await this.reportService.calculateBurndownData(versionId);

    if (data.length === 0) {
      this.createEmptyState(container, '暂无数据，请先创建特性并设置预估工时');
      return;
    }

    // 渲染标题栏
    this.renderHeader(container, data);

    // 渲染图表
    this.renderChart(container, data);

    // 渲染统计卡片
    this.renderStatsCards(container, data);
  }

  /**
   * 渲染标题栏
   */
  private renderHeader(container: HTMLElement, data: BurndownDataPoint[]): void {
    const header = container.createDiv('pm-burndown-header');

    const titleEl = header.createEl('h3', { cls: 'pm-burndown-title' });
    titleEl.textContent = this.config.title || '燃尽图';

    // 显示数据范围
    const rangeEl = header.createEl('span', { cls: 'pm-burndown-range' });
    rangeEl.textContent = `${data[0].date} ~ ${data[data.length - 1].date}`;
  }

  /**
   * 渲染 SVG 图表
   */
  private renderChart(container: HTMLElement, data: BurndownDataPoint[]): void {
    const chartContainer = container.createDiv('pm-burndown-chart-container');

    const padding = { top: 20, right: 30, bottom: 50, left: 60 };
    const viewWidth = 800;
    const viewHeight = 300;
    const width = viewWidth - padding.left - padding.right;
    const height = viewHeight - padding.top - padding.bottom;

    // 计算最大值
    const maxValue = Math.max(
      ...data.map((d) => Math.max(d.planned, d.actual))
    );

    // 生成 SVG 内容
    let svgContent = this.generateSVGContent(data, width, height, maxValue, padding);

    // 创建 SVG 元素
    const svgWrapper = chartContainer.createDiv('pm-burndown-chart');
    svgWrapper.innerHTML = svgContent;
  }

  /**
   * 生成 SVG 内容字符串
   */
  private generateSVGContent(
    data: BurndownDataPoint[],
    width: number,
    height: number,
    maxValue: number,
    padding: { top: number; right: number; bottom: number; left: number }
  ): string {
    const viewWidth = width + padding.left + padding.right;
    const viewHeight = height + padding.top + padding.bottom;

    let svg = `<svg viewBox="0 0 ${viewWidth} ${viewHeight}" preserveAspectRatio="xMidYMid meet">`;

    // 网格线
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const y = padding.top + (height / gridCount) * i;
      svg += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + width}" y2="${y}" stroke="var(--background-modifier-border)" stroke-width="1" stroke-dasharray="4,4" />`;
    }

    // 坐标轴
    svg += `<line x1="${padding.left}" y1="${padding.top + height}" x2="${padding.left + width}" y2="${padding.top + height}" stroke="var(--text-muted)" stroke-width="1" />`;
    svg += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + height}" stroke="var(--text-muted)" stroke-width="1" />`;

    // X 轴标签
    const labelCount = Math.min(data.length, 7);
    const step = Math.ceil(data.length / labelCount);
    for (let i = 0; i < data.length; i += step) {
      const x = padding.left + (width / (data.length - 1 || 1)) * i;
      svg += `<text x="${x}" y="${padding.top + height + 20}" text-anchor="middle" fill="var(--text-muted)" font-size="11">${data[i].date.slice(5)}</text>`;
    }

    // 计划线（理想燃尽线）
    if (data.length >= 2) {
      const plannedPoints = data
        .map((d, i) => {
          const x = padding.left + (width / (data.length - 1 || 1)) * i;
          const y = padding.top + height - (d.planned / maxValue) * height;
          return `${x},${y}`;
        })
        .join(' ');

      svg += `<polyline points="${plannedPoints}" fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="5,5" />`;

      // 计划线数据点
      data.forEach((d, i) => {
        const x = padding.left + (width / (data.length - 1 || 1)) * i;
        const y = padding.top + height - (d.planned / maxValue) * height;
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="#22c55e" stroke="var(--background-primary)" stroke-width="1" />`;
      });
    }

    // 实际线
    if (data.length >= 2) {
      const actualPoints = data
        .map((d, i) => {
          const x = padding.left + (width / (data.length - 1 || 1)) * i;
          const y = padding.top + height - (d.actual / maxValue) * height;
          return `${x},${y}`;
        })
        .join(' ');

      svg += `<polyline points="${actualPoints}" fill="none" stroke="#3b82f6" stroke-width="2" />`;

      // 实际线数据点
      data.forEach((d, i) => {
        const x = padding.left + (width / (data.length - 1 || 1)) * i;
        const y = padding.top + height - (d.actual / maxValue) * height;
        svg += `<circle cx="${x}" cy="${y}" r="4" fill="#3b82f6" stroke="var(--background-primary)" stroke-width="2" />`;
      });
    }

    // 图例
    const legendX = viewWidth - 120;
    const legendY = 30;
    svg += `<line x1="${legendX}" y1="${legendY + 5}" x2="${legendX + 20}" y2="${legendY + 5}" stroke="#22c55e" stroke-width="2" stroke-dasharray="5,5" />`;
    svg += `<text x="${legendX + 25}" y="${legendY + 9}" fill="var(--text-normal)" font-size="12">计划剩余</text>`;
    svg += `<line x1="${legendX}" y1="${legendY + 25}" x2="${legendX + 20}" y2="${legendY + 25}" stroke="#3b82f6" stroke-width="2" />`;
    svg += `<text x="${legendX + 25}" y="${legendY + 29}" fill="var(--text-normal)" font-size="12">实际剩余</text>`;

    svg += '</svg>';
    return svg;
  }

  /**
   * 渲染统计卡片
   */
  private renderStatsCards(
    container: HTMLElement,
    data: BurndownDataPoint[]
  ): void {
    const statsContainer = container.createDiv('pm-burndown-stats');

    const firstDay = data[0];
    const lastDay = data[data.length - 1];

    // 总预估工时
    this.createStatCard(statsContainer, '总预估工时', `${firstDay.planned}h`);

    // 剩余工时
    this.createStatCard(statsContainer, '剩余工时', `${lastDay.actual}h`,
      lastDay.actual > lastDay.planned ? 'warning' : 'normal');

    // 已完成工时
    const completed = firstDay.planned - lastDay.actual;
    this.createStatCard(statsContainer, '已完成', `${completed}h`, 'success');

    // 完成率
    const completionRate = firstDay.planned > 0
      ? Math.round(((firstDay.planned - lastDay.actual) / firstDay.planned) * 100)
      : 0;
    this.createStatCard(statsContainer, '完成率', `${completionRate}%`);
  }

  /**
   * 创建统计卡片
   */
  private createStatCard(
    container: HTMLElement,
    label: string,
    value: string,
    type: 'normal' | 'warning' | 'success' = 'normal'
  ): void {
    const card = container.createDiv(`pm-stat-card pm-stat-card--${type}`);

    const labelEl = card.createEl('div', { cls: 'pm-stat-card__label' });
    labelEl.textContent = label;

    const valueEl = card.createEl('div', { cls: 'pm-stat-card__value' });
    valueEl.textContent = value;
  }
}

// 自注册到渲染器注册表
RendererRegistry.register("burndown", BurndownRenderer);
