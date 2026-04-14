import type { ViewConfig, ViewContext, ViewMode } from '../types';
import { VIEW_MODE_LABELS } from '../types';

/**
 * 工具栏配置选项
 */
export interface ToolbarOptions {
  onViewModeChange: (mode: ViewMode) => void;
  onPropertyClick: () => void;
  onFullscreenClick?: () => void;
}

/**
 * 工具栏控制器
 * 负责渲染工具栏基础骨架（视图模式 + 属性按钮）
 * FilterBar 和排序 badge 由 ViewEngine 在外部组装
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

    // 右侧：功能按钮组（仅保留属性按钮，FilterBar 和排序 badge 由 ViewEngine 插入）
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

    // 全屏按钮
    if (options.onFullscreenClick) {
      const fsBtn = buttonGroup.createEl('button', {
        cls: 'pm-toolbar-btn pm-toolbar-btn-fullscreen',
      });
      const { setIcon } = require('obsidian');
      setIcon(fsBtn, 'maximize');
      fsBtn.addEventListener('click', options.onFullscreenClick);
    }

    // 属性按钮（SelectCell badge 风格）
    const propBtn = buttonGroup.createDiv('pm-cell-badge pm-toolbar-prop-btn');
    propBtn.textContent = '属性 ▼';
    const propColor = '#f59e0b';
    propBtn.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      background-color: rgba(245, 158, 11, 0.15);
      color: ${propColor};
      border: 1px solid rgba(245, 158, 11, 0.3);
      transition: all 0.2s ease;
    `;
    propBtn.addEventListener('click', options.onPropertyClick);
  }
}
