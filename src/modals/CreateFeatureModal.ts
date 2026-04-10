import { App, Modal, Setting, Notice } from 'obsidian';
import { FEATURE_STATUSES, PRIORITIES } from '../constants';
import { formatDateDisplay } from '../ui/components/DatePicker';
import type { EntityManager } from '../core';
import type { CreateFeatureData, Version, Project } from '../types';

export class CreateFeatureModal extends Modal {
  private result: CreateFeatureData = {
    name: '',
    versionId: '',
    projectId: '',
    status: 'backlog',
    priority: 'medium',
    progress: 0,
    tags: [],
  };
  private versions: Version[] = [];
  private projects: Project[] = [];
  private filteredProjects: Project[] = [];
  private onSubmit: (data: CreateFeatureData) => void;
  private entityManager: EntityManager;

  // 用于存储输入元素引用
  private endDateInput: HTMLInputElement | null = null;
  private endDateSetting: Setting | null = null;
  private startDateInput: HTMLInputElement | null = null;
  private startDateSetting: Setting | null = null;

  constructor(
    app: App,
    entityManager: EntityManager,
    defaultVersionId: string | null,
    defaultProjectId: string | null,
    onSubmit: (data: CreateFeatureData) => void
  ) {
    super(app);
    this.entityManager = entityManager;
    this.onSubmit = onSubmit;
    if (defaultVersionId) {
      this.result.versionId = defaultVersionId;
    }
    if (defaultProjectId) {
      this.result.projectId = defaultProjectId;
    }
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('pm-modal');

    // 加载版本和项目列表
    this.versions = await this.entityManager.listVersions();
    this.projects = await this.entityManager.listProjects();

    // 检查是否有版本和项目
    if (this.versions.length === 0) {
      contentEl.createEl('h2', { text: '创建特性' });
      contentEl.createEl('p', {
        text: '暂无版本，请先创建版本后再创建特性。',
        cls: 'pm-modal__warning'
      });

      const buttonContainer = contentEl.createDiv({ cls: 'pm-modal__buttons' });
      const okButton = buttonContainer.createEl('button', { text: '确定' });
      okButton.addEventListener('click', () => this.close());
      return;
    }

    if (this.projects.length === 0) {
      contentEl.createEl('h2', { text: '创建特性' });
      contentEl.createEl('p', {
        text: '暂无项目，请先创建项目后再创建特性。',
        cls: 'pm-modal__warning'
      });

      const buttonContainer = contentEl.createDiv({ cls: 'pm-modal__buttons' });
      const okButton = buttonContainer.createEl('button', { text: '确定' });
      okButton.addEventListener('click', () => this.close());
      return;
    }

    contentEl.createEl('h2', { text: '创建特性' });

    // 特性名称
    new Setting(contentEl)
      .setName('特性名称')
      .setDesc('输入特性的名称（必填）')
      .addText(text => text
        .setPlaceholder('例如：登录页面开发')
        .setValue(this.result.name)
        .onChange(value => {
          this.result.name = value;
        }));

    // 所属版本（必填）
    const versionSetting = new Setting(contentEl)
      .setName('所属版本')
      .setDesc('选择特性所属的版本（必填）')
      .addDropdown(dropdown => {
        dropdown.addOption('', '请选择版本');
        this.versions.forEach(version => {
          dropdown.addOption(version.id, version.name);
        });
        dropdown.setValue(this.result.versionId);
        dropdown.onChange(value => {
          this.result.versionId = value;
          // 更新项目列表
          this.updateProjectDropdown();
        });
      });

    // 所属项目（必填）
    const projectSetting = new Setting(contentEl)
      .setName('所属项目')
      .setDesc('选择特性所属的项目（必填）')
      .addDropdown(dropdown => {
        this.projectDropdown = dropdown;
        this.updateProjectDropdown();
      });

    // 状态
    new Setting(contentEl)
      .setName('状态')
      .addDropdown(dropdown => {
        FEATURE_STATUSES.forEach(status => {
          dropdown.addOption(status.value, status.label);
        });
        dropdown.setValue(this.result.status!);
        dropdown.onChange(value => {
          this.result.status = value as CreateFeatureData['status'];
        });
      });

    // 优先级
    new Setting(contentEl)
      .setName('优先级')
      .addDropdown(dropdown => {
        PRIORITIES.forEach(priority => {
          dropdown.addOption(priority.value, priority.label);
        });
        dropdown.setValue(this.result.priority!);
        dropdown.onChange(value => {
          this.result.priority = value as CreateFeatureData['priority'];
        });
      });

    // 进度
    new Setting(contentEl)
      .setName('进度')
      .setDesc('0-100')
      .addSlider(slider => slider
        .setLimits(0, 100, 5)
        .setValue(this.result.progress!)
        .setDynamicTooltip()
        .onChange(value => {
          this.result.progress = value;
        }));

    // 开始日期 - 使用日历选择器
    this.startDateSetting = new Setting(contentEl)
      .setName('开始日期')
      .setDesc(formatDateDisplay(this.result.startDate) || '（可选，用于时间视图规划）');

    this.startDateSetting.settingEl.createDiv({ cls: 'pm-date-input' }, div => {
      this.startDateInput = div.createEl('input', {
        type: 'date',
        cls: 'pm-date-picker',
      });
      this.startDateInput.value = this.result.startDate || '';
      this.startDateInput.addEventListener('change', (e) => {
        const value = (e.target as HTMLInputElement).value;
        this.result.startDate = value || undefined;
        this.startDateSetting?.setDesc(formatDateDisplay(this.result.startDate) || '（可选）');
      });

      // 快捷按钮
      this.createQuickDateButtons(div, (date) => {
        this.result.startDate = date;
        if (this.startDateInput) {
          this.startDateInput.value = date;
        }
        this.startDateSetting?.setDesc(formatDateDisplay(date));
      });
    });

    // 结束日期 - 使用日历选择器
    this.endDateSetting = new Setting(contentEl)
      .setName('结束日期')
      .setDesc(formatDateDisplay(this.result.endDate) || '（可选）');

    this.endDateSetting.settingEl.createDiv({ cls: 'pm-date-input' }, div => {
      this.endDateInput = div.createEl('input', {
        type: 'date',
        cls: 'pm-date-picker',
      });
      this.endDateInput.value = this.result.endDate || '';
      this.endDateInput.addEventListener('change', (e) => {
        const value = (e.target as HTMLInputElement).value;
        this.result.endDate = value || undefined;
        this.endDateSetting?.setDesc(formatDateDisplay(this.result.endDate) || '（可选）');
      });

      // 快捷按钮
      this.createQuickDateButtons(div, (date) => {
        this.result.endDate = date;
        if (this.endDateInput) {
          this.endDateInput.value = date;
        }
        this.endDateSetting?.setDesc(formatDateDisplay(date));
      });
    });

    // 里程碑标记
    new Setting(contentEl)
      .setName('标记为里程碑')
      .setDesc('里程碑在时间视图中会特殊显示')
      .addToggle(toggle => {
        toggle.setValue(this.result.isMilestone || false);
        toggle.onChange(value => {
          this.result.isMilestone = value;
        });
      });

    // 负责人
    new Setting(contentEl)
      .setName('负责人')
      .setDesc('（可选）')
      .addText(text => text
        .setPlaceholder('例如：张三')
        .setValue(this.result.owner || '')
        .onChange(value => {
          this.result.owner = value || undefined;
        }));

    // 标签
    new Setting(contentEl)
      .setName('标签')
      .setDesc('用逗号分隔多个标签（可选）')
      .addText(text => text
        .setPlaceholder('例如：前端, API')
        .setValue(this.result.tags?.join(', ') || '')
        .onChange(value => {
          this.result.tags = value
            ? value.split(',').map(t => t.trim()).filter(t => t.length > 0)
            : [];
        }));

    // 按钮区域
    const buttonContainer = contentEl.createDiv({ cls: 'pm-modal__buttons' });

    // 填入示例按钮
    const exampleButton = buttonContainer.createEl('button', {
      text: '填入示例',
      cls: 'pm-btn--secondary',
    });
    exampleButton.style.marginRight = 'auto';
    exampleButton.addEventListener('click', () => this.fillExample());

    const cancelButton = buttonContainer.createEl('button', { text: '取消' });
    cancelButton.addEventListener('click', () => this.close());

    const submitButton = buttonContainer.createEl('button', {
      text: '创建',
      cls: 'mod-cta',
    });
    submitButton.addEventListener('click', () => {
      if (!this.result.name.trim()) {
        new Notice('特性名称不能为空');
        return;
      }
      if (!this.result.versionId) {
        new Notice('请选择所属版本');
        return;
      }
      if (!this.result.projectId) {
        new Notice('请选择所属项目');
        return;
      }
      this.onSubmit(this.result);
      this.close();
    });
  }

