import { FEATURE_STATUS_OPTIONS, getStatusColor } from '../design-tokens';
import { getOverlayContainer } from '../../utils/getOverlayContainer';

/**
 * 状态选择器组件
 * 可复用的状态选择下拉菜单
 */
export class StatusPicker {
  private menu?: HTMLElement;

  /**
   * 显示状态选择器
   * @param triggerEl - 触发元素（用于定位）
   * @param currentStatus - 当前状态
   * @param onSelect - 选择回调
   * @param options - 可选：自定义状态选项（默认使用 FEATURE_STATUS_OPTIONS）
   */
  show(
    triggerEl: HTMLElement,
    currentStatus: string | undefined,
    onSelect: (status: string) => void,
    options?: { statusOptions?: typeof FEATURE_STATUS_OPTIONS }
  ): void {
    // 移除已存在的菜单
    this.hide();

    const statuses = options?.statusOptions || FEATURE_STATUS_OPTIONS;

    const zIndex = 'var(--pm-z-dropdown, 1000)';

    // 创建菜单
    this.menu = document.createElement('div');
    this.menu.className = 'pm-status-picker';
    this.menu.style.cssText = `
      position: fixed;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 4px;
      z-index: ${zIndex};
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 140px;
    `;

    // 渲染状态选项
    statuses.forEach(status => {
      const item = this.menu!.createEl('div', { cls: 'pm-status-picker-item' });
      item.style.cssText = `
        padding: 6px 12px;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      `;

      // 高亮当前选中状态
      if (status.id === currentStatus) {
        item.style.background = 'var(--background-modifier-hover)';
        item.style.fontWeight = '500';
      }

      // 颜色圆点
      const colorDot = item.createSpan();
      colorDot.style.cssText = `
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${status.color};
        flex-shrink: 0;
      `;

      // 标签
      item.createSpan({ text: status.label });

      // 点击事件
      item.onclick = (e) => {
        e.stopPropagation();
        onSelect(status.id);
        this.hide();
      };

      // 悬停效果
      item.onmouseenter = () => {
        if (status.id !== currentStatus) {
          item.style.background = 'var(--background-modifier-hover)';
        }
      };
      item.onmouseleave = () => {
        if (status.id !== currentStatus) {
          item.style.background = '';
        }
      };
    });

    getOverlayContainer().appendChild(this.menu);

    // 定位菜单
    this.positionMenu(triggerEl);

    // 点击外部关闭
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
    }, 0);
  }

  /**
   * 隐藏选择器
   */
  hide(): void {
    if (this.menu) {
      this.menu.remove();
      this.menu = undefined;
      document.removeEventListener('click', this.handleOutsideClick);
    }
  }

  /**
   * 定位菜单
   */
  private positionMenu(triggerEl: HTMLElement): void {
    if (!this.menu) return;

    const rect = triggerEl.getBoundingClientRect();
    const menuRect = this.menu.getBoundingClientRect();

    // 默认在触发元素下方
    let top = rect.bottom + 4;
    let left = rect.left;

    // 检查是否超出视口右侧
    if (left + menuRect.width > window.innerWidth) {
      left = rect.right - menuRect.width;
    }

    // 检查是否超出视口底部
    if (top + menuRect.height > window.innerHeight) {
      top = rect.top - menuRect.height - 4;
    }

    this.menu.style.top = `${top}px`;
    this.menu.style.left = `${left}px`;
  }

  /**
   * 处理点击外部事件
   */
  private handleOutsideClick = (e: MouseEvent): void => {
    if (this.menu && !this.menu.contains(e.target as Node)) {
      this.hide();
    }
  };
}

/**
 * 便捷函数：显示状态选择器
 */
export function showStatusPicker(
  triggerEl: HTMLElement,
  currentStatus: string | undefined,
  onSelect: (status: string) => void,
  options?: { statusOptions?: typeof FEATURE_STATUS_OPTIONS }
): void {
  const picker = new StatusPicker();
  picker.show(triggerEl, currentStatus, onSelect, options);
}
