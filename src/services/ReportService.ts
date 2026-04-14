/**
 * 报表数据服务
 * 提供燃尽图、工作量统计、项目健康度等报表数据计算
 */

import { App } from 'obsidian';
import type { EntityManager } from '../core';
import type { Feature, Project, Version } from '../types';
import type { ViewConfig } from '../view-engine/types';

/** 燃尽图数据点 */
export interface BurndownDataPoint {
  date: string;
  planned: number;
  actual: number;
  completed: number;
}

/** 工作量数据 */
export interface WorkloadData {
  name: string;
  estimated: number;
  actual: number;
  remaining: number;
  taskCount: number;
  efficiency: number; // 效率 = estimated / actual (actual > 0)
}

/** 趋势数据点 */
export interface TrendDataPoint {
  date: string;
  count: number;
}

/** 项目健康度指标 */
export interface HealthMetrics {
  totalFeatures: number;
  completedFeatures: number;
  completionRate: number;
  overdueCount: number;
  overdueRate: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  hoursVariance: number; // 工时偏差率
  avgProgress: number;
  riskLevel: 'low' | 'medium' | 'high';
}

/** 日期范围 */
export interface DateRange {
  start: string;
  end: string;
}

export class ReportService {
  constructor(
    private app: App,
    private entityManager: EntityManager
  ) {}

  /**
   * 统一应用 ViewConfig 层级筛选到特性列表
   */
  private applyFeatureFilters(features: Feature[], filters?: ViewConfig): Feature[] {
    if (!filters) return features;

    return features.filter((f) => {
      if (filters.features?.length && !filters.features.includes(f.id)) return false;
      if (filters.projects?.length && !filters.projects.includes(f.projectId)) return false;
      if (filters.versions?.length && !filters.versions.includes(f.versionId)) return false;
      if (filters.version && f.versionId !== filters.version) return false;
      if (filters.project && f.projectId !== filters.project) return false;
      if (filters.status && f.status !== filters.status) return false;
      return true;
    });
  }

  /**
   * 计算燃尽图数据
   * @param versionId 版本ID（可选，向后兼容）
   * @param dateRange 日期范围（可选，默认使用版本周期或最近30天）
   * @param filters 视图配置筛选（可选）
   */
  async calculateBurndownData(
    versionId?: string,
    dateRange?: DateRange,
    filters?: ViewConfig
  ): Promise<BurndownDataPoint[]> {
    // 获取特性列表
    let features = await this.entityManager.listFeatures(
      versionId ? { versionId } : undefined
    );

    features = this.applyFeatureFilters(features, filters);

    // 确定日期范围
    const range = dateRange || this.getDefaultDateRange(features);
    const dates = this.generateDateRange(range.start, range.end);

    // 计算总预估工时
    const totalEstimated = features.reduce(
      (sum, f) => sum + (f.estimatedHours || 0),
      0
    );

    // 按日期计算数据点
    return dates.map((date, index) => {
      const dateStr = date.toISOString().split('T')[0];

      // 计划剩余工时：线性递减
      const daysPassed = index;
      const totalDays = dates.length - 1 || 1;
      const plannedRemaining = Math.round(
        totalEstimated * (1 - daysPassed / totalDays)
      );

      // 实际完成工时：累计已完成特性的实际工时
      const completedBeforeDate = features.filter((f) => {
        if (f.status !== 'completed') return false;
        // 简化处理：使用 endDate 或假设今天之前完成的
        if (f.endDate) return f.endDate <= dateStr;
        return false;
      });
      const actualCompleted = completedBeforeDate.reduce(
        (sum, f) => sum + (f.actualHours || f.estimatedHours || 0),
        0
      );

      // 当日完成工时
      const completedOnDate = completedBeforeDate.filter((f) => f.endDate === dateStr)
        .reduce((sum, f) => sum + (f.actualHours || f.estimatedHours || 0), 0);

      return {
        date: dateStr,
        planned: plannedRemaining,
        actual: totalEstimated - actualCompleted,
        completed: completedOnDate,
      };
    });
  }

