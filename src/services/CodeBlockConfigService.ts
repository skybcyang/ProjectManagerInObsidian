import type { App, TFile } from 'obsidian';
import { ErrorHandler } from '../utils';

/**
 * 代码块配置保存选项
 */
export interface SaveConfigOptions {
  /** 保留的键（不被更新的键） */
  preserveKeys?: string[];
}

/**
 * 代码块配置服务
 * 统一处理 pm-view 代码块配置的读写
 */
export class CodeBlockConfigService {
  // 防抖定时器存储
  private pendingSave = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private app: App) {}

  /**
   * 防抖保存配置 - 避免频繁保存
   * @param sourcePath - 文件路径
   * @param codeBlockIndex - 代码块索引
   * @param updates - 要更新的配置
   * @param delay - 延迟时间（毫秒）
   */
  debouncedSave(
    sourcePath: string,
    codeBlockIndex: number | undefined,
    updates: Record<string, unknown>,
    delay: number = 300
  ): void {
    if (codeBlockIndex === undefined) return;

    const key = `${sourcePath}:${codeBlockIndex}`;

    // 清除之前的定时器
    const existingTimeout = this.pendingSave.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // 设置新的定时器
    const timeout = setTimeout(() => {
      this.saveConfig(sourcePath, codeBlockIndex, updates);
      this.pendingSave.delete(key);
    }, delay);

    this.pendingSave.set(key, timeout);
  }

  /**
   * 清理所有待执行的防抖定时器
   */
  clearPendingSaves(): void {
    this.pendingSave.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.pendingSave.clear();
  }

  /**
   * 保存配置到代码块
   * @param sourcePath - 文件路径
   * @param codeBlockIndex - 代码块索引（第几个 pm-view 代码块）
   * @param updates - 要更新的配置
   * @param options - 保存选项
   */
  async saveConfig(
    sourcePath: string,
    codeBlockIndex: number,
    updates: Record<string, unknown>,
    options?: SaveConfigOptions
  ): Promise<void> {
    if (!sourcePath || codeBlockIndex < 0) return;

    const { TFile } = require('obsidian');
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) return;

    try {
      const content = await this.app.vault.read(file as TFile);
      const newContent = this.buildNewContent(content, codeBlockIndex, updates, options);

      if (newContent !== content) {
        await this.app.vault.modify(file as TFile, newContent);
      }
    } catch (error) {
      ErrorHandler.handle(error, '保存代码块配置失败', { category: 'system' });
    }
  }

  /**
   * 读取代码块配置
   * @param sourcePath - 文件路径
   * @param codeBlockIndex - 代码块索引
   * @returns 配置对象，如果未找到返回 null
   */
  async readConfig<T = Record<string, unknown>>(
    sourcePath: string,
    codeBlockIndex: number
  ): Promise<T | null> {
    if (!sourcePath || codeBlockIndex < 0) return null;

    const { TFile } = require('obsidian');
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) return null;

    try {
      const content = await this.app.vault.read(file as TFile);
      const lines = content.split('\n');

      const blockContent = this.extractBlockContent(lines, codeBlockIndex);
      if (!blockContent) return null;

      const { parseYaml } = require('obsidian');
      return parseYaml(blockContent) as T;
    } catch (error) {
      ErrorHandler.handleSilent(error, `读取代码块配置失败: ${sourcePath}[${codeBlockIndex}]`);
      return null;
    }
  }

  /**
   * 获取代码块数量
   * @param sourcePath - 文件路径
   * @returns 代码块数量
   */
  async getCodeBlockCount(sourcePath: string): Promise<number> {
    if (!sourcePath) return 0;

    const { TFile } = require('obsidian');
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) return 0;

    try {
      const content = await this.app.vault.read(file as TFile);
      const lines = content.split('\n');

      let count = 0;
      for (const line of lines) {
        if (line.trim() === '```pm-view') {
          count++;
        }
      }
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * 提取代码块内容
   */
  private extractBlockContent(lines: string[], codeBlockIndex: number): string | null {
    let blockStart = -1;
    let blockEnd = -1;
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === '```pm-view') {
        if (currentIndex === codeBlockIndex) {
          blockStart = i;
        }
        currentIndex++;
      }

      if (blockStart !== -1 && line === '```') {
        blockEnd = i;
        break;
      }
    }

    if (blockStart === -1 || blockEnd === -1) return null;

    return lines.slice(blockStart + 1, blockEnd).join('\n');
  }

  /**
   * 构建新文件内容
   */
  private buildNewContent(
    content: string,
    codeBlockIndex: number,
    updates: Record<string, unknown>,
    options?: SaveConfigOptions
  ): string {
    const lines = content.split('\n');
    const { stringifyYaml, parseYaml } = require('obsidian');

    // 找到代码块
    let blockStart = -1;
    let blockEnd = -1;
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === '```pm-view') {
        if (currentIndex === codeBlockIndex) {
          blockStart = i;
        }
        currentIndex++;
      }

      if (blockStart !== -1 && line === '```') {
        blockEnd = i;
        break;
      }
    }

    if (blockStart === -1 || blockEnd === -1) return content;

    // 提取原有配置
    const configLines = lines.slice(blockStart + 1, blockEnd);
    const configText = configLines.join('\n');
    const currentConfig = parseYaml(configText) || {};

    // 合并更新
    const newConfig: Record<string, unknown> = { ...currentConfig };

    // 应用保留键
    if (options?.preserveKeys) {
      for (const key of options.preserveKeys) {
        if (key in currentConfig) {
          newConfig[key] = currentConfig[key];
        }
      }
    }

    // 应用更新
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        delete newConfig[key];
      } else {
        newConfig[key] = value;
      }
    });

    // 序列化为 YAML
    const yamlContent = stringifyYaml(newConfig).trim();

    // 构建新代码块
    const newBlock = ['```pm-view', yamlContent, '```'];

    // 替换原代码块
    const newLines = [
      ...lines.slice(0, blockStart),
      ...newBlock,
      ...lines.slice(blockEnd + 1)
    ];

    return newLines.join('\n');
  }

  /**
   * 解析简单配置（用于旧版兼容）
   */
  parseSimpleConfig(lines: string[]): Record<string, string> {
    const config: Record<string, string> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();

      config[key] = value;
    }

    return config;
  }

  /**
   * 将配置转换为 YAML 行（保持特定顺序）
   */
  configToOrderedYaml(
    config: Record<string, unknown>,
    order: string[] = []
  ): string[] {
    const result: string[] = [];
    const processed = new Set<string>();

    // 按指定顺序输出
    for (const key of order) {
      if (key in config && config[key] !== undefined && config[key] !== '') {
        result.push(`${key}: ${config[key]}`);
        processed.add(key);
      }
    }

    // 输出剩余键
    Object.entries(config).forEach(([key, value]) => {
      if (!processed.has(key) && value !== undefined && value !== '') {
        result.push(`${key}: ${value}`);
      }
    });

    return result;
  }
}
