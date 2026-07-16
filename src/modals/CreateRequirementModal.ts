import { App, Modal, Setting, Notice } from 'obsidian';
import { REQUIREMENT_STATUSES, PRIORITIES } from '../constants';
import { formatDateDisplay } from '../ui/components/DatePicker';
import type { EntityManager } from '../core';
import type { CreateRequirementData, Version, Project, Feature } from '../types';

export class CreateRequirementModal extends Modal {
  private result: CreateRequirementData = {
    name: '',
    versionId: '',
    projectId: undefined,
    featureId: undefined,
    status: 'backlog',
    priority: 'medium',
    progress: 0,
    tags: [],
    estimatedDays: undefined,
    actualDays: undefined,
    owner: undefined,
    startDate: undefined,
    endDate: undefined,
    description: undefined,
  };
  private versions: Version[] = [];
  private projects: Project[] = [];
  private features: Feature[] = [];
  private filteredProjects: Project[] = [];
  private filteredFeatures: Feature[] = [];
  private onSubmit: (data: CreateRequirementData) => void;
  private entityManager: EntityManager;

  private endDateInput: HTMLInputElement | null = null;
  private endDateSetting: Setting | null = null;
  private startDateInput: HTMLInputElement | null = null;
  private startDateSetting: Setting | null = null;
  private projectDropdown: any;
  private featureDropdown: any;

