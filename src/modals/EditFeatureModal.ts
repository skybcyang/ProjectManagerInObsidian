import { App, Modal, Setting } from 'obsidian';
import { FEATURE_STATUSES, PRIORITIES, getStatusLabel } from '../constants';
import { formatDateDisplay } from '../ui/components/DatePicker';
import type { EntityManager } from '../core';
import type { Feature, UpdateFeatureData } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { needsStatusConfirmation } from '../utils';

export class EditFeatureModal extends Modal {
  private feature: Feature;
  private result: UpdateFeatureData;
  private onSubmit: (data: UpdateFeatureData) => void;
  private onDelete?: () => void;
  private entityManager: EntityManager;

  // 用于存储输入元素引用
  private endDateInput: HTMLInputElement | null = null;
  private endDateSetting: Setting | null = null;
  private startDateInput: HTMLInputElement | null = null;
  private startDateSetting: Setting | null = null;

  constructor(
    app: App,
    entityManager: EntityManager,
    feature: Feature,
    onSubmit: (data: UpdateFeatureData) => void,
    onDelete?: () => void
  ) {
    super(app);
    this.entityManager = entityManager;
    this.feature = feature;
    this.onSubmit = onSubmit;
    this.onDelete = onDelete;
    this.result = {
      name: feature.name,
      status: feature.status,
      priority: feature.priority,
      progress: feature.progress,
      startDate: feature.startDate,
      endDate: feature.endDate,
      owner: feature.owner,
      tags: [...feature.tags],
      isMilestone: feature.isMilestone,
    };
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('pm-modal');

    contentEl.createEl('h2', { text: '编辑特性' });

    // 特性名称
    new Setting(contentEl)
      .setName('特性名称')
      .addText(text => text
        .setValue(this.result.name!)
        .onChange(value => {
          this.result.name = value;
        }));

    // 状态
    new Setting(contentEl)
      .setName('状态')
      .addDropdown(dropdown => {
        FEATURE_STATUSES.forEach(status => {
          dropdown.addOption(status.value, status.label);
        });
        dropdown.setValue(this.result.status!);
        dropdown.onChange(value => {
          const newStatus = value as UpdateFeatureData['status'];
          // 检查是否需要确认
          if (needsStatusConfirmation(this.result.status!, newStatus!)) {
            new ConfirmModal(
              this.app,
              '确认状态变更',
              `确定要将状态从 "${getStatusLabel(this.result.status!)}" 变更为 "${getStatusLabel(newStatus!)}" 吗？`,
              () => {
                this.result.status = newStatus;
              },
              () => {
                dropdown.setValue(this.result.status!);
              }
            ).open();
          } else {
            this.result.status = newStatus;
          }
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
          this.result.priority = value as UpdateFeatureData['priority'];
        });
      });

    // 进度
    new Setting(contentEl)
      .setName('进度')
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
      .addText(text => text
        .setValue(this.result.owner || '')
        .onChange(value => {
          this.result.owner = value || undefined;
        }));

    // 标签
    new Setting(contentEl)
      .setName('标签')
      .setDesc('用逗号分隔')
      .addText(text => text
        .setValue(this.result.tags?.join(', ') || '')
        .onChange(value => {
          this.result.tags = value
            ? value.split(',').map(t => t.trim()).filter(t => t.length > 0)
            : [];
        }));

    // 按钮
    const buttonContainer = contentEl.createDiv({ cls: 'pm-modal__buttons' });

    // 删除按钮（如果有回调）
    if (this.onDelete) {
      const deleteButton = buttonContainer.createEl('button', {
        text: '删除',
        cls: 'mod-warning',
      });
      deleteButton.style.marginRight = 'auto';
      deleteButton.addEventListener('click', () => {
        new ConfirmModal(
          this.app,
          '确认删除',
          `确定要删除特性 "${this.feature.name}" 吗？此操作不可撤销。`,
          () => {
            this.onDelete!();
            this.close();
          }
        ).open();
      });
    }

    const cancelButton = buttonContainer.createEl('button', { text: '取消' });
    cancelButton.addEventListener('click', () => this.close());

    const submitButton = buttonContainer.createEl('button', {
      text: '保存',
      cls: 'mod-cta',
    });
    submitButton.addEventListener('click', () => {
      if (!this.result.name?.trim()) {
        return;
      }
      this.onSubmit(this.result);
      this.close();
    });
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

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
