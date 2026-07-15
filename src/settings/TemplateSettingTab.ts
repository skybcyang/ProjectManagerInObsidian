/**
 * 模板设置页面
 * 提供自定义模板的配置界面
 */

import { App, PluginSettingTab, Setting, Notice, Modal, TextAreaComponent } from 'obsidian';
import type { TemplateType, ProjectManagerSettings, TemplateContext } from '../types/template';
import { PREVIEW_EXAMPLES } from '../types/template';
import { TemplateService } from '../services/TemplateService';
import { DEFAULT_TEMPLATES } from '../templates/defaults';
import type ProjectManagerPlugin from '../main';

/** 模板类型标签 */
const TEMPLATE_LABELS: Record<TemplateType, string> = {
  overview: '总览页面',
  version: '版本页面',
  project: '项目页面',
  feature: '特性页面',
};

/** 模板类型描述 */
const TEMPLATE_DESCRIPTIONS: Record<TemplateType, string> = {
  overview: '项目管理总览页面的模板',
  version: '创建新版本时使用的页面模板',
  project: '创建新项目时使用的页面模板',
  feature: '创建新特性时使用的页面模板',
};

export class TemplateSettingTab extends PluginSettingTab {
  plugin: ProjectManagerPlugin;
  private templateService: TemplateService;

  constructor(app: App, plugin: ProjectManagerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.templateService = new TemplateService(app, plugin.settings);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Project Manager 模板设置' });

    // 启用自定义模板开关
    new Setting(containerEl)
      .setName('启用自定义模板')
      .setDesc('开启后，将使用下方自定义的模板替代默认模板')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.enableCustomTemplates);
        toggle.onChange(async (value) => {
          this.plugin.settings.enableCustomTemplates = value;
          await this.plugin.saveSettings();
          this.templateService.updateSettings(this.plugin.settings);
        });
      });

    // 模板文件夹设置
    new Setting(containerEl)
      .setName('模板文件夹路径')
      .setDesc('可选：指定一个文件夹路径存放模板文件（.md），优先级高于内置模板')
      .addText(text => {
        text.setPlaceholder('ProjectManager/.templates');
        text.setValue(this.plugin.settings.templateFolder || '');
        text.onChange(async (value) => {
          this.plugin.settings.templateFolder = value.trim() || undefined;
          await this.plugin.saveSettings();
          this.templateService.updateSettings(this.plugin.settings);
        });
      });

    containerEl.createEl('hr');

    // 各类型模板编辑
    const templateTypes: TemplateType[] = ['overview', 'version', 'project', 'feature'];
    
    for (const type of templateTypes) {
      this.createTemplateSection(containerEl, type);
    }

    // 批量操作
    containerEl.createEl('hr');
    containerEl.createEl('h3', { text: '批量操作' });

    new Setting(containerEl)
      .setName('导出所有模板到文件')
      .setDesc('将当前所有模板导出到指定的模板文件夹')
      .addButton(button => {
        button.setButtonText('导出模板');
        button.onClick(async () => {
          try {
            const types: TemplateType[] = ['overview', 'version', 'project', 'feature'];
            for (const type of types) {
              await this.templateService.exportTemplateToFile(type);
            }
            new Notice('模板导出成功！', 3000);
          } catch (error) {
            new Notice(`导出失败: ${(error as Error).message}`, 5000);
          }
        });
      });

    new Setting(containerEl)
      .setName('重置所有模板')
      .setDesc('将所有模板恢复为默认值（会清空自定义模板内容）')
      .addButton(button => {
        button.setButtonText('重置');
        button.setWarning();
        button.onClick(async () => {
          if (confirm('确定要重置所有模板为默认值吗？自定义的模板内容将丢失。')) {
            this.plugin.settings.customTemplates = {};
            await this.plugin.saveSettings();
            this.templateService.updateSettings(this.plugin.settings);
            new Notice('所有模板已重置为默认值', 3000);
            this.display(); // 刷新界面
          }
        });
      });
  }

  /**
   * 创建单个模板编辑区域
   */
  private createTemplateSection(containerEl: HTMLElement, type: TemplateType): void {
    const section = containerEl.createDiv({ cls: 'pm-template-section' });
    section.style.marginBottom = '2em';
    section.style.padding = '1em';
    section.style.border = '1px solid var(--background-modifier-border)';
    section.style.borderRadius = '6px';

    // 标题
    const header = section.createDiv({ cls: 'pm-template-header' });
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '0.5em';

    const title = header.createEl('h3', { 
      text: TEMPLATE_LABELS[type],
      cls: 'pm-template-title' 
    });
    title.style.margin = '0';

    // 描述
    section.createEl('p', { 
      text: TEMPLATE_DESCRIPTIONS[type],
      cls: 'pm-template-desc' 
    });
    const descEl = section.querySelector('.pm-template-desc') as HTMLElement | null;
    if (descEl) {
      descEl.style.color = 'var(--text-muted)';
      descEl.style.fontSize = '0.9em';
      descEl.style.marginBottom = '1em';
    }

    // 按钮组
    const buttonGroup = header.createDiv({ cls: 'pm-template-buttons' });
    buttonGroup.style.display = 'flex';
    buttonGroup.style.gap = '0.5em';

    // 编辑按钮
    const editBtn = buttonGroup.createEl('button', { text: '编辑模板' });
    editBtn.addEventListener('click', () => {
      this.openTemplateEditor(type);
    });

    // 预览按钮
    const previewBtn = buttonGroup.createEl('button', { text: '预览' });
    previewBtn.addEventListener('click', () => {
      this.openTemplatePreview(type);
    });

    // 重置按钮
    const resetBtn = buttonGroup.createEl('button', { text: '重置' });
    resetBtn.style.color = 'var(--text-error)';
    resetBtn.addEventListener('click', async () => {
      if (confirm(`确定要重置 ${TEMPLATE_LABELS[type]} 为默认值吗？`)) {
        delete this.plugin.settings.customTemplates[type];
        await this.plugin.saveSettings();
        this.templateService.updateSettings(this.plugin.settings);
        new Notice(`${TEMPLATE_LABELS[type]} 已重置为默认值`, 3000);
      }
    });
  }

  /**
   * 打开模板编辑器
   */
  private openTemplateEditor(type: TemplateType): void {
    new TemplateEditorModal(
      this.app, 
      this.templateService, 
      type,
      async (content) => {
        this.plugin.settings.customTemplates[type] = content;
        await this.plugin.saveSettings();
        this.templateService.updateSettings(this.plugin.settings);
      }
    ).open();
  }

  /**
   * 打开模板预览
   */
  private async openTemplatePreview(type: TemplateType): Promise<void> {
    const template = await this.templateService.getTemplate(type);
    new TemplatePreviewModal(this.app, type, template).open();
  }
}