  /**
   * 按负责人统计工作量
   */
  async calculateWorkloadByOwner(
    entityType: 'version' | 'project' | 'feature' = 'feature',
    filters?: ViewConfig
  ): Promise<WorkloadData[]> {
    const ownerMap = new Map<string, WorkloadData>();

    const addWorkload = (owner: string, estimated: number, actual: number, count: number) => {
      if (!ownerMap.has(owner)) {
        ownerMap.set(owner, {
          name: owner,
          estimated: 0,
          actual: 0,
          remaining: 0,
          taskCount: 0,
          efficiency: 0,
        });
      }
      const data = ownerMap.get(owner)!;
      data.estimated += estimated;
      data.actual += actual;
      data.remaining += Math.max(0, estimated - actual);
      data.taskCount += count;
    };

    switch (entityType) {
      case 'feature': {
        let features = await this.entityManager.listFeatures();
        features = this.applyFeatureFilters(features, filters);
        for (const f of features) {
          addWorkload(f.owner || '未分配', f.estimatedHours || 0, f.actualHours || 0, 1);
        }
        break;
      }
      case 'project': {
        let features = await this.entityManager.listFeatures();
        features = this.applyFeatureFilters(features, filters);
        const projects = await this.entityManager.listProjects();
        const projectMap = new Map(projects.map(p => [p.id, p]));
        const projectGroups = new Map<string, Feature[]>();
        for (const f of features) {
          if (!projectGroups.has(f.projectId)) projectGroups.set(f.projectId, []);
          projectGroups.get(f.projectId)!.push(f);
        }
        for (const [projectId, pfs] of projectGroups) {
          const project = projectMap.get(projectId);
          const estimated = pfs.reduce((sum, f) => sum + (f.estimatedHours || 0), 0);
          const actual = pfs.reduce((sum, f) => sum + (f.actualHours || 0), 0);
          addWorkload(project?.owner || '未分配', estimated, actual, pfs.length);
        }
        break;
      }
      case 'version': {
        let features = await this.entityManager.listFeatures();
        features = this.applyFeatureFilters(features, filters);
        const versions = await this.entityManager.listVersions();
        const versionMap = new Map(versions.map(v => [v.id, v]));
        const versionGroups = new Map<string, Feature[]>();
        for (const f of features) {
          if (!versionGroups.has(f.versionId)) versionGroups.set(f.versionId, []);
          versionGroups.get(f.versionId)!.push(f);
        }
        for (const [versionId, vfs] of versionGroups) {
          const version = versionMap.get(versionId);
          const estimated = vfs.reduce((sum, f) => sum + (f.estimatedHours || 0), 0);
          const actual = vfs.reduce((sum, f) => sum + (f.actualHours || 0), 0);
          addWorkload(version?.owner || '未分配', estimated, actual, vfs.length);
        }
        break;
      }
    }

    // 计算效率
    const result = Array.from(ownerMap.values());
    for (const data of result) {
      data.efficiency =
        data.actual > 0 ? Math.round((data.estimated / data.actual) * 100) : 100;
    }

    // 按预估工时排序
    return result.sort((a, b) => b.estimated - a.estimated);
  }

