import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { CardRegistry } from '../../ui/cards';
import type { DataService, ActionService } from '../services';
import type { ViewConfig, EntityType, CascadeSelectorConfig } from '../types';
import { BaseRenderer } from './BaseRenderer';
import { ViewEngine } from '../ViewEngine';

/**
 * 级联选择器渲染器
 * 三级联动：视图模式 → 实体类型 → 具体实体
 */
export class CascadeSelectorRenderer extends BaseRenderer {
  private viewEngine?: ViewEngine;
  private currentViewContainer?: HTMLElement;

  // 当前选中的值（顺序：实体类型 → 具体实体 → 视图模式）
  private currentState = {
    entityType: 'feature' as EntityType,
    entityId: '',
    viewMode: 'kanban',
  };

  constructor(
    app: App,
    entityManager: EntityManager,
    cardRegistry: CardRegistry,
    dataService: DataService,
    actionService: ActionService
  ) {
    super(app, entityManager, cardRegistry, dataService, actionService);
  }

  /**
   * 获取或创建 ViewEngine
   */
  private getViewEngine(): ViewEngine {
    if (!this.viewEngine) {
      this.viewEngine = new ViewEngine(this.app, this.entityManager, this.cardRegistry);
    }
    return this.viewEngine;
  }

  /**
   * 渲染级联选择器视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-cascade-selector-view');

    const config = this.config as ViewConfig & { cascadeSelector: CascadeSelectorConfig };
    const selectorConfig = config.cascadeSelector || {};

    // 初始化状态（顺序：实体类型 → 具体实体 → 视图模式）
    this.currentState.entityType = selectorConfig.entityType?.defaultValue || 'feature';
    this.currentState.entityId = selectorConfig.entity?.defaultValue || '';
    this.currentState.viewMode = selectorConfig.viewMode?.defaultValue || 'kanban';

    // 创建选择器容器
    const selectorContainer = container.createDiv('pm-cascade-selector-container');

    // 渲染三级选择器（顺序：实体类型 → 具体实体 → 视图模式）
    const entityTypeSelect = await this.renderEntityTypeSelector(selectorContainer, selectorConfig.entityType);
    const entitySelect = await this.renderEntitySelector(selectorContainer, selectorConfig.entity);
    const viewModeSelect = await this.renderViewModeSelector(selectorContainer, selectorConfig.viewMode);

    // 创建视图容器
    this.currentViewContainer = container.createDiv('pm-cascade-selector-view-container');
    this.currentViewContainer.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
    this.currentViewContainer.style.minHeight = '300px';
    this.currentViewContainer.dataset.containerId = Math.random().toString(36).substring(2, 8);
    console.log('[CascadeSelectorRenderer] 创建视图容器, id:', this.currentViewContainer.dataset.containerId);

    // 初始渲染：先加载实体列表
    await this.refreshEntityOptions(entitySelect, this.currentState.entityType);
    if (this.currentState.entityId) {
      // 检查默认值是否在选项中
      const exists = Array.from(entitySelect.options).some(o => o.value === this.currentState.entityId);
      if (exists) {
        entitySelect.value = this.currentState.entityId;
      } else {
        // 默认值不在当前类型的列表中，清空选择
        this.currentState.entityId = '';
        entitySelect.value = '';
      }
    }
    console.log('[CascadeSelectorRenderer] 初始状态:', JSON.stringify(this.currentState));
    await this.renderCurrentView();

    // 监听实体类型变化
    entityTypeSelect.addEventListener('change', () => {
      this.currentState.entityType = entityTypeSelect.value as EntityType;
      this.currentState.entityId = ''; // 清空实体选择
      entitySelect.value = ''; // 重置下拉框
      this.refreshEntityOptions(entitySelect, this.currentState.entityType).then(() => {
        this.renderCurrentView();
      });
    });

    // 监听实体变化
    entitySelect.addEventListener('change', () => {
      this.currentState.entityId = entitySelect.value;
      console.log('[CascadeSelectorRenderer] 实体变化:', this.currentState.entityType, this.currentState.entityId);
      this.renderCurrentView();
    });

    // 监听视图模式变化
    viewModeSelect.addEventListener('change', () => {
      this.currentState.viewMode = viewModeSelect.value;
      console.log('[CascadeSelectorRenderer] 视图模式变化:', this.currentState.viewMode);
      this.renderCurrentView();
    });
  }

  /**
   * 渲染视图模式选择器
   */
  private async renderViewModeSelector(
    container: HTMLElement,
    config?: CascadeSelectorConfig['viewMode']
  ): Promise<HTMLSelectElement> {
    const wrapper = container.createDiv('pm-cascade-selector-item');

    wrapper.createEl('label', {
      text: config?.label || '视图模式',
      cls: 'pm-cascade-selector-label',
    });

    const selectEl = wrapper.createEl('select', {
      cls: 'pm-cascade-selector-dropdown',
    });

    const options = [
      { label: '看板', value: 'kanban' },
      { label: '网格', value: 'grid' },
      { label: '级联', value: 'cascade' },
      { label: '时间线', value: 'timeline' },
      { label: '日历', value: 'calendar' },
    ];

    for (const option of options) {
      const optEl = selectEl.createEl('option', {
        text: option.label,
        value: option.value,
      });
      if (option.value === this.currentState.viewMode) {
        optEl.selected = true;
      }
    }

    return selectEl;
  }

