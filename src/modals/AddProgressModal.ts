import { Modal, App, Setting, Notice } from 'obsidian';
import type { ProgressLogItem } from '../types';

export class AddProgressModal extends Modal {
  private log: Partial<ProgressLogItem> = {
    time: new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  constructor(
    app: App,
    private onSubmit: (log: ProgressLogItem) => void
  ) {
    super(app);
    this.titleEl.setText('添加进展反馈');
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    new Setting(contentEl)
      .setName('反馈内容')
      .addTextArea(text => text
        .setPlaceholder('输入当前进展、阻塞或下一步计划...')
        .onChange(value => this.log.content = value));

    new Setting(contentEl)
      .setName('记录人')
      .addText(text => text
        .setPlaceholder('可选')
        .onChange(value => this.log.author = value || undefined));

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
      if (!this.log.content || !this.log.content.trim()) {
        new Notice('请填写反馈内容');
        return;
      }
      this.onSubmit({
        time: this.log.time || new Date().toLocaleString('zh-CN'),
        content: this.log.content.trim(),
        author: this.log.author,
      });
      this.close();
    };
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
