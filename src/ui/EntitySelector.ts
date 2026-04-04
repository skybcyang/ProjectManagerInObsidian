import type { App } from 'obsidian';
import type { EntityManager } from '../core';
import type { SingleCardRenderer } from './SingleCardRenderer';

export interface EntitySelectorConfig {
  type: 'version' | 'project';
  defaultId?: string;
}

/**
 * 实体选择器组件
 * 提供下拉选择框选择版本或项目，动态渲染级联卡片
 */
export class EntitySelector {
  constructor(
    private app: App,
    private entityManager: EntityManager,
    private singleCardRenderer: SingleCardRenderer
  ) {}

  /**
   * 渲染实体选择器
   */
  async render(container: HTMLElement, config: EntitySelectorConfig): Promise<void> {
    console.log('[EntitySelector] 开始渲染, config:', config);
    
    container.empty();
    container.addClass('pm-entity-selector');
    
    // 检查配置
    const type = config?.type;
    if (!type || (type !== 'version' && type !== 'project')) {
      container.createEl('div', {
        text: '⚠️ 配置错误: type 必须是 "version" 或 "project"\n\n示例:\n```pm-selector\ntype: version\n```',
        cls: 'pm-error',
        attr: { style: 'white-space: pre-wrap;' }
      });
      return;
    }
    
    // 创建选择器容器
    const selectorContainer = container.createDiv({ cls: 'pm-entity-selector__container' });

    // 加载实体列表
    let entities: Array<{ id: string; name: string }> = [];
    try {
      entities = await this.loadEntities(type);
      console.log('[EntitySelector] 加载实体列表:', entities.length, '个');
    } catch (error) {
      console.error('[EntitySelector] 加载实体列表失败:', error);
      container.createEl('div', {
        text: `⚠️ 加载失败: ${(error as Error).message}`,
        cls: 'pm-error',
      });
      return;
    }

    if (entities.length === 0) {
      this.renderEmptyState(selectorContainer, type);
      return;
    }

    // 创建下拉选择框
    const selectEl = selectorContainer.createEl('select', {
      cls: 'pm-entity-selector__dropdown',
    });

    // 默认选项
    selectEl.createEl('option', {
      text: `请选择${type === 'version' ? '版本' : '项目'}...`,
      value: '',
    });

    // 实体选项
    for (const entity of entities) {
      selectEl.createEl('option', {
        text: entity.name,
        value: entity.id,
      });
    }

    // 级联卡片容器
    const cardContainer = container.createDiv({ cls: 'pm-entity-selector__card' });

    // 如果有默认值，自动选择并渲染
    const defaultId = config?.defaultId;
    if (defaultId) {
      const defaultEntity = entities.find(e => e.id === defaultId);
      if (defaultEntity) {
        selectEl.value = defaultId;
        await this.renderCascadeCard(cardContainer, defaultId);
      }
    }

    // 选择事件
    selectEl.addEventListener('change', async () => {
      const selectedId = selectEl.value;
      if (selectedId) {
        await this.renderCascadeCard(cardContainer, selectedId);
      } else {
        cardContainer.empty();
      }
    });
  }

  /**
   * 加载实体列表
   */
  private async loadEntities(type: 'version' | 'project'): Promise<Array<{ id: string; name: string }>> {
    if (type === 'version') {
      const versions = await this.entityManager.listVersions();
      return versions.map(v => ({ id: v.id, name: v.name }));
    } else {
      const projects = await this.entityManager.listProjects();
      return projects.map(p => ({ id: p.id, name: p.name }));
    }
  }

  /**
   * 渲染级联卡片
   */
  private async renderCascadeCard(container: HTMLElement, id: string): Promise<void> {
    container.empty();
    container.addClass('pm-entity-selector__card-container');

    // 显示加载状态
    const loadingEl = container.createDiv({ cls: 'pm-entity-selector__loading' });
    loadingEl.setText('加载中...');

    try {
      await this.singleCardRenderer.render(container, {
        id,
        expanded: true,
      });
    } catch (error) {
      container.empty();
      const errorEl = container.createDiv({ cls: 'pm-error' });
      errorEl.createEl('span', { text: '⚠️ 加载失败: ' });
      errorEl.createEl('span', { text: (error as Error).message });
    }
  }

  /**
   * 渲染空状态
   */
  private renderEmptyState(container: HTMLElement, type: 'version' | 'project'): void {
    const emptyEl = container.createDiv({ cls: 'pm-entity-selector__empty' });
    const typeName = type === 'version' ? '版本' : '项目';
    emptyEl.createEl('span', { text: `📭 暂无${typeName}数据` });
    emptyEl.createEl('p', {
      text: `点击上方"创建${typeName}"按钮添加首个${typeName}`,
      cls: 'pm-entity-selector__hint',
    });
  }
}
