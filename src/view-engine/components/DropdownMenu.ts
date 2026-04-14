/**
 * 下拉菜单位置选项
 */
export interface DropdownPosition {
  /** 水平对齐方式 */
  horizontalAlign?: 'left' | 'right';
  /** 垂直偏移量 */
  verticalOffset?: number;
  /** 是否进行边界检查 */
  boundaryCheck?: boolean;
}

/**
 * 下拉菜单配置选项
 */
export interface DropdownOptions {
  /** 菜单类名 */
  className?: string;
  /** 最小宽度 */
  minWidth?: number;
  /** 最大高度 */
  maxHeight?: number;
  /** 位置选项 */
  position?: DropdownPosition;
  /** 点击外部时关闭 */
  closeOnOutsideClick?: boolean;
  /** 按 Escape 键关闭 */
  closeOnEscape?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
}

/**
 * 下拉菜单组件
 * 统一处理下拉菜单的定位、边界检查、点击外部关闭等逻辑
 */
export class DropdownMenu {
  private element: HTMLElement | null = null;
  private outsideClickHandler: ((e: MouseEvent) => void) | null = null;
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;

  /**
   * 显示下拉菜单
   * @param triggerEl - 触发按钮元素
   * @param content - 菜单内容（HTML 元素或字符串）
   * @param options - 配置选项
   * @returns 菜单元素
   */
  show(
    triggerEl: HTMLElement,
    content: HTMLElement | string,
    options: DropdownOptions = {}
  ): HTMLElement {
    // 如果已有菜单，先关闭
    this.close();

    const {
      className = 'pm-dropdown-menu',
      minWidth = 180,
      maxHeight,
      position = {},
      closeOnOutsideClick = true,
      closeOnEscape = true,
      onClose,
    } = options;

    const {
      horizontalAlign = 'left',
      verticalOffset = 4,
      boundaryCheck = true,
    } = position;

    // 创建菜单元素
    this.element = document.createElement('div');
    this.element.className = className;
    this.element.style.cssText = `
      position: absolute;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 8px;
      z-index: var(--pm-z-dropdown, 1000);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: ${minWidth}px;
      ${maxHeight ? `max-height: ${maxHeight}px; overflow-y: auto;` : ''}
    `;

    // 添加内容
    if (typeof content === 'string') {
      this.element.innerHTML = content;
    } else {
      this.element.appendChild(content);
    }

    // 定位菜单
    this.positionMenu(triggerEl, horizontalAlign, verticalOffset, boundaryCheck);

    // 添加到文档（优先挂载到当前全屏容器内，保证全屏模式下可见）
    const { getOverlayContainer } = require('../../utils');
    getOverlayContainer().appendChild(this.element);

    // 设置关闭处理器
    if (closeOnOutsideClick) {
      this.setupOutsideClickHandler(triggerEl, onClose);
    }

    if (closeOnEscape) {
      this.setupEscapeHandler(onClose);
    }

    return this.element;
  }

  /**
   * 关闭下拉菜单
   */
  close(): void {
    if (this.element) {
      // 移除事件监听
      if (this.outsideClickHandler) {
        document.removeEventListener('click', this.outsideClickHandler);
        this.outsideClickHandler = null;
      }

      if (this.escapeHandler) {
        document.removeEventListener('keydown', this.escapeHandler);
        this.escapeHandler = null;
      }

      // 移除元素
      this.element.remove();
      this.element = null;
    }
  }

  /**
   * 检查菜单是否显示
   */
  isOpen(): boolean {
    return this.element !== null && this.element.isConnected;
  }

  /**
   * 定位菜单
   */
  private positionMenu(
    triggerEl: HTMLElement,
    horizontalAlign: 'left' | 'right',
    verticalOffset: number,
    boundaryCheck: boolean
  ): void {
    if (!this.element) return;

    const rect = triggerEl.getBoundingClientRect();

    // 计算初始位置
    let left = horizontalAlign === 'left' ? rect.left : rect.right - this.element.offsetWidth;
    let top = rect.bottom + verticalOffset;

    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;

    // 边界检查
    if (boundaryCheck) {
      setTimeout(() => {
        if (!this.element) return;

        const menuRect = this.element.getBoundingClientRect();

        // 右边界检查
        if (menuRect.right > window.innerWidth) {
          this.element.style.left = `${window.innerWidth - menuRect.width - 10}px`;
        }

        // 左边界检查
        if (menuRect.left < 0) {
          this.element.style.left = '10px';
        }

        // 下边界检查
        if (menuRect.bottom > window.innerHeight) {
          // 如果下方空间不足，显示在触发按钮上方
          this.element.style.top = `${rect.top - menuRect.height - verticalOffset}px`;
        }
      }, 0);
    }
  }

  /**
   * 设置点击外部关闭处理器
   */
  private setupOutsideClickHandler(
    triggerEl: HTMLElement,
    onClose?: () => void
  ): void {
    this.outsideClickHandler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (this.element && !this.element.contains(target) && target !== triggerEl) {
        this.close();
        onClose?.();
      }
    };

    // 延迟添加监听器，避免立即触发
    setTimeout(() => {
      if (this.outsideClickHandler) {
        document.addEventListener('click', this.outsideClickHandler);
      }
    }, 0);
  }

  /**
   * 设置 Escape 键关闭处理器
   */
  private setupEscapeHandler(onClose?: () => void): void {
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        onClose?.();
      }
    };

    document.addEventListener('keydown', this.escapeHandler);
  }
}

/**
 * 下拉菜单管理器
 * 管理所有下拉菜单实例，确保同时只显示一个
 */
export class DropdownMenuManager {
  private static currentMenu: DropdownMenu | null = null;

  /**
   * 显示下拉菜单（自动关闭之前的）
   */
  static show(
    triggerEl: HTMLElement,
    content: HTMLElement | string,
    options: DropdownOptions = {}
  ): DropdownMenu {
    // 关闭之前的菜单
    this.closeCurrent();

    // 创建新菜单
    const menu = new DropdownMenu();
    menu.show(triggerEl, content, {
      ...options,
      onClose: () => {
        this.currentMenu = null;
        options.onClose?.();
      },
    });

    this.currentMenu = menu;
    return menu;
  }

  /**
   * 关闭当前菜单
   */
  static closeCurrent(): void {
    if (this.currentMenu) {
      this.currentMenu.close();
      this.currentMenu = null;
    }
  }

  /**
   * 检查是否有菜单显示
   */
  static hasOpenMenu(): boolean {
    return this.currentMenu !== null && this.currentMenu.isOpen();
  }
}
