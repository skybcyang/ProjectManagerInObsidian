import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { CardRegistry } from '../../ui/cards';
import type { DataService, ActionService } from '../services';
import type { ViewConfig, ViewContext, EntityType, CascadeSelectorConfig } from '../types';
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

  private selectorContainer?: HTMLElement;
  private entityTypeSelect?: HTMLSelectElement;
  private entitySelect?: HTMLSelectElement;
  private viewModeSelect?: HTMLSelectElement;

  /**
   * 渲染级联选择器视图
   */
  async render(container: HTMLElement): Promise<void> {
    // 每次重新渲染时重置状态
    this.viewEngine = undefined;
    this.currentViewContainer = undefined;
    
    container.empty();
    container.addClass('pm-cascade-selector-view');

    const config = this.config as ViewConfig & { cascadeSelector: CascadeSelectorConfig };
    const selectorConfig = config.cascadeSelector || {};

    // 初始化状态（顺序：实体类型 → 具体实体 → 视图模式）
    this.currentState.entityType = selectorConfig.entityType?.defaultValue || 'feature';
    this.currentState.entityId = selectorConfig.entity?.defaultValue || '';
    this.currentState.viewMode = selectorConfig.viewMode?.defaultValue || 'kanban';

    // 创建选择器容器
    this.selectorContainer = container.createDiv('pm-cascade-selector-container');

    // 渲染三级选择器（顺序：实体类型 → 具体实体 → 视图模式）
    this.entityTypeSelect = await this.renderEntityTypeSelector(this.selectorContainer, selectorConfig.entityType);
    this.entitySelect = await this.renderEntitySelector(this.selectorContainer, selectorConfig.entity);
    this.viewModeSelect = await this.renderViewModeSelector(this.selectorContainer, selectorConfig.viewMode);

    // 创建视图容器
    this.currentViewContainer = container.createDiv('pm-cascade-selector-view-container');

    // 初始渲染：先加载实体列表
    await this.refreshEntityOptions(this.entitySelect, this.currentState.entityType);
    if (this.currentState.entityId) {
      // 检查默认值是否在选项中
      const exists = Array.from(this.entitySelect!.options).some((o: HTMLOptionElement) => o.value === this.currentState.entityId);
      if (exists) {
        this.entitySelect!.value = this.currentState.entityId;
      } else {
        // 默认值不在当前类型的列表中，清空选择
        this.currentState.entityId = '';
        this.entitySelect!.value = '';
      }
    }
    await this.renderCurrentView();

    // 监听实体类型变化
    this.entityTypeSelect.addEventListener('change', () => {
      this.currentState.entityType = this.entityTypeSelect!.value as EntityType;
      this.currentState.entityId = ''; // 清空实体选择
      this.entitySelect!.value = ''; // 重置下拉框
      this.refreshEntityOptions(this.entitySelect!, this.currentState.entityType).then(() => {
        this.renderCurrentView();
      });
    });

    // 监听实体变化
    this.entitySelect.addEventListener('change', () => {
      this.currentState.entityId = this.entitySelect!.value;
      this.renderCurrentView();
    });

    // 监听视图模式变化
    this.viewModeSelect.addEventListener('change', () => {
      this.currentState.viewMode = this.viewModeSelect!.value;
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

  // viewEngine 已在类顶部声明

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
   * 渲染当前视图
   */
  private async renderCurrentView(): Promise<void> {
    if (!this.currentViewContainer) {
      return;
    }

    // 显示加载状态
    this.currentViewContainer.empty();
    
    const loadingEl = this.currentViewContainer.createDiv('pm-cascade-selector-loading');
    loadingEl.textContent = '加载中...';

    try {
      // 构建视图配置
      const viewConfig = this.buildViewConfig();

      // 清空加载状态
      this.currentViewContainer.empty();

      // 使用缓存的 ViewEngine 渲染
      const viewEngine = this.getViewEngine();
      const context: ViewContext = {
        sourcePath: this.context.sourcePath,
        el: this.currentViewContainer,
      };
      
      await viewEngine.render(this.currentViewContainer, viewConfig, context);
    } catch (error) {
      console.error('[CascadeSelectorRenderer] 渲染错误:', error);
      this.currentViewContainer.empty();
      const errorEl = this.currentViewContainer.createDiv('pm-cascade-selector-error');
      errorEl.textContent = `渲染失败: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }

  /**
   * 构建视图配置
   * 
   * 逻辑：
   * - 选择了具体实体 -> 显示该实体本身（单卡片）
   * - 未选择实体（全部）-> 显示该类型下的所有实体列表
   */
  private buildViewConfig(): ViewConfig & { _hideToolbar?: boolean } {
    const { entityType, entityId, viewMode } = this.currentState;

    // 级联视图显示完整层级
    if (viewMode === 'cascade') {
      return {
        mode: 'cascade',
        type: entityId ? entityType : 'version',
        id: entityId,
        expanded: true,
        _hideToolbar: true,
      };
    }

    // 选择了具体实体 - 显示该实体本身
    if (entityId) {
      const config: ViewConfig & { _hideToolbar?: boolean } = {
        mode: viewMode as any,
        type: entityType,
        id: entityId,
        _hideToolbar: true,
      };
      if (viewMode === 'grid') config.cols = 1; // 单卡片，单列显示
      return config;
    }

    // 未选择具体实体 - 显示该类型下的所有实体列表
    const config: ViewConfig & { _hideToolbar?: boolean } = {
      mode: viewMode as any,
      type: entityType,
      _hideToolbar: true,
    };

    // 设置视图特定选项
    if (viewMode === 'kanban') config.groupBy = 'status';
    if (viewMode === 'grid') config.cols = 3;

    return config;
  }
}
