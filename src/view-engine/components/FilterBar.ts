import { type App, TFile } from 'obsidian';
import type { EntityManager } from '../../core';
import type { ViewConfig, EntityType } from '../types';
import { EntityTreeSelector } from './EntityTreeSelector';
import type { TreeSelection } from './EntityTreeSelector';

/**
 * FilterBar - 精致长条卡片式筛选器
 * 筛选在上，视图在下，所有条件在一个横向卡片内
 * 支持筛选条件持久化保存到代码块
 * 统一使用 SelectCell 风格
 */
export class FilterBar {
  private container?: HTMLElement;
  private filters: ViewConfig = { mode: 'kanban' };
  private owners: string[] = [];
  private treeSelector?: EntityTreeSelector;
  private currentEntityType: EntityType = 'feature';

  // 实体类型选项（带颜色）
  private readonly entityTypeOptions = [
    { value: 'version', label: '📁 版本', color: '#6366f1' },
    { value: 'project', label: '📂 项目', color: '#3b82f6' },
    { value: 'feature', label: '📄 特性', color: '#22c55e' },
  ];

  // 状态选项（带颜色）
  private readonly statusOptions = [
    { value: '', label: '全部状态', color: '#9ca3af' },
    { value: 'backlog', label: '待处理', color: '#9ca3af' },
    { value: 'todo', label: '待开始', color: '#3b82f6' },
    { value: 'in-progress', label: '进行中', color: '#f59e0b' },
    { value: 'testing', label: '测试中', color: '#8b5cf6' },
    { value: 'completed', label: '已完成', color: '#22c55e' },
  ];

  // 优先级选项（带颜色）
  private readonly priorityOptions = [
    { value: '', label: '全部优先级', color: '#9ca3af' },
    { value: 'critical', label: '紧急', color: '#ef4444' },
    { value: 'high', label: '高', color: '#f97316' },
    { value: 'medium', label: '中', color: '#eab308' },
    { value: 'low', label: '低', color: '#22c55e' },
  ];

  constructor(
    private app: App,
    private entityManager: EntityManager,
    private onChange: (filters: ViewConfig) => void,
    private sourcePath?: string,
    private codeBlockStart?: number
  ) {}

  /**
   * 加载选项数据
   */
  async loadOptions(): Promise<void> {
    // 加载负责人列表（去重）
    const features = await this.entityManager.listFeatures();
    const ownersSet = new Set<string>();
    features.forEach(f => {
      if (f.owner) ownersSet.add(f.owner);
    });
    this.owners = ['全部负责人', ...Array.from(ownersSet).sort()];
  }

  /**
   * 渲染筛选器 - 横向紧凑卡片式，所有下拉框使用 SelectCell 风格
   */
  render(parent: HTMLElement, initialFilters?: Partial<ViewConfig>): HTMLElement {
    this.container = parent.createDiv('pm-filter-container');

    if (initialFilters) {
      this.filters = { ...this.filters, ...initialFilters };
    }

    // 筛选器横向条
    const filterBar = this.container.createDiv('pm-filter-bar-compact');

    // 实体类型选择器 - SelectCell 风格
    this.createSelectCell(filterBar, '实体类型', this.entityTypeOptions, this.currentEntityType, (value) => {
      this.currentEntityType = value as EntityType;
      this.treeSelector?.updateEntityType(this.currentEntityType);
      this.onFilterChange();
    });

    // 树形层级选择器（已经是 SelectCell 风格）
    const treeWrapper = filterBar.createDiv('pm-filter-tree-wrapper');
    this.treeSelector = new EntityTreeSelector(this.app, this.entityManager, {
      entityType: this.currentEntityType,
      onSelect: (selection) => {
        this.handleTreeSelection(selection);
      },
      initialSelection: this.buildInitialSelection(),
    });
    this.treeSelector.render(treeWrapper);

    // 状态筛选 - SelectCell 风格
    this.createSelectCell(filterBar, '状态', this.statusOptions, this.filters.status || '', (value) => {
      this.filters.status = value || undefined;
      this.onFilterChange();
    });

    // 优先级筛选 - SelectCell 风格
    this.createSelectCell(filterBar, '优先级', this.priorityOptions, this.filters.priority || '', (value) => {
      this.filters.priority = value || undefined;
      this.onFilterChange();
    });

    // 负责人筛选 - SelectCell 风格
    const ownerOptions = this.owners.map(o => ({
      value: o === '全部负责人' ? '' : o,
      label: o,
      color: '#8b5cf6'
    }));
    this.createSelectCell(filterBar, '负责人', ownerOptions, this.filters.owner || '', (value) => {
      this.filters.owner = value || undefined;
      this.onFilterChange();
    });

    return this.container;
  }

