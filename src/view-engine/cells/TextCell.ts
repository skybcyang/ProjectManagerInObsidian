import { BaseCell } from './BaseCell';

/**
 * 文本单元格
 * 支持单行/多行文本内联编辑
 */
export class TextCell extends BaseCell<string> {
  private isMultiline: boolean = false;

  constructor(
    app: any,
    entityManager: any,
    entityId: string,
    entityType: string,
    field: string,
    value: string,
    onChange?: (value: string) => void,
    options?: { multiline?: boolean }
  ) {
    super(app, entityManager, entityId, entityType, field, value || '', onChange);
    this.isMultiline = options?.multiline || false;
  }

  /**
   * 渲染显示状态
   */
  renderDisplay(container: HTMLElement): void {
    const displayText = this.value || '-';
    this.createClickableDisplay(container, displayText);
  }

  /**
   * 渲染编辑状态
   */
  renderEdit(container: HTMLElement): void {
    const wrapper = this.createInputWrapper(container);

    const input = wrapper.createEl(this.isMultiline ? 'textarea' : 'input');
    input.className = 'pm-cell-input';

    if (!this.isMultiline) {
      (input as HTMLInputElement).type = 'text';
    }

    input.value = this.value;

    // 自动聚焦
    setTimeout(() => input.focus(), 0);

    // 处理输入
    const handleSave = () => {
      this.value = input.value;
      this.endEdit(true);
    };

    const handleCancel = () => {
      this.endEdit(false);
    };

    if (this.isMultiline) {
      // 多行文本：Ctrl+Enter 保存，Escape 取消
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
        }
      });

      // 失去焦点保存
      input.addEventListener('blur', () => {
        setTimeout(() => {
          if (!wrapper.contains(document.activeElement)) {
            handleSave();
          }
        }, 100);
      });
    } else {
      // 单行文本：Enter 保存，Escape 取消
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
        }
      });

      // 失去焦点保存
      input.addEventListener('blur', () => {
        setTimeout(() => {
          if (!wrapper.contains(document.activeElement)) {
            handleSave();
          }
        }, 100);
      });
    }
  }
}
