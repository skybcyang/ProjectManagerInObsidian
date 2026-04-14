import { App, Modal, Setting, Notice } from 'obsidian';
import type { EmailSummaryService } from '../services';

export class ExportEmailModal extends Modal {
  constructor(
    app: App,
    private emailSummaryService: EmailSummaryService
  ) {
    super(app);
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('pm-modal');

    contentEl.createEl('h2', { text: '导出项目总结邮件' });

    contentEl.createEl('p', {
      text: '选择导出方式：',
      cls: 'pm-modal__info',
    });

    // 按钮容器
    const buttonContainer = contentEl.createDiv({ cls: 'pm-modal__buttons' });

    const cancelButton = buttonContainer.createEl('button', { text: '取消' });
    cancelButton.addEventListener('click', () => this.close());

    const renderedButton = buttonContainer.createEl('button', {
      text: '导出当前页面渲染邮件',
      cls: 'mod-cta',
    });
    renderedButton.addEventListener('click', () => this.handleExportRendered());

    const summaryButton = buttonContainer.createEl('button', {
      text: '导出结构化总结邮件',
    });
    summaryButton.addEventListener('click', () => this.handleExportSummary());
  }

  private async handleExportRendered(): Promise<void> {
    const result = await this.emailSummaryService.buildEmailFromRenderedPage();
    if (result) {
      const { downloadEML } = await import('../utils/emlGenerator');
      downloadEML(result.emlContent, result.filename);
      new Notice('页面渲染邮件导出成功', 3000);
      this.close();
    }
  }

  private async handleExportSummary(): Promise<void> {
    const result = await this.emailSummaryService.buildEmailForActiveFile();
    if (result) {
      const { downloadEML } = await import('../utils/emlGenerator');
      downloadEML(result.emlContent, result.filename);
      new Notice('结构化总结邮件导出成功', 3000);
      this.close();
    }
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
