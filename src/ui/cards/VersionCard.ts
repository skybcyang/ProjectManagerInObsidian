import type { CardComponent } from './CardRegistry';
import type { Version } from '../../types';
import type { IPDPhaseValue, TRStatusValue } from '../../constants';
import { IPD_PHASES, getTRStatusEmoji, getDefaultDeliverables } from '../../constants';

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

    // 添加右键菜单
    this.setupContextMenu(card, version);

    const header = card.createDiv({ cls: 'pm-card__header' });
    
    header.createEl('span', {
      text: '📦',
      cls: 'pm-emoji-icon',
    });

    card.createEl('div', {
      text: version.name,
      cls: 'pm-card__title',
    });

    // 显示当前 TR 阶段
    if (version.phase) {
      const phaseInfo = IPD_PHASES.find(p => p.value === version.phase);
      if (phaseInfo) {
        const phaseEl = card.createDiv({ cls: 'pm-card__phase' });
        phaseEl.createEl('span', {
          text: phaseInfo.label,
          cls: 'pm-phase-badge',
        });
        phaseEl.style.cssText = `
          display: inline-block;
          background: ${phaseInfo.color}20;
          color: ${phaseInfo.color};
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          margin-top: 4px;
        `;
      }
    }

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

  /**
   * 设置右键菜单
   */
  private setupContextMenu(card: HTMLElement, version: Version): void {
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e, version);
    });
  }

  /**
   * 显示右键菜单
   */
  private showContextMenu(e: MouseEvent, version: Version): void {
    // 移除已存在的菜单
    const existingMenu = document.querySelector('.pm-version-context-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'pm-version-context-menu';
    menu.style.cssText = `
      position: fixed;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 4px 0;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 200px;
    `;

    // 菜单项
    const menuItems: Array<{ label: string; icon: string; onClick: () => void; disabled?: boolean }> = [
      {
        label: '推进到下一阶段',
        icon: '➡️',
        onClick: () => this.advanceToNextPhase(version),
        disabled: version.phase === 'tr6',
      },
      {
        label: '设置 TR 日期',
        icon: '📅',
        onClick: () => this.showSetTRDateModal(version),
      },
      {
        label: '查看交付件清单',
        icon: '📋',
        onClick: () => this.showDeliverablesModal(version),
      },
      { label: 'separator', icon: '', onClick: () => {} },
      {
        label: '打开版本文件',
        icon: '📄',
        onClick: () => this.openVersionFile(version),
      },
    ];

    menuItems.forEach(item => {
      if (item.label === 'separator') {
        const separator = menu.createDiv();
        separator.style.cssText = `
          height: 1px;
          background: var(--background-modifier-border);
          margin: 4px 0;
        `;
        return;
      }

      const menuItem = menu.createDiv({ cls: 'pm-context-menu-item' });
      menuItem.style.cssText = `
        padding: 8px 16px;
        cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
        opacity: ${item.disabled ? 0.5 : 1};
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      `;
      menuItem.innerHTML = `<span>${item.icon}</span><span>${item.label}</span>`;

      if (!item.disabled) {
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.background = 'var(--background-modifier-hover)';
        });
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.background = '';
        });
        menuItem.addEventListener('click', () => {
          menu.remove();
          item.onClick();
        });
      }
    });

    // 定位菜单
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    document.body.appendChild(menu);

    // 点击外部关闭
    const closeMenu = (ev: MouseEvent) => {
      if (!menu.contains(ev.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }

  /**
   * 推进到下一阶段
   */
  private advanceToNextPhase(version: Version): void {
    const phases: IPDPhaseValue[] = ['tr3', 'tr4', 'tr4a', 'tr5', 'tr6'];
    const currentIndex = phases.indexOf(version.phase || 'tr3');
    if (currentIndex >= 0 && currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1];
      this.updateVersionPhase(version, nextPhase);
    }
  }

  /**
   * 更新版本阶段
   */
  private updateVersionPhase(version: Version, newPhase: IPDPhaseValue): void {
    // 触发更新事件，由外部处理
    const event = new CustomEvent('pm:update-version-phase', {
      detail: { versionId: version.id, newPhase },
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  /**
   * 显示设置 TR 日期模态框
   */
  private showSetTRDateModal(version: Version): void {
    const event = new CustomEvent('pm:show-tr-date-modal', {
      detail: { version },
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  /**
   * 显示交付件清单模态框
   */
  private showDeliverablesModal(version: Version): void {
    const phase = version.phase || 'tr3';
    const checkpoint = version.trCheckpoints?.find(cp => cp.phase === phase);
    
    // 创建模态框
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: var(--background-primary);
      border-radius: 8px;
      padding: 20px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;

    const phaseInfo = IPD_PHASES.find(p => p.value === phase);
    modal.createEl('h3', { text: `📋 ${phaseInfo?.label || phase} 交付件清单` });

    if (checkpoint && checkpoint.deliverables.length > 0) {
      const list = modal.createEl('ul');
      checkpoint.deliverables.forEach(item => {
        const li = list.createEl('li');
        li.textContent = item;
        li.style.marginBottom = '8px';
      });
    } else {
      modal.createEl('p', { text: '暂无交付件清单' });
    }

    // 风险列表
    if (checkpoint && checkpoint.risks.length > 0) {
      modal.createEl('h4', { text: '⚠️ 风险' });
      const riskList = modal.createEl('ul');
      checkpoint.risks.forEach(risk => {
        const li = riskList.createEl('li');
        li.textContent = risk;
        li.style.color = 'var(--text-error)';
        li.style.marginBottom = '4px';
      });
    }

    // 关闭按钮
    const closeBtn = modal.createEl('button', { text: '关闭' });
    closeBtn.style.cssText = `
      margin-top: 16px;
      padding: 8px 16px;
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    closeBtn.onclick = () => overlay.remove();

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  }

  /**
   * 打开版本文件
   */
  private openVersionFile(version: Version): void {
    const event = new CustomEvent('pm:open-version', {
      detail: { versionId: version.id },
      bubbles: true,
    });
    document.dispatchEvent(event);
  }
}
