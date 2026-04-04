import { App, Modal, Setting, Notice } from 'obsidian';
import { PROJECT_STATUSES, PRIORITIES } from '../constants';
import { formatDateDisplay } from '../ui/components/DatePicker';
import type { EntityManager } from '../core';
import type { CreateProjectData, Version } from '../types';

export class CreateProjectModal extends Modal {
  private result: CreateProjectData = {
    name: '',
    versionId: '',
    status: 'backlog',
    priority: 'medium',
    tags: [],
  };
  private versions: Version[] = [];
  private onSubmit: (data: CreateProjectData) => void;
  private entityManager: EntityManager;

  constructor(
    app: App,
    entityManager: EntityManager,
    defaultVersionId: string | null,
    onSubmit: (data: CreateProjectData) => void
  ) {
    super(app);
    this.entityManager = entityManager;
    this.onSubmit = onSubmit;
    if (defaultVersionId) {
      this.result.versionId = defaultVersionId;
    }
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('pm-modal');

    // 加载版本列表
    this.versions = await this.entityManager.listVersions();

    // 检查是否有版本
    if (this.versions.length === 0) {
      contentEl.createEl('h2', { text: '创建项目' });
      contentEl.createEl('p', { 
        text: '暂无版本，请先创建版本后再创建项目。',
        cls: 'pm-modal__warning'
      });
      
      const buttonContainer = contentEl.createDiv({ cls: 'pm-modal__buttons' });
      const okButton = buttonContainer.createEl('button', { text: '确定' });
      okButton.addEventListener('click', () => this.close());
      return;
    }

    contentEl.createEl('h2', { text: '创建项目' });

    // 项目名称
    new Setting(contentEl)
      .setName('项目名称')
      .setDesc('输入项目的名称（必填）')
      .addText(text => text
        .setPlaceholder('例如：官网重构')
        .setValue(this.result.name)
        .onChange(value => {
          this.result.name = value;
        }));

    // 所属版本（必填）
    new Setting(contentEl)
      .setName('所属版本')
      .setDesc('选择项目所属的版本（必填）')
      .addDropdown(dropdown => {
        dropdown.addOption('', '请选择版本');
        this.versions.forEach(version => {
          dropdown.addOption(version.id, version.name);
        });
        dropdown.setValue(this.result.versionId);
        dropdown.onChange(value => {
          this.result.versionId = value;
        });
      });

    // 状态
    new Setting(contentEl)
      .setName('状态')
      .addDropdown(dropdown => {
        PROJECT_STATUSES.forEach(status => {
          dropdown.addOption(status.value, status.label);
        });
        dropdown.setValue(this.result.status!);
        dropdown.onChange(value => {
          this.result.status = value as CreateProjectData['status'];
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
          this.result.priority = value as CreateProjectData['priority'];
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
        .setPlaceholder('例如：前端, 重要')
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
        new Notice('项目名称不能为空');
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

  /**
   * 填入示例数据
   */
  private fillExample(): void {
    this.result = {
      name: '官网重构项目',
      versionId: this.versions.length > 0 ? this.versions[0].id : '',
      status: 'backlog',
      priority: 'high',
      owner: '李四',
      tags: ['前端', '设计', '官网'],
    };
    
    // 重新渲染
    this.onOpen();
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
