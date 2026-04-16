import type { ViewConfig, ViewMode, CardFieldsConfig, ListColumnField } from '../types';
import { ENTITY_CARD_FIELD_DEFINITIONS, LIST_COLUMN_DEFINITIONS } from '../types';
import { DropdownMenuManager } from '../components/DropdownMenu';

/**
 * 属性面板选项
 */
export interface PropertyPanelOptions {
  onConfigChange: (updates: Partial<ViewConfig>) => void;
  debouncedSave: (updates: Partial<ViewConfig>) => void;
}

/**
 * 属性面板控制器
 * 负责渲染属性面板和处理配置变更
 */
export class PropertyPanelController {
  /**
   * 显示属性面板
   */
  show(
    triggerBtn: HTMLElement,
    wrapper: HTMLElement,
    config: ViewConfig,
    options: PropertyPanelOptions
  ): void {
    const content = this.createPanelContent(config, options, wrapper);

    DropdownMenuManager.show(triggerBtn, content, {
      className: 'pm-property-panel pm-dropdown-menu',
      minWidth: 260,
      maxHeight: 500,
    });
  }

  /**
   * 创建面板内容
   */
  private createPanelContent(
    config: ViewConfig,
    options: PropertyPanelOptions,
    wrapper: HTMLElement
  ): HTMLElement {
    const panel = document.createElement('div');

    // 标题
    panel.createEl('div', {
      text: '视图属性',
      cls: 'pm-panel-title'
    }).style.cssText = 'font-weight: 600; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--background-modifier-border);';

    // 1. 列表视图：表头字段勾选配置
    if (config.mode === 'list') {
      this.renderListColumnSelector(panel, config, options);
    }

    // 3. EntityCard 视图：字段多选配置
    if (config.mode !== 'list') {
      this.renderCardFieldSelector(panel, config, options);
    }

    // 4. 视图特定配置
    if (config.mode === 'kanban') {
      this.renderGroupBySelector(panel, config, options);
    }

    return panel;
  }

  /**
   * 渲染列表视图表头字段选择器
   */
  private renderListColumnSelector(
    panel: HTMLElement,
    config: ViewConfig,
    options: PropertyPanelOptions
  ): void {
    const section = panel.createDiv('pm-property-section');
    section.style.marginBottom = '12px';
    section.createEl('label', {
      text: '显示列',
      cls: 'pm-property-label'
    }).style.cssText = 'display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;';

    const checkboxContainer = section.createDiv('pm-checkbox-group');
    checkboxContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

    let liveColumns = config.listColumns || ['name', 'status', 'priority', 'owner'];

    LIST_COLUMN_DEFINITIONS.forEach(field => {
      const label = checkboxContainer.createEl('label');
      label.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px;';

      const checkbox = label.createEl('input');
      checkbox.type = 'checkbox';
      checkbox.checked = liveColumns.includes(field.key as ListColumnField);
      checkbox.disabled = field.required;

      const text = label.createSpan();
      text.textContent = field.label + (field.required ? ' (必选)' : '');
      text.style.cssText = field.required ? 'color: var(--text-muted);' : '';

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (!liveColumns.includes(field.key as ListColumnField)) {
            liveColumns = [...liveColumns, field.key as ListColumnField];
          }
        } else {
          liveColumns = liveColumns.filter(k => k !== field.key);
        }
        options.debouncedSave({ listColumns: liveColumns });
        options.onConfigChange({ listColumns: liveColumns });
      });
    });
  }

  /**
   * 渲染 EntityCard 字段选择器
   */
  private renderCardFieldSelector(
    panel: HTMLElement,
    config: ViewConfig,
    options: PropertyPanelOptions
  ): void {
    const section = panel.createDiv('pm-property-section');
    section.style.marginBottom = '12px';
    section.createEl('label', {
      text: '卡片显示字段',
      cls: 'pm-property-label'
    }).style.cssText = 'display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;';

    const currentCardFields: CardFieldsConfig = config.cardFields || {
      required: ['name', 'priority'],
      optional: ['status', 'owner', 'progress']
    };
    let liveOptional = currentCardFields.optional || [];

    const multiSelectContainer = section.createDiv('pm-multi-select');
    multiSelectContainer.style.cssText = `
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      padding: 8px;
      max-height: 150px;
      overflow-y: auto;
    `;

    // 必选字段
    const requiredSection = multiSelectContainer.createDiv('pm-required-fields');
    requiredSection.style.cssText = 'margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed var(--background-modifier-border);';
    requiredSection.createEl('div', { text: '必选字段', cls: 'pm-section-subtitle' }).style.cssText = 'font-size: 11px; color: var(--text-muted); margin-bottom: 4px;';

    ENTITY_CARD_FIELD_DEFINITIONS.filter(f => f.required).forEach(field => {
      const label = requiredSection.createEl('label');
      label.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted);';
      const checkbox = label.createEl('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.disabled = true;
      label.createSpan({ text: field.label });
    });

    // 可选字段
    const optionalSection = multiSelectContainer.createDiv('pm-optional-fields');
    optionalSection.createEl('div', { text: '可选字段', cls: 'pm-section-subtitle' }).style.cssText = 'font-size: 11px; color: var(--text-muted); margin-bottom: 4px;';

    ENTITY_CARD_FIELD_DEFINITIONS.filter(f => !f.required).forEach(field => {
      const label = optionalSection.createEl('label');
      label.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; padding: 2px 0;';

      const checkbox = label.createEl('input');
      checkbox.type = 'checkbox';
      checkbox.checked = liveOptional.includes(field.key);

      label.createSpan({ text: field.label });

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (!liveOptional.includes(field.key)) {
            liveOptional = [...liveOptional, field.key];
          }
        } else {
          liveOptional = liveOptional.filter(k => k !== field.key);
        }
        const newCardFields = { ...currentCardFields, optional: liveOptional };
        options.debouncedSave({ cardFields: newCardFields });
        options.onConfigChange({ cardFields: newCardFields });
      });
    });
  }

  /**
   * 渲染分组方式选择器
   */
  private renderGroupBySelector(
    panel: HTMLElement,
    config: ViewConfig,
    options: PropertyPanelOptions
  ): void {
    const section = panel.createDiv('pm-property-section');
    section.style.marginBottom = '12px';
    section.createEl('label', {
      text: '分组方式',
      cls: 'pm-property-label'
    }).style.cssText = 'display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;';

    const select = section.createEl('select', { cls: 'pm-property-select' });
    select.style.cssText = 'width: 100%; padding: 6px 8px; height: 32px; line-height: 1.4;';
    const groupOptions = [
      { value: 'status', label: '状态' },
      { value: 'priority', label: '优先级' },
    ];
    groupOptions.forEach(opt => {
      const option = select.createEl('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (config.groupBy === opt.value) option.selected = true;
    });

    select.addEventListener('change', () => {
      const groupByValue = select.value as ViewConfig['groupBy'];
      options.debouncedSave({ groupBy: groupByValue });
      options.onConfigChange({ groupBy: groupByValue });
    });
  }

}
