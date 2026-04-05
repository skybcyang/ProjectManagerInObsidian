import { App, Modal, Setting, Notice } from 'obsidian';
import type { EntityManager } from '../core';
import type { Version, Project, Feature } from '../types';
import { generateICS, downloadICS } from '../utils';

export class ExportICSModal extends Modal {
  private versions: Version[] = [];
  private projects: Project[] = [];
  private exportScope: 'all' | 'version' | 'project' = 'all';
  private selectedVersionId = '';
  private selectedProjectId = '';

  constructor(
    app: App,
    private entityManager: EntityManager
  ) {
    super(app);
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('pm-modal');

    this.versions = await this.entityManager.listVersions();
    this.projects = await this.entityManager.listProjects();

    contentEl.createEl('h2', { text: '导出ICS邮件' });

    // 导出范围
    new Setting(contentEl)
      .setName('导出范围')
      .addDropdown(dropdown => {
        dropdown.addOption('all', '全部特性');
        dropdown.addOption('version', '按版本筛选');
        dropdown.addOption('project', '按项目筛选');
        dropdown.setValue(this.exportScope);
        dropdown.onChange(value => {
          this.exportScope = value as typeof this.exportScope;
          this.renderFilters();
        });
      });

    // 动态筛选容器
    const filterContainer = contentEl.createDiv({ cls: 'pm-modal__filters' });
    this.renderFilters = () => {
      filterContainer.empty();

      if (this.exportScope === 'version') {
        if (this.versions.length === 0) {
          filterContainer.createEl('p', { text: '暂无版本可选', cls: 'pm-modal__warning' });
          return;
        }
        new Setting(filterContainer)
          .setName('选择版本')
          .addDropdown(dropdown => {
            this.versions.forEach(v => {
              dropdown.addOption(v.id, v.name);
            });
            dropdown.setValue(this.selectedVersionId || this.versions[0]?.id || '');
            dropdown.onChange(value => {
              this.selectedVersionId = value;
            });
            this.selectedVersionId = dropdown.getValue();
          });
      } else if (this.exportScope === 'project') {
        if (this.projects.length === 0) {
          filterContainer.createEl('p', { text: '暂无项目可选', cls: 'pm-modal__warning' });
          return;
        }
        new Setting(filterContainer)
          .setName('选择项目')
          .addDropdown(dropdown => {
            this.projects.forEach(p => {
              dropdown.addOption(p.id, p.name);
            });
            dropdown.setValue(this.selectedProjectId || this.projects[0]?.id || '');
            dropdown.onChange(value => {
              this.selectedProjectId = value;
            });
            this.selectedProjectId = dropdown.getValue();
          });
      }
    };
    this.renderFilters();

    // 按钮
    const buttonContainer = contentEl.createDiv({ cls: 'pm-modal__buttons' });
    const cancelButton = buttonContainer.createEl('button', { text: '取消' });
    cancelButton.addEventListener('click', () => this.close());

    const submitButton = buttonContainer.createEl('button', {
      text: '导出',
      cls: 'mod-cta',
    });
    submitButton.addEventListener('click', () => this.handleExport());
  }

  private renderFilters: () => void = () => {};

  private async handleExport(): Promise<void> {
    let features: Feature[] = await this.entityManager.listFeatures();

    if (this.exportScope === 'version') {
      const versionId = this.selectedVersionId;
      if (!versionId) {
        new Notice('请选择一个版本');
        return;
      }
      features = features.filter(f => f.versionId === versionId);
    } else if (this.exportScope === 'project') {
      const projectId = this.selectedProjectId;
      if (!projectId) {
        new Notice('请选择一个项目');
        return;
      }
      features = features.filter(f => f.projectId === projectId);
    }

    const featuresWithDueDate = features.filter(f => f.dueDate);

    if (featuresWithDueDate.length === 0) {
      new Notice('没有设置截止日期的特性', 3000);
      return;
    }

    let filename = '项目管理_截止日期';
    if (this.exportScope === 'version') {
      const version = this.versions.find(v => v.id === this.selectedVersionId);
      if (version) filename = `${version.name}_截止日期`;
    } else if (this.exportScope === 'project') {
      const project = this.projects.find(p => p.id === this.selectedProjectId);
      if (project) filename = `${project.name}_截止日期`;
    }

    const icsContent = generateICS(featuresWithDueDate);
    downloadICS(icsContent, filename);

    new Notice(`已导出 ${featuresWithDueDate.length} 个特性`, 3000);
    this.close();
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
