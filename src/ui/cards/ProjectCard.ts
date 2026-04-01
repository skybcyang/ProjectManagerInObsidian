import type { CardComponent } from './CardRegistry';
import type { Project } from '../../types';
import { getPriorityLabel } from '../../constants';

/**
 * 项目卡片组件
 * 用于渲染项目信息
 */
export class ProjectCard implements CardComponent {
  readonly id = 'project';

  /**
   * 判断是否匹配项目实体
   */
  matches(entity: unknown): boolean {
    return (entity as Project)?.versionId !== undefined && (entity as Project)?.priority !== undefined;
  }

  /**
   * 渲染项目卡片
   */
  render(entity: unknown, onClick?: () => void): HTMLElement {
    const project = entity as Project;
    const priorityEmoji = { critical: '🔴', high: '🟠', medium: '🔵', low: '🟢' }[project.priority] || '⚪';

    const card = document.createElement('div');
    card.className = 'pm-card pm-card--project';
    card.dataset.id = project.id;
    card.dataset.priority = project.priority;
    card.dataset.status = project.status;

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
      text: priorityEmoji,
      cls: 'pm-emoji-icon',
    });
    
    header.createEl('span', {
      text: getPriorityLabel(project.priority),
      cls: `pm-badge pm-badge--priority-${project.priority}`,
    });

    card.createEl('div', {
      text: project.name,
      cls: 'pm-card__title',
    });

    const footer = card.createDiv({ cls: 'pm-card__footer' });
    
    if (project.owner) {
      footer.createEl('span', {
        text: `👤 ${project.owner}`,
        cls: 'pm-card__owner',
      });
    }

    return card;
  }
}
