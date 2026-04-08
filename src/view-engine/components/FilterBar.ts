import { type App, TFile } from 'obsidian';
import type { EntityManager } from '../../core';
import type { ViewConfig } from '../types';

/**
 * FilterBar - 精致长条卡片式筛选器
 * 筛选在上，视图在下，所有条件在一个横向卡片内
 * 支持筛选条件持久化保存到代码块
 */
export class FilterBar {
  private container?: HTMLElement;
  private filters: ViewConfig = { mode: 'kanban' };
  private versions: Array<{ value: string; label: string }> = [];
  private projects: Array<{ value: string; label: string }> = [];
  private features: Array<{ value: string; label: string }> = [];
  private owners: string[] = [];

  // 状态选项
  private readonly statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'backlog', label: '待处理' },
    { value: 'todo', label: '待开始' },
    { value: 'in-progress', label: '进行中' },
    { value: 'testing', label: '测试中' },
    { value: 'completed', label: '已完成' },
  ];

  // 优先级选项
  private readonly priorityOptions = [
    { value: '', label: '全部优先级' },
    { value: 'critical', label: '紧急' },
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' },
  ];

  constructor(
    private app: App,
    private entityManager: EntityManager,
    private onChange: (filters: ViewConfig) => void,
    private sourcePath?: string,
    private codeBlockStart?: number
  ) {}

  /**
   * 加载选项数据
   */
  async loadOptions(): Promise<void> {
    // 加载版本
    const versions = await this.entityManager.listVersions();
    this.versions = [{ value: '', label: '全部版本' }, ...versions.map(v => ({ value: v.id, label: v.name }))];

    // 加载项目
    const projects = await this.entityManager.listProjects();
    this.projects = [{ value: '', label: '全部项目' }, ...projects.map(p => ({ value: p.id, label: p.name }))];

    // 加载特性
    const features = await this.entityManager.listFeatures();
    this.features = [{ value: '', label: '全部特性' }, ...features.map(f => ({ value: f.id, label: f.name }))];

    // 加载负责人列表（去重）
    const ownersSet = new Set<string>();
    features.forEach(f => {
      if (f.owner) ownersSet.add(f.owner);
    });
    this.owners = ['全部负责人', ...Array.from(ownersSet).sort()];
  }

  /**
   * 渲染筛选器 - 横向紧凑卡片式，6个筛选+重置按钮排成一排
   */
  render(parent: HTMLElement, initialFilters?: Partial<ViewConfig>): HTMLElement {
    this.container = parent.createDiv('pm-filter-container');
    
    if (initialFilters) {
      this.filters = { ...this.filters, ...initialFilters };
    }

    // 筛选器横向条
    const filterBar = this.container.createDiv('pm-filter-bar-compact');

    // 版本筛选
    this.createSelectCompact(filterBar, '版本', this.versions, this.filters.version || '', (value) => {
      this.filters.version = value || undefined;
      this.filters.project = undefined;
      this.filters.feature = undefined;
      this.onFilterChange();
      this.updateProjectOptions();
    });

    // 项目筛选
    this.createSelectCompact(filterBar, '项目', this.projects, this.filters.project || '', (value) => {
      this.filters.project = value || undefined;
      this.filters.feature = undefined;
      this.onFilterChange();
      this.updateFeatureOptions();
    });

    // 特性筛选
    this.createSelectCompact(filterBar, '特性', this.features, this.filters.feature || '', (value) => {
      this.filters.feature = value || undefined;
      this.onFilterChange();
    });

    // 状态筛选
    this.createSelectCompact(filterBar, '状态', this.statusOptions, this.filters.status || '', (value) => {
      this.filters.status = value || undefined;
      this.onFilterChange();
    });

    // 优先级筛选
    this.createSelectCompact(filterBar, '优先级', this.priorityOptions, this.filters.priority || '', (value) => {
      this.filters.priority = value || undefined;
      this.onFilterChange();
    });

    // 负责人筛选
    this.createSelectCompact(filterBar, '负责人', 
      this.owners.map(o => ({ value: o === '全部负责人' ? '' : o, label: o })), 
      this.filters.owner || '', (value) => {
        this.filters.owner = value || undefined;
        this.onFilterChange();
      });

    // 重置按钮
    const resetBtn = filterBar.createEl('button', {
      cls: 'pm-filter-reset-compact',
      text: '↺ 重置',
    });
    resetBtn.addEventListener('click', () => {
      this.resetFilters();
    });

    return this.container;
  }

  /**
   * 筛选条件变化时的处理
   */
  private onFilterChange(): void {
    // 触发视图刷新
    this.onChange({ ...this.filters });
    // 保存到代码块
    this.saveFiltersToCodeBlock();
  }

  /**
   * 保存筛选条件到代码块
   */
  private async saveFiltersToCodeBlock(): Promise<void> {
    if (!this.sourcePath || this.codeBlockStart === undefined) return;

    const file = this.app.vault.getAbstractFileByPath(this.sourcePath);
    if (!(file instanceof TFile)) return;

    try {
      const content = await this.app.vault.read(file);
      const lines = content.split('\n');

      // 找到代码块的开始和结束
      let blockStart = -1;
      let blockEnd = -1;
      let codeBlockIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 找到 pm-view 代码块
        if (line === '```pm-view') {
          if (codeBlockIndex === this.codeBlockStart) {
            blockStart = i;
          }
          codeBlockIndex++;
        }
        
        // 找到对应的结束标记
        if (blockStart !== -1 && line === '```') {
          blockEnd = i;
          break;
        }
      }

      if (blockStart === -1 || blockEnd === -1) return;

      // 提取原有的配置
      const originalLines = lines.slice(blockStart + 1, blockEnd);
      const originalConfig = this.parseOriginalConfig(originalLines);

      // 合并新的筛选条件
      const newConfig = {
        ...originalConfig,
        mode: this.filters.mode,
        ...(this.filters.version && { version: this.filters.version }),
        ...(this.filters.project && { project: this.filters.project }),
        ...(this.filters.feature && { feature: this.filters.feature }),
        ...(this.filters.status && { status: this.filters.status }),
        ...(this.filters.priority && { priority: this.filters.priority }),
        ...(this.filters.owner && { owner: this.filters.owner }),
        ...(this.filters.tag && { tag: this.filters.tag }),
      };

      // 生成新的 YAML
      const yamlLines = this.configToYaml(newConfig);
      const newBlockLines = ['```pm-view', ...yamlLines, '```'];

      // 替换代码块
      const newLines = [
        ...lines.slice(0, blockStart),
        ...newBlockLines,
        ...lines.slice(blockEnd + 1)
      ];

      const newContent = newLines.join('\n');
      
      // 使用 processFrontMatter 或 modify
      if (newContent !== content) {
        await this.app.vault.modify(file, newContent);
      }
    } catch (error) {
      console.error('保存筛选条件失败:', error);
    }
  }

  /**
   * 解析原有配置
   */
  private parseOriginalConfig(lines: string[]): Partial<ViewConfig> {
    const config: Partial<ViewConfig> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      
      // 保留非筛选相关的配置
      if (['mode', 'title', 'groupBy', 'sortBy', 'sortOrder', 'limit', 'cols', 'expanded', 'tag'].includes(key)) {
        (config as any)[key] = value;
      }
    }
    
    return config;
  }

  /**
   * 将配置转换为 YAML 格式
   */
  private configToYaml(config: Partial<ViewConfig>): string[] {
    const lines: string[] = [];
    
    // 保持原有顺序：先保留的配置，再添加筛选条件
    const order = ['mode', 'title', 'version', 'project', 'feature', 'status', 'priority', 'owner', 'tag', 'groupBy', 'sortBy', 'sortOrder', 'limit', 'cols', 'expanded'];
    
    for (const key of order) {
      const value = (config as any)[key];
      if (value !== undefined && value !== '') {
        lines.push(`${key}: ${value}`);
      }
    }
    
    return lines;
  }

  /**
   * 创建紧凑下拉选择器（用于横向筛选栏）
   */
  private createSelectCompact(
    container: HTMLElement,
    label: string,
    options: Array<{ value: string; label: string }>,
    value: string,
    onChange: (value: string) => void
  ): HTMLElement {
    const wrapper = container.createDiv('pm-filter-field-compact');
    
    const select = wrapper.createEl('select', { cls: 'pm-filter-select-compact' });
    options.forEach(opt => {
      const option = select.createEl('option', {
        text: opt.label,
        value: opt.value,
      });
      if (opt.value === value) {
        option.selected = true;
      }
    });

    select.addEventListener('change', () => {
      onChange(select.value);
    });

    return wrapper;
  }

  /**
   * 更新项目选项（根据选中的版本）
   */
  private async updateProjectOptions(): Promise<void> {
    if (!this.container) return;

    let projects;
    if (this.filters.version) {
      projects = await this.entityManager.listProjects({ versionId: this.filters.version });
    } else {
      projects = await this.entityManager.listProjects();
    }
    this.projects = [{ value: '', label: '全部项目' }, ...projects.map(p => ({ value: p.id, label: p.name }))];
    
    this.rerenderSelect('项目', this.projects, this.filters.project || '', (value) => {
      this.filters.project = value || undefined;
      this.filters.feature = undefined;
      this.onFilterChange();
      this.updateFeatureOptions();
    });
  }

  /**
   * 更新特性选项（根据选中的项目）
   */
  private async updateFeatureOptions(): Promise<void> {
    if (!this.container) return;

    let features;
    if (this.filters.project) {
      features = await this.entityManager.listFeatures({ projectId: this.filters.project });
    } else if (this.filters.version) {
      features = await this.entityManager.listFeatures({ versionId: this.filters.version });
    } else {
      features = await this.entityManager.listFeatures();
    }
    this.features = [{ value: '', label: '全部特性' }, ...features.map(f => ({ value: f.id, label: f.name }))];
    
    this.rerenderSelect('特性', this.features, this.filters.feature || '', (value) => {
      this.filters.feature = value || undefined;
      this.onFilterChange();
    });
  }

  /**
   * 重新渲染下拉框（用于级联更新）
   */
  private rerenderSelect(
    labelText: string,
    options: Array<{ value: string; label: string }>,
    value: string,
    onChange: (value: string) => void
  ): void {
    if (!this.container) return;
    
    const selects = this.container.querySelectorAll('.pm-filter-select-compact');
    selects.forEach((selectEl, index) => {
      const parent = selectEl.parentElement;
      if (!parent) return;
      
      // 通过位置找到对应的 label（版本=0, 项目=1, 特性=2, 状态=3, 优先级=4, 负责人=5）
      const labelMap = ['版本', '项目', '特性', '状态', '优先级', '负责人'];
      if (labelMap[index] === labelText) {
        parent.empty();
        const select = parent.createEl('select', { cls: 'pm-filter-select-compact' });
        options.forEach(opt => {
          const option = select.createEl('option', {
            text: opt.label,
            value: opt.value,
          });
          if (opt.value === value) {
            option.selected = true;
          }
        });
        select.addEventListener('change', () => {
          onChange(select.value);
        });
      }
    });
  }

  /**
   * 重置所有筛选条件
   */
  private resetFilters(): void {
    this.filters = { mode: this.filters.mode };
    
    this.loadOptions().then(() => {
      if (this.container) {
        // 重置所有下拉框
        const selects = this.container.querySelectorAll('.pm-filter-select-compact');
        selects.forEach((selectEl, index) => {
          const select = selectEl as HTMLSelectElement;
          select.value = '';
        });
        
        // 触发刷新并保存
        this.onFilterChange();
      }
    });
  }

  /**
   * 获取当前筛选条件
   */
  getFilters(): ViewConfig {
    return { ...this.filters };
  }
}
