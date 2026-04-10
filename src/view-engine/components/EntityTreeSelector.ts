import { type App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { EntityType } from '../types';

/**
 * 树节点选择 - 支持多选
 */
export interface TreeSelection {
  versionIds?: string[];
  projectIds?: string[];
  featureIds?: string[];
  type: EntityType;
}

/**
 * 树形选择器选项
 */
export interface EntityTreeSelectorOptions {
  entityType: EntityType;
  onSelect: (selection: TreeSelection | null) => void;
  initialSelection?: TreeSelection;
}

/**
 * 树节点数据结构
 */
interface TreeNode {
  id: string;
  name: string;
  type: EntityType;
  children?: TreeNode[];
  expanded?: boolean;
  parentId?: string;
}

/**
 * 实体类型颜色配置（与 SelectCell 风格一致）
 */
const ENTITY_TYPE_COLORS: Record<EntityType, { bg: string; text: string; border: string }> = {
  version: { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1', border: 'rgba(99, 102, 241, 0.3)' },
  project: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  feature: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
};

/**
 * EntityTreeSelector - 实体树形级联选择器
 * 支持版本 → 项目 → 特性的层级展示，所有层级支持勾选
 * 采用 SelectCell 风格的视觉设计
 */
export class EntityTreeSelector {
  private container?: HTMLElement;
  private treeData: TreeNode[] = [];
  private selectedIds: Set<string> = new Set();
  private dropdownEl?: HTMLElement;

  constructor(
    private app: App,
    private entityManager: EntityManager,
    private options: EntityTreeSelectorOptions
  ) {
    // 初始化选中状态
    const initial = options.initialSelection;
    if (initial) {
      if (initial.versionIds) initial.versionIds.forEach(id => this.selectedIds.add(id));
      if (initial.projectIds) initial.projectIds.forEach(id => this.selectedIds.add(id));
      if (initial.featureIds) initial.featureIds.forEach(id => this.selectedIds.add(id));
    }
  }

  /**
   * 加载树形数据
   */
  async loadTree(): Promise<TreeNode[]> {
    const versions = await this.entityManager.listVersions();
    const tree: TreeNode[] = [];

    for (const version of versions) {
      const versionNode: TreeNode = {
        id: version.id,
        name: version.name,
        type: 'version',
        expanded: true,
        children: [],
      };

      // 加载项目
      const projects = await this.entityManager.listProjects({ versionId: version.id });
      for (const project of projects) {
        const projectNode: TreeNode = {
          id: project.id,
          name: project.name,
          type: 'project',
          expanded: false,
          parentId: version.id,
          children: [],
        };

        // 加载特性
        const features = await this.entityManager.listFeatures({ projectId: project.id });
        for (const feature of features) {
          projectNode.children!.push({
            id: feature.id,
            name: feature.name,
            type: 'feature',
            parentId: project.id,
          });
        }

        versionNode.children!.push(projectNode);
      }

      tree.push(versionNode);
    }

    this.treeData = tree;
    return tree;
  }

  /**
   * 渲染选择器
   * 采用 SelectCell 风格的 badge 触发器
   */
  render(container: HTMLElement): void {
    this.container = container;
    container.empty();

    const wrapper = container.createDiv('pm-entity-tree-selector');

    // 触发按钮 - 使用 badge 风格（与 SelectCell 一致）
    const triggerBtn = wrapper.createDiv('pm-entity-tree-trigger pm-cell-badge');
    this.updateTriggerDisplay(triggerBtn);

    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown(wrapper);
    });

    // 点击外部关闭
    document.addEventListener('click', (e) => {
      if (this.dropdownEl && !this.dropdownEl.contains(e.target as Node) && !wrapper.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });
  }

  /**
   * 更新触发按钮显示
   * 采用 SelectCell 的 badge 风格：彩色背景 + 圆角 + 边框
   */
  private updateTriggerDisplay(triggerEl: HTMLElement): void {
    triggerEl.empty();

    const count = this.selectedIds.size;
    const entityType = this.options.entityType;
    const colors = ENTITY_TYPE_COLORS[entityType];

    // 设置 badge 样式（与 SelectCell 一致）
    triggerEl.style.backgroundColor = colors.bg;
    triggerEl.style.color = colors.text;
    triggerEl.style.border = `1px solid ${colors.border}`;

    if (count === 0) {
      // 未选择时显示占位符
      triggerEl.createSpan({
        text: this.getPlaceholder(),
        cls: 'pm-entity-tree-trigger-text',
      });
    } else {
      // 已选择时显示数量和类型标签
      const label = this.getEntityTypeLabel(entityType);
      triggerEl.createSpan({
        text: `${label} · ${count}`,
        cls: 'pm-entity-tree-trigger-text',
      });
    }

    // 添加下拉箭头（与 SelectCell 的下拉指示一致）
    const arrow = triggerEl.createSpan({
      cls: 'pm-entity-tree-trigger-arrow',
    });
    arrow.style.cssText = `
      margin-left: 6px;
      font-size: 10px;
      opacity: 0.7;
    `;
    arrow.textContent = '▼';
  }

  /**
   * 获取实体类型标签
   */
  private getEntityTypeLabel(type: EntityType): string {
    switch (type) {
      case 'version': return '版本';
      case 'project': return '项目';
      case 'feature': return '特性';
      default: return '';
    }
  }

  /**
   * 获取占位符文本
   */
  private getPlaceholder(): string {
    return `全部${this.getEntityTypeLabel(this.options.entityType)}`;
  }

  /**
   * 切换下拉显示
   * 采用 SelectCell 风格的下拉面板（pm-cell-dropdown）
   */
  private async toggleDropdown(wrapper: HTMLElement): Promise<void> {
    if (this.dropdownEl) {
      this.closeDropdown();
      return;
    }

    if (this.treeData.length === 0) {
      await this.loadTree();
    }

    // 创建下拉面板到 body - 使用 pm-cell-dropdown 风格
    this.dropdownEl = document.body.createDiv('pm-cell-dropdown pm-tree-dropdown-panel');

    // 计算位置（相对于触发器）
    this.positionDropdown(wrapper);

    // 监听滚动和窗口变化
    const updatePosition = () => this.positionDropdown(wrapper);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    (this.dropdownEl as any)._cleanup = () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };

    // 头部：全部选项（带颜色圆点指示器，类似 SelectCell）
    const headerEl = this.dropdownEl.createDiv('pm-tree-dropdown-header pm-cell-dropdown-item');
    const allCheckbox = headerEl.createEl('input', { type: 'checkbox' });
    allCheckbox.className = 'pm-tree-checkbox';
    allCheckbox.checked = this.selectedIds.size === 0;
    allCheckbox.addEventListener('change', () => {
      this.selectedIds.clear();
      this.refreshCheckboxes();
      this.updateSelection();
    });

    // 添加颜色圆点（与 SelectCell 一致的风格）
    const dot = headerEl.createSpan('pm-tree-color-dot');
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-muted);
      flex-shrink: 0;
      margin-left: 4px;
    `;

    headerEl.createSpan({ text: this.getPlaceholder() });

    // 选中标记（当全部未选时显示 ✓）
    if (this.selectedIds.size === 0) {
      headerEl.createSpan({
        text: '✓',
        cls: 'pm-cell-dropdown-check',
      }).style.cssText = 'margin-left: auto; font-weight: bold;';
    }

    // 树形容器
    const treeContainer = this.dropdownEl.createDiv('pm-tree-container');
    for (const node of this.treeData) {
      this.renderNode(treeContainer, node, 0);
    }
  }

  /**
   * 计算下拉框位置
   * 使用 fixed 定位，与 SelectCell 一致
   */
  private positionDropdown(triggerEl: HTMLElement): void {
    if (!this.dropdownEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const dropdownHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + 4;

    // 如果下方空间不足，显示在上方
    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      top = Math.max(8, rect.top - dropdownHeight - 4);
    }

    this.dropdownEl.style.cssText += `
      position: fixed;
      left: ${rect.left}px;
      top: ${top}px;
      min-width: 200px;
      max-width: 320px;
      max-height: 320px;
      overflow-y: auto;
    `;
  }

  /**
   * 关闭下拉
   */
  private closeDropdown(): void {
    if (this.dropdownEl) {
      if ((this.dropdownEl as any)._cleanup) {
        (this.dropdownEl as any)._cleanup();
      }
      this.dropdownEl.remove();
      this.dropdownEl = undefined;
    }
  }

  /**
   * 渲染树节点
   * 采用 SelectCell 的 dropdown-item 风格
   */
  private renderNode(container: HTMLElement, node: TreeNode, depth: number): void {
    const isSelected = this.isNodeSelected(node);
    const hasChildren = node.children && node.children.length > 0;

    const nodeEl = container.createDiv('pm-tree-node');

    // 内容行 - 使用 pm-cell-dropdown-item 风格
    const contentRow = nodeEl.createDiv('pm-tree-node-content pm-cell-dropdown-item');
    contentRow.style.cssText += `
      padding-left: ${depth * 20 + 8}px;
      margin: 2px 0;
    `;

    // 展开/折叠按钮
    if (hasChildren) {
      const expandBtn = contentRow.createSpan('pm-tree-expand');
      expandBtn.textContent = node.expanded ? '▼' : '▶';
      expandBtn.style.cssText = `
        font-size: 10px;
        width: 16px;
        text-align: center;
        cursor: pointer;
        opacity: 0.6;
      `;
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleNode(node, nodeEl);
      });
    } else {
      contentRow.createSpan('pm-tree-expand-placeholder').style.cssText = 'width: 16px;';
    }

    // Checkbox（所有层级都有）
    const checkbox = contentRow.createEl('input', { type: 'checkbox' });
    checkbox.className = 'pm-tree-checkbox';
    checkbox.style.cssText = `
      margin: 0 4px 0 2px;
      cursor: pointer;
    `;
    checkbox.checked = isSelected;
    checkbox.dataset.nodeId = node.id;
    checkbox.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.toggleNodeSelection(node, checked);
    });

    // 颜色圆点（与 SelectCell 一致的风格）
    const dot = contentRow.createSpan('pm-tree-color-dot');
    const colors = ENTITY_TYPE_COLORS[node.type];
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${colors.text};
      flex-shrink: 0;
      margin-right: 6px;
    `;

    // 名称
    const nameEl = contentRow.createSpan('pm-tree-name');
    nameEl.textContent = node.name;

    // 选中标记（如果选中）
    if (isSelected) {
      contentRow.createSpan({
        text: '✓',
        cls: 'pm-cell-dropdown-check',
      }).style.cssText = 'margin-left: auto; font-weight: bold;';
    }

    // 子节点容器
    if (hasChildren) {
      const childrenContainer = nodeEl.createDiv('pm-tree-children');
      if (!node.expanded) {
        childrenContainer.style.display = 'none';
      }

      for (const child of node.children!) {
        this.renderNode(childrenContainer, child, depth + 1);
      }
    }
  }

  /**
   * 判断节点是否被选中（递归检查自身和子节点）
   */
  private isNodeSelected(node: TreeNode): boolean {
    // 如果当前节点被选中，返回 true
    if (this.selectedIds.has(node.id)) {
      return true;
    }
    // 如果子节点中有被选中的，也视为选中（半选状态）
    if (node.children) {
      return node.children.some(child => this.isNodeSelected(child));
    }
    return false;
  }

  /**
   * 切换节点及子节点的选择状态
   */
  private toggleNodeSelection(node: TreeNode, checked: boolean): void {
    if (checked) {
      this.selectedIds.add(node.id);
    } else {
      this.selectedIds.delete(node.id);
    }

    // 递归勾选/取消所有子节点
    if (node.children) {
      for (const child of node.children) {
        this.toggleNodeSelection(child, checked);
      }
    }

    // 更新显示
    this.refreshCheckboxes();
    this.updateTriggerDisplay(this.container!.querySelector('.pm-entity-tree-trigger') as HTMLElement);
    this.updateSelection();
  }

  /**
   * 切换节点展开/折叠
   */
  private toggleNode(node: TreeNode, nodeEl: HTMLElement): void {
    node.expanded = !node.expanded;

    const expandBtn = nodeEl.querySelector('.pm-tree-expand');
    if (expandBtn) {
      expandBtn.textContent = node.expanded ? '▼' : '▶';
    }

    const childrenContainer = nodeEl.querySelector('.pm-tree-children') as HTMLElement;
    if (childrenContainer) {
      childrenContainer.style.display = node.expanded ? 'block' : 'none';
    }
  }

  /**
   * 切换选择状态
   */
  private toggleSelection(nodeId: string, checked: boolean): void {
    if (checked) {
      this.selectedIds.add(nodeId);
    } else {
      this.selectedIds.delete(nodeId);
    }

    // 更新触发按钮
    if (this.container) {
      const triggerBtn = this.container.querySelector('.pm-entity-tree-trigger');
      if (triggerBtn) {
        this.updateTriggerDisplay(triggerBtn as HTMLElement);
      }
    }

    // 触发回调
    this.updateSelection();
  }

  /**
   * 刷新所有 checkbox 状态和选中标记
   * 与 SelectCell 风格一致：选中项显示 ✓ 标记
   */
  private refreshCheckboxes(): void {
    if (!this.dropdownEl) return;

    // 更新树节点
    const contentRows = this.dropdownEl.querySelectorAll('.pm-tree-node-content');
    contentRows.forEach((row) => {
      const checkbox = row.querySelector('.pm-tree-checkbox') as HTMLInputElement;
      if (!checkbox) return;

      const nodeId = checkbox.dataset.nodeId;
      if (nodeId) {
        const isSelected = this.selectedIds.has(nodeId);
        checkbox.checked = isSelected;

        // 更新或移除 ✓ 标记
        let checkMark = row.querySelector('.pm-cell-dropdown-check');
        if (isSelected) {
          if (!checkMark) {
            checkMark = row.createSpan({
              text: '✓',
              cls: 'pm-cell-dropdown-check',
            });
            (checkMark as HTMLElement).style.cssText = 'margin-left: auto; font-weight: bold;';
          }
        } else if (checkMark) {
          checkMark.remove();
        }
      }
    });

    // 更新头部"全部"复选框和选中标记
    const headerRow = this.dropdownEl.querySelector('.pm-tree-dropdown-header');
    if (headerRow) {
      const headerCheckbox = headerRow.querySelector('input') as HTMLInputElement;
      if (headerCheckbox) {
        headerCheckbox.checked = this.selectedIds.size === 0;
      }

      // 更新头部 ✓ 标记
      let headerCheckMark = headerRow.querySelector('.pm-cell-dropdown-check');
      if (this.selectedIds.size === 0) {
        if (!headerCheckMark) {
          headerCheckMark = headerRow.createSpan({
            text: '✓',
            cls: 'pm-cell-dropdown-check',
          });
          (headerCheckMark as HTMLElement).style.cssText = 'margin-left: auto; font-weight: bold;';
        }
      } else if (headerCheckMark) {
        headerCheckMark.remove();
      }
    }

    // 更新触发按钮显示
    if (this.container) {
      const triggerBtn = this.container.querySelector('.pm-entity-tree-trigger') as HTMLElement;
      if (triggerBtn) {
        this.updateTriggerDisplay(triggerBtn);
      }
    }
  }

  /**
   * 更新选择并触发回调
   */
  private updateSelection(): void {
    const selection: TreeSelection = {
      type: this.options.entityType,
    };

    // 根据 entityType 收集选中 ID
    const ids = Array.from(this.selectedIds);
    switch (this.options.entityType) {
      case 'version':
        selection.versionIds = ids;
        break;
      case 'project':
        selection.projectIds = ids;
        break;
      case 'feature':
        selection.featureIds = ids;
        break;
    }

    this.options.onSelect(ids.length > 0 ? selection : null);
  }

  /**
   * 获取节点图标
   */
  private getNodeIcon(type: EntityType): string {
    switch (type) {
      case 'version': return '📁';
      case 'project': return '📂';
      case 'feature': return '📄';
      default: return '📄';
    }
  }

  /**
   * 更新 entityType
   */
  async updateEntityType(entityType: EntityType): Promise<void> {
    this.options.entityType = entityType;
    this.selectedIds.clear();
    this.treeData = [];

    if (this.container) {
      const triggerBtn = this.container.querySelector('.pm-entity-tree-trigger');
      if (triggerBtn) {
        this.updateTriggerDisplay(triggerBtn as HTMLElement);
      }
    }
  }

  /**
   * 获取当前选择
   */
  getSelection(): TreeSelection | null {
    if (this.selectedIds.size === 0) return null;

    const selection: TreeSelection = { type: this.options.entityType };
    const ids = Array.from(this.selectedIds);

    switch (this.options.entityType) {
      case 'version':
        selection.versionIds = ids;
        break;
      case 'project':
        selection.projectIds = ids;
        break;
      case 'feature':
        selection.featureIds = ids;
        break;
    }

    return selection;
  }
}
