import { BaseCell } from './BaseCell';

/**
 * 日期单元格
 * 支持日期选择和清除
 */
export class DateCell extends BaseCell<string> {
  constructor(
    app: any,
    entityManager: any,
    entityId: string,
    entityType: string,
    field: string,
    value: string,
    onChange?: (value: string) => void
  ) {
    super(app, entityManager, entityId, entityType, field, value || '', onChange);
  }

  /**
   * 渲染显示状态
   */
  renderDisplay(container: HTMLElement): void {
    const displayText = this.value
      ? this.formatDate(this.value)
      : '-';

    const el = this.createClickableDisplay(container, displayText);
    el.addClass('pm-cell-date');

    // 过期标记
    if (this.value && this.isOverdue(this.value)) {
      el.addClass('pm-cell-date-overdue');
      el.setAttribute('title', '已过期');
    }
  }

  /**
   * 渲染编辑状态
   */
  renderEdit(container: HTMLElement): void {
    const wrapper = this.createInputWrapper(container);
    wrapper.style.position = 'relative';

    // 日期输入框
    const input = wrapper.createEl('input');
    input.className = 'pm-cell-input pm-cell-date-input';
    input.type = 'date';
    input.value = this.value;

    // 设置样式
    input.style.cssText = `
      width: 100%;
      padding: 4px 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      color: var(--text-normal);
      font-size: 13px;
    `;

    // 自动聚焦
    setTimeout(() => input.focus(), 0);

    // 处理选择
    input.addEventListener('change', () => {
      this.value = input.value;
      this.endEdit(true);
    });

    // 失去焦点保存
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (!wrapper.contains(document.activeElement)) {
          this.value = input.value;
          this.endEdit(true);
        }
      }, 100);
    });

    // 键盘处理
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.endEdit(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.value = input.value;
        this.endEdit(true);
      }
    });

    // 快速选择按钮
    const quickActions = wrapper.createDiv('pm-cell-date-actions');

    const zIndex = 'var(--pm-z-dropdown, 1000)';

    quickActions.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      margin-top: 4px;
      padding: 4px;
      z-index: ${zIndex};
      display: flex;
      gap: 4px;
    `;

    // 今天按钮
    const todayBtn = quickActions.createEl('button');
    todayBtn.textContent = '今天';
    todayBtn.className = 'pm-cell-btn';
    todayBtn.onclick = () => {
      this.value = this.formatDateForInput(new Date());
      this.endEdit(true);
    };

    // 明天按钮
    const tomorrowBtn = quickActions.createEl('button');
    tomorrowBtn.textContent = '明天';
    tomorrowBtn.className = 'pm-cell-btn';
    tomorrowBtn.onclick = () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.value = this.formatDateForInput(tomorrow);
      this.endEdit(true);
    };

    // 下周按钮
    const nextWeekBtn = quickActions.createEl('button');
    nextWeekBtn.textContent = '下周';
    nextWeekBtn.className = 'pm-cell-btn';
    nextWeekBtn.onclick = () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      this.value = this.formatDateForInput(nextWeek);
      this.endEdit(true);
    };

    // 清除按钮
    if (this.value) {
      const clearBtn = quickActions.createEl('button');
      clearBtn.textContent = '清除';
      clearBtn.className = 'pm-cell-btn pm-cell-btn-danger';
      clearBtn.onclick = () => {
        this.value = '';
        this.endEdit(true);
      };
    }

    // 点击外部关闭
    const closeMenu = (e: MouseEvent) => {
      if (!wrapper.contains(e.target as Node)) {
        this.value = input.value;
        this.endEdit(true);
        document.removeEventListener('click', closeMenu);
      }
    };

    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }

  /**
   * 格式化日期显示
   */
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 检查是否是今天/明天
    if (this.isSameDay(date, today)) {
      return '今天';
    }
    if (this.isSameDay(date, tomorrow)) {
      return '明天';
    }

    // 相对时间
    const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return `${Math.abs(diffDays)}天前`;
    }
    if (diffDays <= 7) {
      return `${diffDays}天后`;
    }

    // 标准格式
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  /**
   * 格式化为 input date 格式 (YYYY-MM-DD)
   */
  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 检查是否是同一天
   */
  private isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  /**
   * 检查是否过期
   */
  private isOverdue(dateStr: string): boolean {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }
}
