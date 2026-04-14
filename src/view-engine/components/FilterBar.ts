import { type App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { ViewConfig, EntityType } from '../types';
import { EntityTreeSelector } from './EntityTreeSelector';
import type { TreeSelection } from './EntityTreeSelector';
import { CodeBlockConfigService } from '../../services';

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
  private cleanupFns: (() => void)[] = [];
  private configService: CodeBlockConfigService;

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
  ) {
    this.configService = new CodeBlockConfigService(app);
  }

  /**
   * 加载选项数据（使用缓存优化）
   */
  async loadOptions(): Promise<void> {
    // 从缓存加载负责人列表（O(1) 性能，无需遍历所有文件）
    const ownersFromCache = this.entityManager.getOwners();
    this.owners = ['全部负责人', ...ownersFromCache];
  }

  /**
   * 渲染筛选器 - 横向紧凑卡片式，所有下拉框使用 SelectCell 风格
   */
  render(parent: HTMLElement, initialFilters?: Partial<ViewConfig>): HTMLElement {
    this.container = parent.createDiv('pm-filter-container');

    if (initialFilters) {
      this.filters = { ...this.filters, ...initialFilters };

      // 同步 entityType 到 currentEntityType，确保 FilterBar 显示与配置一致
      if (initialFilters.entityType) {
        this.currentEntityType = initialFilters.entityType;
      }
    }

    // 筛选器横向条
    const filterBar = this.container.createDiv('pm-filter-bar-compact');

    // 实体类型选择器 - SelectCell 风格
    this.createSelectCell(filterBar, '实体类型', this.entityTypeOptions, this.currentEntityType, (value) => {
      this.currentEntityType = value as EntityType;
      this.filters.entityType = this.currentEntityType;

      // 清空所有层级筛选字段，避免旧值污染新配置
      this.filters.version = undefined;
      this.filters.project = undefined;
      this.filters.feature = undefined;

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
    const closeHandler = (e: MouseEvent) => {
      if (dropdownEl && !dropdownEl.contains(e.target as Node) && !wrapper.contains(e.target as Node)) {
        dropdownEl.remove();
        dropdownEl = null;
      }
    };
    document.addEventListener('click', closeHandler);

    // 保存清理函数
    this.cleanupFns.push(() => {
      document.removeEventListener('click', closeHandler);
      if (dropdownEl) {
        dropdownEl.remove();
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
    const zIndex = 'var(--pm-z-dropdown, 1000)';

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
      z-index: ${zIndex};
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

      item.addEventListener('click', () => {
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
   * 根据 entityType 和 filter 字段智能构建树选择状态（统一使用列表）
   */
  private buildInitialSelection(): TreeSelection | undefined {
    const selection: TreeSelection = { type: this.currentEntityType };
    let hasSelection = false;

    switch (this.currentEntityType) {
      case 'version':
        if (this.filters.versions && this.filters.versions.length > 0) {
          selection.versionIds = [...this.filters.versions];
          hasSelection = true;
        }
        break;
      case 'project':
        // 优先使用 projects，其次使用 versions
        if (this.filters.projects && this.filters.projects.length > 0) {
          selection.projectIds = [...this.filters.projects];
          hasSelection = true;
        } else if (this.filters.versions && this.filters.versions.length > 0) {
          selection.versionIds = [...this.filters.versions];
          hasSelection = true;
        }
        break;
      case 'feature':
        // 优先级：features > projects > versions
        if (this.filters.features && this.filters.features.length > 0) {
          selection.featureIds = [...this.filters.features];
          hasSelection = true;
        } else if (this.filters.projects && this.filters.projects.length > 0) {
          selection.projectIds = [...this.filters.projects];
          hasSelection = true;
        } else if (this.filters.versions && this.filters.versions.length > 0) {
          selection.versionIds = [...this.filters.versions];
          hasSelection = true;
        }
        break;
    }

    return hasSelection ? selection : undefined;
  }

  /**
   * 处理树形选择器的选择变化
   * 树形选择器已处理级联勾选，这里直接使用勾选的节点ID
   * - 关注 version：使用勾选的 versionIds
   * - 关注 project：使用勾选的 projectIds
   * - 关注 feature：使用勾选的 featureIds
   */
  private handleTreeSelection(selection: TreeSelection | null): void {
    // 清空列表字段
    this.filters.versions = undefined;
    this.filters.projects = undefined;
    this.filters.features = undefined;

    if (!selection) {
      this.onFilterChange();
      return;
    }

    switch (this.currentEntityType) {
      case 'version': {
        // 关注版本：直接使用勾选的版本ID列表
        if (selection.versionIds && selection.versionIds.length > 0) {
          this.filters.versions = selection.versionIds;
        }
        break;
      }
      case 'project': {
        // 关注项目：只使用直接勾选的项目ID（树形选择器已级联勾选子节点）
        if (selection.projectIds && selection.projectIds.length > 0) {
          this.filters.projects = selection.projectIds;
        }
        break;
      }
      case 'feature': {
        // 关注特性：只使用直接勾选的特性ID（树形选择器已级联勾选子节点）
        if (selection.featureIds && selection.featureIds.length > 0) {
          this.filters.features = selection.featureIds;
        }
        break;
      }
    }

    this.onFilterChange();
  }

  /**
   * 筛选条件变化时的处理
   * 统一使用列表形式传递层级筛选字段
   */
  private onFilterChange(): void {
    const cleanFilters: ViewConfig = {
      mode: this.filters.mode,
      entityType: this.filters.entityType,
    };

    // 显式清空旧的层级字段，避免 { ...config, ...cleanFilters } 时保留旧值
    cleanFilters.versions = undefined;
    cleanFilters.projects = undefined;
    cleanFilters.features = undefined;

    // 根据 entityType 添加层级字段（统一使用列表）
    switch (this.currentEntityType) {
      case 'version':
        if (this.filters.versions && this.filters.versions.length > 0) {
          cleanFilters.versions = this.filters.versions;
        }
        break;
      case 'project':
        if (this.filters.projects && this.filters.projects.length > 0) {
          cleanFilters.projects = this.filters.projects;
        } else if (this.filters.versions && this.filters.versions.length > 0) {
          cleanFilters.versions = this.filters.versions;
        }
        break;
      case 'feature':
        if (this.filters.features && this.filters.features.length > 0) {
          cleanFilters.features = this.filters.features;
        } else if (this.filters.projects && this.filters.projects.length > 0) {
          cleanFilters.projects = this.filters.projects;
        } else if (this.filters.versions && this.filters.versions.length > 0) {
          cleanFilters.versions = this.filters.versions;
        }
        break;
    }

    // 添加其他非层级字段
    if (this.filters.status) cleanFilters.status = this.filters.status;
    if (this.filters.priority) cleanFilters.priority = this.filters.priority;
    if (this.filters.owner) cleanFilters.owner = this.filters.owner;
    if (this.filters.tag) cleanFilters.tag = this.filters.tag;

    this.onChange(cleanFilters);
    this.saveFiltersToCodeBlock();
  }

  /**
   * 保存筛选条件到代码块（使用 CodeBlockConfigService）
   * 统一使用列表形式保存层级筛选字段
   */
  private async saveFiltersToCodeBlock(): Promise<void> {
    if (!this.sourcePath || this.codeBlockStart === undefined) return;

    // 只保存筛选相关的字段，保留其他配置
    const filterUpdates: Record<string, unknown> = {};

    if (this.filters.entityType) filterUpdates.entityType = this.filters.entityType;

    // 显式清空旧的层级字段，确保代码块中删除这些键
    filterUpdates.versions = undefined;
    filterUpdates.projects = undefined;
    filterUpdates.features = undefined;

    // 根据 entityType 保存层级字段（统一使用列表）
    switch (this.currentEntityType) {
      case 'version':
        if (this.filters.versions && this.filters.versions.length > 0) {
          filterUpdates.versions = this.filters.versions;
        }
        break;
      case 'project':
        if (this.filters.projects && this.filters.projects.length > 0) {
          filterUpdates.projects = this.filters.projects;
        } else if (this.filters.versions && this.filters.versions.length > 0) {
          filterUpdates.versions = this.filters.versions;
        }
        break;
      case 'feature':
        if (this.filters.features && this.filters.features.length > 0) {
          filterUpdates.features = this.filters.features;
        } else if (this.filters.projects && this.filters.projects.length > 0) {
          filterUpdates.projects = this.filters.projects;
        } else if (this.filters.versions && this.filters.versions.length > 0) {
          filterUpdates.versions = this.filters.versions;
        }
        break;
    }

    if (this.filters.status) filterUpdates.status = this.filters.status;
    if (this.filters.priority) filterUpdates.priority = this.filters.priority;
    if (this.filters.owner) filterUpdates.owner = this.filters.owner;
    if (this.filters.tag) filterUpdates.tag = this.filters.tag;

    await this.configService.saveConfig(
      this.sourcePath,
      this.codeBlockStart,
      filterUpdates,
      { preserveKeys: ['mode', 'title', 'groupBy', 'sortBy', 'sortOrder', 'limit', 'cols', 'expanded'] }
    );
  }

  /**
   * 获取当前筛选条件
   */
  getFilters(): ViewConfig {
    return { ...this.filters };
  }

  /**
   * 销毁筛选栏，清理所有事件监听器
   */
  destroy(): void {
    // 执行所有清理函数
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];

    // 清理容器
    if (this.container) {
      this.container.remove();
      this.container = undefined;
    }

    // 清理树选择器
    if (this.treeSelector) {
      this.treeSelector.destroy();
      this.treeSelector = undefined;
    }
  }
}
