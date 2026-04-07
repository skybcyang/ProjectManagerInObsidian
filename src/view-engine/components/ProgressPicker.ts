/**
 * 进度选择器组件
 * 可复用的进度选择滑块
 */
export class ProgressPicker {
  private menu?: HTMLElement;

  /**
   * 显示进度选择器
   * @param triggerEl - 触发元素（用于定位）
   * @param currentProgress - 当前进度 (0-100)
   * @param onSelect - 选择回调
   */
  show(
    triggerEl: HTMLElement,
    currentProgress: number,
    onSelect: (progress: number) => void
  ): void {
    // 移除已存在的菜单
    this.hide();

    const progress = currentProgress || 0;

    // 创建菜单
    this.menu = document.createElement('div');
    this.menu.className = 'pm-progress-picker';
    this.menu.style.cssText = `
      position: fixed;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      padding: 12px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 180px;
    `;

    // 标题
    this.menu.createEl('div', {
      text: '更新进度',
      cls: 'pm-picker-title',
    }).style.cssText = 'font-size: 12px; color: var(--text-muted); margin-bottom: 10px; font-weight: 500;';

    // 滑块容器
    const sliderContainer = this.menu.createDiv();
    sliderContainer.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;';

    // 滑块
    const slider = sliderContainer.createEl('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(progress);
    slider.style.cssText = `
      flex: 1;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: var(--background-modifier-border);
      border-radius: 2px;
      outline: none;
    `;
    // 自定义滑块样式
    const sliderThumbStyle = `
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--interactive-accent);
      cursor: pointer;
    `;
    slider.style.setProperty('--thumb-style', sliderThumbStyle);

    // 数值显示
    const valueDisplay = sliderContainer.createEl('span');
    valueDisplay.textContent = `${progress}%`;
    valueDisplay.style.cssText = 'min-width: 40px; text-align: right; font-size: 13px; font-weight: 500; color: var(--text-normal);';

    // 滑块变化事件
    slider.oninput = () => {
      const value = parseInt(slider.value);
      valueDisplay.textContent = `${value}%`;
    };

    // 快捷按钮
    const quickBtnsContainer = this.menu.createDiv();
    quickBtnsContainer.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--background-modifier-border);';

    const quickValues = [0, 25, 50, 75, 100];
    quickValues.forEach(value => {
      const btn = quickBtnsContainer.createEl('button');
      btn.textContent = `${value}%`;
      const isSelected = value === progress;
      btn.style.cssText = `
        padding: 4px 10px;
        font-size: 11px;
        border: 1px solid ${isSelected ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'};
        background: ${isSelected ? 'var(--interactive-accent)' : 'var(--background-secondary)'};
        color: ${isSelected ? 'var(--text-on-accent)' : 'var(--text-normal)'};
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s;
      `;
      btn.onmouseenter = () => {
        if (!isSelected) {
          btn.style.background = 'var(--background-modifier-hover)';
        }
      };
      btn.onmouseleave = () => {
        if (!isSelected) {
          btn.style.background = 'var(--background-secondary)';
        }
      };
      btn.onclick = (e) => {
        e.stopPropagation();
        slider.value = String(value);
        valueDisplay.textContent = `${value}%`;
      };
    });

    // 按钮容器
    const btnContainer = this.menu.createDiv();
    btnContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px;';

    // 取消按钮
    const cancelBtn = btnContainer.createEl('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = `
      padding: 6px 14px;
      font-size: 12px;
      border: 1px solid var(--background-modifier-border);
      background: var(--background-secondary);
      color: var(--text-normal);
      border-radius: 4px;
      cursor: pointer;
    `;
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      this.hide();
    };

    // 确认按钮
    const confirmBtn = btnContainer.createEl('button');
    confirmBtn.textContent = '更新';
    confirmBtn.style.cssText = `
      padding: 6px 14px;
      font-size: 12px;
      border: none;
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    `;
    confirmBtn.onclick = (e) => {
      e.stopPropagation();
      const value = parseInt(slider.value);
      onSelect(value);
      this.hide();
    };

    document.body.appendChild(this.menu);

    // 定位菜单
    this.positionMenu(triggerEl);

    // 点击外部关闭（排除菜单自身）
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
 * 便捷函数：显示进度选择器
 */
export function showProgressPicker(
  triggerEl: HTMLElement,
  currentProgress: number,
  onSelect: (progress: number) => void
): void {
  const picker = new ProgressPicker();
  picker.show(triggerEl, currentProgress, onSelect);
}
