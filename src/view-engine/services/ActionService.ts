import type { App, TFile } from 'obsidian';
import type { EntityManager } from '../../core';
import type { EntityType } from '../types';
import type { EntityBase, Version, Project, Feature } from '../../types';

/**
 * 实体策略接口
 */
interface EntityStrategy<T = EntityBase> {
  get: (id: string) => Promise<T | null>;
  update: (id: string, data: Partial<T>) => Promise<T | null>;
}

/**
 * 实体策略注册表
 */
class EntityStrategyRegistry {
  private strategies: Map<EntityType, EntityStrategy>;

  constructor(private entityManager: EntityManager) {
    this.strategies = new Map([
      ['version', {
        get: (id: string) => this.entityManager.getVersion(id),
        update: (id: string, data: Partial<Version>) => this.entityManager.updateVersion(id, data),
      }],
      ['project', {
        get: (id: string) => this.entityManager.getProject(id),
        update: (id: string, data: Partial<Project>) => this.entityManager.updateProject(id, data),
      }],
      ['feature', {
        get: (id: string) => this.entityManager.getFeature(id),
        update: (id: string, data: Partial<Feature>) => this.entityManager.updateFeature(id, data),
      }],
    ]);
  }

  get(type: EntityType): EntityStrategy | undefined {
    return this.strategies.get(type);
  }

  has(type: EntityType): boolean {
    return this.strategies.has(type);
  }
}

/**
 * 事件总线 - 简单的发布订阅实现
 */
export class EventBus {
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  on(event: string, listener: (...args: any[]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // 返回取消订阅函数
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(listener => listener(...args));
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(listener);
  }
}

/**
 * 操作服务
 * 统一处理所有交互操作（状态变更、进度更新等）
 */
export class ActionService {
  private strategyRegistry: EntityStrategyRegistry;
  private eventBus: EventBus;
  // 打开实体前的回调（用于退出全屏等）
  private beforeOpenEntityCallback?: () => void;

  constructor(
    private app: App,
    private entityManager: EntityManager
  ) {
    this.strategyRegistry = new EntityStrategyRegistry(entityManager);
    this.eventBus = new EventBus();
  }

  /**
   * 获取事件总线实例
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * 订阅刷新事件
   */
  onRefresh(callback: () => void): () => void {
    return this.eventBus.on('refresh', callback);
  }

  /**
   * 设置打开实体前的回调
   */
  setBeforeOpenEntityCallback(callback: () => void): void {
    this.beforeOpenEntityCallback = callback;
  }

  /**
   * 触发刷新
   */
  private triggerRefresh(): void {
    this.eventBus.emit('refresh');
  }

  /**
   * 获取实体策略
   */
  private getStrategy(type: EntityType): EntityStrategy | null {
    return this.strategyRegistry.get(type) || null;
  }

  /**
   * 变更实体状态
   */
  async changeStatus(
    type: EntityType,
    id: string,
    newStatus: string,
    confirmNeeded: boolean = true
  ): Promise<boolean> {
    try {
      const strategy = this.getStrategy(type);
      if (!strategy) return false;

      // 获取当前实体
      const entity = await strategy.get(id);
      if (!entity) return false;

      const currentStatus = entity.status;

      // 从 completed 返回时需要确认
      if (confirmNeeded && currentStatus === 'completed') {
        const confirmed = await this.showConfirmDialog(
          '确认状态变更',
          `确定要将状态从 "已完成" 变更为 "${newStatus}" 吗？`
        );
        if (!confirmed) return false;
      }

      // 更新状态
      await strategy.update(id, { status: newStatus } as any);

      // 触发刷新
      this.triggerRefresh();

      return true;
    } catch (error) {
      console.error('状态变更失败:', error);
      return false;
    }
  }

  /**
   * 更新进度
   */
  async updateProgress(
    type: EntityType,
    id: string,
    progress: number
  ): Promise<boolean> {
    try {
      if (type !== 'feature') return false;

      // 更新进度字段
      await this.entityManager.updateFeature(id, { progress });

      // 添加进展记录到文件
      await this.addProgressLog(id, progress);

      // 触发刷新
      this.triggerRefresh();

      return true;
    } catch (error) {
      console.error('进度更新失败:', error);
      return false;
    }
  }

  /**
   * 添加进展记录到特性文件
   */
  private async addProgressLog(featureId: string, progress: number): Promise<void> {
    const path = await this.entityManager.getFeaturePath(featureId);
    if (!path) return;

    const obsidian = require('obsidian');
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof obsidian.TFile)) return;

    const content = await this.app.vault.read(file as TFile);
    const now = new Date();
    const timeStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const progressEntry = `- [${timeStr}] 进度更新至 ${progress}%\n`;

