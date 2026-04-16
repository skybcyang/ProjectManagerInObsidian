import { Modal, App, Setting, Notice } from 'obsidian';
import type { RiskItem, RiskLevel } from '../types';

export class AddRiskModal extends Modal {
  private risk: Partial<RiskItem> = {
    level: 'medium',
    status: '未关闭',
    foundDate: new Date().toISOString().split('T')[0],
  };

  constructor(
    app: App,
    private onSubmit: (risk: Omit<RiskItem, 'sourceName' | 'sourceType'>) => void
  ) {
    super(app);
    this.titleEl.setText('添加风险');
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    new Setting(contentEl)
      .setName('风险类型')
      .addText(text => text
        .setPlaceholder('如：技术风险、资源风险')
        .onChange(value => this.risk.type = value));

    new Setting(contentEl)
      .setName('风险描述')
      .addTextArea(text => text
        .setPlaceholder('描述风险详情...')
        .onChange(value => this.risk.description = value));

    new Setting(contentEl)
      .setName('风险等级')
      .addDropdown(drop => drop
        .addOption('low', '低')
        .addOption('medium', '中')
        .addOption('high', '高')
        .setValue('medium')
        .onChange(value => this.risk.level = value as RiskLevel));

    new Setting(contentEl)
      .setName('责任人')
      .addText(text => text
        .setPlaceholder('@姓名')
        .onChange(value => this.risk.owner = value));

    new Setting(contentEl)
      .setName('发现时间')
      .addText(text => text
        .setValue(this.risk.foundDate || '')
        .onChange(value => this.risk.foundDate = value));

    new Setting(contentEl)
      .setName('闭环时间')
      .addText(text => text
        .setPlaceholder('YYYY-MM-DD')
        .onChange(value => this.risk.closeDate = value || undefined));

    new Setting(contentEl)
      .setName('状态')
      .addDropdown(drop => drop
        .addOption('未关闭', '未关闭')
        .addOption('跟踪中', '跟踪中')
        .addOption('已闭环', '已闭环')
        .setValue('未关闭')
        .onChange(value => this.risk.status = value));

    const btnContainer = contentEl.createDiv();
    btnContainer.style.display = 'flex';
    btnContainer.style.justifyContent = 'flex-end';
    btnContainer.style.gap = '10px';
    btnContainer.style.marginTop = '20px';

    const cancelBtn = btnContainer.createEl('button', { text: '取消' });
    cancelBtn.onclick = () => this.close();

    const submitBtn = btnContainer.createEl('button', { text: '保存' });
    submitBtn.classList.add('mod-cta');
    submitBtn.onclick = () => {
      if (!this.risk.type || !this.risk.description) {
        new Notice('请填写风险类型和描述');
        return;
      }
      this.onSubmit({
        type: this.risk.type,
        description: this.risk.description,
        level: this.risk.level || 'medium',
        owner: this.risk.owner || '',
        foundDate: this.risk.foundDate || '',
        closeDate: this.risk.closeDate,
        status: this.risk.status || '未关闭',
      });
      this.close();
    };
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
