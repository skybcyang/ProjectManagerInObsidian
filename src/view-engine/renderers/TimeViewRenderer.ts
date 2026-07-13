import type { App } from 'obsidian';
import type { EntityManager } from '../../core';
import type { DataService, ActionService } from '../services';
import { ViewConfig, Entity, EntityType, getEntityType, TimeViewMode, TimeGroupBy } from '../types';
import type { Feature } from '../../types';
import { BaseRenderer } from './BaseRenderer';
import { RendererRegistry } from '../RendererRegistry';
import { DateFormat, getPriorityColor, translateStatus } from '../design-tokens';

/**
 * 时间视图状态
 */
interface TimeViewState {
  currentDate: Date;
  viewMode: TimeViewMode;
  groupBy: TimeGroupBy;
  /** 已折叠的组 ID（负责人或项目），默认全部展开 */
  collapsedGroups: Set<string>;
}

/**
 * 时间视图项
 */
interface TimeViewItem {
  entity: Entity;
  startDate: Date;
  endDate: Date;
  progress: number;
  entityType: EntityType;
}

/**
 * 甘特图行
 */
interface GanttRow {
  id: string;
  label: string;
  item?: TimeViewItem;
  indent: number;
  isGroupHeader: boolean;
  expandable?: boolean;
  expanded?: boolean;
  groupId?: string;
}

/**
 * 时间视图渲染器（甘特图形态）
 * 支持按负责人/按项目分组，可展开项目行查看子特性
 */
export class TimeViewRenderer extends BaseRenderer {
  private state: TimeViewState = {
    currentDate: new Date(),
    viewMode: 'month',
    groupBy: 'owner',
    collapsedGroups: new Set(),
  };

  /**
   * 初始化渲染器，从配置中恢复时间视图状态
   */
  init(config: ViewConfig, context: import('../types').ViewContext, options?: import('./BaseRenderer').RendererInitOptions): void {
    super.init(config, context, options);
    this.initializeStateFromConfig();
  }

  /**
   * 从 YAML 配置初始化时间视图状态
   */
  private initializeStateFromConfig(): void {
    const config = this.config;
    const collapsedGroups = new Set(config.collapsedGroups || []);

    this.state = {
      currentDate: config.timeViewDate ? new Date(config.timeViewDate) : new Date(),
      viewMode: config.timeViewMode || 'month',
      groupBy: config.timeGroupBy || 'owner',
      collapsedGroups,
    };
  }

  /**
   * 将当前状态持久化到 YAML 配置
   */
  private persistState(): void {
    this.saveConfig({
      timeViewMode: this.state.viewMode,
      timeGroupBy: this.state.groupBy,
      timeViewDate: this.state.currentDate.toISOString().split('T')[0],
      collapsedGroups: Array.from(this.state.collapsedGroups),
    });
  }

  /**
   * 渲染时间视图
   */
  async render(container: HTMLElement): Promise<void> {
    // 显示加载状态，等待数据准备完成
    this.showLoading(container);

    const entities = await this.prepareData();
    const items = this.convertToTimeItems(entities);

    container.empty();
    container.addClass('pm-timeview');

    this.renderToolbar(container, entities.length, items.length);

    const contentArea = container.createDiv('pm-timeview-content');

    if (items.length === 0) {
      this.renderEmptyState(contentArea, entities.length === 0 ? '暂无数据' : '没有带时间信息的实体');
      return;
    }

    const { start: rangeStart, end: rangeEnd } = this.getTimeRange(items);
    const rows = await this.buildGanttRows(items);
    this.renderGantt(contentArea, rows, rangeStart, rangeEnd);
  }

  // ==================== 数据准备 ====================

