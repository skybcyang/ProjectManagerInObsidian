import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { ViewConfig, ViewMode, EntityType } from '../types';
import { VIEW_MODE_LABELS } from '../types';
import { EntityTreeSelector } from '../components/EntityTreeSelector';
import type { TreeSelection } from '../components/EntityTreeSelector';
import { hexToRgba } from '../../utils';
import type { SortMenuController } from './SortMenuController';

/**
 * 工具栏配置选项
 */
export interface ToolbarOptions {
	onViewModeChange: (mode: ViewMode) => void;
	onPropertyClick: () => void;
	onFullscreenClick?: () => void;
	sortMenuController?: SortMenuController;
	onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
	sortConfig?: ViewConfig;
}

/**
 * 工具栏控制器
 * 负责渲染完整工具栏：视图切换 + 筛选 badges + 排序 + 属性 + 全屏
 */
export class ToolbarController {
	private container?: HTMLElement;
	private filters: ViewConfig = { mode: 'cascade' };
	private owners: string[] = [];
	private treeSelector?: EntityTreeSelector;
	private currentEntityType: EntityType = 'feature';
	private cleanupFns: (() => void)[] = [];

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
		private onSave: (filterUpdates: Record<string, unknown>) => void,
		private sourcePath?: string,
		private codeBlockIndex?: number
	) {}

	/**
	 * 加载选项数据（使用缓存优化）
	 */
	async loadOptions(): Promise<void> {
		const ownersFromCache = this.entityManager.getOwners();
		this.owners = ['全部负责人', ...ownersFromCache];
	}

	/**
	 * 渲染工具栏
	 */
	render(
		wrapper: HTMLElement,
		config: ViewConfig,
		options: ToolbarOptions
	): HTMLElement {
		const toolbar = wrapper.createDiv('pm-view-toolbar');
		this.container = toolbar;

		// 同步初始筛选条件
		this.filters = { ...this.filters, ...config };
		if (config.entityType) {
			this.currentEntityType = config.entityType;
		}

		// 左侧：视图模式切换下拉
		this.renderViewModeSelector(toolbar, config, options.onViewModeChange);

		// 右侧：功能按钮组 + 筛选器
		const rightGroup = toolbar.createDiv('pm-toolbar-group pm-toolbar-right');
		this.renderFilters(rightGroup, config);

		// 排序 badge
		if (options.sortMenuController && options.onSortChange && options.sortConfig) {
			options.sortMenuController.renderBadge(rightGroup, options.sortConfig, options.onSortChange);
		}

		// 属性按钮
		this.renderPropertyButton(rightGroup, options.onPropertyClick);

		// 全屏按钮
		if (options.onFullscreenClick) {
			this.renderFullscreenButton(rightGroup, options.onFullscreenClick);
		}

		return toolbar;
	}

	/**
	 * 渲染筛选器 badges
	 */
	private renderFilters(container: HTMLElement, config: ViewConfig): void {
		// 实体类型
		this.createSelectCell(container, '实体类型', this.entityTypeOptions, this.currentEntityType, (value) => {
			this.currentEntityType = value as EntityType;
			this.filters.entityType = this.currentEntityType;
			this.filters.version = undefined;
			this.filters.project = undefined;
			this.filters.feature = undefined;
			this.filters.versions = undefined;
			this.filters.projects = undefined;
			this.filters.features = undefined;
			this.treeSelector?.updateEntityType(this.currentEntityType);
			this.onFilterChange();
		});

		// 树形层级选择器
		const treeWrapper = container.createDiv('pm-filter-tree-wrapper');
		this.treeSelector = new EntityTreeSelector(this.app, this.entityManager, {
			entityType: this.currentEntityType,
			onSelect: (selection) => {
				this.handleTreeSelection(selection);
			},
			initialSelection: this.buildInitialSelection(),
		});
		this.treeSelector.render(treeWrapper);

		// 状态
		this.createSelectCell(container, '状态', this.statusOptions, this.filters.status || '', (value) => {
			this.filters.status = value || undefined;
			this.onFilterChange();
		});

		// 优先级
		this.createSelectCell(container, '优先级', this.priorityOptions, this.filters.priority || '', (value) => {
			this.filters.priority = value || undefined;
			this.onFilterChange();
		});

		// 负责人
		const ownerOptions = this.owners.map(o => ({
			value: o === '全部负责人' ? '' : o,
			label: o,
			color: '#8b5cf6'
		}));
		this.createSelectCell(container, '负责人', ownerOptions, this.filters.owner || '', (value) => {
			this.filters.owner = value || undefined;
			this.onFilterChange();
		});
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

		Object.entries(VIEW_MODE_LABELS).forEach(([mode, label]) => {
			const option = viewModeSelect.createEl('option', {
				text: label,
				value: mode,
			});
			if (mode === config.mode) {
				option.selected = true;
			}
		});

		viewModeSelect.addEventListener('change', () => {
			onChange(viewModeSelect.value as ViewMode);
		});
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

		const triggerBtn = wrapper.createDiv('pm-cell-badge pm-filter-badge');
		const selectedOption = options.find(opt => opt.value === value) || options[0];
		this.updateBadgeStyle(triggerBtn, selectedOption);

		let dropdownEl: HTMLElement | null = null;
		let currentValue = value;

		triggerBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			if (dropdownEl) {
				dropdownEl.remove();
				dropdownEl = null;
				return;
			}
			dropdownEl = this.createDropdown(wrapper, options, currentValue, (newValue) => {
				currentValue = newValue;
				onChange(newValue);
				const newOption = options.find(opt => opt.value === newValue) || options[0];
				this.updateBadgeStyle(triggerBtn, newOption);
				dropdownEl?.remove();
				dropdownEl = null;
			});
		});

		const closeHandler = (e: MouseEvent) => {
			if (dropdownEl && !dropdownEl.contains(e.target as Node) && !wrapper.contains(e.target as Node)) {
				dropdownEl.remove();
				dropdownEl = null;
			}
		};
		document.addEventListener('click', closeHandler);

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
			background-color: ${hexToRgba(color, 0.15)};
			color: ${color};
			border-color: ${hexToRgba(color, 0.3)};
		`;

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

			const color = opt.color || '#9ca3af';
			const dot = item.createSpan();
			dot.style.cssText = `
				width: 8px;
				height: 8px;
				border-radius: 50%;
				background: ${color};
				flex-shrink: 0;
			`;

			item.createSpan({ text: opt.label });

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
	 * 构建初始选择状态
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
				if (this.filters.projects && this.filters.projects.length > 0) {
					selection.projectIds = [...this.filters.projects];
					hasSelection = true;
				} else if (this.filters.versions && this.filters.versions.length > 0) {
					selection.versionIds = [...this.filters.versions];
					hasSelection = true;
				}
				break;
			case 'feature':
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
	 */
	private handleTreeSelection(selection: TreeSelection | null): void {
		this.filters.versions = undefined;
		this.filters.projects = undefined;
		this.filters.features = undefined;

		if (!selection) {
			this.onFilterChange();
			return;
		}

		switch (this.currentEntityType) {
			case 'version': {
				if (selection.versionIds && selection.versionIds.length > 0) {
					this.filters.versions = selection.versionIds;
				}
				break;
			}
			case 'project': {
				if (selection.projectIds && selection.projectIds.length > 0) {
					this.filters.projects = selection.projectIds;
				}
				break;
			}
			case 'feature': {
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
	 */
	private onFilterChange(): void {
		const cleanFilters: ViewConfig = {
			mode: this.filters.mode,
			entityType: this.filters.entityType,
		};

		cleanFilters.versions = undefined;
		cleanFilters.projects = undefined;
		cleanFilters.features = undefined;

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

		if (this.filters.status) cleanFilters.status = this.filters.status;
		if (this.filters.priority) cleanFilters.priority = this.filters.priority;
		if (this.filters.owner) cleanFilters.owner = this.filters.owner;
		if (this.filters.tag) cleanFilters.tag = this.filters.tag;

		this.onChange(cleanFilters);
		this.saveFiltersToCodeBlock();
	}

	/**
	 * 保存筛选条件到代码块
	 */
	private saveFiltersToCodeBlock(): void {
		const filterUpdates: Record<string, unknown> = {};

		if (this.filters.entityType) filterUpdates.entityType = this.filters.entityType;

		filterUpdates.versions = undefined;
		filterUpdates.projects = undefined;
		filterUpdates.features = undefined;

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

		filterUpdates.status = this.filters.status || undefined;
		filterUpdates.priority = this.filters.priority || undefined;
		filterUpdates.owner = this.filters.owner || undefined;
		filterUpdates.tag = this.filters.tag || undefined;

		this.onSave(filterUpdates);
	}

	/**
	 * 渲染属性按钮
	 */
	private renderPropertyButton(container: HTMLElement, onClick: () => void): void {
		const propBtn = container.createDiv('pm-cell-badge pm-toolbar-prop-btn');
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
		propBtn.addEventListener('click', onClick);
	}

	/**
	 * 渲染全屏按钮
	 */
	private renderFullscreenButton(container: HTMLElement, onClick: () => void): void {
		const fsBtn = container.createEl('button', {
			cls: 'pm-toolbar-btn pm-toolbar-btn-fullscreen',
		});
		const { setIcon } = require('obsidian');
		setIcon(fsBtn, 'maximize');
		fsBtn.addEventListener('click', onClick);
	}

	/**
	 * 获取当前筛选条件
	 */
	getFilters(): ViewConfig {
		return { ...this.filters };
	}

	/**
	 * 销毁工具栏，清理所有事件监听器
	 */
	destroy(): void {
		this.cleanupFns.forEach(fn => fn());
		this.cleanupFns = [];

		if (this.container) {
			this.container.remove();
			this.container = undefined;
		}

		if (this.treeSelector) {
			this.treeSelector.destroy();
			this.treeSelector = undefined;
		}
	}
}
