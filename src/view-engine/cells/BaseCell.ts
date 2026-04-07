import type { App } from 'obsidian';
import type { EntityManager } from '../../core';

/**
 * 单元格编辑基类
 * 所有内联编辑单元格的基础
 */
export abstract class BaseCell<T = any> {
  protected containerEl: HTMLElement | null = null;
  protected isEditing: boolean = false;
  protected originalValue: T;

  constructor(
    protected app: App,
    protected entityManager: EntityManager,
    protected entityId: string,
    protected entityType: string,
    protected field: string,
    protected value: T,
    protected onChange?: (value: T) => void,
    protected onBlur?: () => void
  ) {
    this.originalValue = value;
  }

  /**
   * 渲染单元格（只读状态）
   */
  abstract renderDisplay(container: HTMLElement): void;

  /**
   * 渲染编辑状态
   */
  abstract renderEdit(container: HTMLElement): void;

  /**
   * 创建单元格容器
   */
  render(container: HTMLElement): void {
    this.containerEl = container;
    this.containerEl.addClass('pm-cell');
    this.containerEl.dataset.field = this.field;

    if (this.isEditing) {
      this.renderEdit(this.containerEl);
    } else {
      this.renderDisplay(this.containerEl);
    }
  }

  /**
   * 切换到编辑模式
   */
  startEdit(): void {
    if (this.isEditing) return;
    this.isEditing = true;

    if (this.containerEl) {
      this.containerEl.empty();
      this.renderEdit(this.containerEl);
    }
  }

  /**
   * 退出编辑模式
   */
  endEdit(save: boolean = true): void {
    if (!this.isEditing) return;
    this.isEditing = false;

    if (save) {
      this.saveValue();
    } else {
      this.value = this.originalValue;
    }

    if (this.containerEl) {
      this.containerEl.empty();
      this.renderDisplay(this.containerEl);
    }

    this.onBlur?.();
  }

  /**
   * 保存值（子类可覆盖）
   */
  protected saveValue(): void {
    if (this.value !== this.originalValue) {
      this.onChange?.(this.value);
      this.originalValue = this.value;
    }
  }

  /**
   * 更新值
   */
  setValue(value: T): void {
    this.value = value;
    if (!this.isEditing && this.containerEl) {
      this.containerEl.empty();
      this.renderDisplay(this.containerEl);
    }
  }

  /**
   * 获取当前值
   */
  getValue(): T {
    return this.value;
  }

  /**
   * 创建可点击的显示元素
   */
  protected createClickableDisplay(container: HTMLElement, content: string | HTMLElement): HTMLElement {
    const el = container.createEl('div', { cls: 'pm-cell-display' });

    if (typeof content === 'string') {
      el.textContent = content || '-';
    } else {
      el.appendChild(content);
    }

    // 点击切换到编辑模式
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startEdit();
    });

    return el;
  }

  /**
   * 创建输入框包装器
   */
  protected createInputWrapper(container: HTMLElement): HTMLElement {
    const wrapper = container.createDiv('pm-cell-edit-wrapper');
    return wrapper;
  }

  /**
   * 销毁单元格
   */
  destroy(): void {
    if (this.containerEl) {
      this.containerEl.empty();
    }
    this.containerEl = null;
  }
}

/**
 * 单元格工厂
 * 根据字段类型创建对应的单元格
 */
export interface CellFactory {
  createCell(
    app: App,
    entityManager: EntityManager,
    entityId: string,
    entityType: string,
    field: string,
    fieldType: string,
    value: any,
    options?: string[],
    onChange?: (value: any) => void
  ): BaseCell;
}
