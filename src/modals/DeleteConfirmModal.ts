import { App, Modal, Setting, ButtonComponent } from 'obsidian';
import type { EntityManager } from '../core';
import type { Version, Project } from '../types';

interface DeleteImpact {
  type: 'version' | 'project';
  name: string;
  relatedProjects?: number;
  relatedFeatures?: number;
}

export class DeleteConfirmModal extends Modal {
  private onConfirm: () => void;
  private onCancel: () => void;

  constructor(
    app: App,
    private impact: DeleteImpact,
    onConfirm: () => void,
    onCancel?: () => void
  ) {
    super(app);
    this.onConfirm = onConfirm;
    this.onCancel = onCancel || (() => {});
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('pm-modal');

    // 标题
    contentEl.createEl('h2', { 
      text: `删除${this.impact.type === 'version' ? '版本' : '项目'}`,
      cls: 'pm-modal__title pm-modal__title--danger'
    });

    // 警告信息
    const warningEl = contentEl.createDiv('pm-modal__warning');
    warningEl.createSpan({ text: '⚠️ ' });
    warningEl.createSpan({ 
      text: `确定要删除 "${this.impact.name}" 吗？`,
    });

    // 影响分析
    const impactEl = contentEl.createDiv('pm-modal__impact');
    impactEl.createEl('h3', { text: '删除影响：' });
    
    const listEl = impactEl.createEl('ul');
    
    if (this.impact.type === 'version' && this.impact.relatedProjects) {
      listEl.createEl('li', { 
        text: `将删除 ${this.impact.relatedProjects} 个关联项目` 
      });
    }
    
    if (this.impact.relatedFeatures) {
      listEl.createEl('li', { 
        text: `将删除 ${this.impact.relatedFeatures} 个关联特性` 
      });
    }

    // 按钮区域
    const buttonContainer = contentEl.createDiv('pm-modal__buttons');
    
    const cancelBtn = new ButtonComponent(buttonContainer)
      .setButtonText('取消')
      .onClick(() => {
        this.onCancel();
        this.close();
      });
    
    const confirmBtn = new ButtonComponent(buttonContainer)
      .setButtonText('确认删除')
      .setWarning()
      .onClick(() => {
        this.onConfirm();
        this.close();
      });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}

/**
 * 显示删除确认对话框
 */
export async function showDeleteConfirm(
  app: App,
  entityManager: EntityManager,
  type: 'version' | 'project',
  id: string,
  name: string
): Promise<boolean> {
  return new Promise((resolve) => {
    let impact: DeleteImpact = { type, name };

    // 获取关联数据
    const loadImpact = async () => {
      if (type === 'version') {
        const projects = await entityManager.getVersionProjects(id);
        let totalFeatures = 0;
        for (const project of projects) {
          const features = await entityManager.getProjectFeatures(project.id);
          totalFeatures += features.length;
        }
        impact.relatedProjects = projects.length;
        impact.relatedFeatures = totalFeatures;
      } else {
        const features = await entityManager.getProjectFeatures(id);
        impact.relatedFeatures = features.length;
      }

      // 如果没有关联数据，直接确认
      if (!impact.relatedProjects && !impact.relatedFeatures) {
        resolve(true);
        return;
      }

      // 显示确认对话框
      new DeleteConfirmModal(
        app,
        impact,
        () => resolve(true),
        () => resolve(false)
      ).open();
    };

    loadImpact();
  });
}
