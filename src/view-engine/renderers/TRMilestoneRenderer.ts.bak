import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import type { ViewConfig } from '../types';
import { BaseRenderer } from './BaseRenderer';
import type { Version, TRCheckpoint } from '../../types';
import type { IPDPhaseValue, TRStatusValue } from '../../constants';
import { IPD_PHASES, getTRStatusEmoji, getIPDPhaseColor, TR_WARNING_DAYS } from '../../constants';
import { Notice } from 'obsidian';

/**
 * TR里程碑渲染器
 * 展示所有版本的TR阶段进度，替代Excel多sheet管理
 */
export class TRMilestoneRenderer extends BaseRenderer {
  private versions: Version[] = [];

  constructor(
    app: App,
    entityManager: EntityManager,
    dataService: DataService,
    actionService: ActionService
  ) {
    super(app, entityManager, dataService, actionService);
  }

  /**
   * 渲染TR里程碑视图
   */
  async render(container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('pm-tr-milestone-view');

    // 加载所有版本
    this.versions = await this.entityManager.listVersions();

    // 创建视图容器
    const viewContainer = container.createDiv('pm-tr-milestone-container');

    // 创建标题
    const header = viewContainer.createDiv('pm-tr-milestone-header');
    header.createEl('h3', { text: '📊 TR里程碑总览' });

    // 创建图例
    this.createLegend(viewContainer);

    // 渲染里程碑表格
    if (this.versions.length === 0) {
      this.createEmptyState(viewContainer, '暂无版本数据');
    } else {
      this.renderMilestoneTable(viewContainer);
    }
  }

  /**
   * 创建图例
   */
  private createLegend(container: HTMLElement): void {
    const legend = container.createDiv('pm-tr-milestone-legend');
    legend.createSpan({ text: '图例: ', cls: 'pm-legend-label' });
    
    const items = [
      { emoji: '✅', label: '已完成' },
      { emoji: '🔄', label: '进行中' },
      { emoji: '⏳', label: '未开始' },
      { emoji: '⚠️', label: '延期风险' },
    ];
    
    items.forEach(item => {
      const span = legend.createSpan({ cls: 'pm-legend-item' });
      span.createSpan({ text: item.emoji, cls: 'pm-legend-emoji' });
      span.createSpan({ text: item.label, cls: 'pm-legend-text' });
    });
  }

  /**
   * 渲染里程碑表格
   */
  private renderMilestoneTable(container: HTMLElement): void {
    const table = container.createEl('table', { cls: 'pm-tr-milestone-table' });
    
    // 表头
    const thead = table.createEl('thead');
    const headerRow = thead.createEl('tr');
    headerRow.createEl('th', { text: '版本' });
    
    // TR阶段列
    IPD_PHASES.forEach(phase => {
      const th = headerRow.createEl('th');
      th.createDiv({ text: phase.label, cls: 'pm-tr-phase-label' });
      th.createDiv({ text: phase.description, cls: 'pm-tr-phase-desc' });
    });
    
    headerRow.createEl('th', { text: '状态/风险' });
    
    // 表体
    const tbody = table.createEl('tbody');
    
    this.versions.forEach(version => {
      const row = tbody.createEl('tr');
      
      // 版本名称
      const nameCell = row.createEl('td');
      const nameLink = nameCell.createEl('a', { 
        text: version.name,
        cls: 'pm-tr-version-name'
      });
      nameLink.onclick = () => {
        this.actionService.openEntity('version', version.id);
      };
      
      // TR阶段单元格
      IPD_PHASES.forEach(phase => {
        const cell = row.createEl('td');
        const checkpoint = version.trCheckpoints?.find(cp => cp.phase === phase.value);
        
        if (checkpoint) {
          this.renderCheckpointCell(cell, checkpoint, version, phase.value);
        } else {
          cell.createSpan({ text: '-', cls: 'pm-tr-empty' });
        }
      });
      
      // 当前状态和风险摘要
      const statusCell = row.createEl('td');
      this.renderCurrentStatusWithRisks(statusCell, version);
    });
  }

