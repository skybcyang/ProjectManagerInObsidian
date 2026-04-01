import { App, Modal } from 'obsidian';

export class ConfirmModal extends Modal {
  private onConfirm: () => void;
  private onCancel?: () => void;
  private message: string;
  private title: string;

  constructor(
    app: App,
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) {
    super(app);
    this.title = title;
    this.message = message;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('pm-modal');

    contentEl.createEl('h2', { text: this.title });
    
    const messageEl = contentEl.createEl('p', { text: this.message });
    messageEl.style.marginBottom = '20px';

    // 按钮
    const buttonContainer = contentEl.createDiv({ cls: 'pm-modal__buttons' });
    
    const cancelButton = buttonContainer.createEl('button', { text: '取消' });
    cancelButton.addEventListener('click', () => {
      if (this.onCancel) {
        this.onCancel();
      }
      this.close();
    });

    const confirmButton = buttonContainer.createEl('button', { 
      text: '确认',
      cls: 'mod-warning',
    });
    confirmButton.addEventListener('click', () => {
      this.onConfirm();
      this.close();
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