/**
 * 模板编辑器模态框
 * 左右分栏：左侧编辑，右侧实时预览
 */
class TemplateEditorModal extends Modal {
  private templateService: TemplateService;
  private type: TemplateType;
  private onSave: (content: string) => Promise<void>;
  private textArea: TextAreaComponent | null = null;
  private previewEl: HTMLElement | null = null;

  constructor(
    app: App,
    templateService: TemplateService,
    type: TemplateType,
    onSave: (content: string) => Promise<void>
  ) {
    super(app);
    this.templateService = templateService;
    this.type = type;
    this.onSave = onSave;
    this.titleEl.setText(`编辑 ${TEMPLATE_LABELS[type]} 模板`);
  }

  async onOpen(): Promise<void> {
    const { contentEl, modalEl } = this;
    contentEl.empty();

    // 让模态框更大：占屏幕 90%
    modalEl.style.width = '90vw';
    modalEl.style.maxWidth = '1200px';
    modalEl.style.height = '85vh';
    contentEl.style.height = 'calc(100% - 45px)';
    contentEl.style.display = 'flex';
    contentEl.style.flexDirection = 'column';
    contentEl.style.overflow = 'hidden';

    // 获取当前模板内容
    const defaultTemplate = this.templateService.getDefaultTemplate(this.type);
    const settings = this.templateService.getSettings();
    const currentTemplate = settings.customTemplates[this.type] || defaultTemplate;

    // 顶部提示条
    const hintEl = contentEl.createDiv({ cls: 'pm-template-editor-hint' });
    hintEl.style.cssText = `
      padding: 8px 12px;
      margin-bottom: 12px;
      background: var(--background-secondary);
      border-radius: 6px;
      font-size: 13px;
      color: var(--text-muted);
      flex-shrink: 0;
    `;
    hintEl.setText('使用 {{变量名}} 插入变量，支持 {{#if 条件}}...{{/if}} 和 {{#each 数组}}...{{/each}}。右侧实时预览使用示例数据渲染。');

    // 主编辑区：左右分栏
    const mainEl = contentEl.createDiv({ cls: 'pm-template-editor-main' });
    mainEl.style.cssText = `
      display: flex;
      gap: 16px;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    `;

    // 左侧：编辑器
    const leftEl = mainEl.createDiv({ cls: 'pm-template-editor-left' });
    leftEl.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    `;

    const editorLabel = leftEl.createEl('div', { text: '模板源码', cls: 'pm-template-editor-label' });
    editorLabel.style.cssText = `
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    const editorWrapper = leftEl.createDiv({ cls: 'pm-template-editor-wrapper' });
    editorWrapper.style.cssText = `
      flex: 1;
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      overflow: hidden;
    `;

    this.textArea = new TextAreaComponent(editorWrapper);
    this.textArea.setValue(currentTemplate);
    this.textArea.inputEl.style.cssText = `
      width: 100%;
      height: 100%;
      min-height: unset;
      resize: none;
      border: none;
      padding: 12px;
      font-family: var(--font-monospace, monospace);
      font-size: 13px;
      line-height: 1.6;
      background: var(--background-primary);
      color: var(--text-normal);
    `;

    // 右侧：预览
    const rightEl = mainEl.createDiv({ cls: 'pm-template-editor-right' });
    rightEl.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    `;

    const previewHeader = rightEl.createDiv({ cls: 'pm-template-editor-preview-header' });
    previewHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    `;

    const previewLabel = previewHeader.createEl('div', { text: '实时预览', cls: 'pm-template-editor-label' });
    previewLabel.style.cssText = `
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    const varToggle = previewHeader.createEl('button', { text: '变量说明', cls: 'pm-template-var-toggle' });
    varToggle.style.cssText = `
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
      color: var(--text-muted);
      cursor: pointer;
    `;

    const previewWrapper = rightEl.createDiv({ cls: 'pm-template-preview-wrapper' });
    previewWrapper.style.cssText = `
      flex: 1;
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      overflow: auto;
      background: var(--background-primary);
    `;

    this.previewEl = previewWrapper.createDiv({ cls: 'pm-template-preview-content markdown-preview-view markdown-rendered' });
    this.previewEl.style.cssText = `
      padding: 16px;
      min-height: 100%;
    `;

    // 变量说明面板（默认折叠）
    const varPanel = rightEl.createDiv({ cls: 'pm-template-var-panel' });
    varPanel.style.cssText = `
      display: none;
      margin-top: 8px;
      padding: 10px 12px;
      background: var(--background-secondary);
      border-radius: 6px;
      font-size: 12px;
      max-height: 120px;
      overflow-y: auto;
    `;

    const variables = this.getAvailableVariables(this.type);
    for (const [name, desc] of Object.entries(variables)) {
      const row = varPanel.createDiv({ cls: 'pm-template-var-row' });
      row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 4px;';
      row.createEl('code', { text: `{{${name}}}`, cls: 'pm-template-var-name' }).style.cssText = `
        color: var(--text-accent);
        font-family: var(--font-monospace, monospace);
        white-space: nowrap;
      `;
      row.createSpan({ text: desc, cls: 'pm-template-var-desc' }).style.color = 'var(--text-muted)';
    }

    varToggle.addEventListener('click', () => {
      const isHidden = varPanel.style.display === 'none';
      varPanel.style.display = isHidden ? 'block' : 'none';
      varToggle.style.background = isHidden ? 'var(--background-modifier-accent)' : 'var(--background-primary)';
    });

    // 实时预览更新
    const updatePreview = () => {
      const template = this.textArea?.getValue() || '';
      const context = this.getPreviewContext(this.type);
      try {
        const rendered = this.templateService.renderTemplate(template, context);
        if (this.previewEl) {
          this.previewEl.empty();
          // 使用 Obsidian 的 MarkdownRenderer 渲染 Markdown
          const { MarkdownRenderer } = require('obsidian');
          MarkdownRenderer.renderMarkdown(rendered, this.previewEl, '', this);
        }
      } catch (error) {
        if (this.previewEl) {
          this.previewEl.empty();
          this.previewEl.createEl('div', {
            text: `预览渲染出错: ${(error as Error).message}`,
            cls: 'pm-template-preview-error'
          }).style.cssText = 'color: var(--text-error); padding: 16px;';
        }
      }
    };

    this.textArea.inputEl.addEventListener('input', updatePreview);
    updatePreview();

    // 底部按钮
    const buttonDiv = contentEl.createDiv();
    buttonDiv.style.cssText = `
      margin-top: 16px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      flex-shrink: 0;
    `;

    const cancelBtn = buttonDiv.createEl('button', { text: '取消' });
    cancelBtn.addEventListener('click', () => this.close());

    const saveBtn = buttonDiv.createEl('button', { text: '保存', cls: 'mod-cta' });
    saveBtn.addEventListener('click', async () => {
      const content = this.textArea?.getValue() || '';
      await this.onSave(content);
      new Notice('模板保存成功！', 3000);
      this.close();
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }

  /**
   * 获取可用变量列表
   */
  private getAvailableVariables(type: TemplateType): Record<string, string> {
    const commonVars: Record<string, string> = {
      id: '实体唯一标识',
      name: '实体名称',
      status: '状态',
      priorityEmoji: '优先级表情符号（自动计算）',
      statusEmoji: '状态表情符号（自动计算）',
      createTime: '创建时间（自动计算）',
    };

    switch (type) {
      case 'overview':
        return {
          date: '当前日期',
        };
      case 'version':
        return {
          ...commonVars,
          owner: '负责人（可选）',
          startDate: '开始日期（可选）',
          endDate: '结束日期（可选）',
          tags: '标签数组',
          estimatedDays: '预估人天',
          actualDays: '实际人天',
        };
      case 'project':
        return {
          ...commonVars,
          versionId: '关联版本ID',
          owner: '负责人（可选）',
          priority: '优先级',
          tags: '标签数组',
          estimatedDays: '预估人天',
          actualDays: '实际人天',
        };
      case 'feature':
        return {
          ...commonVars,
          versionId: '关联版本ID',
          projectId: '关联项目ID',
          owner: '负责人（可选）',
          priority: '优先级',
          progress: '进度（0-100）',
          startDate: '开始日期（可选）',
          endDate: '结束日期（可选）',
          tags: '标签数组',
          estimatedDays: '预估人天（可选）',
          actualDays: '实际人天（可选）',
          requirementIds: '需求ID数组（可选）',
          projectLink: '项目链接（可选）',
          isMilestone: '是否为里程碑',
        };
      default:
        return commonVars;
    }
  }

  /**
   * 获取预览用的示例数据
   */
  private getPreviewContext(type: TemplateType): TemplateContext {
    return PREVIEW_EXAMPLES[type];
  }
}

/**
 * 模板预览模态框
 * 用于单独预览当前已保存的模板
 */
class TemplatePreviewModal extends Modal {
  private type: TemplateType;
  private template: string;

  constructor(app: App, type: TemplateType, template: string) {
    super(app);
    this.type = type;
    this.template = template;
    this.titleEl.setText(`${TEMPLATE_LABELS[type]} 模板预览`);
  }

  async onOpen(): Promise<void> {
    const { contentEl, modalEl } = this;
    contentEl.empty();

    modalEl.style.width = '80vw';
    modalEl.style.maxWidth = '900px';
    modalEl.style.maxHeight = '80vh';

    const previewDiv = contentEl.createDiv({ cls: 'pm-template-preview markdown-preview-view markdown-rendered' });
    previewDiv.style.cssText = `
      padding: 16px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      max-height: calc(80vh - 120px);
      overflow: auto;
    `;

    const { MarkdownRenderer } = require('obsidian');
    MarkdownRenderer.renderMarkdown(this.template, previewDiv, '', this.app);

    const buttonDiv = contentEl.createDiv();
    buttonDiv.style.cssText = `
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
    `;

    const closeBtn = buttonDiv.createEl('button', { text: '关闭', cls: 'mod-cta' });
    closeBtn.addEventListener('click', () => this.close());
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