  /**
   * 渲染检查点单元格（带点击交互）
   */
  private renderCheckpointCell(
    cell: HTMLTableCellElement, 
    checkpoint: TRCheckpoint,
    version: Version,
    phaseValue: string
  ): void {
    const status = checkpoint.status;
    const emoji = getTRStatusEmoji(status);
    
    cell.addClass(`pm-tr-status-${status}`);
    cell.style.cursor = 'pointer';
    cell.title = '点击快速更新状态';
    
    // 状态图标
    const statusEl = cell.createDiv({ cls: 'pm-tr-status-icon' });
    statusEl.textContent = emoji;
    
    // 计划日期
    if (checkpoint.plannedDate) {
      const dateEl = cell.createDiv({ cls: 'pm-tr-date' });
      dateEl.textContent = this.formatShortDate(checkpoint.plannedDate);
      
      // 检查是否延期风险（7天内到期但未完成）
      if (this.isWarningStatus(checkpoint)) {
        cell.addClass('pm-tr-warning');
        cell.style.background = '#ff6b6b20'; // 红色背景
        cell.style.border = '2px solid #ff6b6b';
        const warningEl = cell.createDiv({ cls: 'pm-tr-warning-badge' });
        warningEl.textContent = '⚠️';
        warningEl.title = `即将到期 (${this.getDaysUntil(checkpoint.plannedDate)}天)`;
      }
    }
    
    // 实际完成日期（如果已完成）
    if (checkpoint.actualDate && status === 'passed') {
      const actualEl = cell.createDiv({ cls: 'pm-tr-actual-date' });
      actualEl.textContent = this.formatShortDate(checkpoint.actualDate);
    }

    // 点击事件 - 快速更新状态
    cell.onclick = (e) => {
      e.stopPropagation();
      this.showCheckpointQuickUpdate(cell, checkpoint, version, phaseValue);
    };
  }

