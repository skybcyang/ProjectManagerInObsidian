import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { CardRegistry } from '../../ui/cards';
import type { DataService, ActionService } from '../services';
import type { ViewConfig, EntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';
import { ViewEngine } from '../ViewEngine';

/**
 * 级联选择器配置
 */
export interface CascadeSelectorConfig {
  // 第一级：视图模式
  viewMode?: {
    label?: string;
    defaultValue?: string;  // kanban/grid/cascade/timeline/calendar
  };
  // 第二级：实体类型
  entityType?: {
    label?: string;
    defaultValue?: EntityType;  // version/project/feature
  };
  // 第三级：具体实体（动态加载）
  entity?: {
    label?: string;
    defaultValue?: string;
    allowEmpty?: boolean;
  };
}

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

    // 初始渲染：先加载实体列表
    await this.refreshEntityOptions(entitySelect, this.currentState.entityType);
    if (this.currentState.entityId) {
      entitySelect.value = this.currentState.entityId;
    }
    await this.renderCurrentView();

    // 监听实体类型变化
    entityTypeSelect.addEventListener('change', () => {
      this.currentState.entityType = entityTypeSelect.value as EntityType;
      this.currentState.entityId = ''; // 清空实体选择
      this.refreshEntityOptions(entitySelect, this.currentState.entityType).then(() => {
        this.renderCurrentView();
      });
    });

    // 监听实体变化
    entitySelect.addEventListener('change', () => {
      this.currentState.entityId = entitySelect.value;
      this.renderCurrentView();
    });

    // 监听视图模式变化
    viewModeSelect.addEventListener('change', () => {
      this.currentState.viewMode = viewModeSelect.value;
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
  private renderTimeout?: number;
  private async renderCurrentView(): Promise<void> {
    if (!this.currentViewContainer) return;

    // 清除之前的渲染定时器
    if (this.renderTimeout) {
      window.clearTimeout(this.renderTimeout);
    }

    // 显示加载状态
    this.currentViewContainer.empty();
    this.currentViewContainer.createDiv('pm-cascade-selector-loading', (el) => {
      el.textContent = '加载中...';
    });

    // 延迟渲染，避免频繁切换
    this.renderTimeout = window.setTimeout(async () => {
      try {
        // 构建视图配置
        const viewConfig: ViewConfig & { _hideToolbar?: boolean } = {
          mode: this.currentState.viewMode as any,
          type: this.currentState.entityType,
          id: this.currentState.entityId,
          _hideToolbar: true,
        };

        // 根据视图模式和实体类型调整配置
        if (this.currentState.viewMode === 'kanban') {
          viewConfig.groupBy = 'status';
        } else if (this.currentState.viewMode === 'grid') {
          viewConfig.cols = 3;
        } else if (this.currentState.viewMode === 'cascade') {
          viewConfig.expanded = true;
        }

        // 清空加载状态
        this.currentViewContainer!.empty();

        // 创建新的 ViewEngine 并渲染
        const viewEngine = new ViewEngine(this.app, this.entityManager, this.cardRegistry);
        await viewEngine.render(this.currentViewContainer!, viewConfig, {
          sourcePath: this.context.sourcePath,
          el: this.currentViewContainer!,
        });
      } catch (error) {
        console.error('[CascadeSelectorRenderer] 渲染错误:', error);
        if (this.currentViewContainer) {
          this.currentViewContainer.empty();
          this.currentViewContainer.createDiv('pm-cascade-selector-error', (el) => {
            el.textContent = `渲染失败: ${error instanceof Error ? error.message : '未知错误'}`;
          });
        }
      }
    }, 200);
  }
}