  /**
   * 渲染实体类型选择器
   */
  private async renderEntityTypeSelector(
    container: HTMLElement,
    config?: CascadeSelectorConfig['entityType']
  ): Promise<HTMLSelectElement> {
    const wrapper = container.createDiv('pm-cascade-selector-item');

    wrapper.createEl('label', {
      text: config?.label || '实体类型',
      cls: 'pm-cascade-selector-label',
    });

    const selectEl = wrapper.createEl('select', {
      cls: 'pm-cascade-selector-dropdown',
    });

    const options = [
      { label: '版本', value: 'version' },
      { label: '项目', value: 'project' },
      { label: '特性', value: 'feature' },
    ];

    for (const option of options) {
      const optEl = selectEl.createEl('option', {
        text: option.label,
        value: option.value,
      });
      if (option.value === this.currentState.entityType) {
        optEl.selected = true;
      }
    }

    return selectEl;
  }

  /**
   * 渲染实体选择器
   */
  private async renderEntitySelector(
    container: HTMLElement,
    config?: CascadeSelectorConfig['entity']
  ): Promise<HTMLSelectElement> {
    const wrapper = container.createDiv('pm-cascade-selector-item');

    wrapper.createEl('label', {
      text: config?.label || '选择实体',
      cls: 'pm-cascade-selector-label',
    });

    const selectEl = wrapper.createEl('select', {
      cls: 'pm-cascade-selector-dropdown',
    });

    // 空选项
    if (config?.allowEmpty !== false) {
      selectEl.createEl('option', {
        text: '请选择...',
        value: '',
      });
    }

    return selectEl;
  }

  /**
   * 刷新实体选项
   */
  private async refreshEntityOptions(
    selectEl: HTMLSelectElement,
    entityType: EntityType
  ): Promise<void> {
    // 保存当前值
    const currentValue = selectEl.value;

    // 清空选项
    selectEl.empty();

    // 添加空选项
    selectEl.createEl('option', {
      text: '请选择...',
      value: '',
    });

    // 加载新选项
    let options: Array<{ label: string; value: string }> = [];

    switch (entityType) {
      case 'version': {
        const versions = await this.entityManager.listVersions();
        options = versions.map((v) => ({ label: v.name, value: v.id }));
        break;
      }
      case 'project': {
        const projects = await this.entityManager.listProjects();
        options = projects.map((p) => ({ label: p.name, value: p.id }));
        break;
      }
      case 'feature': {
        const features = await this.entityManager.listFeatures();
        options = features.map((f) => ({ label: f.name, value: f.id }));
        break;
      }
    }

    for (const option of options) {
      selectEl.createEl('option', {
        text: option.label,
        value: option.value,
      });
    }

    // 尝试恢复之前的值
    if (currentValue) {
      const exists = Array.from(selectEl.options).some((o) => o.value === currentValue);
      if (exists) {
        selectEl.value = currentValue;
      }
    }
  }

