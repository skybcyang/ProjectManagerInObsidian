import type { CardComponent } from './CardRegistry';
import type { Version } from '../../types';

/**
 * 版本卡片组件
 * 用于渲染版本信息
 */
export class VersionCard implements CardComponent {
  readonly id = 'version';

  /**
   * 判断是否匹配版本实体
   */
  matches(entity: unknown): boolean {
    const v = entity as Partial<Version>;
    // 版本有 startDate 或 endDate，但没有 priority 字段
    return (v?.startDate !== undefined || v?.endDate !== undefined) && 
           (v as any).priority === undefined;
  }

  /**
   * 渲染版本卡片
   */
  render(entity: unknown, onClick?: () => void): HTMLElement {
    const version = entity as Version;

    const card = document.createElement('div');
    card.className = 'pm-card pm-card--version';
    card.dataset.id = version.id;
    card.dataset.status = version.status;

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
    
    header.createEl('span', {
      text: '📦',
      cls: 'pm-emoji-icon',
    });

    card.createEl('div', {
      text: version.name,
      cls: 'pm-card__title',
    });

    const footer = card.createDiv({ cls: 'pm-card__footer' });
    
    if (version.owner) {
      footer.createEl('span', {
        text: `👤 ${version.owner}`,
        cls: 'pm-card__owner',
      });
    }

    if (version.startDate || version.endDate) {
      const dateRange = `${version.startDate || '?'} ~ ${version.endDate || '?'}`;
      footer.createEl('span', {
        text: `📅 ${dateRange}`,
        cls: 'pm-card__date',
      });
    }

    return card;
  }
}