  /**
   * 创建 SelectCell 风格的下拉选择器
   */
  private createSelectCell(
    container: HTMLElement,
    label: string,
    options: Array<{ value: string; label: string; color?: string }>,
    value: string,
    onChange: (value: string) => void
  ): HTMLElement {
    const wrapper = container.createDiv('pm-filter-field-compact');

    // 触发按钮 - SelectCell 风格（无标签，直接显示）
    const triggerBtn = wrapper.createDiv('pm-cell-badge pm-filter-badge');
    const selectedOption = options.find(opt => opt.value === value) || options[0];
    this.updateBadgeStyle(triggerBtn, selectedOption);

    // 下拉菜单容器
    let dropdownEl: HTMLElement | null = null;

    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdownEl) {
        dropdownEl.remove();
        dropdownEl = null;
        return;
      }
      dropdownEl = this.createDropdown(wrapper, options, value, (newValue) => {
        onChange(newValue);
        const newOption = options.find(opt => opt.value === newValue) || options[0];
        this.updateBadgeStyle(triggerBtn, newOption);
        dropdownEl?.remove();
        dropdownEl = null;
      });
    });

    // 点击外部关闭
    document.addEventListener('click', (e) => {
      if (dropdownEl && !dropdownEl.contains(e.target as Node) && !wrapper.contains(e.target as Node)) {
        dropdownEl.remove();
        dropdownEl = null;
      }
    });

    return wrapper;
  }

  /**
   * 更新 badge 样式
   */
  private updateBadgeStyle(badge: HTMLElement, option: { value: string; label: string; color?: string }): void {
    badge.empty();
    badge.textContent = option.label;

    const color = option.color || '#9ca3af';
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

    // 添加下拉箭头
    const arrow = badge.createSpan();
    arrow.textContent = '▼';
    arrow.style.cssText = `
      font-size: 10px;
      opacity: 0.7;
      margin-left: 2px;
    `;
  }

  /**
   * 创建下拉菜单
   */
  private createDropdown(
    container: HTMLElement,
    options: Array<{ value: string; label: string; color?: string }>,
    currentValue: string,
    onSelect: (value: string) => void
  ): HTMLElement {
    const rect = container.getBoundingClientRect();
    const dropdown = document.body.createDiv('pm-cell-dropdown pm-filter-dropdown');

    dropdown.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.bottom + 4}px;
      min-width: ${rect.width}px;
      max-width: 200px;
      max-height: 280px;
      overflow-y: auto;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      padding: 4px;
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    `;

    options.forEach(opt => {
      const item = dropdown.createDiv('pm-cell-dropdown-item');
      item.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        transition: background 0.15s ease;
      `;

      // 颜色圆点
      const color = opt.color || '#9ca3af';
      const dot = item.createSpan();
      dot.style.cssText = `
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${color};
        flex-shrink: 0;
      `;

      // 标签
      item.createSpan({ text: opt.label });

      // 选中标记
      if (opt.value === currentValue) {
        item.createSpan({
          text: '✓',
          cls: 'pm-cell-dropdown-check'
        }).style.cssText = 'margin-left: auto; font-weight: bold;';
      }

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelect(opt.value);
      });

      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--background-modifier-hover)';
      });

      item.addEventListener('mouseleave', () => {
        item.style.background = '';
      });
    });

    return dropdown;
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

  /**
   * 构建初始选择状态
   */
  private buildInitialSelection(): TreeSelection | undefined {
    if (!this.filters.version && !this.filters.project && !this.filters.feature) {
      return undefined;
    }

    const selection: TreeSelection = { type: this.currentEntityType };
    if (this.filters.version) selection.versionIds = [this.filters.version];
    if (this.filters.project) selection.projectIds = [this.filters.project];
    if (this.filters.feature) selection.featureIds = [this.filters.feature];
    return selection;
  }

  /**
   * 处理树形选择器的选择变化
   */
  private handleTreeSelection(selection: TreeSelection | null): void {
    if (selection) {
      this.filters.version = selection.versionIds?.[0];
      this.filters.project = selection.projectIds?.[0];
      this.filters.feature = selection.featureIds?.[0];
    } else {
      this.filters.version = undefined;
      this.filters.project = undefined;
      this.filters.feature = undefined;
    }
    this.onFilterChange();
  }

  /**
   * 筛选条件变化时的处理
   */
  private onFilterChange(): void {
    this.onChange({ ...this.filters });
    this.saveFiltersToCodeBlock();
  }

  /**
   * 保存筛选条件到代码块
   */
  private async saveFiltersToCodeBlock(): Promise<void> {
    if (!this.sourcePath || this.codeBlockStart === undefined) return;

    const file = this.app.vault.getAbstractFileByPath(this.sourcePath);
    if (!(file instanceof TFile)) return;

    try {
      const content = await this.app.vault.read(file);
      const lines = content.split('\n');

      let blockStart = -1;
      let blockEnd = -1;
      let codeBlockIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '```pm-view') {
          if (codeBlockIndex === this.codeBlockStart) {
            blockStart = i;
          }
          codeBlockIndex++;
        }
        if (blockStart !== -1 && line === '```') {
          blockEnd = i;
          break;
        }
      }

      if (blockStart === -1 || blockEnd === -1) return;

      const originalLines = lines.slice(blockStart + 1, blockEnd);
      const originalConfig = this.parseOriginalConfig(originalLines);

      const newConfig = {
        ...originalConfig,
        mode: this.filters.mode,
        ...(this.filters.version && { version: this.filters.version }),
        ...(this.filters.project && { project: this.filters.project }),
        ...(this.filters.feature && { feature: this.filters.feature }),
        ...(this.filters.status && { status: this.filters.status }),
        ...(this.filters.priority && { priority: this.filters.priority }),
        ...(this.filters.owner && { owner: this.filters.owner }),
        ...(this.filters.tag && { tag: this.filters.tag }),
      };

      const yamlLines = this.configToYaml(newConfig);
      const newBlockLines = ['```pm-view', ...yamlLines, '```'];

      const newLines = [
        ...lines.slice(0, blockStart),
        ...newBlockLines,
        ...lines.slice(blockEnd + 1)
      ];

      const newContent = newLines.join('\n');
      if (newContent !== content) {
        await this.app.vault.modify(file, newContent);
      }
    } catch (error) {
      console.error('保存筛选条件失败:', error);
    }
  }

  /**
   * 解析原有配置
   */
  private parseOriginalConfig(lines: string[]): Partial<ViewConfig> {
    const config: Partial<ViewConfig> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();

      if (['mode', 'title', 'groupBy', 'sortBy', 'sortOrder', 'limit', 'cols', 'expanded', 'tag'].includes(key)) {
        (config as any)[key] = value;
      }
    }

    return config;
  }

  /**
   * 将配置转换为 YAML 格式
   */
  private configToYaml(config: Partial<ViewConfig>): string[] {
    const lines: string[] = [];
    const order = ['mode', 'title', 'version', 'project', 'feature', 'status', 'priority', 'owner', 'tag', 'groupBy', 'sortBy', 'sortOrder', 'limit', 'cols', 'expanded'];

    for (const key of order) {
      const value = (config as any)[key];
      if (value !== undefined && value !== '') {
        lines.push(`${key}: ${value}`);
      }
    }

    return lines;
  }

  /**
   * 获取当前筛选条件
   */
  getFilters(): ViewConfig {
    return { ...this.filters };
  }
}
