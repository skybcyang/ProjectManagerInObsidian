import type { App } from 'obsidian';
import type { CardComponent } from './CardRegistry';
import type { Feature } from '../../types';
import { getPriorityLabel } from '../../constants';
import { getUserAvatarElement } from '../../utils/avatar';

/**
 * 特性卡片组件
 * 用于在看板或独立展示中渲染特性
 */
export class FeatureCard implements CardComponent {
  readonly id = 'feature';
  private app?: App;

  constructor(app?: App) {
    this.app = app;
  }

  /**
   * 判断是否匹配特性实体
   */
  matches(entity: unknown): boolean {
    const f = entity as Partial<Feature>;
    // 特性特有的字段：progress 和 projectId
    return f?.progress !== undefined && f?.projectId !== undefined;
  }

  /**
   * 渲染特性卡片
   */
  render(entity: unknown, onClick?: () => void): HTMLElement {
    const feature = entity as Feature;
    
    const card = document.createElement('div');
    card.className = 'pm-card pm-card--feature';
    card.dataset.id = feature.id;
    card.dataset.priority = feature.priority;
    card.dataset.status = feature.status;

    // 添加点击事件
    if (onClick) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      });
    }

    this.renderHeader(card, feature);
    this.renderBody(card, feature);
    this.renderFooter(card, feature);

    return card;
  }

  /**
   * 渲染紧凑版卡片（用于看板）
   */
  renderCompact(entity: unknown, onClick?: () => void): HTMLElement {
    const feature = entity as Feature;
    
    const card = document.createElement('div');
    card.className = 'pm-card pm-card--feature pm-card--compact';
    card.dataset.id = feature.id;
    card.dataset.priority = feature.priority;
    card.dataset.status = feature.status;

    // 添加点击事件
    if (onClick) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      });
    }

    const header = card.createDiv({ cls: 'pm-card__header' });
    
    // 优先级徽章
    header.createEl('span', {
      text: getPriorityLabel(feature.priority),
      cls: `pm-badge pm-badge--priority-${feature.priority}`,
    });

    // 进度
    if (feature.progress > 0) {
      header.createEl('span', {
        text: `${feature.progress}%`,
        cls: 'pm-progress-text',
      });
    }

    // 标题
    card.createEl('div', {
      text: feature.name,
      cls: 'pm-card__title',
    });

    return card;
  }

  private renderHeader(container: HTMLElement, feature: Feature): void {
    const header = container.createDiv({ cls: 'pm-card__header' });

    // 优先级徽章
    header.createEl('span', {
      text: getPriorityLabel(feature.priority),
      cls: `pm-badge pm-badge--priority-${feature.priority}`,
    });

    // 进度百分比
    if (feature.progress > 0) {
      header.createEl('span', {
        text: `${feature.progress}%`,
        cls: 'pm-progress-text',
      });
    }
  }

  private renderBody(container: HTMLElement, feature: Feature): void {
    // 标题
    container.createEl('div', {
      text: feature.name,
      cls: 'pm-card__title',
    });

    // 进度条
    if (feature.progress > 0) {
      const progressBar = container.createDiv({ cls: 'pm-progress' });
      const fill = progressBar.createDiv({ cls: 'pm-progress__fill' });
      fill.style.width = `${feature.progress}%`;
    }
  }

  private renderFooter(container: HTMLElement, feature: Feature): void {
    const footer = container.createDiv({ cls: 'pm-card__footer' });

    // 负责人
    if (feature.owner) {
      const ownerEl = footer.createDiv({ cls: 'pm-card__owner' });
      if (this.app) {
        const avatar = getUserAvatarElement(this.app, feature.owner, 16);
        if (avatar) {
          ownerEl.appendChild(avatar);
        }
      }
      ownerEl.createEl('span', {
        text: feature.owner,
        cls: 'pm-card__owner-name',
      });
    }

    // 结束日期
    if (feature.endDate) {
      const dueEl = footer.createEl('span', {
        text: `📅 ${feature.endDate}`,
        cls: 'pm-card__due',
      });

      // 逾期高亮
      if (new Date(feature.endDate) < new Date() && feature.status !== 'completed') {
        dueEl.addClass('pm-card__due--overdue');
      }
    }
  }
}
