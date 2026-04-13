import type { ViewConfig, ViewContext, ViewMode } from '../types';
import { VIEW_MODE_LABELS } from '../types';

/**
 * 工具栏配置选项
 */
export interface ToolbarOptions {
  onViewModeChange: (mode: ViewMode) => void;
  onFilterToggle: () => void;
  onSortClick: () => void;
  onPropertyClick: () => void;
}

/**
 * 工具栏控制器
 * 负责渲染工具栏和处理工具栏交互
 */
export class ToolbarController {
  /**
   * 渲染工具栏
   */
  render(
    wrapper: HTMLElement,
    config: ViewConfig,
    options: ToolbarOptions
  ): HTMLElement {
    const toolbar = wrapper.createDiv('pm-view-toolbar');

    // 左侧：视图模式切换下拉
    this.renderViewModeSelector(toolbar, config, options.onViewModeChange);

    // 右侧：功能按钮组
    this.renderActionButtons(toolbar, options);

    return toolbar;
  }

  /**
   * 渲染视图模式选择器
   */
  private renderViewModeSelector(
    toolbar: HTMLElement,
    config: ViewConfig,
    onChange: (mode: ViewMode) => void
  ): void {
    const viewModeGroup = toolbar.createDiv('pm-toolbar-group');
    const viewModeSelect = viewModeGroup.createEl('select', { cls: 'pm-toolbar-select' });

    // 添加视图模式选项
    Object.entries(VIEW_MODE_LABELS).forEach(([mode, label]) => {
      const option = viewModeSelect.createEl('option', {
        text: label,
        value: mode,
      });
      if (mode === config.mode) {
        option.selected = true;
      }
    });

    // 视图切换事件
    viewModeSelect.addEventListener('change', () => {
      onChange(viewModeSelect.value as ViewMode);
    });
  }

  /**
   * 渲染操作按钮组
   */
  private renderActionButtons(
    toolbar: HTMLElement,
    options: ToolbarOptions
  ): void {
    const buttonGroup = toolbar.createDiv('pm-toolbar-group pm-toolbar-right');

    // 筛选按钮
    const filterBtn = buttonGroup.createEl('button', {
      cls: 'pm-toolbar-btn',
      text: '筛选 ▼',
    });
    filterBtn.addEventListener('click', () => {
      options.onFilterToggle();
      // 切换按钮文字
      const currentWrapper = filterBtn.closest('.pm-view-wrapper') as HTMLElement;
      const filterBar = currentWrapper?.querySelector('.pm-filter-container') as HTMLElement;
      if (filterBar) {
        const isHidden = filterBar.style.display === 'none';
        filterBtn.textContent = isHidden ? '筛选 ▲' : '筛选 ▼';
      }
    });

    // 排序按钮
    const sortBtn = buttonGroup.createEl('button', {
      cls: 'pm-toolbar-btn',
      text: '排序 ▼',
    });
    sortBtn.addEventListener('click', options.onSortClick);

    // 属性按钮
    const propBtn = buttonGroup.createEl('button', {
      cls: 'pm-toolbar-btn',
      text: '属性 ▼',
    });
    propBtn.addEventListener('click', options.onPropertyClick);
  }
}
