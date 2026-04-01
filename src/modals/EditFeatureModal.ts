import { App, Modal, Setting } from 'obsidian';
import { FEATURE_STATUSES, PRIORITIES, getStatusLabel } from '../constants';
import type { FeatureService } from '../services/FeatureService';
import type { Feature, UpdateFeatureData } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { needsStatusConfirmation } from '../utils';

export class EditFeatureModal extends Modal {
  private feature: Feature;
  private result: UpdateFeatureData;
  private onSubmit: (data: UpdateFeatureData) => void;
  private onDelete?: () => void;
  private featureService: FeatureService;

  constructor(
    app: App,
    featureService: FeatureService,
    feature: Feature,
    onSubmit: (data: UpdateFeatureData) => void,
    onDelete?: () => void
  ) {
    super(app);
    this.featureService = featureService;
    this.feature = feature;
    this.onSubmit = onSubmit;
    this.onDelete = onDelete;
    this.result = {
      name: feature.name,
      status: feature.status,
      priority: feature.priority,
      progress: feature.progress,
      dueDate: feature.dueDate,
      owner: feature.owner,
      tags: [...feature.tags],
    };
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('pm-modal');

    contentEl.createEl('h2', { text: '编辑特性' });

    // 特性名称
    new Setting(contentEl)
      .setName('特性名称')
      .addText(text => text
        .setValue(this.result.name!)
        .onChange(value => {
          this.result.name = value;
        }));

    // 状态
    new Setting(contentEl)
      .setName('状态')
      .addDropdown(dropdown => {
        FEATURE_STATUSES.forEach(status => {
          dropdown.addOption(status.value, status.label);
        });
        dropdown.setValue(this.result.status!);
        dropdown.onChange(value => {
          const newStatus = value as UpdateFeatureData['status'];
          // 检查是否需要确认
          if (needsStatusConfirmation(this.result.status!, newStatus!)) {
            new ConfirmModal(
              this.app,
              '确认状态变更',
              `确定要将状态从 "${getStatusLabel(this.result.status!)}" 变更为 "${getStatusLabel(newStatus!)}" 吗？`,
              () => {
                this.result.status = newStatus;
              },
              () => {
                dropdown.setValue(this.result.status!);
              }
            ).open();
          } else {
            this.result.status = newStatus;
          }
        });
      });

    // 优先级
    new Setting(contentEl)
      .setName('优先级')
      .addDropdown(dropdown => {
        PRIORITIES.forEach(priority => {
          dropdown.addOption(priority.value, priority.label);
        });
        dropdown.setValue(this.result.priority!);
        dropdown.onChange(value => {
          this.result.priority = value as UpdateFeatureData['priority'];
        });
      });

    // 进度
    new Setting(contentEl)
      .setName('进度')
      .addSlider(slider => slider
        .setLimits(0, 100, 5)
        .setValue(this.result.progress!)
        .setDynamicTooltip()
        .onChange(value => {
          this.result.progress = value;
        }));

    // 截止日期
    new Setting(contentEl)
      .setName('截止日期')
      .addText(text => text
        .setPlaceholder('YYYY-MM-DD')
        .setValue(this.result.dueDate || '')
        .onChange(value => {
          this.result.dueDate = value || undefined;
        }));

    // 负责人
    new Setting(contentEl)
      .setName('负责人')
      .addText(text => text
        .setValue(this.result.owner || '')
        .onChange(value => {
          this.result.owner = value || undefined;
        }));

    // 标签
    new Setting(contentEl)
      .setName('标签')
      .setDesc('用逗号分隔')
      .addText(text => text
        .setValue(this.result.tags?.join(', ') || '')
        .onChange(value => {
          this.result.tags = value
            ? value.split(',').map(t => t.trim()).filter(t => t.length > 0)
            : [];
        }));

    // 按钮
    const buttonContainer = contentEl.createDiv({ cls: 'pm-modal__buttons' });
    
    // 删除按钮（如果有回调）
    if (this.onDelete) {
      const deleteButton = buttonContainer.createEl('button', { 
        text: '删除',
        cls: 'mod-warning',
      });
      deleteButton.style.marginRight = 'auto';
      deleteButton.addEventListener('click', () => {
        new ConfirmModal(
          this.app,
          '确认删除',
          `确定要删除特性 "${this.feature.name}" 吗？此操作不可撤销。`,
          () => {
            this.onDelete!();
            this.close();
          }
        ).open();
      });
    }

    const cancelButton = buttonContainer.createEl('button', { text: '取消' });
    cancelButton.addEventListener('click', () => this.close());

    const submitButton = buttonContainer.createEl('button', { 
      text: '保存',
      cls: 'mod-cta',
    });
    submitButton.addEventListener('click', () => {
      if (!this.result.name?.trim()) {
        return;
      }
      this.onSubmit(this.result);
      this.close();
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
