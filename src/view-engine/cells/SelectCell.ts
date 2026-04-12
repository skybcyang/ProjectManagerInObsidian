import { BaseCell } from './BaseCell';

/**
 * 下拉选择单元格
 * 支持状态、优先级等单选字段
 */
export class SelectCell extends BaseCell<string> {
  private options: { value: string; label: string; color?: string }[];
  private optionMap: Map<string, { value: string; label: string; color?: string }>;

  constructor(
    app: any,
    entityManager: any,
    entityId: string,
    entityType: string,
    field: string,
    value: string,
    onChange?: (value: string) => void,
    rawOptions?: string[]
  ) {
    super(app, entityManager, entityId, entityType, field, value || '', onChange);

    // 转换选项格式
    this.options = (rawOptions || []).map(opt => {
      if (typeof opt === 'string') {
        return {
          value: opt,
          label: this.translateOption(opt),
          color: this.getOptionColor(opt)
        };
      }
      return opt;
    });

    this.optionMap = new Map(this.options.map(o => [o.value, o]));
  }

  /**
   * 渲染显示状态
   */
  renderDisplay(container: HTMLElement): void {
    const option = this.optionMap.get(this.value);
    const badge = container.createEl('div', {
      cls: `pm-cell-badge pm-cell-badge-${this.value}`
    });

    if (option?.color) {
      badge.style.backgroundColor = this.hexToRgba(option.color, 0.15);
      badge.style.color = option.color;
      badge.style.border = `1px solid ${this.hexToRgba(option.color, 0.3)}`;
    }

    badge.textContent = option?.label || this.value || '-';

    // 点击打开下拉选择
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showDropdown(container);
    });
  }

  /**
   * 渲染编辑状态（显示下拉菜单）
   */
  renderEdit(container: HTMLElement): void {
    this.showDropdown(container);
  }

  /**
   * 显示下拉选择菜单
   */
  private showDropdown(container: HTMLElement): void {
    // 移除已存在的菜单
    const existingMenu = container.querySelector('.pm-cell-dropdown');
    if (existingMenu) existingMenu.remove();

    const zIndex = 'var(--pm-z-dropdown, 1000)';

    const menu = container.createDiv('pm-cell-dropdown');
    menu.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      min-width: 140px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 4px;
      z-index: ${zIndex};
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-height: 200px;
      overflow-y: auto;
    `;

    this.options.forEach(opt => {
      const item = menu.createDiv('pm-cell-dropdown-item');
      item.style.cssText = `
        padding: 6px 10px;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      `;

      // 颜色指示器
      if (opt.color) {
        const dot = item.createSpan();
        dot.style.cssText = `
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${opt.color};
          flex-shrink: 0;
        `;
      }

      item.createSpan({ text: opt.label });

      // 选中标记
      if (opt.value === this.value) {
        item.createSpan({
          text: '✓',
          cls: 'pm-cell-dropdown-check'
        }).style.cssText = 'margin-left: auto; font-weight: bold;';
      }

      item.addEventListener('click', () => {
        this.value = opt.value;
        this.endEdit(true);
      });

      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--background-modifier-hover)';
      });

      item.addEventListener('mouseleave', () => {
        item.style.background = '';
      });
    });

    // 点击外部关闭
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && !container.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
        if (this.isEditing) {
          this.isEditing = false;
        }
      }
    };

    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }

  /**
   * 翻译选项显示名称
   */
  private translateOption(value: string): string {
    const translations: Record<string, string> = {
      // 状态
      backlog: '待处理',
      todo: '待开始',
      'in-progress': '进行中',
      testing: '测试中',
      completed: '已完成',
      archived: '已归档',
      planning: '规划中',
      active: '进行中',
      suspended: '已暂停',
      // 优先级
      critical: '紧急',
      high: '高',
      medium: '中',
      low: '低',
    };
    return translations[value] || value;
  }

  /**
   * 获取选项颜色
   */
  private getOptionColor(value: string): string {
    const colors: Record<string, string> = {
      // 状态颜色
      backlog: '#9ca3af',
      todo: '#3b82f6',
      'in-progress': '#f59e0b',
      testing: '#8b5cf6',
      completed: '#22c55e',
      archived: '#6b7280',
      planning: '#6366f1',
      active: '#22c55e',
      suspended: '#ef4444',
      // 优先级颜色
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#22c55e',
    };
    return colors[value];
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