  constructor(
    app: App,
    entityManager: EntityManager,
    defaultVersionId: string | null = null,
    defaultProjectId: string | null = null,
    onSubmit: (data: CreateRequirementData) => void
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

    this.versions = await this.entityManager.listVersions();
    this.projects = await this.entityManager.listProjects();
    this.features = await this.entityManager.listFeatures();

    if (this.versions.length === 0) {
      contentEl.createEl('h2', { text: '创建需求' });
      contentEl.createEl('p', {
        text: '暂无版本，请先创建版本后再创建需求。',
        cls: 'pm-modal__warning'
      });

      const buttonContainer = contentEl.createDiv({ cls: 'pm-modal__buttons' });
      const okButton = buttonContainer.createEl('button', { text: '确定' });
      okButton.addEventListener('click', () => this.close());
      return;
    }

    contentEl.createEl('h2', { text: '创建需求' });

    // 需求名称
    new Setting(contentEl)
      .setName('需求名称')
      .setDesc('输入需求的名称（必填）')
      .addText(text => text
        .setPlaceholder('例如：用户注册流程优化')
        .setValue(this.result.name)
        .onChange(value => {
          this.result.name = value;
        }));

    // 所属版本（必填）
    new Setting(contentEl)
      .setName('所属版本')
      .setDesc('选择需求所属的版本（必填）')
      .addDropdown(dropdown => {
        dropdown.addOption('', '请选择版本');
        this.versions.forEach(version => {
          dropdown.addOption(version.id, version.name);
        });
        dropdown.setValue(this.result.versionId);
        dropdown.onChange(value => {
          this.result.versionId = value;
          this.updateProjectDropdown();
        });
      });

    // 所属项目（可选）
    const projectSetting = new Setting(contentEl)
      .setName('所属项目')
      .setDesc('选择需求关联的项目（可选）')
      .addDropdown(dropdown => {
        this.projectDropdown = dropdown;
        this.updateProjectDropdown();
      });

    // 关联特性（可选）
    const featureSetting = new Setting(contentEl)
      .setName('关联特性')
      .setDesc('选择需求关联的特性（可选）')
      .addDropdown(dropdown => {
        this.featureDropdown = dropdown;
        this.updateFeatureDropdown();
      });

    // 状态
    new Setting(contentEl)
      .setName('状态')
      .addDropdown(dropdown => {
        REQUIREMENT_STATUSES.forEach(status => {
          dropdown.addOption(status.value, status.label);
        });
        dropdown.setValue(this.result.status!);
        dropdown.onChange(value => {
          this.result.status = value as CreateRequirementData['status'];
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
          this.result.priority = value as CreateRequirementData['priority'];
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

    // 开始日期
    this.startDateSetting = new Setting(contentEl)
      .setName('开始日期')
      .setDesc(formatDateDisplay(this.result.startDate) || '（可选）');

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

      this.createQuickDateButtons(div, (date) => {
        this.result.startDate = date;
        if (this.startDateInput) {
          this.startDateInput.value = date;
        }
        this.startDateSetting?.setDesc(formatDateDisplay(date));
      });
    });

    // 结束日期
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

      this.createQuickDateButtons(div, (date) => {
        this.result.endDate = date;
        if (this.endDateInput) {
          this.endDateInput.value = date;
        }
        this.endDateSetting?.setDesc(formatDateDisplay(date));
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

    // 预估人天
    new Setting(contentEl)
      .setName('预估人天')
      .setDesc('人天（可选）')
      .addText(text => {
        text.inputEl.type = 'number';
        text.inputEl.placeholder = '例如：5';
        text.setValue(this.result.estimatedDays !== undefined ? String(this.result.estimatedDays) : '')
          .onChange(value => {
            const num = value ? parseFloat(value) : undefined;
            this.result.estimatedDays = num !== undefined && !isNaN(num) ? num : undefined;
          });
      });

    // 实际人天
    new Setting(contentEl)
      .setName('实际人天')
      .setDesc('人天（可选）')
      .addText(text => {
        text.inputEl.type = 'number';
        text.inputEl.placeholder = '例如：3';
        text.setValue(this.result.actualDays !== undefined ? String(this.result.actualDays) : '')
          .onChange(value => {
            const num = value ? parseFloat(value) : undefined;
            this.result.actualDays = num !== undefined && !isNaN(num) ? num : undefined;
          });
      });

    // 描述
    new Setting(contentEl)
      .setName('需求描述')
      .setDesc('（可选）')
      .addTextArea(text => text
        .setPlaceholder('描述需求的背景、目标和范围')
        .setValue(this.result.description || '')
        .onChange(value => {
          this.result.description = value || undefined;
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
        new Notice('需求名称不能为空');
        return;
      }
      if (!this.result.versionId) {
        new Notice('请选择所属版本');
        return;
      }
      this.onSubmit(this.result);
      this.close();
    });
  }

  private fillExample(): void {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    this.result = {
      name: '用户注册流程优化',
      versionId: this.result.versionId || (this.versions.length > 0 ? this.versions[0].id : ''),
      projectId: this.result.projectId,
      featureId: this.result.featureId,
      status: 'todo',
      priority: 'high',
      progress: 0,
      startDate: today.toISOString().split('T')[0],
      endDate: nextWeek.toISOString().split('T')[0],
      owner: '产品经理小李',
      tags: ['需求', '注册', '用户体验'],
      estimatedDays: 3,
      actualDays: 0,
      description: '简化注册流程，支持手机号和第三方授权登录，降低用户流失率。',
    };

    this.onOpen();
  }

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

  private updateProjectDropdown(): void {
    if (!this.projectDropdown) return;

    this.projectDropdown.selectEl.innerHTML = '';
    this.projectDropdown.addOption('', '不关联项目');

    this.filteredProjects = this.result.versionId
      ? this.projects.filter((p: Project) => p.versionId === this.result.versionId)
      : [];

    this.filteredProjects.forEach(project => {
      this.projectDropdown.addOption(project.id, project.name);
    });

    if (this.result.projectId && !this.filteredProjects.find(p => p.id === this.result.projectId)) {
      this.result.projectId = undefined;
      this.projectDropdown.setValue('');
    } else {
      this.projectDropdown.setValue(this.result.projectId || '');
    }

    this.projectDropdown.onChange((value: string) => {
      this.result.projectId = value || undefined;
      this.updateFeatureDropdown();
    });

    this.updateFeatureDropdown();
  }

  private updateFeatureDropdown(): void {
    if (!this.featureDropdown) return;

    this.featureDropdown.selectEl.innerHTML = '';
    this.featureDropdown.addOption('', '不关联特性');

    this.filteredFeatures = this.result.projectId
      ? this.features.filter((f: Feature) => f.projectId === this.result.projectId)
      : [];

    this.filteredFeatures.forEach(feature => {
      this.featureDropdown.addOption(feature.id, feature.name);
    });

    if (this.result.featureId && !this.filteredFeatures.find(f => f.id === this.result.featureId)) {
      this.result.featureId = undefined;
      this.featureDropdown.setValue('');
    } else {
      this.featureDropdown.setValue(this.result.featureId || '');
    }

    this.featureDropdown.onChange((value: string) => {
      this.result.featureId = value || undefined;
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
