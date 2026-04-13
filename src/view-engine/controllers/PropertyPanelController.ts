import type { ViewConfig, ViewMode, CardFieldsConfig, ListColumnField, EntityType } from '../types';
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

    // 1. 实体类型选择器
    this.renderEntityTypeSelector(panel, config, options);

    // 2. 列表视图：表头字段勾选配置
    if (config.mode === 'list') {
      this.renderListColumnSelector(panel, config, options);
    }

    // 3. EntityCard 视图：字段多选配置
    if (config.mode !== 'list') {
      this.renderCardFieldSelector(panel, config, options);
    }

    // 4. 视图特定配置
    if (config.mode === 'kanban' || config.mode === 'cascade') {
      this.renderGroupBySelector(panel, config, options);
    }

    if (config.mode === 'grid') {
      this.renderColsSelector(panel, config, options);
    }

    // 5. 通用配置：显示数量限制
    this.renderLimitInput(panel, config, options);

    return panel;
  }

  /**
   * 渲染实体类型选择器
   */
  private renderEntityTypeSelector(
    panel: HTMLElement,
    config: ViewConfig,
    options: PropertyPanelOptions
  ): void {
    const section = panel.createDiv('pm-property-section');
    section.style.marginBottom = '12px';
    section.createEl('label', {
      text: '实体类型',
      cls: 'pm-property-label'
    }).style.cssText = 'display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;';

    const select = section.createEl('select', { cls: 'pm-property-select' });
    select.style.cssText = 'width: 100%; padding: 6px 8px; height: 32px; line-height: 1.4;';
    const entityTypes = [
      { value: 'feature', label: '特性' },
      { value: 'project', label: '项目' },
      { value: 'version', label: '版本' }
    ];
    entityTypes.forEach(type => {
      const option = select.createEl('option');
      option.value = type.value;
      option.textContent = type.label;
      if (config.entityType === type.value) option.selected = true;
    });

    select.addEventListener('change', () => {
      options.onConfigChange({ entityType: select.value as EntityType });
    });
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

    const currentColumns = config.listColumns || ['name', 'status', 'priority', 'owner'];

    LIST_COLUMN_DEFINITIONS.forEach(field => {
      const label = checkboxContainer.createEl('label');
      label.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px;';

      const checkbox = label.createEl('input');
      checkbox.type = 'checkbox';
      checkbox.checked = currentColumns.includes(field.key as ListColumnField);
      checkbox.disabled = field.required;

      const text = label.createSpan();
      text.textContent = field.label + (field.required ? ' (必选)' : '');
      text.style.cssText = field.required ? 'color: var(--text-muted);' : '';

      checkbox.addEventListener('change', () => {
        let newColumns = [...currentColumns];
        if (checkbox.checked) {
          if (!newColumns.includes(field.key as ListColumnField)) {
            newColumns.push(field.key as ListColumnField);
          }
        } else {
          newColumns = newColumns.filter(k => k !== field.key);
        }
        options.debouncedSave({ listColumns: newColumns });
        options.onConfigChange({ listColumns: newColumns });
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
    const currentOptional = currentCardFields.optional || [];

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
      checkbox.checked = currentOptional.includes(field.key);

      label.createSpan({ text: field.label });

      checkbox.addEventListener('change', () => {
        let newOptional = [...currentOptional];
        if (checkbox.checked) {
          if (!newOptional.includes(field.key)) {
            newOptional.push(field.key);
          }
        } else {
          newOptional = newOptional.filter(k => k !== field.key);
        }
        const newCardFields = { ...currentCardFields, optional: newOptional };
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

  /**
   * 渲染网格列数选择器
   */
  private renderColsSelector(
    panel: HTMLElement,
    config: ViewConfig,
    options: PropertyPanelOptions
  ): void {
    const section = panel.createDiv('pm-property-section');
    section.style.marginBottom = '12px';
    section.createEl('label', {
      text: '列数',
      cls: 'pm-property-label'
    }).style.cssText = 'display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;';

    const select = section.createEl('select', { cls: 'pm-property-select' });
    select.style.cssText = 'width: 100%; padding: 6px 8px; height: 32px; line-height: 1.4;';
    [2, 3, 4, 5].forEach(num => {
      const option = select.createEl('option');
      option.value = String(num);
      option.textContent = `${num} 列`;
      if ((config.cols || 3) === num) option.selected = true;
    });

    select.addEventListener('change', () => {
      const newCols = parseInt(select.value) as 1 | 2 | 3 | 4;
      options.debouncedSave({ cols: newCols });
      options.onConfigChange({ cols: newCols });
    });
  }

  /**
   * 渲染显示数量限制输入框
   */
  private renderLimitInput(
    panel: HTMLElement,
    config: ViewConfig,
    options: PropertyPanelOptions
  ): void {
    const section = panel.createDiv('pm-property-section');
    section.style.marginBottom = '12px';
    section.createEl('label', {
      text: '显示数量限制',
      cls: 'pm-property-label'
    }).style.cssText = 'display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;';

    const input = section.createEl('input');
    input.type = 'number';
    input.placeholder = '无限制';
    input.value = config.limit ? String(config.limit) : '';
    input.style.cssText = 'width: 100%; padding: 4px 8px;';
    input.addEventListener('change', () => {
      const limit = input.value ? parseInt(input.value) : undefined;
      options.debouncedSave({ limit });
      options.onConfigChange({ limit });
    });
  }
}