    // 在进展反馈历史记录部分添加
    const progressSection = '## 📈 进展反馈历史记录\n\n';
    if (content.includes(progressSection)) {
      const newContent = content.replace(
        progressSection,
        progressSection + progressEntry
      );
      await this.app.vault.modify(file as TFile, newContent);
    }
  }

  /**
   * 添加进展反馈笔记到文件
   */
  async addProgressNote(
    type: EntityType,
    id: string,
    note: string
  ): Promise<boolean> {
    try {
      if (type !== 'feature') return false;

      const path = await this.entityManager.getFeaturePath(id);
      if (!path) return false;

      const obsidian = require('obsidian');
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof obsidian.TFile)) return false;

      const content = await this.app.vault.read(file as TFile);
      const now = new Date();
      const timeStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const noteEntry = `- [${timeStr}] ${note}\n`;

      // 查找历史记录部分并添加
      const historySection = '### 历史记录\n';
      const historyIndex = content.indexOf(historySection);

      if (historyIndex !== -1) {
        // 在历史记录部分后插入
        const insertIndex = historyIndex + historySection.length;
        const newContent = content.slice(0, insertIndex) + noteEntry + content.slice(insertIndex);
        await this.app.vault.modify(file as TFile, newContent);
      } else {
        // 查找旧的进展反馈格式
        const oldSection = '## 📝 进展反馈\n\n### 历史记录\n';
        const oldIndex = content.indexOf(oldSection);
        if (oldIndex !== -1) {
          const insertIndex = oldIndex + oldSection.length;
          const newContent = content.slice(0, insertIndex) + noteEntry + content.slice(insertIndex);
          await this.app.vault.modify(file as TFile, newContent);
        }
      }

      this.triggerRefresh();
      return true;
    } catch (error) {
      console.error('添加进展反馈失败:', error);
      return false;
    }
  }

  /**
   * 更新负责人
   */
  async updateOwner(
    type: EntityType,
    id: string,
    owner: string
  ): Promise<boolean> {
    try {
      const strategy = this.getStrategy(type);
      if (!strategy) return false;

      await strategy.update(id, { owner } as any);
      this.triggerRefresh();
      return true;
    } catch (error) {
      console.error('负责人更新失败:', error);
      return false;
    }
  }

  /**
   * 更新优先级
   */
  async updatePriority(
    type: EntityType,
    id: string,
    priority: string
  ): Promise<boolean> {
    try {
      const strategy = this.getStrategy(type);
      if (!strategy) return false;

      await strategy.update(id, { priority } as any);
      this.triggerRefresh();
      return true;
    } catch (error) {
      console.error('优先级更新失败:', error);
      return false;
    }
  }

  /**
   * 打开实体文件
   */
  async openEntity(type: EntityType, id: string): Promise<void> {
    // 调用打开前的回调（用于退出全屏等）
    if (this.beforeOpenEntityCallback) {
      this.beforeOpenEntityCallback();
    }

    const path = await this.entityManager.getEntityPath(type, id);
    if (!path) {
      console.error(`[ActionService] 无法获取实体路径: ${type} ${id}`);
      return;
    }

    const obsidian = require('obsidian');
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!file) {
      console.error(`[ActionService] 文件不存在: ${path}`);
      return;
    }

    if (file instanceof obsidian.TFile) {
      try {
        // 尝试获取或创建标签页并打开文件
        const leaf = this.app.workspace.getLeaf('tab');
        await leaf.openFile(file as TFile);
      } catch (error) {
        console.error(`[ActionService] 打开文件失败: ${path}`, error);
      }
    } else {
      console.error(`[ActionService] 路径不是文件: ${path}`);
    }
  }

  /**
   * 更新指定字段
   */
  async updateField(
    type: EntityType,
    id: string,
    field: string,
    value: any
  ): Promise<boolean> {
    try {
      const strategy = this.getStrategy(type);
      if (!strategy) return false;

      const data = { [field]: value };
      await strategy.update(id, data);
      this.triggerRefresh();
      return true;
    } catch (error) {
      console.error(`更新字段 ${field} 失败:`, error);
      return false;
    }
  }

  /**
   * 显示确认对话框
   */
  private async showConfirmDialog(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const { Modal, ButtonComponent } = require('obsidian');

      class ConfirmModal extends Modal {
        onOpen() {
          const { contentEl } = this;
          contentEl.createEl('h2', { text: title });
          contentEl.createEl('p', { text: message });

          const buttonContainer = contentEl.createDiv();
          buttonContainer.style.display = 'flex';
          buttonContainer.style.justifyContent = 'flex-end';
          buttonContainer.style.gap = '10px';
          buttonContainer.style.marginTop = '20px';

          new ButtonComponent(buttonContainer)
            .setButtonText('取消')
            .onClick(() => {
              resolve(false);
              this.close();
            });

          new ButtonComponent(buttonContainer)
            .setButtonText('确认')
            .setCta()
            .onClick(() => {
              resolve(true);
              this.close();
            });
        }

        onClose() {
          const { contentEl } = this;
          contentEl.empty();
        }
      }

      new (ConfirmModal as any)(this.app).open();
    });
  }
}
