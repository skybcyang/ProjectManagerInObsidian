import { App, Modal, Setting } from 'obsidian';
import { VERSION_STATUSES, getStatusLabel } from '../constants';
import type { CreateVersionData } from '../types';

export class CreateVersionModal extends Modal {
  private result: CreateVersionData = {
    name: '',
    status: 'planning',
    tags: [],
  };
  private onSubmit: (data: CreateVersionData) => void;

  constructor(app: App, onSubmit: (data: CreateVersionData) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('pm-modal');

    contentEl.createEl('h2', { text: '创建版本' });

    // 版本名称
    new Setting(contentEl)
      .setName('版本名称')
      .setDesc('输入版本的名称（必填）')
      .addText(text => text
        .setPlaceholder('例如：v1.0 第一季度')
        .setValue(this.result.name)
        .onChange(value => {
          this.result.name = value;
        }));

    // 状态
    new Setting(contentEl)
      .setName('状态')
      .addDropdown(dropdown => {
        VERSION_STATUSES.forEach((status: {value: string, label: string}) => {
          dropdown.addOption(status.value, status.label);
        });
        dropdown.setValue(this.result.status!);
        dropdown.onChange(value => {
          this.result.status = value as CreateVersionData['status'];
        });
      });

    // 开始日期
    new Setting(contentEl)
      .setName('开始日期')
      .setDesc('（可选）')
      .addText(text => text
        .setPlaceholder('YYYY-MM-DD')
        .onChange(value => {
          this.result.startDate = value || undefined;
        }));

    // 结束日期
    new Setting(contentEl)
      .setName('结束日期')
      .setDesc('（可选）')
      .addText(text => text
        .setPlaceholder('YYYY-MM-DD')
        .onChange(value => {
          this.result.endDate = value || undefined;
        }));

    // 负责人
    new Setting(contentEl)
      .setName('负责人')
      .setDesc('（可选）')
      .addText(text => text
        .setPlaceholder('例如：张三')
        .onChange(value => {
          this.result.owner = value || undefined;
        }));

    // 标签
    new Setting(contentEl)
      .setName('标签')
      .setDesc('用逗号分隔多个标签（可选）')
      .addText(text => text
        .setPlaceholder('例如：Q1, 重要')
        .onChange(value => {
          this.result.tags = value
            ? value.split(',').map(t => t.trim()).filter(t => t.length > 0)
            : [];
        }));

    // 按钮
    const buttonContainer = contentEl.createDiv({ cls: 'pm-modal__buttons' });
    
    const cancelButton = buttonContainer.createEl('button', { text: '取消' });
    cancelButton.addEventListener('click', () => this.close());

    const submitButton = buttonContainer.createEl('button', { 
      text: '创建',
      cls: 'mod-cta',
    });
    submitButton.addEventListener('click', () => {
      if (!this.result.name.trim()) {
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
