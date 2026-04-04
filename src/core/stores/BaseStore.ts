import { FileSystem } from '../filesystem/FileSystem';
import { App } from 'obsidian';

/**
 * 存储基类
 * 提供通用 CRUD 功能
 */
export abstract class BaseStore<T, CreateData, UpdateData> {
  protected fs: FileSystem;
  protected app: App;

  constructor(fs: FileSystem, app: App) {
    this.fs = fs;
    this.app = app;
  }

  /**
   * 生成唯一ID
   */
  protected generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * 创建实体
   */
  abstract create(data: CreateData): Promise<T>;

  /**
   * 更新实体
   */
  abstract update(id: string, data: UpdateData): Promise<T>;

  /**
   * 删除实体
   */
  abstract delete(id: string): Promise<boolean>;

  /**
   * 根据ID获取实体
   */
  abstract getById(id: string): Promise<T | null>;

  /**
   * 列出所有实体
   */
  abstract list(): Promise<T[]>;
}
