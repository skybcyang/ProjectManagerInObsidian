import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { CardRegistry } from '../../ui/cards';
import type { DataService, ActionService } from '../services';
import type { ViewConfig, SelectorConfig, EntityType } from '../types';
import { BaseRenderer } from './BaseRenderer';
import { ViewEngine } from '../ViewEngine';

/**
 * 选择器渲染器
 * 支持下拉选择框 + 动态视图渲染
 */
export class SelectorRenderer extends BaseRenderer {
  private viewEngine?: ViewEngine;
  private currentViewContainer?: HTMLElement;

  constructor(
    app: App,
    entityManager: EntityManager,
    cardRegistry: CardRegistry,
    dataService: DataService,
    actionService: ActionService
  ) {
    super(app, entityManager, cardRegistry, dataService, actionService);
    // 注意：ViewEngine 延迟创建，避免循环依赖
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
   * 渲染选择器视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-selector-view');

    const config = this.config as ViewConfig & { selector: SelectorConfig; view: ViewConfig };
    const selectorConfig = config.selector;
    const viewConfig = config.view;

    if (!selectorConfig || !viewConfig) {
      const errorEl = container.createDiv('pm-selector-error');
      errorEl.textContent = '配置错误：需要 selector 和 view 配置';
      return;
    }

    // 创建选择器容器
    const selectorContainer = container.createDiv('pm-selector-container');
    
    // 渲染下拉选择框
    const selectEl = await this.renderSelector(selectorContainer, selectorConfig);

    // 创建视图容器
    this.currentViewContainer = container.createDiv('pm-selector-view-container');

    // 如果有默认值，自动渲染
    const defaultValue = selectorConfig.defaultValue;
    if (defaultValue) {
      selectEl.value = defaultValue;
      await this.renderView(viewConfig, selectorConfig.type, defaultValue);
    } else if (!selectorConfig.allowEmpty) {
      // 如果不允许空选择，默认选择第一项
      const firstOption = selectEl.querySelector('option[value]:not([value=""])') as HTMLOptionElement;
      if (firstOption) {
        selectEl.value = firstOption.value;
        await this.renderView(viewConfig, selectorConfig.type, firstOption.value);
      }
    }

    // 监听选择变化
    selectEl.addEventListener('change', async () => {
      const selectedValue = selectEl.value;
      if (selectedValue) {
        await this.renderView(viewConfig, selectorConfig.type, selectedValue);
      } else {
        // 清空视图
        if (this.currentViewContainer) {
          this.currentViewContainer.empty();
        }
      }
    });
  }

  /**
   * 渲染下拉选择框
   */
  private async renderSelector(
    container: HTMLElement,
    config: SelectorConfig
  ): Promise<HTMLSelectElement> {
    const wrapper = container.createDiv('pm-selector-dropdown-wrapper');

    // 标签
    if (config.label) {
      wrapper.createEl('label', {
        text: config.label,
        cls: 'pm-selector-label',
      });
    }

    // 下拉框
    const selectEl = wrapper.createEl('select', {
      cls: 'pm-selector-dropdown',
    });

    // 空选项
    if (config.allowEmpty !== false) {
      selectEl.createEl('option', {
        text: config.emptyLabel || `请选择...`,
        value: '',
      });
    }

    // 加载选项
    const options = await this.loadOptions(config.type);
    for (const option of options) {
      selectEl.createEl('option', {
        text: option.label,
        value: option.value,
      });
    }

    return selectEl;
  }

  /**
   * 加载选项数据
   */
  private async loadOptions(
    type: SelectorConfig['type']
  ): Promise<Array<{ label: string; value: string }>> {
    switch (type) {
      case 'version': {
        const versions = await this.entityManager.listVersions();
        return versions.map((v) => ({ label: v.name, value: v.id }));
      }
      case 'project': {
        const projects = await this.entityManager.listProjects();
        return projects.map((p) => ({ label: p.name, value: p.id }));
      }
      case 'status': {
        return [
          { label: '待处理', value: 'backlog' },
          { label: '待开始', value: 'todo' },
          { label: '进行中', value: 'in-progress' },
          { label: '测试中', value: 'testing' },
          { label: '已完成', value: 'completed' },
          { label: '已归档', value: 'archived' },
        ];
      }
      case 'priority': {
        return [
          { label: '紧急', value: 'critical' },
          { label: '高', value: 'high' },
          { label: '中', value: 'medium' },
          { label: '低', value: 'low' },
        ];
      }
      case 'owner': {
        // 从所有特性中提取负责人
        const features = await this.entityManager.listFeatures();
        const owners = new Set<string>();
        for (const f of features) {
          if (f.owner) owners.add(f.owner);
        }
        return Array.from(owners).map((o) => ({ label: o, value: o }));
      }
      case 'tag': {
        // 从所有特性中提取标签
        const features = await this.entityManager.listFeatures();
        const tags = new Set<string>();
        for (const f of features) {
          for (const tag of f.tags || []) {
            tags.add(tag);
          }
        }
        return Array.from(tags).map((t) => ({ label: t, value: t }));
      }
      case 'view': {
        // 视图模式选择器 - 返回支持的视图模式
        return [
          { label: '看板', value: 'kanban' },
          { label: '网格', value: 'grid' },
          { label: '级联', value: 'cascade' },
          { label: '时间线', value: 'timeline' },
          { label: '日历', value: 'calendar' },
        ];
      }
      default:
        return [];
    }
  }

  /**
   * 渲染视图
   */
  private async renderView(
    viewConfig: ViewConfig,
    selectorType: SelectorConfig['type'],
    selectedValue: string
  ): Promise<void> {
    if (!this.currentViewContainer) return;

    // 显示加载状态
    this.currentViewContainer.empty();
    const loadingEl = this.currentViewContainer.createDiv('pm-selector-loading');
    loadingEl.textContent = '加载中...';

    try {
      let mergedConfig: ViewConfig;

      // 如果是视图模式选择器，改变 mode 而不是 filter
      if (selectorType === 'view') {
        mergedConfig = {
          ...viewConfig,
          mode: selectedValue as any,
        };
      } else {
        // 构建过滤条件
        const filterKey = this.getFilterKey(selectorType);
        mergedConfig = {
          ...viewConfig,
          filter: {
            ...viewConfig.filter,
            [filterKey]: selectedValue,
          },
        };
      }

      // 使用 ViewEngine 渲染
      await this.getViewEngine().render(this.currentViewContainer, mergedConfig, {
        sourcePath: this.context.sourcePath,
        el: this.currentViewContainer,
      });
    } catch (error) {
      this.currentViewContainer.empty();
      const errorEl = this.currentViewContainer.createDiv('pm-selector-error');
      errorEl.textContent = `渲染失败: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }

  /**
   * 获取过滤键名
   */
  private getFilterKey(selectorType: SelectorConfig['type']): string {
    const keyMap: Record<string, string> = {
      version: 'versionId',
      project: 'projectId',
      status: 'status',
      priority: 'priority',
      owner: 'owner',
      tag: 'tag',
      view: 'mode', // 视图选择器不用于过滤
    };
    return keyMap[selectorType] || selectorType;
  }
}
