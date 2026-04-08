import { App, Modal, Setting } from 'obsidian';
import { VERSION_STATUSES, IPD_PHASES } from '../constants';
import { formatDateDisplay } from '../ui/components/DatePicker';
import type { CreateVersionData } from '../types';

export class CreateVersionModal extends Modal {
  private result: CreateVersionData = {
    name: '',
    status: 'planning',
    phase: 'tr3',
    tags: [],
  };
  private onSubmit: (data: CreateVersionData) => void;

  // 用于存储输入元素引用以便更新值
  private startDateInput: HTMLInputElement | null = null;
  private endDateInput: HTMLInputElement | null = null;
  private targetDateInput: HTMLInputElement | null = null;

  constructor(app: App, onSubmit: (data: CreateVersionData) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('pm-modal');

    contentEl.createEl('h2', { text: '创建版本' });

    // 版本名称
    new Setting(contentEl)
      .setName('版本名称')
      .setDesc('输入版本的名称（必填）')
      .addText(text => text
        .setPlaceholder('例如：v1.0 第一季度')
        .setValue(this.result.name)
        .onChange(value => {
          this.result.name = value;
        }));

    // 状态
    new Setting(contentEl)
      .setName('状态')
      .addDropdown(dropdown => {
        VERSION_STATUSES.forEach((status: {value: string, label: string}) => {
          dropdown.addOption(status.value, status.label);
        });
        dropdown.setValue(this.result.status!);
        dropdown.onChange(value => {
          this.result.status = value as CreateVersionData['status'];
        });
      });

    // 当前 TR 阶段
    new Setting(contentEl)
      .setName('当前 TR 阶段')
      .setDesc('选择版本当前的 IPD 阶段')
      .addDropdown(dropdown => {
        IPD_PHASES.forEach(phase => {
          dropdown.addOption(phase.value, `${phase.label} - ${phase.description}`);
        });
        dropdown.setValue(this.result.phase || 'tr3');
        dropdown.onChange(value => {
          this.result.phase = value as CreateVersionData['phase'];
        });
      });

    // TR6 目标发布日期
    const targetDateSetting = new Setting(contentEl)
      .setName('TR6 目标发布日期')
      .setDesc(formatDateDisplay(this.result.targetDate) || '（可选，TR6阶段的目标发布日期）');
    
    targetDateSetting.settingEl.createDiv({ cls: 'pm-date-input' }, div => {
      this.targetDateInput = div.createEl('input', {
        type: 'date',
        cls: 'pm-date-picker',
      });
      this.targetDateInput.value = this.result.targetDate || '';
      this.targetDateInput.addEventListener('change', (e) => {
        const value = (e.target as HTMLInputElement).value;
        this.result.targetDate = value || undefined;
        targetDateSetting.setDesc(formatDateDisplay(this.result.targetDate) || '（可选）');
      });
      
      // 快捷按钮
      this.createQuickDateButtons(div, (date) => {
        this.result.targetDate = date;
        if (this.targetDateInput) {
          this.targetDateInput.value = date;
        }
        targetDateSetting.setDesc(formatDateDisplay(date));
      });
    });

    // 开始日期 - 使用日历选择器
    const startDateSetting = new Setting(contentEl)
      .setName('开始日期')
      .setDesc(formatDateDisplay(this.result.startDate) || '（可选）');
    
    startDateSetting.settingEl.createDiv({ cls: 'pm-date-input' }, div => {
      this.startDateInput = div.createEl('input', {
        type: 'date',
        cls: 'pm-date-picker',
      });
      this.startDateInput.value = this.result.startDate || '';
      this.startDateInput.addEventListener('change', (e) => {
        const value = (e.target as HTMLInputElement).value;
        this.result.startDate = value || undefined;
        startDateSetting.setDesc(formatDateDisplay(this.result.startDate) || '（可选）');
      });
      
      // 快捷按钮
      this.createQuickDateButtons(div, (date) => {
        this.result.startDate = date;
        if (this.startDateInput) {
          this.startDateInput.value = date;
        }
        startDateSetting.setDesc(formatDateDisplay(date));
      });
    });

    // 结束日期 - 使用日历选择器
    const endDateSetting = new Setting(contentEl)
      .setName('结束日期')
      .setDesc(formatDateDisplay(this.result.endDate) || '（可选）');
    
    endDateSetting.settingEl.createDiv({ cls: 'pm-date-input' }, div => {
      this.endDateInput = div.createEl('input', {
        type: 'date',
        cls: 'pm-date-picker',
      });
      this.endDateInput.value = this.result.endDate || '';
      this.endDateInput.addEventListener('change', (e) => {
        const value = (e.target as HTMLInputElement).value;
        this.result.endDate = value || undefined;
        endDateSetting.setDesc(formatDateDisplay(this.result.endDate) || '（可选）');
      });
      
      // 快捷按钮
      this.createQuickDateButtons(div, (date) => {
        this.result.endDate = date;
        if (this.endDateInput) {
          this.endDateInput.value = date;
        }
        endDateSetting.setDesc(formatDateDisplay(date));
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
        .setPlaceholder('例如：Q1, 重要')
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
    const nextQuarter = new Date(today);
    nextQuarter.setMonth(nextQuarter.getMonth() + 3);
    
    this.result = {
      name: 'v1.0.0 春季迭代',
      status: 'planning',
      phase: 'tr3',
      targetDate: nextQuarter.toISOString().split('T')[0],
      owner: '张三',
      startDate: today.toISOString().split('T')[0],
      endDate: nextQuarter.toISOString().split('T')[0],
      tags: ['Q2', '重要'],
    };
    
    // 重新渲染以更新所有字段
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

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
