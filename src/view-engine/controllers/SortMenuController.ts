import type { ViewConfig } from '../types';
import { DropdownMenuManager } from '../components/DropdownMenu';
import { hexToRgba } from '../../utils';

/**
 * 排序字段定义
 */
interface SortField {
  value: string;
  label: string;
}

/**
 * 排序菜单控制器
 * 负责渲染排序 badge 和下拉菜单
 */
export class SortMenuController {
  private sortFields: SortField[] = [
    { value: 'name', label: '名称' },
    { value: 'status', label: '状态' },
    { value: 'startDate', label: '开始日期' },
    { value: 'endDate', label: '结束日期' },
    { value: 'priority', label: '优先级' },
    { value: 'progress', label: '进度' },
    { value: 'created', label: '创建时间' },
  ];

  /**
   * 渲染排序 badge（SelectCell 风格）
   */
  renderBadge(
    container: HTMLElement,
    config: ViewConfig,
    onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  ): HTMLElement {
    const wrapper = container.createDiv('pm-sort-badge-wrapper');

    const badge = wrapper.createDiv('pm-cell-badge pm-sort-badge');
    this.updateBadgeText(badge, config.sortBy, config.sortOrder);

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      this.show(badge, config, (sortBy, sortOrder) => {
        this.updateBadgeText(badge, sortBy, sortOrder);
        onSortChange(sortBy, sortOrder);
      });
    });

    return wrapper;
  }

  /**
   * 更新 badge 显示文本
   */
  private updateBadgeText(
    badge: HTMLElement,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): void {
    badge.empty();

    const field = this.sortFields.find(f => f.value === sortBy);
    const label = field ? field.label : '排序';
    const arrow = sortOrder === 'desc' ? '↓' : '↑';

    badge.textContent = `${label} ${arrow}`;

    // 仅保留颜色样式，结构样式由 .pm-cell-badge 统一控制
    const color = '#8b5cf6';
    badge.style.cssText = `
      background-color: ${hexToRgba(color, 0.15)};
      color: ${color};
      border-color: ${hexToRgba(color, 0.3)};
    `;
  }

  /**
   * 显示排序菜单
   */
  show(
    triggerBtn: HTMLElement,
    config: ViewConfig,
    onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  ): void {
    const currentSortBy = config.sortBy || 'name';
    const currentSortOrder = config.sortOrder || 'asc';

    // 创建菜单内容
    const content = this.createMenuContent(currentSortBy, currentSortOrder, onSortChange);

    // 使用 DropdownMenuManager 显示菜单（统一 SelectCell 下拉风格）
    DropdownMenuManager.show(triggerBtn, content, {
      className: 'pm-cell-dropdown pm-sort-menu',
      minWidth: 180,
      padding: 4,
    });
  }

  /**
   * 创建菜单内容
   */
  private createMenuContent(
    currentSortBy: string,
    currentSortOrder: 'asc' | 'desc',
    onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  ): HTMLElement {
    const menu = document.createElement('div');

    const title = menu.createEl('div', { text: '排序字段', cls: 'pm-menu-section-title' });
    title.style.cssText = 'font-weight: 600; margin-bottom: 4px; padding: 4px 8px; font-size: 12px; color: var(--text-muted);';

    const fieldList = menu.createDiv('pm-sort-field-list');

    this.sortFields.forEach(field => {
      const item = this.createSortFieldItem(
        field,
        currentSortBy,
        currentSortOrder,
        (newOrder) => {
          onSortChange(field.value, newOrder);
          DropdownMenuManager.closeCurrent();
        }
      );
      fieldList.appendChild(item);
    });

    return menu;
  }

  /**
   * 创建排序字段项
   */
  private createSortFieldItem(
    field: SortField,
    currentSortBy: string,
    currentSortOrder: 'asc' | 'desc',
    onClick: (newOrder: 'asc' | 'desc') => void
  ): HTMLElement {
    const item = document.createElement('div');
    // 统一使用 SelectCell 下拉项风格
    item.className = 'pm-cell-dropdown-item';

    // 颜色圆点（与其他下拉选择器保持一致）
    const dot = item.createEl('span');
    dot.style.cssText = 'width: 8px; height: 8px; border-radius: 50%; background: #8b5cf6; flex-shrink: 0;';

    // 标签
    item.createSpan({ text: field.label });

    if (currentSortBy === field.value) {
      item.classList.add('pm-sort-active');
      const orderIcon = item.createSpan({
        text: currentSortOrder === 'asc' ? '▲' : '▼',
        cls: 'pm-cell-dropdown-check',
      });
    }

    item.addEventListener('click', () => {
      const newOrder = currentSortBy === field.value && currentSortOrder === 'asc' ? 'desc' : 'asc';
      onClick(newOrder);
    });

    return item;
  }

}