  /**
   * 将实体转换为时间视图项
   */
  private convertToTimeItems(entities: Entity[]): TimeViewItem[] {
    return entities
      .filter((e) => 'endDate' in e && (e as any).endDate)
      .map((e) => {
        const endDate = new Date((e as any).endDate);
        const startDate = (e as any).startDate
          ? new Date((e as any).startDate)
          : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          entity: e,
          startDate,
          endDate,
          progress: (e as any).progress || 0,
          entityType: getEntityType(e),
        };
      })
      .filter((item) => !isNaN(item.startDate.getTime()) && !isNaN(item.endDate.getTime()));
  }

  /**
   * 构建甘特图行列表
   */
  private async buildGanttRows(items: TimeViewItem[]): Promise<GanttRow[]> {
    if (this.state.groupBy === 'owner') {
      return this.buildOwnerRows(items);
    }
    return this.buildProjectRows(items);
  }

  /**
   * 按负责人分组
   */
  private buildOwnerRows(items: TimeViewItem[]): GanttRow[] {
    const byOwner = new Map<string, TimeViewItem[]>();
    items.forEach((item) => {
      const owner = item.entity.owner || '未分配';
      if (!byOwner.has(owner)) byOwner.set(owner, []);
      byOwner.get(owner)!.push(item);
    });

    const rows: GanttRow[] = [];
    Array.from(byOwner.entries()).forEach(([owner, ownerItems]) => {
      const expanded = !this.state.collapsedGroups.has(owner);
      rows.push({
        id: `owner-${owner}`,
        label: `@${owner}`,
        indent: 0,
        isGroupHeader: true,
        expandable: true,
        expanded,
        groupId: owner,
      });
      if (expanded) {
        ownerItems.forEach((item) => {
          rows.push({
            id: `item-${item.entity.id}`,
            label: item.entity.name,
            item,
            indent: 1,
            isGroupHeader: false,
            groupId: owner,
          });
        });
      }
    });
    return rows;
  }

  /**
   * 按项目分组
   */
  private async buildProjectRows(items: TimeViewItem[]): Promise<GanttRow[]> {
    const projectItems = items.filter((i) => getEntityType(i.entity) === 'project');
    const featureItems = items.filter((i) => getEntityType(i.entity) === 'feature');

    // 有项目实体时，以项目为父行
    if (projectItems.length > 0) {
      const rows: GanttRow[] = [];
      for (const pItem of projectItems) {
        const projectId = pItem.entity.id;
        const expanded = !this.state.collapsedGroups.has(projectId);

        rows.push({
          id: `project-${projectId}`,
          label: pItem.entity.name,
          item: pItem,
          indent: 0,
          isGroupHeader: true,
          expandable: true,
          expanded,
          groupId: projectId,
        });

        if (expanded) {
          const childFeatures = featureItems.filter(
            (f) => (f.entity as Feature).projectId === projectId
          );
          if (childFeatures.length === 0) {
            try {
              const features = await this.entityManager.getProjectFeatures(projectId);
              const childItems = this.convertToTimeItems(features);
              childItems.forEach((item) => {
                rows.push({
                  id: `item-${item.entity.id}`,
                  label: item.entity.name,
                  item,
                  indent: 1,
                  isGroupHeader: false,
                  groupId: projectId,
                });
              });
            } catch {
              // 忽略加载失败
            }
          } else {
            childFeatures.forEach((item) => {
              rows.push({
                id: `item-${item.entity.id}`,
                label: item.entity.name,
                item,
                indent: 1,
                isGroupHeader: false,
                groupId: projectId,
              });
            });
          }
        }
      }
      return rows;
    }

    // 仅有特性时，按 projectId 分组并查询项目名称
    const byProject = new Map<string, TimeViewItem[]>();
    featureItems.forEach((item) => {
      const pid = (item.entity as Feature).projectId || '未关联';
      if (!byProject.has(pid)) byProject.set(pid, []);
      byProject.get(pid)!.push(item);
    });

    const rows: GanttRow[] = [];
    for (const [pid, fItems] of byProject) {
      let projectName = '未关联项目';
      if (pid !== '未关联') {
        const project = await this.entityManager.getProject(pid);
        if (project) projectName = project.name;
      }

      const expanded = !this.state.collapsedGroups.has(pid);
      rows.push({
        id: `project-${pid}`,
        label: projectName,
        indent: 0,
        isGroupHeader: true,
        expandable: true,
        expanded,
        groupId: pid,
      });

      if (expanded) {
        fItems.forEach((item) => {
          rows.push({
            id: `item-${item.entity.id}`,
            label: item.entity.name,
            item,
            indent: 1,
            isGroupHeader: false,
            groupId: pid,
          });
        });
      }
    }
    return rows;
  }

  // ==================== 时间范围 ====================

  /**
   * 获取当前视图的时间范围
   */
  private getTimeRange(items?: TimeViewItem[]): { start: Date; end: Date } {
    const { currentDate, viewMode } = this.state;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    switch (viewMode) {
      case 'week': {
        const start = this.getWeekStart(currentDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return { start, end };
      }
      case 'month': {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        return { start, end };
      }
      case 'year': {
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31);
        return { start, end };
      }
      case 'all': {
        if (items && items.length > 0) {
          const startTimes = items.map((i) => i.startDate.getTime());
          const endTimes = items.map((i) => i.endDate.getTime());
          const start = new Date(Math.min(...startTimes));
          const end = new Date(Math.max(...endTimes));
          // 添加 5% 缓冲
          const range = end.getTime() - start.getTime();
          const buffer = range * 0.05;
          return {
            start: new Date(start.getTime() - buffer),
            end: new Date(end.getTime() + buffer),
          };
        }
        // 回退到当前月
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        return { start, end };
      }
    }
  }

  /**
   * 获取周开始日期（周日）
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  // ==================== 工具栏 ====================

  /**
   * 渲染工具栏
   */
  private renderToolbar(
    container: HTMLElement,
    totalCount: number = 0,
    timeItemsCount: number = 0
  ): void {
    const toolbar = container.createDiv('pm-timeview-toolbar');

    // 左侧：日期导航
    const navGroup = toolbar.createDiv('pm-timeview-nav');

    const prevBtn = navGroup.createEl('button', { cls: 'pm-timeview-nav-btn' });
    prevBtn.textContent = '◀';
    prevBtn.onclick = () => {
      this.navigateDate(-1);
      this.persistState();
      this.refresh(container);
    };

    const todayBtn = navGroup.createEl('button', { cls: 'pm-timeview-today-btn' });
    todayBtn.textContent =
      this.state.viewMode === 'week' ? '本周' :
      this.state.viewMode === 'year' ? '本年度' :
      this.state.viewMode === 'all' ? '全部' : '本月';
    todayBtn.onclick = () => {
      this.state.currentDate = new Date();
      this.persistState();
      this.refresh(container);
    };

    const nextBtn = navGroup.createEl('button', { cls: 'pm-timeview-nav-btn' });
    nextBtn.textContent = '▶';
    nextBtn.onclick = () => {
      this.navigateDate(1);
      this.persistState();
      this.refresh(container);
    };

    // 中间：日期标题
    const dateTitle = toolbar.createDiv('pm-timeview-date-title');
    dateTitle.textContent = this.getDateTitle();

    // 视图模式切换
    const modeGroup = toolbar.createDiv('pm-timeview-mode');
    const modeSelect = modeGroup.createEl('select', { cls: 'pm-timeview-mode-select' });
    const modes: { value: TimeViewMode; label: string }[] = [
      { value: 'week', label: '周' },
      { value: 'month', label: '月' },
      { value: 'year', label: '年度' },
      { value: 'all', label: '全部时间' },
    ];
    modes.forEach((mode) => {
      const option = modeSelect.createEl('option', { text: mode.label, value: mode.value });
      if (mode.value === this.state.viewMode) option.selected = true;
    });
    modeSelect.addEventListener('change', () => {
      this.state.viewMode = modeSelect.value as TimeViewMode;
      this.persistState();
      this.refresh(container);
    });

    // 分组切换
    const groupToggle = toolbar.createDiv('pm-timeview-group-toggle');
    const ownerBtn = groupToggle.createEl('button', {
      cls: `pm-timeview-group-toggle__btn ${this.state.groupBy === 'owner' ? 'active' : ''}`,
      text: '按负责人',
    });
    ownerBtn.onclick = () => {
      if (this.state.groupBy !== 'owner') {
        this.state.groupBy = 'owner';
        this.persistState();
        this.refresh(container);
      }
    };

    const projectBtn = groupToggle.createEl('button', {
      cls: `pm-timeview-group-toggle__btn ${this.state.groupBy === 'project' ? 'active' : ''}`,
      text: '按项目',
    });
    projectBtn.onclick = () => {
      if (this.state.groupBy !== 'project') {
        this.state.groupBy = 'project';
        this.persistState();
        this.refresh(container);
      }
    };

    // 右侧：统计
    const statsGroup = toolbar.createDiv('pm-timeview-stats');
    statsGroup.textContent = `${timeItemsCount} 项`;
  }

  /**
   * 日期导航
   */
  private navigateDate(direction: -1 | 1): void {
    const { viewMode, currentDate } = this.state;
    switch (viewMode) {
      case 'week':
        currentDate.setDate(currentDate.getDate() + direction * 7);
        break;
      case 'month':
        currentDate.setMonth(currentDate.getMonth() + direction);
        break;
      case 'year':
        currentDate.setFullYear(currentDate.getFullYear() + direction);
        break;
      case 'all':
        // 全部时间模式下导航无效
        break;
    }
  }

  /**
   * 刷新视图
   */
  private async refresh(container: HTMLElement): Promise<void> {
    await this.render(container);
  }

  /**
   * 获取日期标题
   */
  private getDateTitle(): string {
    const { currentDate, viewMode } = this.state;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    switch (viewMode) {
      case 'week': {
        const weekStart = this.getWeekStart(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const sm = weekStart.getMonth() + 1;
        const sd = weekStart.getDate();
        const em = weekEnd.getMonth() + 1;
        const ed = weekEnd.getDate();
        return sm === em
          ? `${year}年${sm}月${sd}日-${ed}日`
          : `${year}年${sm}月${sd}日-${em}月${ed}日`;
      }
      case 'month':
        return `${year}年${month}月`;
      case 'year':
        return `${year}年`;
      case 'all':
        return '全部时间';
    }
  }

  // ==================== 甘特图渲染 ====================

  /**
   * 渲染甘特图
   */
  private renderGantt(
    container: HTMLElement,
    rows: GanttRow[],
    rangeStart: Date,
    rangeEnd: Date
  ): void {
    const gantt = container.createDiv('pm-timeview-gantt');

    this.renderGanttHeader(gantt, rangeStart, rangeEnd);

    const body = gantt.createDiv('pm-timeview-gantt-body');
    rows.forEach((row) => {
      this.renderGanttRow(body, row, rangeStart, rangeEnd);
    });
  }

  /**
   * 渲染甘特图表头
   */
  private renderGanttHeader(
    container: HTMLElement,
    rangeStart: Date,
    rangeEnd: Date
  ): void {
    const header = container.createDiv('pm-timeview-gantt-header');

    const nameCol = header.createDiv('pm-timeview-gantt-header-name');
    nameCol.textContent = this.state.groupBy === 'project' ? '项目 / 特性' : '负责人 / 任务';

    const timelineHeader = header.createDiv('pm-timeview-gantt-header-timeline');

    const days =
      (rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000) + 1;

    let ticks: Date[] = [];
    if (days <= 10) {
      for (let i = 0; i < days; i++) {
        const d = new Date(rangeStart);
        d.setDate(d.getDate() + i);
        ticks.push(d);
      }
    } else if (days <= 35) {
      let d = new Date(rangeStart);
      while (d <= rangeEnd) {
        ticks.push(new Date(d));
        d.setDate(d.getDate() + 7);
      }
    } else if (days <= 730) {
      let d = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      while (d <= rangeEnd) {
        ticks.push(new Date(d));
        d.setMonth(d.getMonth() + 1);
      }
    } else {
      // 全部时间或跨年度视图：按季度刻度
      let d = new Date(rangeStart.getFullYear(), Math.floor(rangeStart.getMonth() / 3) * 3, 1);
      while (d <= rangeEnd) {
        ticks.push(new Date(d));
        d.setMonth(d.getMonth() + 3);
      }
    }

    if (ticks.length < 2) {
      ticks = [rangeStart, rangeEnd];
    }

    const range = rangeEnd.getTime() - rangeStart.getTime();
    const crossYear = rangeStart.getFullYear() !== rangeEnd.getFullYear();

    ticks.forEach((tick) => {
      const tickEl = timelineHeader.createDiv('pm-timeview-gantt-tick');
      const percent = ((tick.getTime() - rangeStart.getTime()) / range) * 100;
      tickEl.style.left = `${percent}%`;
      if (days <= 35) {
        tickEl.textContent = `${tick.getMonth() + 1}/${tick.getDate()}`;
      } else if (crossYear) {
        tickEl.textContent = `${tick.getFullYear()}年${tick.getMonth() + 1}月`;
      } else {
        tickEl.textContent = `${tick.getMonth() + 1}月`;
      }
    });

    ticks.forEach((tick) => {
      const line = timelineHeader.createDiv('pm-timeview-gantt-grid-line');
      const percent = ((tick.getTime() - rangeStart.getTime()) / range) * 100;
      line.style.left = `${percent}%`;
    });
  }

  /**
   * 渲染甘特图行
   */
  private renderGanttRow(
    body: HTMLElement,
    row: GanttRow,
    rangeStart: Date,
    rangeEnd: Date
  ): void {
    const rowEl = body.createDiv('pm-timeview-gantt-row');
    if (row.isGroupHeader) rowEl.addClass('pm-timeview-gantt-row--header');
    if (row.indent > 0) rowEl.addClass('pm-timeview-gantt-row--sub');

    // 名称列
    const nameCol = rowEl.createDiv('pm-timeview-gantt-name');
    nameCol.style.paddingLeft = `${12 + row.indent * 20}px`;

    if (row.expandable) {
      const expandBtn = nameCol.createSpan('pm-timeview-expand-btn');
      expandBtn.textContent = row.expanded ? '▼' : '▶';
      expandBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleGroup(row.groupId!);
        this.persistState();
        this.refresh(rowEl.closest('.pm-timeview') as HTMLElement);
      };
    }

    const labelSpan = nameCol.createSpan('pm-timeview-gantt-name-text');
    labelSpan.textContent = row.label;

    // 时间轴列
    const timelineCol = rowEl.createDiv('pm-timeview-gantt-timeline');

    if (row.item) {
      this.renderGanttBar(timelineCol, row.item, rangeStart, rangeEnd);
    }

    // 点击跳转
    if (row.item) {
      rowEl.addEventListener('click', () => {
        this.actionService.openEntity(row.item!.entityType, row.item!.entity.id);
      });
      rowEl.style.cursor = 'pointer';
    }
  }

  /**
   * 渲染甘特条
   */
  private renderGanttBar(
    container: HTMLElement,
    item: TimeViewItem,
    rangeStart: Date,
    rangeEnd: Date
  ): void {
    const range = rangeEnd.getTime() - rangeStart.getTime();
    if (range <= 0) return;

    const itemStart = Math.max(item.startDate.getTime(), rangeStart.getTime());
    const itemEnd = Math.min(item.endDate.getTime(), rangeEnd.getTime());
    const duration = itemEnd - itemStart;

    if (duration <= 0) return;

    const leftPercent = ((itemStart - rangeStart.getTime()) / range) * 100;
    const widthPercent = (duration / range) * 100;

    const bar = container.createDiv('pm-timeview-gantt-bar');
    bar.style.left = `${Math.max(0, Math.min(99, leftPercent))}%`;
    bar.style.width = `${Math.max(1, Math.min(100, widthPercent))}%`;

    const priorityColor = getPriorityColor((item.entity as any).priority || 'medium');

    bar.style.background = priorityColor.bg;
    bar.style.color = '#fff';

    // 未完成部分叠加暗色表示进度
    if (item.progress > 0 && item.progress < 100) {
      const darken = bar.createDiv('pm-timeview-gantt-bar-darken');
      darken.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: ${100 - item.progress}%;
        background: rgba(0,0,0,0.25);
        border-radius: 0 4px 4px 0;
        z-index: 1;
      `;
    }

    // 条内文字（始终在覆盖层之上）
    const barText = bar.createSpan('pm-timeview-gantt-bar-text');
    barText.style.cssText = 'position: relative; z-index: 2;';
    barText.textContent = item.entity.name;
  }

  // ==================== 交互 ====================

  /**
   * 切换分组展开/折叠状态
   */
  private toggleGroup(groupId: string): void {
    if (this.state.collapsedGroups.has(groupId)) {
      this.state.collapsedGroups.delete(groupId);
    } else {
      this.state.collapsedGroups.add(groupId);
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 渲染空状态
   */
  private renderEmptyState(container: HTMLElement, message: string): void {
    const empty = container.createDiv('pm-timeview-empty');
    empty.createDiv({ text: '📅', cls: 'pm-timeview-empty-icon' }).style.cssText =
      'font-size: 48px;';
    empty.createDiv({ text: message, cls: 'pm-timeview-empty-text' }).style.cssText =
      'font-size: 14px;';
    const hint = empty.createDiv({ cls: 'pm-timeview-empty-hint' });
    hint.style.cssText = 'font-size: 12px; opacity: 0.7;';
    hint.textContent = '提示：为实体添加 startDate 和 endDate 字段即可在时间视图中显示';
  }
}

// 自注册到渲染器注册表
RendererRegistry.register('timeview', TimeViewRenderer);