  /**
   * 按项目统计工作量
   */
  async calculateWorkloadByProject(filters?: ViewConfig): Promise<WorkloadData[]> {
    let projects = await this.entityManager.listProjects();
    let features = await this.entityManager.listFeatures();

    features = this.applyFeatureFilters(features, filters);

    // 根据过滤后的特性反推需要展示的项目
    const relevantProjectIds = new Set(features.map((f) => f.projectId));
    projects = projects.filter((p) => relevantProjectIds.has(p.id));

    // 如果还有 versions/projects 数组限制，进一步过滤项目
    if (filters?.projects?.length) {
      projects = projects.filter((p) => filters.projects!.includes(p.id));
    }
    if (filters?.versions?.length) {
      projects = projects.filter((p) => filters.versions!.includes(p.versionId));
    }
    if (filters?.version) {
      projects = projects.filter((p) => p.versionId === filters.version);
    }

    return projects.map((project) => {
      const projectFeatures = features.filter(
        (f) => f.projectId === project.id
      );

      const estimated = projectFeatures.reduce(
        (sum, f) => sum + (f.estimatedHours || 0),
        0
      );
      const actual = projectFeatures.reduce(
        (sum, f) => sum + (f.actualHours || 0),
        0
      );

      return {
        name: project.name,
        estimated,
        actual,
        remaining: Math.max(0, estimated - actual),
        taskCount: projectFeatures.length,
        efficiency: actual > 0 ? Math.round((estimated / actual) * 100) : 100,
      };
    }).sort((a, b) => b.estimated - a.estimated);
  }

  /**
   * 计算完成趋势（近N天）
   */
  async calculateCompletionTrend(days: number = 30): Promise<TrendDataPoint[]> {
    const features = await this.entityManager.listFeatures();
    const completedFeatures = features.filter((f) => f.status === 'completed');

    const today = new Date();
    const dates: TrendDataPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // 统计该日期完成的特性数
      const count = completedFeatures.filter((f) => f.endDate === dateStr).length;

      dates.push({ date: dateStr, count });
    }

    return dates;
  }

  /**
   * 计算项目健康度
   */
  async calculateProjectHealth(versionId?: string): Promise<HealthMetrics> {
    const features = await this.entityManager.listFeatures(
      versionId ? { versionId } : undefined
    );

    const totalFeatures = features.length;
    const completedFeatures = features.filter(
      (f) => f.status === 'completed'
    ).length;
    const completionRate =
      totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0;

    // 逾期统计
    const today = new Date().toISOString().split('T')[0];
    const overdueFeatures = features.filter(
      (f) => f.endDate && f.endDate < today && f.status !== 'completed'
    );
    const overdueCount = overdueFeatures.length;
    const overdueRate =
      totalFeatures > 0 ? Math.round((overdueCount / totalFeatures) * 100) : 0;

    // 工时统计
    const totalEstimatedHours = features.reduce(
      (sum, f) => sum + (f.estimatedHours || 0),
      0
    );
    const totalActualHours = features.reduce(
      (sum, f) => sum + (f.actualHours || 0),
      0
    );
    const hoursVariance =
      totalActualHours > 0
        ? Math.round(
            ((totalActualHours - totalEstimatedHours) / totalEstimatedHours) * 100
          )
        : 0;

    // 平均进度
    const avgProgress =
      totalFeatures > 0
        ? Math.round(
            features.reduce((sum, f) => sum + (f.progress || 0), 0) / totalFeatures
          )
        : 0;

    // 风险等级
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (overdueRate > 20 || hoursVariance > 30) {
      riskLevel = 'high';
    } else if (overdueRate > 10 || hoursVariance > 15) {
      riskLevel = 'medium';
    }

    return {
      totalFeatures,
      completedFeatures,
      completionRate,
      overdueCount,
      overdueRate,
      totalEstimatedHours,
      totalActualHours,
      hoursVariance,
      avgProgress,
      riskLevel,
    };
  }

  /**
   * 获取默认日期范围
   */
  private getDefaultDateRange(features: Feature[]): DateRange {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 尝试从特性日期推断范围
    const dates = features
      .flatMap((f) => [f.startDate, f.endDate])
      .filter((d): d is string => !!d)
      .sort();

    if (dates.length > 0) {
      return {
        start: dates[0],
        end: dates[dates.length - 1],
      };
    }

    // 默认最近30天
    return {
      start: thirtyDaysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };
  }

  /**
   * 生成日期范围数组
   */
  private generateDateRange(start: string, end: string): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    const endDate = new Date(end);

    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }
}