  /**
   * 显示检查点快速更新菜单
   */
  private showCheckpointQuickUpdate(
    cell: HTMLElement,
    checkpoint: TRCheckpoint,
    version: Version,
    phaseValue: string
  ): void {
    // 移除已存在的菜单
    const existingMenu = document.querySelector('.pm-tr-quick-update-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'pm-tr-quick-update-menu';
    menu.style.cssText = `
      position: fixed;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 8px 0;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 180px;
    `;

    // 标题
    const phaseInfo = IPD_PHASES.find(p => p.value === phaseValue);
    const title = menu.createEl('div', { 
      text: `${phaseInfo?.label || phaseValue} 状态更新`,
      cls: 'pm-menu-title'
    });
    title.style.cssText = 'padding: 8px 16px; font-weight: 600; border-bottom: 1px solid var(--background-modifier-border); margin-bottom: 4px;';

    // 状态选项
    const statuses: Array<{ value: TRStatusValue; label: string; emoji: string }> = [
      { value: 'not-started', label: '未开始', emoji: '⏳' },
      { value: 'in-progress', label: '进行中', emoji: '🔄' },
      { value: 'passed', label: '已通过', emoji: '✅' },
      { value: 'blocked', label: '阻塞', emoji: '⚠️' },
    ];

    statuses.forEach(s => {
      const item = menu.createDiv({ cls: 'pm-menu-item' });
      item.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        ${checkpoint.status === s.value ? 'background: var(--background-modifier-hover); font-weight: 600;' : ''}
      `;
      item.innerHTML = `<span>${s.emoji}</span><span>${s.label}</span>`;

      if (checkpoint.status !== s.value) {
        item.addEventListener('mouseenter', () => {
          item.style.background = 'var(--background-modifier-hover)';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = '';
        });
        item.addEventListener('click', async () => {
          menu.remove();
          await this.updateCheckpointStatus(version, phaseValue, s.value);
        });
      }
    });

    // 设置日期按钮
    menu.createDiv({ cls: 'pm-menu-separator' }).style.cssText = 
      'height: 1px; background: var(--background-modifier-border); margin: 4px 0;';

    const dateBtn = menu.createDiv({ cls: 'pm-menu-item' });
    dateBtn.style.cssText = 'padding: 8px 16px; cursor: pointer; font-size: 13px;';
    dateBtn.innerHTML = '📅 设置计划日期';
    dateBtn.onclick = () => {
      menu.remove();
      this.showSetDateModal(version, phaseValue, checkpoint.plannedDate);
    };

    // 定位菜单
    const rect = cell.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 4}px`;

    document.body.appendChild(menu);

    // 点击外部关闭
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }

  /**
   * 更新检查点状态
   */
  private async updateCheckpointStatus(
    version: Version,
    phaseValue: string,
    newStatus: TRStatusValue
  ): Promise<void> {
    const updatedCheckpoints = version.trCheckpoints?.map(cp => 
      cp.phase === phaseValue ? { ...cp, status: newStatus } : cp
    ) || [];

    // 如果设置为已通过，自动更新实际日期
    if (newStatus === 'passed') {
      const today = new Date().toISOString().split('T')[0];
      const index = updatedCheckpoints.findIndex(cp => cp.phase === phaseValue);
      if (index !== -1) {
        updatedCheckpoints[index] = { ...updatedCheckpoints[index], actualDate: today };
      }
    }

    await this.entityManager.updateVersion(version.id, {
      trCheckpoints: updatedCheckpoints,
      // 如果当前阶段更新了，同步更新 version.phase
      ...(version.phase === phaseValue ? {} : {}),
    });

    new Notice(`TR阶段状态已更新: ${newStatus}`);
    
    // 刷新视图
    const container = document.querySelector('.pm-tr-milestone-view') as HTMLElement;
    if (container) {
      this.render(container);
    }
  }

  /**
   * 显示设置日期模态框
   */
  private showSetDateModal(version: Version, phaseValue: string, currentDate?: string): void {
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
      max-width: 300px;
      width: 90%;
    `;

    const phaseInfo = IPD_PHASES.find(p => p.value === phaseValue);
    modal.createEl('h4', { text: `设置 ${phaseInfo?.label || phaseValue} 计划日期` });

    const input = modal.createEl('input', {
      type: 'date',
      value: currentDate || '',
    });
    input.style.cssText = 'width: 100%; padding: 8px; margin: 16px 0;';

    const btnContainer = modal.createDiv();
    btnContainer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';

    const cancelBtn = btnContainer.createEl('button', { text: '取消' });
    cancelBtn.onclick = () => overlay.remove();

    const saveBtn = btnContainer.createEl('button', { text: '保存', cls: 'mod-cta' });
    saveBtn.onclick = async () => {
      const newDate = input.value || undefined;
      const updatedCheckpoints = version.trCheckpoints?.map(cp => 
        cp.phase === phaseValue ? { ...cp, plannedDate: newDate } : cp
      ) || [];

      await this.entityManager.updateVersion(version.id, {
        trCheckpoints: updatedCheckpoints,
      });

      overlay.remove();
      new Notice('计划日期已更新');
      
      // 刷新视图
      const container = document.querySelector('.pm-tr-milestone-view') as HTMLElement;
      if (container) {
        this.render(container);
      }
    };

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  }

  /**
   * 渲染当前状态和风险摘要
   */
  private renderCurrentStatusWithRisks(container: HTMLElement, version: Version): void {
    const phase = version.phase || 'tr3';
    const checkpoint = version.trCheckpoints?.find(cp => cp.phase === phase);
    
    if (checkpoint) {
      const emoji = getTRStatusEmoji(checkpoint.status);
      const phaseInfo = IPD_PHASES.find(p => p.value === phase);
      
      const statusEl = container.createDiv({ cls: 'pm-tr-current-status' });
      statusEl.createSpan({ text: emoji, cls: 'pm-tr-status-emoji' });
      statusEl.createSpan({ text: phaseInfo?.label || phase, cls: 'pm-tr-phase-name' });
      
      // 设置状态颜色
      if (phaseInfo) {
        statusEl.style.color = phaseInfo.color;
      }

      // 风险摘要
      const currentCheckpoint = version.trCheckpoints?.find(cp => cp.phase === phase);
      if (currentCheckpoint && currentCheckpoint.risks.length > 0) {
        const riskBadge = container.createDiv({ cls: 'pm-tr-risk-badge' });
        riskBadge.textContent = `⚠️ ${currentCheckpoint.risks.length} 风险`;
        riskBadge.style.cssText = `
          font-size: 11px;
          color: var(--text-error);
          margin-top: 4px;
          cursor: pointer;
        `;
        riskBadge.title = currentCheckpoint.risks.join('\n');
        riskBadge.onclick = () => {
          new Notice(currentCheckpoint.risks.join('\n'), 5000);
        };
      }
    } else {
      container.createSpan({ text: '未知', cls: 'pm-tr-unknown' });
    }
  }

  /**
   * 检查是否为预警状态（7天内到期但未完成）
   */
  private isWarningStatus(checkpoint: TRCheckpoint): boolean {
    if (checkpoint.status === 'passed' || checkpoint.status === 'blocked') {
      return false;
    }
    
    if (!checkpoint.plannedDate) {
      return false;
    }
    
    const plannedDate = new Date(checkpoint.plannedDate);
    const today = new Date();
    const diffDays = Math.ceil((plannedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 && diffDays <= TR_WARNING_DAYS;
  }

  /**
   * 获取距离天数的文字描述
   */
  private getDaysUntil(dateStr: string): string {
    const targetDate = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '明天';
    if (diffDays < 0) return `已延期 ${Math.abs(diffDays)}`;
    return `剩余 ${diffDays}`;
  }

  /**
   * 格式化短日期 (MM-DD)
   */
  private formatShortDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
}
