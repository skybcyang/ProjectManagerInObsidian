import { App, TFile, Notice } from 'obsidian';
import type { EntityManager } from '../core';
import type { Version, Project, Feature } from '../types';
import { ReportService, type HealthMetrics, type WorkloadData, type TrendDataPoint, type BurndownDataPoint } from './ReportService';
import { generateEML, downloadEML, captureRenderedPage } from '../utils';
import { getStatusLabel, getPriorityLabel } from '../constants';

export type PageType = 'overview' | 'version' | 'project' | 'feature';

export interface PageContext {
  type: PageType;
  entityId?: string;
  entityName?: string;
  filePath: string;
}

export class EmailSummaryService {
  private reportService: ReportService;

  constructor(
    private app: App,
    private entityManager: EntityManager
  ) {
    this.reportService = new ReportService(app, entityManager);
  }

  async buildEmailForActiveFile(): Promise<{ emlContent: string; filename: string } | null> {
    const context = await this.detectPageContext();
    if (!context) {
      new Notice('请先打开一个项目管理页面');
      return null;
    }

    let result: { subject: string; html: string; plain: string } | null = null;

    switch (context.type) {
      case 'overview':
        result = await this.buildOverviewEmail();
        break;
      case 'version':
        if (context.entityId) {
          result = await this.buildVersionEmail(context.entityId, context.entityName || '版本');
        }
        break;
      case 'project':
        if (context.entityId) {
          result = await this.buildProjectEmail(context.entityId, context.entityName || '项目');
        }
        break;
      case 'feature':
        if (context.entityId) {
          result = await this.buildFeatureEmail(context.entityId, context.entityName || '特性');
        }
        break;
    }

    if (!result) {
      new Notice('当前页面不支持导出邮件总结');
      return null;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const emlContent = generateEML({
      subject: result.subject,
      from: 'ProjectManager <no-reply@obsidian.local>',
      to: 'User <user@local>',
      htmlBody: result.html,
      plainBody: result.plain,
    });

    const safeName = result.subject.replace(/[\\/:*?"<>|]/g, '_');
    const filename = `${safeName}_${dateStr}`;

    return { emlContent, filename };
  }

  async buildEmailFromRenderedPage(): Promise<{ emlContent: string; filename: string } | null> {
    const captured = await captureRenderedPage(this.app);
    if (!captured) {
      return null;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const subject = `${captured.title} - ${dateStr}`;
    const emlContent = generateEML({
      subject,
      from: 'ProjectManager <no-reply@obsidian.local>',
      to: 'User <user@local>',
      htmlBody: captured.html,
      plainBody: captured.plain,
    });

    const safeName = subject.replace(/[\\/:*?"<>|]/g, '_');
    const filename = `${safeName}_${dateStr}`;

    return { emlContent, filename };
  }

  async detectPageContext(): Promise<PageContext | null> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return null;

    const path = activeFile.path;

    if (path === 'ProjectManager/总览.md') {
      return { type: 'overview', filePath: path };
    }

    const cache = this.app.metadataCache.getFileCache(activeFile);
    const fm = cache?.frontmatter;
    const id = fm?.id ? String(fm.id) : undefined;
    const name = fm?.name ? String(fm.name) : activeFile.basename;

    if (path.startsWith('ProjectManager/Versions/') && id) {
      return { type: 'version', entityId: id, entityName: name, filePath: path };
    }
    if (path.startsWith('ProjectManager/Projects/') && id) {
      return { type: 'project', entityId: id, entityName: name, filePath: path };
    }
    if (path.startsWith('ProjectManager/Features/') && id) {
      return { type: 'feature', entityId: id, entityName: name, filePath: path };
    }

    return null;
  }

  // ==================== 总览邮件 ====================

  private async buildOverviewEmail(): Promise<{ subject: string; html: string; plain: string }> {
    const dateStr = new Date().toISOString().split('T')[0];
    const subject = `项目管理总览 - ${dateStr}`;

    const [versions, projects, features, health, workloadProjects, trend, overdue] = await Promise.all([
      this.entityManager.listVersions(),
      this.entityManager.listProjects(),
      this.entityManager.listFeatures(),
      this.reportService.calculateProjectHealth(),
      this.reportService.calculateWorkloadByProject(),
      this.reportService.calculateCompletionTrend(30),
      this.entityManager.getOverdueItems(),
    ]);

    const completedVersions = versions.filter(v => v.status === 'completed').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const completedFeatures = features.filter(f => f.status === 'completed').length;

    const html = this.wrapHTML(subject, `
      <h1>${subject}</h1>
      <div class="metrics">
        ${this.metricCard('版本总数', String(versions.length))}
        ${this.metricCard('项目总数', String(projects.length))}
        ${this.metricCard('特性总数', String(features.length))}
        ${this.metricCard('整体完成率', `${health.completionRate}%`)}
        ${this.metricCard('逾期特性数', String(health.overdueCount), health.overdueCount > 0 ? 'overdue' : '')}
        ${this.metricCard('平均进度', `${health.avgProgress}%`)}
      </div>
      <h2>版本状态一览</h2>
      ${this.versionsTable(versions)}
      <h2>项目工作量 TOP 5</h2>
      ${this.workloadTable(workloadProjects.slice(0, 5))}
      <h2>近30天完成趋势</h2>
      ${this.trendTable(trend)}
      <h2>逾期项提醒</h2>
      ${this.overdueList(overdue)}
    `);

    const plain = this.buildPlainOverview(subject, versions, projects, features, health, workloadProjects, trend, overdue);
    return { subject, html, plain };
  }

  // ==================== 版本邮件 ====================

  private async buildVersionEmail(versionId: string, versionName: string): Promise<{ subject: string; html: string; plain: string }> {
    const dateStr = new Date().toISOString().split('T')[0];
    const subject = `版本 ${versionName} 项目总结 - ${dateStr}`;

    const [version, projects, features, health, workloadByProject, burndown, overdue] = await Promise.all([
      this.entityManager.getVersion(versionId),
      this.entityManager.listProjects({ versionId }),
      this.entityManager.listFeatures({ versionId }),
      this.reportService.calculateProjectHealth(versionId),
      this.reportService.calculateWorkloadByProject({ mode: 'list', version: versionId }),
      this.reportService.calculateBurndownData(versionId),
      this.entityManager.getOverdueItems('feature'),
    ]);

    const versionOverdue = overdue.filter((o: Feature | Project | Version) => 'projectId' in o && o.versionId === versionId);

    const html = this.wrapHTML(subject, `
      <h1>${subject}</h1>
      <p><strong>状态:</strong> ${version ? getStatusLabel(version.status, 'version') : '-'} &nbsp;|&nbsp; <strong>负责人:</strong> ${version?.owner || '未分配'} &nbsp;|&nbsp; <strong>周期:</strong> ${version?.startDate || '-'} ~ ${version?.endDate || '-'}</p>
      <div class="metrics">
        ${this.metricCard('特性总数', String(health.totalFeatures))}
        ${this.metricCard('完成率', `${health.completionRate}%`)}
        ${this.metricCard('逾期数', String(health.overdueCount), health.overdueCount > 0 ? 'overdue' : '')}
        ${this.metricCard('总预估工时', String(health.totalEstimatedHours))}
        ${this.metricCard('总实际工时', String(health.totalActualHours))}
        ${this.metricCard('风险等级', this.riskLabel(health.riskLevel), `risk-${health.riskLevel}`)}
      </div>
      <h2>包含项目</h2>
      ${this.projectsTable(projects, features)}
      <h2>燃尽图摘要</h2>
      ${this.burndownTable(burndown)}
      <h2>项目工作量</h2>
      ${this.workloadTable(workloadByProject)}
      <h2>逾期特性</h2>
      ${this.overdueList(versionOverdue)}
    `);

    const plain = this.buildPlainVersion(subject, version, projects, features, health, workloadByProject, burndown, versionOverdue);
    return { subject, html, plain };
  }

  // ==================== 项目邮件 ====================

  private async buildProjectEmail(projectId: string, projectName: string): Promise<{ subject: string; html: string; plain: string }> {
    const dateStr = new Date().toISOString().split('T')[0];
    const subject = `项目 ${projectName} 进展报告 - ${dateStr}`;

    const [project, features, workloadOwners, overdue] = await Promise.all([
      this.entityManager.getProject(projectId),
      this.entityManager.listFeatures({ projectId }),
      this.reportService.calculateWorkloadByOwner('feature', { mode: 'list', project: projectId }),
      this.entityManager.getOverdueItems('feature'),
    ]);

    const completedCount = features.filter(f => f.status === 'completed').length;
    const avgProgress = features.length > 0
      ? Math.round(features.reduce((sum, f) => sum + (f.progress || 0), 0) / features.length)
      : 0;
    const totalEstimated = features.reduce((sum, f) => sum + (f.estimatedHours || 0), 0);
    const totalActual = features.reduce((sum, f) => sum + (f.actualHours || 0), 0);
    const projectOverdue = overdue.filter((o: Feature | Project | Version) => 'projectId' in o && o.projectId === projectId);

    const html = this.wrapHTML(subject, `
      <h1>${subject}</h1>
      <p><strong>所属版本:</strong> ${project ? (await this.entityManager.getVersion(project.versionId))?.name || '-' : '-'} &nbsp;|&nbsp; <strong>负责人:</strong> ${project?.owner || '未分配'} &nbsp;|&nbsp; <strong>状态:</strong> ${project ? getStatusLabel(project.status, 'project') : '-'} &nbsp;|&nbsp; <strong>优先级:</strong> ${project ? getPriorityLabel(project.priority) : '-'}</p>
      <div class="metrics">
        ${this.metricCard('特性总数', String(features.length))}
        ${this.metricCard('已完成', String(completedCount))}
        ${this.metricCard('平均进度', `${avgProgress}%`)}
        ${this.metricCard('逾期数', String(projectOverdue.length), projectOverdue.length > 0 ? 'overdue' : '')}
        ${this.metricCard('预估工时', String(totalEstimated))}
        ${this.metricCard('实际工时', String(totalActual))}
      </div>
      <h2>特性列表</h2>
      ${this.featuresTable(features)}
      <h2>负责人工作量</h2>
      ${this.workloadTable(workloadOwners)}
      <h2>逾期特性</h2>
      ${this.overdueList(projectOverdue)}
    `);

    const plain = this.buildPlainProject(subject, project, features, completedCount, avgProgress, totalEstimated, totalActual, workloadOwners, projectOverdue);
    return { subject, html, plain };
  }

  // ==================== 特性邮件 ====================

  private async buildFeatureEmail(featureId: string, featureName: string): Promise<{ subject: string; html: string; plain: string }> {
    const dateStr = new Date().toISOString().split('T')[0];
    const subject = `特性 ${featureName} 进展报告 - ${dateStr}`;

    const feature = await this.entityManager.getFeature(featureId);
    const [version, project] = await Promise.all([
      feature ? this.entityManager.getVersion(feature.versionId) : Promise.resolve(null),
      feature ? this.entityManager.getProject(feature.projectId) : Promise.resolve(null),
    ]);

    const remaining = Math.max(0, (feature?.estimatedHours || 0) - (feature?.actualHours || 0));

    const html = this.wrapHTML(subject, `
      <h1>${subject}</h1>
      <p><strong>所属版本:</strong> ${version?.name || '-'} &nbsp;|&nbsp; <strong>所属项目:</strong> ${project?.name || '-'} &nbsp;|&nbsp; <strong>负责人:</strong> ${feature?.owner || '未分配'}</p>
      <div class="metrics">
        ${this.metricCard('状态', feature ? getStatusLabel(feature.status, 'feature') : '-')}
        ${this.metricCard('优先级', feature ? getPriorityLabel(feature.priority) : '-')}
        ${this.metricCard('进度', `${feature?.progress || 0}%`)}
        ${this.metricCard('预估工时', String(feature?.estimatedHours || 0))}
        ${this.metricCard('实际工时', String(feature?.actualHours || 0))}
        ${this.metricCard('剩余工时', String(remaining))}
      </div>
      <h2>时间计划</h2>
      <p>开始日期: ${feature?.startDate || '-'} &nbsp;|&nbsp; 结束日期: ${feature?.endDate || '-'}</p>
      <h2>进度详情</h2>
      <div style="background:#e5e7eb;border-radius:4px;height:20px;width:100%;max-width:400px;">
        <div style="background:#3b82f6;border-radius:4px;height:20px;width:${feature?.progress || 0}%;"></div>
      </div>
    `);

    const plain = this.buildPlainFeature(subject, feature, version, project, remaining);
    return { subject, html, plain };
  }

  // ==================== HTML 构建工具 ====================

  private wrapHTML(title: string, body: string): string {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
body { font-family: "Segoe UI", "Microsoft YaHei", sans-serif; color: #333; line-height: 1.6; padding: 16px; }
h1 { font-size: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
h2 { font-size: 16px; color: #2563eb; margin-top: 24px; }
table { border-collapse: collapse; width: 100%; margin-top: 8px; }
th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 13px; }
th { background: #f3f4f6; }
.metrics { margin: 16px 0; }
.metric { display: inline-block; min-width: 110px; padding: 12px; background: #f9fafb; border-radius: 6px; margin: 0 8px 8px 0; text-align: center; }
.metric-value { font-size: 18px; font-weight: bold; color: #111827; }
.metric-label { font-size: 12px; color: #6b7280; }
.risk-low { color: #22c55e; }
.risk-medium { color: #f59e0b; }
.risk-high { color: #ef4444; }
.overdue { color: #ef4444; }
.empty { color: #9ca3af; font-style: italic; }
</style>
</head>
<body>
${body}
</body>
</html>`;
  }

  private metricCard(label: string, value: string, extraClass: string = ''): string {
    return `<div class="metric">
  <div class="metric-value ${extraClass}">${value}</div>
  <div class="metric-label">${label}</div>
</div>`;
  }

  private riskLabel(level: string): string {
    switch (level) {
      case 'low': return '低风险';
      case 'medium': return '中风险';
      case 'high': return '高风险';
      default: return level;
    }
  }

  private versionsTable(versions: Version[]): string {
    if (versions.length === 0) return '<p class="empty">暂无数据</p>';
    const rows = versions.map(v => `
      <tr>
        <td>${v.name}</td>
        <td>${getStatusLabel(v.status, 'version')}</td>
        <td>${v.startDate || '-'} ~ ${v.endDate || '-'}</td>
        <td>${v.owner || '未分配'}</td>
      </tr>
    `).join('');
    return `<table><thead><tr><th>版本名称</th><th>状态</th><th>周期</th><th>负责人</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  private projectsTable(projects: Project[], allFeatures: Feature[]): string {
    if (projects.length === 0) return '<p class="empty">暂无数据</p>';
    const rows = projects.map(p => {
      const count = allFeatures.filter(f => f.projectId === p.id).length;
      return `
        <tr>
          <td>${p.name}</td>
          <td>${getStatusLabel(p.status, 'project')}</td>
          <td>${p.owner || '未分配'}</td>
          <td>${count}</td>
        </tr>
      `;
    }).join('');
    return `<table><thead><tr><th>项目名称</th><th>状态</th><th>负责人</th><th>特性数</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  private featuresTable(features: Feature[]): string {
    if (features.length === 0) return '<p class="empty">暂无数据</p>';
    const rows = features.map(f => `
      <tr>
        <td>${f.name}</td>
        <td>${getStatusLabel(f.status, 'feature')}</td>
        <td>${f.progress}%</td>
        <td>${f.owner || '未分配'}</td>
        <td>${f.endDate || '-'}</td>
      </tr>
    `).join('');
    return `<table><thead><tr><th>特性名称</th><th>状态</th><th>进度</th><th>负责人</th><th>截止日期</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  private workloadTable(data: WorkloadData[]): string {
    if (data.length === 0) return '<p class="empty">暂无数据</p>';
    const rows = data.map(d => `
      <tr>
        <td>${d.name}</td>
        <td>${d.estimated}</td>
        <td>${d.actual}</td>
        <td>${d.remaining}</td>
        <td>${d.taskCount}</td>
        <td>${d.efficiency}%</td>
      </tr>
    `).join('');
    return `<table><thead><tr><th>名称</th><th>预估工时</th><th>实际工时</th><th>剩余工时</th><th>任务数</th><th>效率</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  private trendTable(data: TrendDataPoint[]): string {
    if (data.length === 0) return '<p class="empty">暂无数据</p>';
    const rows = data.map(d => `
      <tr><td>${d.date}</td><td>${d.count}</td></tr>
    `).join('');
    return `<table><thead><tr><th>日期</th><th>完成数</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  private burndownTable(data: BurndownDataPoint[]): string {
    if (data.length === 0) return '<p class="empty">暂无数据</p>';
    const sample = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 10)) === 0 || i === data.length - 1);
    const rows = sample.map(d => `
      <tr><td>${d.date}</td><td>${d.planned}</td><td>${d.actual}</td><td>${d.completed}</td></tr>
    `).join('');
    return `<table><thead><tr><th>日期</th><th>计划剩余</th><th>实际剩余</th><th>当日完成</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  private overdueList(items: Array<Version | Project | Feature>): string {
    if (items.length === 0) return '<p class="empty">无逾期项</p>';
    const list = items.map(i => {
      const typeLabel = 'projectId' in i ? ('versionId' in i && !('projectId' in i && i.projectId) ? '版本' : '特性') : ('versionId' in i ? '项目' : '版本');
      const date = i.endDate || '-';
      return `<li class="overdue">[${typeLabel}] ${i.name} (截止: ${date})</li>`;
    }).join('');
    return `<ul>${list}</ul>`;
  }

  // ==================== 纯文本构建工具 ====================

  private buildPlainOverview(
    subject: string,
    versions: Version[],
    projects: Project[],
    features: Feature[],
    health: HealthMetrics,
    workload: WorkloadData[],
    trend: TrendDataPoint[],
    overdue: Array<Version | Project | Feature>
  ): string {
    const lines = [subject, ''];
    lines.push(`版本总数: ${versions.length} | 项目总数: ${projects.length} | 特性总数: ${features.length}`);
    lines.push(`整体完成率: ${health.completionRate}% | 逾期特性数: ${health.overdueCount} | 平均进度: ${health.avgProgress}%`);
    lines.push('', '== 版本状态 ==');
    versions.forEach(v => lines.push(`${v.name}: ${getStatusLabel(v.status, 'version')} | ${v.startDate || '-'} ~ ${v.endDate || '-'}`));
    lines.push('', '== 项目工作量 TOP 5 ==');
    workload.slice(0, 5).forEach(w => lines.push(`${w.name}: 预估${w.estimated}h 实际${w.actual}h 效率${w.efficiency}%`));
    lines.push('', '== 近30天完成趋势（最近5天） ==');
    trend.slice(-5).forEach(t => lines.push(`${t.date}: ${t.count}`));
    lines.push('', '== 逾期项 ==');
    if (overdue.length === 0) lines.push('无逾期项');
    else overdue.forEach(o => lines.push(`- ${o.name} (截止: ${o.endDate || '-'})`));
    return lines.join('\n');
  }

  private buildPlainVersion(
    subject: string,
    version: Version | null,
    projects: Project[],
    features: Feature[],
    health: HealthMetrics,
    workload: WorkloadData[],
    burndown: BurndownDataPoint[],
    overdue: Array<Version | Project | Feature>
  ): string {
    const lines = [subject, ''];
    if (version) {
      lines.push(`版本: ${version.name} | 状态: ${getStatusLabel(version.status, 'version')} | 负责人: ${version.owner || '未分配'}`);
      lines.push(`周期: ${version.startDate || '-'} ~ ${version.endDate || '-'}`);
    }
    lines.push(`特性总数: ${health.totalFeatures} | 完成率: ${health.completionRate}% | 逾期数: ${health.overdueCount}`);
    lines.push(`预估工时: ${health.totalEstimatedHours}h | 实际工时: ${health.totalActualHours}h | 风险: ${this.riskLabel(health.riskLevel)}`);
    lines.push('', '== 包含项目 ==');
    projects.forEach(p => lines.push(`${p.name}: ${getStatusLabel(p.status, 'project')} | 负责人: ${p.owner || '未分配'}`));
    lines.push('', '== 燃尽摘要 ==');
    burndown.slice(0, 5).forEach(b => lines.push(`${b.date}: 计划${b.planned} 实际${b.actual} 完成${b.completed}`));
    lines.push('', '== 负责人工作量 ==');
    workload.forEach(w => lines.push(`${w.name}: 预估${w.estimated}h 实际${w.actual}h`));
    lines.push('', '== 逾期特性 ==');
    if (overdue.length === 0) lines.push('无逾期项');
    else overdue.forEach(o => lines.push(`- ${o.name} (截止: ${o.endDate || '-'})`));
    return lines.join('\n');
  }

  private buildPlainProject(
    subject: string,
    project: Project | null,
    features: Feature[],
    completedCount: number,
    avgProgress: number,
    totalEstimated: number,
    totalActual: number,
    workload: WorkloadData[],
    overdue: Array<Version | Project | Feature>
  ): string {
    const lines = [subject, ''];
    if (project) {
      lines.push(`项目: ${project.name} | 状态: ${getStatusLabel(project.status, 'project')} | 优先级: ${getPriorityLabel(project.priority)}`);
    }
    lines.push(`特性总数: ${features.length} | 已完成: ${completedCount} | 平均进度: ${avgProgress}%`);
    lines.push(`预估工时: ${totalEstimated}h | 实际工时: ${totalActual}h | 逾期数: ${overdue.length}`);
    lines.push('', '== 特性列表 ==');
    features.forEach(f => lines.push(`${f.name}: ${getStatusLabel(f.status, 'feature')} | 进度${f.progress}% | 负责人:${f.owner || '未分配'} | 截止:${f.endDate || '-'}`));
    lines.push('', '== 负责人工作量 ==');
    workload.forEach(w => lines.push(`${w.name}: 预估${w.estimated}h 实际${w.actual}h`));
    lines.push('', '== 逾期特性 ==');
    if (overdue.length === 0) lines.push('无逾期项');
    else overdue.forEach(o => lines.push(`- ${o.name} (截止: ${o.endDate || '-'})`));
    return lines.join('\n');
  }

  private buildPlainFeature(
    subject: string,
    feature: Feature | null,
    version: Version | null,
    project: Project | null,
    remaining: number
  ): string {
    const lines = [subject, ''];
    if (feature) {
      lines.push(`特性: ${feature.name}`);
      lines.push(`状态: ${getStatusLabel(feature.status, 'feature')} | 优先级: ${getPriorityLabel(feature.priority)} | 进度: ${feature.progress}%`);
      lines.push(`负责人: ${feature.owner || '未分配'}`);
      lines.push(`所属版本: ${version?.name || '-'} | 所属项目: ${project?.name || '-'}`);
      lines.push(`预估工时: ${feature.estimatedHours || 0}h | 实际工时: ${feature.actualHours || 0}h | 剩余: ${remaining}h`);
      lines.push(`时间计划: ${feature.startDate || '-'} ~ ${feature.endDate || '-'}`);
    }
    return lines.join('\n');
  }
}
