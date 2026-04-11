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
   * 计算燃尽图数据
   * @param versionId 版本ID（可选，不传则统计所有特性）
   * @param dateRange 日期范围（可选，默认使用版本周期或最近30天）
   */
  async calculateBurndownData(
    versionId?: string,
    dateRange?: DateRange
  ): Promise<BurndownDataPoint[]> {
    // 获取特性列表
    const features = await this.entityManager.listFeatures(
      versionId ? { versionId } : undefined
    );

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
    let entities: Array<Feature | Project | Version> = [];

    switch (entityType) {
      case 'feature':
        entities = await this.entityManager.listFeatures(
          filters ? { versionId: filters.version, projectId: filters.project, status: filters.status as any } : undefined
        );
        break;
      case 'project':
        entities = await this.entityManager.listProjects(
          filters ? { versionId: filters.version } : undefined
        );
        break;
      case 'version':
        entities = await this.entityManager.listVersions();
        break;
    }

    // 按负责人分组
    const ownerMap = new Map<string, WorkloadData>();

    for (const entity of entities) {
      const owner = entity.owner || '未分配';

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
      const estimated = (entity as Feature).estimatedHours || 0;
      const actual = (entity as Feature).actualHours || 0;

      data.estimated += estimated;
      data.actual += actual;
      data.remaining += Math.max(0, estimated - actual);
      data.taskCount += 1;
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
  async calculateWorkloadByProject(versionId?: string): Promise<WorkloadData[]> {
    const projects = await this.entityManager.listProjects(
      versionId ? { versionId } : undefined
    );
    const features = await this.entityManager.listFeatures(
      versionId ? { versionId } : undefined
    );

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
