import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import type { EntityManager } from '../core';
import type { CardRegistry } from './cards';

export interface SingleCardConfig {
  id: string;
}

/**
 * 单个卡片渲染器
 * 支持在 Markdown 中通过代码块渲染单个实体卡片
 * 
 * 使用方式：
 * ```pm-card
 * id: abc123
 * ```
 */
export class SingleCardRenderer {
  constructor(
    private app: App,
    private entityManager: EntityManager,
    private cardRegistry: CardRegistry
  ) {}

  /**
   * 渲染单个卡片
   */
  async render(container: HTMLElement, config: SingleCardConfig): Promise<void> {
    container.empty();
    container.addClass('pm-single-card');

    if (!config.id) {
      this.renderError(container, '请提供实体 ID');
      return;
    }

    // 查找实体
    const result = await this.entityManager.findById(config.id);

    if (!result) {
      this.renderError(container, `未找到 ID 为 "${config.id}" 的实体`);
      return;
    }

    // 使用注册表渲染
    const cardRenderer = this.cardRegistry.findRenderer(result.entity);
    
    if (!cardRenderer) {
      this.renderError(container, `无法渲染该实体类型: ${result.type}`);
      return;
    }

    // 创建点击回调
    const onClick = async () => {
      const path = await this.entityManager.getEntityPath(result.type, config.id);
      if (!path) return;
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf().openFile(file);
      }
    };

    const card = cardRenderer.render(result.entity, onClick);
    container.appendChild(card);
  }

  /**
   * 渲染错误信息
   */
  private renderError(container: HTMLElement, message: string): void {
    const errorEl = container.createDiv({ cls: 'pm-error' });
    errorEl.createEl('span', { text: '⚠️ ' });
    errorEl.createEl('span', { text: message });
  }
}
