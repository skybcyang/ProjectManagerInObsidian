import { App, MarkdownRenderChild, TFile } from 'obsidian';

/**
 * 进展输入组件
 * 处理特性页面中的进展反馈输入
 */
export class ProgressInput {
  constructor(private app: App) {}

  /**
   * 处理容器中的所有进展输入框
   */
  processInputs(container: HTMLElement): void {
    const inputs = container.querySelectorAll('.pm-progress-input:not(.pm-progress-input--processed)');

    inputs.forEach((input) => {
      const featureId = input.getAttribute('data-feature-id');
      if (!featureId) return;

      // 标记为已处理
      input.addClass('pm-progress-input--processed');

      // 添加键盘事件监听
      input.addEventListener('keydown', async (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const value = (input as HTMLInputElement).value.trim();
          if (value) {
            await this.saveProgress(featureId, value, container);
            (input as HTMLInputElement).value = '';
          }
        }
      });
    });
  }

  /**
   * 保存进展
   */
  private async saveProgress(featureId: string, content: string, container: HTMLElement): Promise<void> {
    try {
      // 查找当前文件
      const activeFile = this.app.workspace.getActiveFile();
      if (!activeFile) {
        console.error('未找到活动文件');
        return;
      }

      // 读取文件内容
      const fileContent = await this.app.vault.read(activeFile);
      
      // 获取当前时间
      const now = new Date();
      const timestamp = now.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      // 创建新的进展记录
      const newEntry = `- [${timestamp}] ${content}`;

      // 查找历史记录部分并插入新记录
      const historySection = '### 历史记录';
      const addNewSection = '### 添加新进展';
      
      let updatedContent: string;
      
      if (fileContent.includes(historySection)) {
        // 在历史记录后插入新条目
        const historyIndex = fileContent.indexOf(historySection);
        const addNewIndex = fileContent.indexOf(addNewSection, historyIndex);
        
        if (addNewIndex > historyIndex) {
          // 在历史记录和添加新进展之间插入
          const insertPosition = fileContent.lastIndexOf('\n', addNewIndex);
          updatedContent = 
            fileContent.slice(0, insertPosition) + 
            '\n' + newEntry + 
            fileContent.slice(insertPosition);
        } else {
          // 在历史记录后插入
          const insertPosition = historyIndex + historySection.length;
          updatedContent = 
            fileContent.slice(0, insertPosition) + 
            '\n' + newEntry + 
            fileContent.slice(insertPosition);
        }
      } else {
        // 如果没有历史记录部分，在进展反馈部分添加
        const progressSection = '## 📝 进展反馈';
        if (fileContent.includes(progressSection)) {
          const insertPosition = fileContent.indexOf(progressSection) + progressSection.length;
          updatedContent = 
            fileContent.slice(0, insertPosition) + 
            '\n\n### 历史记录\n' + newEntry + 
            fileContent.slice(insertPosition);
        } else {
          console.error('未找到进展反馈部分');
          return;
        }
      }

      // 写入文件
      await this.app.vault.modify(activeFile, updatedContent);

      // 显示成功提示（通过创建临时提示元素）
      this.showSuccessNotification(container);

    } catch (error) {
      console.error('保存进展失败:', error);
      this.showErrorNotification(container, error as Error);
    }
  }

  /**
   * 显示成功通知
   */
  private showSuccessNotification(container: HTMLElement): void {
    const notification = container.createDiv({
      cls: 'pm-progress-notification pm-progress-notification--success',
      text: '✓ 进展已保存',
    });

    // 3秒后移除
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * 显示错误通知
   */
  private showErrorNotification(container: HTMLElement, error: Error): void {
    const notification = container.createDiv({
      cls: 'pm-progress-notification pm-progress-notification--error',
      text: '✗ 保存失败: ' + error.message,
    });

    // 5秒后移除
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

/**
 * 进展输入容器 - 用于保持输入框的事件监听
 */
export class ProgressInputContainer extends MarkdownRenderChild {
  constructor(
    containerEl: HTMLElement,
    private progressInput: ProgressInput
  ) {
    super(containerEl);
  }

  onload(): void {
    // 立即处理输入框
    this.progressInput.processInputs(this.containerEl);

    // 使用 MutationObserver 监视变化
    const observer = new MutationObserver(() => {
      this.progressInput.processInputs(this.containerEl);
    });

    observer.observe(this.containerEl, {
      childList: true,
      subtree: true,
    });

    // 保存 observer 以便卸载时清理
    (this as any)._observer = observer;
  }

  onunload(): void {
    const observer = (this as any)._observer;
    if (observer) {
      observer.disconnect();
    }
  }
}