  /**
   * 填入示例数据
   */
  private fillExample(): void {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    this.result = {
      name: '首页设计开发',
      versionId: this.result.versionId || (this.versions.length > 0 ? this.versions[0].id : ''),
      projectId: this.result.projectId || (this.projects.length > 0 ? this.projects[0].id : ''),
      status: 'todo',
      priority: 'high',
      progress: 0,
      startDate: today.toISOString().split('T')[0],
      endDate: nextWeek.toISOString().split('T')[0],
      owner: '设计师小王',
      tags: ['UI', '首页', '设计'],
      isMilestone: false,
    };

    // 重新渲染
    this.onOpen();
  }

  /**
   * 创建快捷日期按钮
   */
  private createQuickDateButtons(
    container: HTMLElement,
    onSelect: (date: string) => void
  ): void {
    const quickContainer = container.createDiv({ cls: 'pm-date-quick' });

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    const buttons = [
      { label: '今天', date: formatDate(today) },
      { label: '明天', date: formatDate(tomorrow) },
      { label: '一周后', date: formatDate(nextWeek) },
      { label: '一月后', date: formatDate(nextMonth) },
    ];

    buttons.forEach(({ label, date }) => {
      const btn = quickContainer.createEl('button', {
        text: label,
        cls: 'pm-date-quick__btn',
      });
      btn.addEventListener('click', () => onSelect(date));
    });
  }

  private projectDropdown: any;

  private updateProjectDropdown(): void {
    if (!this.projectDropdown) return;

    // 清空选项
    this.projectDropdown.selectEl.innerHTML = '';
    this.projectDropdown.addOption('', '请选择项目');

    // 过滤项目
    this.filteredProjects = this.result.versionId
      ? this.projects.filter((p: Project) => p.versionId === this.result.versionId)
      : this.projects;

    this.filteredProjects.forEach(project => {
      this.projectDropdown.addOption(project.id, project.name);
    });

    // 如果当前选中的项目不在过滤后的列表中，重置选择
    if (this.result.projectId && !this.filteredProjects.find(p => p.id === this.result.projectId)) {
      this.result.projectId = '';
      this.projectDropdown.setValue('');
    } else {
      this.projectDropdown.setValue(this.result.projectId);
    }

    // 监听变化
    this.projectDropdown.onChange((value: string) => {
      this.result.projectId = value;
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
