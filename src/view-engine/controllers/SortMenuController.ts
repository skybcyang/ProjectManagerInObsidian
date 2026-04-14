import type { ViewConfig } from '../types';
import { DropdownMenuManager } from '../components/DropdownMenu';

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

    // SelectCell 风格样式
    const color = '#8b5cf6';
    badge.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      background-color: ${this.hexToRgba(color, 0.15)};
      color: ${color};
      border: 1px solid ${this.hexToRgba(color, 0.3)};
      transition: all 0.2s ease;
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

    // 使用 DropdownMenuManager 显示菜单
    DropdownMenuManager.show(triggerBtn, content, {
      className: 'pm-sort-menu pm-dropdown-menu',
      minWidth: 180,
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
    title.style.cssText = 'font-weight: 600; margin-bottom: 8px; font-size: 13px;';

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
    item.className = 'pm-sort-field-item';
    item.style.cssText = `
      padding: 6px 12px;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;
    item.textContent = field.label;

    if (currentSortBy === field.value) {
      item.classList.add('pm-sort-active');
      item.style.background = 'var(--background-modifier-hover)';
      const orderIcon = document.createElement('span');
      orderIcon.textContent = currentSortOrder === 'asc' ? ' ▲' : ' ▼';
      item.appendChild(orderIcon);
    }

    item.addEventListener('click', () => {
      const newOrder = currentSortBy === field.value && currentSortOrder === 'asc' ? 'desc' : 'asc';
      onClick(newOrder);
    });

    item.addEventListener('mouseenter', () => {
      if (currentSortBy !== field.value) {
        item.style.background = 'var(--background-modifier-hover)';
      }
    });

    item.addEventListener('mouseleave', () => {
      if (currentSortBy !== field.value) {
        item.style.background = '';
      }
    });

    return item;
  }

  /**
   * Hex 转 RGBA
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
