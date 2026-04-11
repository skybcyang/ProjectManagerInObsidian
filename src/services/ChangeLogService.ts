/**
 * 变更日志服务
 * 记录和查询实体变更历史
 */

import { App, TFile, TFolder } from 'obsidian';
import type {
  ChangeLogEntry,
  ChangeLogEntityType,
  ChangeLogAction,
  FieldChange,
  LogQueryOptions,
  ChangeLogStats,
} from '../types/changelog';
import type { Feature, Project, Version } from '../types';

export class ChangeLogService {
  private readonly LOG_DIR = 'ProjectManager/.changelog';
  private readonly ARCHIVE_DIR = 'ProjectManager/.changelog/archive';

  constructor(private app: App) {}

  /**
   * 记录实体创建
   */
  async logCreate(
    entityType: ChangeLogEntityType,
    entity: Feature | Project | Version
  ): Promise<void> {
    const entry: ChangeLogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      entityType,
      entityId: entity.id,
      entityName: entity.name,
      action: 'create',
      changes: this.buildCreateChanges(entity),
      operator: this.getCurrentUser(),
    };

    await this.saveLogEntry(entry);
  }

  /**
   * 记录实体更新
   */
  async logUpdate(
    entityType: ChangeLogEntityType,
    oldEntity: Feature | Project | Version,
    newEntity: Feature | Project | Version
  ): Promise<void> {
    const changes = this.buildUpdateChanges(oldEntity, newEntity);

    // 如果没有变化，不记录
    if (changes.length === 0) return;

    const entry: ChangeLogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      entityType,
      entityId: newEntity.id,
      entityName: newEntity.name,
      action: 'update',
      changes,
      operator: this.getCurrentUser(),
    };

    await this.saveLogEntry(entry);
  }

  /**
   * 记录实体删除
   */
  async logDelete(
    entityType: ChangeLogEntityType,
    entity: Feature | Project | Version
  ): Promise<void> {
    const entry: ChangeLogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      entityType,
      entityId: entity.id,
      entityName: entity.name,
      action: 'delete',
      changes: this.buildDeleteChanges(entity),
      operator: this.getCurrentUser(),
    };

    await this.saveLogEntry(entry);
  }

  /**
   * 查询变更日志
   */
  async queryLogs(options: LogQueryOptions = {}): Promise<ChangeLogEntry[]> {
    const {
      entityType,
      entityId,
      action,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = options;

    // 获取所有日志文件
    const logFiles = await this.getLogFiles(startDate, endDate);

    // 读取并过滤日志
    const entries: ChangeLogEntry[] = [];

    for (const file of logFiles) {
      const content = await this.app.vault.read(file);
      const lines = content.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const entry: ChangeLogEntry = JSON.parse(line);

          // 应用过滤条件
          if (entityType && entry.entityType !== entityType) continue;
          if (entityId && entry.entityId !== entityId) continue;
          if (action && entry.action !== action) continue;
          if (startDate && entry.timestamp < startDate.getTime()) continue;
          if (endDate && entry.timestamp > endDate.getTime()) continue;

          entries.push(entry);
        } catch {
          // 跳过无效的日志行
          continue;
        }
      }
    }

    // 按时间戳降序排列
    entries.sort((a, b) => b.timestamp - a.timestamp);

    // 应用分页
    return entries.slice(offset, offset + limit);
  }

  /**
   * 获取单个实体的变更历史
   */
  async getEntityHistory(
    entityType: ChangeLogEntityType,
    entityId: string,
    limit = 50
  ): Promise<ChangeLogEntry[]> {
    return this.queryLogs({ entityType, entityId, limit });
  }

  /**
   * 获取变更统计
   */
  async getStats(days = 30): Promise<ChangeLogStats> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const entries = await this.queryLogs({
      startDate,
      endDate,
      limit: 10000,
    });

    const stats: ChangeLogStats = {
      totalCount: entries.length,
      createCount: 0,
      updateCount: 0,
      deleteCount: 0,
      byEntityType: { version: 0, project: 0, feature: 0 },
    };

    for (const entry of entries) {
      switch (entry.action) {
        case 'create':
          stats.createCount++;
          break;
        case 'update':
          stats.updateCount++;
          break;
        case 'delete':
          stats.deleteCount++;
          break;
      }
      stats.byEntityType[entry.entityType]++;
    }

    return stats;
  }

  /**
   * 导出变更日志
   */
  async exportLogs(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const entries = await this.queryLogs({
      startDate,
      endDate,
      limit: 10000,
    });

    if (format === 'csv') {
      return this.exportAsCsv(entries);
    }

    return JSON.stringify(entries, null, 2);
  }

  /**
   * 归档旧日志（保留最近90天）
   */
  async archiveOldLogs(retentionDays = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const logFiles = await this.getLogFiles();
    let archivedCount = 0;

    for (const file of logFiles) {
      // 从文件名提取日期
      const dateMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
      if (!dateMatch) continue;

      const fileDate = new Date(dateMatch[1]);
      if (fileDate < cutoffDate) {
        // 移动文件到归档目录
        const archivePath = `${this.ARCHIVE_DIR}/${file.name}`;
        try {
          await this.ensureDirectory(this.ARCHIVE_DIR);
          await this.app.vault.adapter.rename(file.path, archivePath);
          archivedCount++;
        } catch (error) {
          console.error(`归档日志失败: ${file.path}`, error);
        }
      }
    }

    return archivedCount;
  }

  // ==================== 私有方法 ====================

  /**
   * 生成日志ID
   */
  private generateLogId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取当前用户
   */
  private getCurrentUser(): string | undefined {
    // Obsidian 不直接提供用户信息，可以尝试从配置或其他插件获取
    // 暂时返回 undefined
    return undefined;
  }

  /**
   * 构建创建变更详情
   */
  private buildCreateChanges(entity: Feature | Project | Version): FieldChange[] {
    const changes: FieldChange[] = [];

    for (const [key, value] of Object.entries(entity)) {
      if (value !== undefined && value !== null) {
        changes.push({
          field: key,
          oldValue: undefined,
          newValue: value,
          type: 'added',
        });
      }
    }

    return changes;
  }

  /**
   * 构建更新变更详情
   */
  private buildUpdateChanges(
    oldEntity: Feature | Project | Version,
    newEntity: Feature | Project | Version
  ): FieldChange[] {
    const changes: FieldChange[] = [];

    // 获取所有可能的字段
    const allKeys = new Set([
      ...Object.keys(oldEntity),
      ...Object.keys(newEntity),
    ]);

    for (const key of allKeys) {
      const oldValue = (oldEntity as unknown as Record<string, unknown>)[key];
      const newValue = (newEntity as unknown as Record<string, unknown>)[key];

      // 跳过未变化的字段
      if (this.isEqual(oldValue, newValue)) continue;

      // 确定变更类型
      let type: FieldChange['type'] = 'modified';
      if (oldValue === undefined) type = 'added';
      else if (newValue === undefined) type = 'removed';

      changes.push({
        field: key,
        oldValue,
        newValue,
        type,
      });
    }

    return changes;
  }

  /**
   * 构建删除变更详情
   */
  private buildDeleteChanges(entity: Feature | Project | Version): FieldChange[] {
    const changes: FieldChange[] = [];

    for (const [key, value] of Object.entries(entity)) {
      changes.push({
        field: key,
        oldValue: value,
        newValue: undefined,
        type: 'removed',
      });
    }

    return changes;
  }

  /**
   * 比较两个值是否相等
   */
  private isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.isEqual(item, b[index]));
    }
    if (typeof a === 'object' && a !== null && b !== null) {
      return this.isEqual(
        Object.entries(a as Record<string, unknown>),
        Object.entries(b as Record<string, unknown>)
      );
    }
    return false;
  }

  /**
   * 保存日志条目
   */
  private async saveLogEntry(entry: ChangeLogEntry): Promise<void> {
    const date = new Date(entry.timestamp).toISOString().split('T')[0];
    const filePath = `${this.LOG_DIR}/${date}.jsonl`;

    await this.ensureDirectory(this.LOG_DIR);

    // 追加写入文件
    const line = JSON.stringify(entry) + '\n';

    const existingFile = this.app.vault.getAbstractFileByPath(filePath);
    if (existingFile instanceof TFile) {
      const content = await this.app.vault.read(existingFile);
      await this.app.vault.modify(existingFile, content + line);
    } else {
      await this.app.vault.create(filePath, line);
    }
  }

  /**
   * 获取日志文件列表
   */
  private async getLogFiles(
    startDate?: Date,
    endDate?: Date
  ): Promise<TFile[]> {
    const folder = this.app.vault.getAbstractFileByPath(this.LOG_DIR);
    if (!(folder instanceof TFolder)) return [];

    const files: TFile[] = [];

    for (const child of folder.children) {
      if (!(child instanceof TFile)) continue;
      if (!child.name.endsWith('.jsonl')) continue;

      // 从文件名提取日期
      const dateMatch = child.name.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
      if (!dateMatch) continue;

      const fileDate = new Date(dateMatch[1]);

      // 应用日期过滤
      if (startDate && fileDate < startDate) continue;
      if (endDate && fileDate > endDate) continue;

      files.push(child);
    }

    // 按日期排序
    files.sort((a, b) => a.name.localeCompare(b.name));

    return files;
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectory(path: string): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(path);
    if (!folder) {
      await this.app.vault.createFolder(path);
    }
  }

  /**
   * 导出为 CSV 格式
   */
  private exportAsCsv(entries: ChangeLogEntry[]): string {
    const headers = ['时间', '操作', '实体类型', '实体ID', '实体名称', '操作人', '变更字段'];
    const rows: string[] = [];

    // 添加标题行
    rows.push(headers.join(','));

    for (const entry of entries) {
      const date = new Date(entry.timestamp).toLocaleString('zh-CN');
      const actionMap: Record<ChangeLogAction, string> = {
        create: '创建',
        update: '更新',
        delete: '删除',
      };
      const typeMap: Record<ChangeLogEntityType, string> = {
        version: '版本',
        project: '项目',
        feature: '特性',
      };

      // 将变更字段序列化为字符串
      const changesStr = entry.changes
        .map((c) => `${c.field}: ${JSON.stringify(c.oldValue)} → ${JSON.stringify(c.newValue)}`)
        .join('; ');

      const row = [
        date,
        actionMap[entry.action],
        typeMap[entry.entityType],
        entry.entityId,
        entry.entityName,
        entry.operator || '未知',
        changesStr,
      ];

      rows.push(row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    }

    return rows.join('\n');
  }
}
