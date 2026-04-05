import { App, Modal, Setting, Notice } from 'obsidian';
import { FEATURE_STATUSES, PRIORITIES } from '../constants';
import type { EntityManager } from '../core';
import type { CreateFeatureData, Version, Project } from '../types';

/**
 * 快速创建特性模态框
 * 用于日历视图等场景的快速创建
 */
export class QuickCreateModal extends Modal {
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

  constructor(
    app: App,
    private entityManager: EntityManager,
    private defaultDate: string,
    private onSubmit: (data: CreateFeatureData) => void
  ) {
    super(app);
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('pm-modal');

    this.versions = await this.entityManager.listVersions();
    this.projects = await this.entityManager.listProjects();

    if (this.versions.length === 0 || this.projects.length === 0) {
      contentEl.createEl('h2', { text: '快速创建特性' });
      contentEl.createEl('p', { 
        text: '需要先创建版本和项目',
        cls: 'pm-modal__warning'
      });
      const btn = contentEl.createEl('button', { text: '确定' });
      btn.addEventListener('click', () => this.close());
      return;
    }

    // 设置默认值
    this.result.versionId = this.versions[0].id;
    this.result.projectId = this.projects[0].id;
    this.result.dueDate = this.defaultDate;
    this.updateFilteredProjects();

    contentEl.createEl('h2', { text: `创建特性 (${this.defaultDate})` });

    // 名称
    new Setting(contentEl)
      .setName('特性名称')
      .addText(text => {
        text.setPlaceholder('输入特性名称');
        text.onChange(value => {
          this.result.name = value;
        });
        setTimeout(() => text.inputEl.focus(), 0);
      });

    // 版本选择
    new Setting(contentEl)
      .setName('所属版本')
      .addDropdown(dropdown => {
        this.versions.forEach(v => {
          dropdown.addOption(v.id, v.name);
        });
        dropdown.setValue(this.result.versionId);
        dropdown.onChange(value => {
          this.result.versionId = value;
          this.updateFilteredProjects();
          this.renderProjectDropdown();
        });
      });

    // 项目选择
    const projectSetting = new Setting(contentEl)
      .setName('所属项目');
    this.projectDropdown = projectSetting.addDropdown(dropdown => {
      this.filteredProjects.forEach(p => {
        dropdown.addOption(p.id, p.name);
      });
      dropdown.setValue(this.result.projectId);
      dropdown.onChange(value => {
        this.result.projectId = value;
      });
    });

    // 状态
    new Setting(contentEl)
      .setName('状态')
      .addDropdown(dropdown => {
        FEATURE_STATUSES.forEach(s => {
          dropdown.addOption(s.value, s.label);
        });
        dropdown.setValue(this.result.status || 'backlog');
        dropdown.onChange(value => {
          this.result.status = value as any;
        });
      });

    // 优先级
    new Setting(contentEl)
      .setName('优先级')
      .addDropdown(dropdown => {
        PRIORITIES.forEach(p => {
          dropdown.addOption(p.value, p.label);
        });
        dropdown.setValue(this.result.priority || 'medium');
        dropdown.onChange(value => {
          this.result.priority = value as any;
        });
      });

    // 按钮
    const buttonContainer = contentEl.createDiv({ cls: 'pm-modal__buttons' });
    
    const cancelButton = buttonContainer.createEl('button', { text: '取消' });
    cancelButton.addEventListener('click', () => this.close());

    const createButton = buttonContainer.createEl('button', { 
      text: '创建',
      cls: 'mod-cta'
    });
    createButton.addEventListener('click', async () => {
      if (!this.result.name.trim()) {
        new Notice('请输入特性名称');
        return;
      }
      this.onSubmit(this.result);
      this.close();
    });
  }

  private projectDropdown: any;

  private updateFilteredProjects(): void {
    this.filteredProjects = this.projects.filter(p => p.versionId === this.result.versionId);
    if (this.filteredProjects.length > 0 && !this.filteredProjects.find(p => p.id === this.result.projectId)) {
      this.result.projectId = this.filteredProjects[0].id;
    }
  }

  private renderProjectDropdown(): void {
    if (!this.projectDropdown) return;
    const dropdown = this.projectDropdown;
    dropdown.selectEl.empty();
    this.filteredProjects.forEach(p => {
      dropdown.addOption(p.id, p.name);
    });
    dropdown.setValue(this.result.projectId);
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
