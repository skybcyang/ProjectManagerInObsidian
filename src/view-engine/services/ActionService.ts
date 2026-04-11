import type { App, TFile } from 'obsidian';
import type { EntityManager } from '../../core';
import type { EntityType } from '../types';

/**
 * 操作服务
 * 统一处理所有交互操作（状态变更、进度更新等）
 */
export class ActionService {
  // 刷新回调函数
  private refreshCallback?: () => void;

  constructor(
    private app: App,
    private entityManager: EntityManager
  ) {}

  /**
   * 设置刷新回调
   */
  setRefreshCallback(callback: () => void): void {
    this.refreshCallback = callback;
  }

  /**
   * 触发刷新
   */
  private triggerRefresh(): void {
    if (this.refreshCallback) {
      this.refreshCallback();
    }
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
      // 获取当前实体
      const entity = await this.getEntity(type, id);
      if (!entity) return false;

      const currentStatus = (entity as any).status;

      // 从 completed 返回时需要确认
      if (confirmNeeded && currentStatus === 'completed') {
        const confirmed = await this.showConfirmDialog(
          '确认状态变更',
          `确定要将状态从 "已完成" 变更为 "${newStatus}" 吗？`
        );
        if (!confirmed) return false;
      }

      // 更新状态
      await this.updateEntity(type, id, { status: newStatus });
      
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
      await this.updateEntity(type, id, { owner });
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
      await this.updateEntity(type, id, { priority });
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
   * 获取实体
   */
  private async getEntity(type: EntityType, id: string): Promise<any | null> {
    switch (type) {
      case 'version':
        return this.entityManager.getVersion(id);
      case 'project':
        return this.entityManager.getProject(id);
      case 'feature':
        return this.entityManager.getFeature(id);
      default:
        return null;
    }
  }

  /**
   * 更新实体
   */
  private async updateEntity(
    type: EntityType,
    id: string,
    data: any
  ): Promise<void> {
    switch (type) {
      case 'version':
        await this.entityManager.updateVersion(id, data);
        break;
      case 'project':
        await this.entityManager.updateProject(id, data);
        break;
      case 'feature':
        await this.entityManager.updateFeature(id, data);
        break;
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
      const data = { [field]: value };
      await this.updateEntity(type, id, data);
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