  /**
   * 渲染当前视图
   */
  private async renderCurrentView(): Promise<void> {
    if (!this.currentViewContainer) {
      console.error('[CascadeSelectorRenderer] 视图容器不存在');
      return;
    }

    // 显示加载状态
    this.currentViewContainer.empty();
    const loadingEl = this.currentViewContainer.createDiv('pm-cascade-selector-loading');
    loadingEl.textContent = '加载中...';

    try {
      console.log('[CascadeSelectorRenderer] 开始渲染:', this.currentState);

      // 构建视图配置
      let viewConfig: ViewConfig & { _hideToolbar?: boolean };

      // 根据实体类型和视图模式调整配置
      if (this.currentState.viewMode === 'cascade') {
        // 级联视图显示完整层级（版本→项目→特性）
        // 如果选择了具体实体，从该实体开始展开；否则显示全部
        viewConfig = {
          mode: 'cascade',
          type: this.currentState.entityId ? this.currentState.entityType : 'version',
          id: this.currentState.entityId,
          expanded: true,
          _hideToolbar: true,
        };
      } else if (this.currentState.entityType === 'feature' && this.currentState.entityId) {
        // 选择了具体特性 - 显示该特性详情（级联展示）
        viewConfig = {
          mode: this.currentState.viewMode as any,
          type: 'feature',
          id: this.currentState.entityId,
          _hideToolbar: true,
        };

        // 看板默认按状态分组
        if (this.currentState.viewMode === 'kanban') {
          viewConfig.groupBy = 'status';
        } else if (this.currentState.viewMode === 'grid') {
          viewConfig.cols = 3;
        }
      } else {
        // 看板/网格/时间线/日历视图显示该实体下的特性列表
        viewConfig = {
          mode: this.currentState.viewMode as any,
          type: 'feature',
          _hideToolbar: true,
        };

        // 根据实体类型添加过滤条件
        if (this.currentState.entityType === 'version' && this.currentState.entityId) {
          viewConfig.filter = { versionId: this.currentState.entityId };
        } else if (this.currentState.entityType === 'project' && this.currentState.entityId) {
          viewConfig.filter = { projectId: this.currentState.entityId };
        }

        // 看板默认按状态分组
        if (this.currentState.viewMode === 'kanban') {
          viewConfig.groupBy = 'status';
        } else if (this.currentState.viewMode === 'grid') {
          viewConfig.cols = 3;
        }
      }
      
      console.log('[CascadeSelectorRenderer] viewConfig:', JSON.stringify(viewConfig));

      // 清空加载状态
      const containerId = this.currentViewContainer.dataset.containerId;
      console.log('[CascadeSelectorRenderer] 准备清空容器, id:', containerId, '当前子元素:', this.currentViewContainer.children.length);
      this.currentViewContainer.empty();
      console.log('[CascadeSelectorRenderer] 视图容器已清空，id:', containerId);

      // 创建新的 ViewEngine 并渲染
      const viewEngine = new ViewEngine(this.app, this.entityManager, this.cardRegistry);
      console.log('[CascadeSelectorRenderer] 调用 viewEngine.render');
      
      await viewEngine.render(this.currentViewContainer, viewConfig, {
        sourcePath: this.context.sourcePath,
        el: this.currentViewContainer,
      });
      
      const finalContainerId = this.currentViewContainer?.dataset.containerId;
      const finalChildCount = this.currentViewContainer?.children.length;
      const firstChildClass = this.currentViewContainer?.children[0]?.className;
      console.log('[CascadeSelectorRenderer] 渲染完成，容器id:', finalContainerId, '子元素:', finalChildCount, '第一个子元素class:', firstChildClass);
    } catch (error) {
      console.error('[CascadeSelectorRenderer] 渲染错误:', error);
      if (this.currentViewContainer) {
        this.currentViewContainer.empty();
        const errorEl = this.currentViewContainer.createDiv('pm-cascade-selector-error');
        errorEl.textContent = `渲染失败: ${error instanceof Error ? error.message : '未知错误'}`;
      }
    }
  }
}
