import { Notice } from 'obsidian';

/**
 * 错误类型分类
 */
export type ErrorCategory = 'user' | 'system' | 'expected';

/**
 * 错误处理选项
 */
export interface ErrorHandlerOptions {
  /** 是否显示通知 */
  showNotice?: boolean;
  /** 是否静默处理（不显示任何提示） */
  silent?: boolean;
  /** 错误分类 */
  category?: ErrorCategory;
  /** 自定义错误消息 */
  message?: string;
}

/**
 * 统一错误处理工具类
 */
export class ErrorHandler {
  private static readonly PLUGIN_NAME = 'ProjectManager';

  /**
   * 处理错误
   */
  static handle(error: unknown, context: string, options: ErrorHandlerOptions = {}): void {
    const { showNotice = true, silent = false, category = 'system', message } = options;

    // 构建错误消息
    const errorMessage = message || this.extractErrorMessage(error);
    const fullMessage = `[${this.PLUGIN_NAME}] ${context}: ${errorMessage}`;

    // 始终记录到控制台
    if (category === 'expected') {
      console.warn(fullMessage, error);
    } else {
      console.error(fullMessage, error);
    }

    // 根据分类决定通知行为
    if (silent) return;

    let noticeMessage: string;
    let noticeDuration: number;

    switch (category) {
      case 'user':
        // 用户错误：友好提示
        noticeMessage = `⚠️ ${context}: ${errorMessage}`;
        noticeDuration = 5000;
        break;
      case 'system':
        // 系统错误：详细提示
        noticeMessage = `❌ ${context}: ${errorMessage}`;
        noticeDuration = 8000;
        break;
      case 'expected':
        // 预期错误：轻量提示
        noticeMessage = `ℹ️ ${errorMessage}`;
        noticeDuration = 3000;
        break;
      default:
        noticeMessage = `❌ ${context}: ${errorMessage}`;
        noticeDuration = 5000;
    }

    if (showNotice) {
      new Notice(noticeMessage, noticeDuration);
    }
  }

  /**
   * 处理成功操作
   */
  static handleSuccess(message: string, duration: number = 3000): void {
    new Notice(`✅ ${message}`, duration);
  }

  /**
   * 处理用户输入错误
   */
  static handleUserError(message: string, context?: string): void {
    const fullMessage = context ? `${context}: ${message}` : message;
    new Notice(`⚠️ ${fullMessage}`, 5000);
    console.warn(`[${this.PLUGIN_NAME}] 用户错误:`, fullMessage);
  }

  /**
   * 处理系统错误（带详细日志）
   */
  static handleSystemError(error: unknown, context: string): void {
    this.handle(error, context, { category: 'system', showNotice: true });
  }

  /**
   * 静默处理错误（仅记录日志）
   */
  static handleSilent(error: unknown, context: string): void {
    console.error(`[${this.PLUGIN_NAME}] ${context}:`, error);
  }

  /**
   * 提取错误消息
   */
  private static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return '发生未知错误';
  }
}
