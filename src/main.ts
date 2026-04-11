import { Plugin, TFile, MarkdownPostProcessorContext, parseYaml, MarkdownRenderChild, Notice } from 'obsidian';
import { EntityManager } from './core';
import { Breadcrumb, Button, ButtonContainer, ProgressInput, ProgressInputContainer } from './ui';
import { CreateVersionModal, CreateProjectModal, CreateFeatureModal, EditFeatureModal, ConfirmModal, ExportICSModal } from './modals';
import { ValidationError, needsStatusConfirmation, ErrorHandler } from './utils';
import { getStatusLabel, VERSION_STATUSES, PROJECT_STATUSES, FEATURE_STATUSES } from './constants';
import type { CreateVersionData, CreateProjectData, CreateFeatureData, Feature, ProjectManagerSettings } from './types';
import { ViewEngine } from './view-engine';
import { TemplateSettingTab } from './settings';
import { DEFAULT_SETTINGS } from './types/template';

export default class ProjectManagerPlugin extends Plugin {
  settings: ProjectManagerSettings;
  private entityManager: EntityManager;
  private breadcrumb: Breadcrumb;
  private button: Button;
  private progressInput: ProgressInput;
  private viewEngine: ViewEngine;

  async onload(): Promise<void> {
    // 加载设置
    await this.loadSettings();
    
    // 初始化核心层
    this.entityManager = new EntityManager(this.app, this.settings);
    
    // 初始化 UI 层
    this.breadcrumb = new Breadcrumb(this.app, this.entityManager);
    this.button = new Button(this.app, this.entityManager);
    this.progressInput = new ProgressInput(this.app);
    this.viewEngine = new ViewEngine(this.app, this.entityManager);

    // 初始化缓存 - 等待 metadata cache 准备好
    await this.waitForMetadataCache();
    await this.entityManager.initialize();
    const stats = this.entityManager.cache.getStats();
    console.log('【ProjectManager】缓存初始化完成:', stats);

    // 注册代码块处理器：pm-view（唯一入口）
    this.registerMarkdownCodeBlockProcessor('pm-view', this.processViewBlock.bind(this));

    // 注册 post-processor：处理 pm-btn 按钮
    this.registerMarkdownPostProcessor((el, ctx) => {
      this.processButtons(el, ctx);
    }, 100);

    // 注册 post-processor：处理进展输入框
    this.registerMarkdownPostProcessor((el, ctx) => {
      this.processProgressInputs(el, ctx);
    }, 100);

    // 注册 post-processor：渲染面包屑导航
    this.registerMarkdownPostProcessor((el, ctx) => {
      this.processBreadcrumb(el, ctx);
    }, 50);

    // 侧边栏按钮
    this.addRibbonIcon('layout-grid', 'Project Manager', async () => {
      await this.openDashboard();
    });

    // 命令：打开总览
    this.addCommand({
      id: 'open-dashboard',
      name: '打开总览页面',
      callback: async () => await this.openDashboard(),
    });

    // 命令：创建版本
    this.addCommand({
      id: 'create-version',
      name: '创建版本',
      callback: () => this.openCreateVersionModal(),
    });

    // 命令：创建项目
    this.addCommand({
      id: 'create-project',
      name: '创建项目',
      callback: () => this.openCreateProjectModal(),
    });

    // 命令：创建特性
    this.addCommand({
      id: 'create-feature',
      name: '创建特性',
      callback: () => this.openCreateFeatureModal(),
    });

    // 命令：导出 ICS
    this.addCommand({
      id: 'export-ics',
      name: '导出截止日期到日历',
      callback: () => this.exportICS(),
    });

    // 命令：查看变更历史
    this.addCommand({
      id: 'view-changelog',
      name: '查看变更历史',
      callback: () => this.openChangelogView(),
    });

    // 文件右键菜单
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile) {
          this.addFileMenuItems(menu, file);
        }
      })
    );

    // 编辑器右键菜单
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor, view) => {
        const file = view.file;
        if (file instanceof TFile) {
          this.addFileMenuItems(menu, file);
        }
      })
    );

    // 监听 layout-change 事件来处理按钮
    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        setTimeout(() => {
          const activeLeaf = this.app.workspace.activeLeaf;
          if (activeLeaf && activeLeaf.view) {
            const view = activeLeaf.view;
            const container = (view as any).contentEl || (view as any).containerEl;
            if (container) {
              this.button.processButtons(container);
              this.progressInput.processInputs(container);
            }
          }
        }, 100);
      })
    );

    // 注册设置页面
    this.addSettingTab(new TemplateSettingTab(this.app, this));

    // 插件已加载
  }

  onunload(): void {
    // 清理视图引擎资源
    this.viewEngine.destroy();
  }

  /**
   * 等待 metadata cache 准备就绪
   * Obsidian 启动时需要时间索引所有文件
   */
  private async waitForMetadataCache(): Promise<void> {
    // 等待 vault 文件系统准备好
    return new Promise((resolve) => {
      const checkReady = () => {
        // 通过检查 vault 是否有文件来判断
        const files = this.app.vault.getMarkdownFiles();
        // 如果有文件或者已经过了足够时间，认为准备好了
        if (files.length > 0) {
          // 再给一个短暂的延迟确保 metadata 被解析
          setTimeout(resolve, 100);
        } else {
          // vault 可能是空的，或者还没准备好，继续等待
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    });
  }

  /**
   * 加载设置
   */
  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  /**
   * 保存设置
   */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /**
   * 打开总览页面
   */
  private async openDashboard(): Promise<void> {
    const { InitService } = await import('./services/InitService');
    const initService = new InitService(this.app, this.settings);
    
    const initialized = await initService.isInitialized();
    if (!initialized) {
      await initService.initialize();
    }
    await initService.openDashboard();
  }

  /**
   * 处理 pm-view 代码块（唯一入口）
   */
  private async processViewBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): Promise<void> {
    // 防止重复渲染同一个元素
    if ((el as any)._pmViewRendered) {
      return;
    }
    (el as any)._pmViewRendered = true;

    try {
      const config = this.viewEngine.parseConfig(source);
      
      // 计算当前代码块索引
      const codeBlockIndex = await this.getCodeBlockIndex(ctx.sourcePath, source, el);
      
      const viewContext: import('./view-engine').ViewContext = {
        sourcePath: ctx.sourcePath,
        el,
      };
      
      try {
        await this.viewEngine.render(el, config, viewContext, codeBlockIndex);
      } catch (error) {
        ErrorHandler.handle(error, '视图渲染失败', { category: 'system' });
        el.empty();
        el.createEl('div', {
          text: `渲染失败: ${(error as Error).message}`,
          cls: 'pm-error',
        });
      }
    } catch (error) {
      ErrorHandler.handle(error, '视图配置解析失败', { category: 'user' });
      el.createEl('div', {
        text: `视图配置错误: ${(error as Error).message}`,
        cls: 'pm-error',
      });
    }
  }

  /**
   * 获取代码块在文档中的索引
   */
  private async getCodeBlockIndex(
    sourcePath: string,
    source: string,
    el: HTMLElement
  ): Promise<number> {
    try {
      const file = this.app.vault.getAbstractFileByPath(sourcePath);
      if (!(file instanceof TFile)) return 0;

      const content = await this.app.vault.read(file);
      const lines = content.split('\n');
      
      // 找到所有 pm-view 代码块的位置
      let index = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '```pm-view') {
          // 检查这个代码块的内容是否匹配
          const blockLines: string[] = [];
          let j = i + 1;
          while (j < lines.length && lines[j].trim() !== '```') {
            blockLines.push(lines[j]);
            j++;
          }
          
          const blockContent = blockLines.join('\n').trim();
          if (blockContent === source.trim()) {
            return index;
          }
          index++;
        }
      }
      
      return 0;
    } catch (error) {
      console.error('获取代码块索引失败:', error);
      return 0;
    }
  }

  /**
   * 处理按钮
   */
  private processButtons(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    const buttons = el.querySelectorAll('.pm-btn[data-action]');
    if (buttons.length === 0) return;

    this.button.processButtons(el);

    const container = new ButtonContainer(el, this.button);
    ctx.addChild(container);
  }

  /**
   * 处理进展输入
   */
  private processProgressInputs(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    const inputs = el.querySelectorAll('.pm-progress-input');
    if (inputs.length === 0) return;

    this.progressInput.processInputs(el);

    const container = new ProgressInputContainer(el, this.progressInput);
    ctx.addChild(container);
  }

  /**
   * 处理面包屑导航
   */
  private processBreadcrumb(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    const sourcePath = ctx.sourcePath;
    if (!sourcePath.startsWith('ProjectManager/')) return;
    if (sourcePath === 'ProjectManager/总览.md') return;

    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) return;

    // 获取 el 的父容器作为面包屑容器
    const containerEl = el.parentElement;
    if (!containerEl) return;

    // 只在第一个元素时渲染面包屑，避免重复
    const firstEl = containerEl.querySelector(':scope > *');
    if (firstEl !== el) return;

    // 检查容器是否是 pm-view 内部，如果是则不渲染面包屑
    // 面包屑应该只在 markdown 预览根容器渲染，不在代码块内部渲染
    if (containerEl.closest('.pm-view') || containerEl.closest('.pm-view-wrapper')) {
      return;
    }

    // 确保容器是 markdown 预览容器（而不是表格等内部元素）
    const isMarkdownContainer = containerEl.classList.contains('markdown-preview-view') ||
                                  containerEl.classList.contains('markdown-reading-view') ||
                                  containerEl.classList.contains('view-content') ||
                                  el.classList.contains('mod-header');
    
    // 如果不是标准 markdown 容器，检查 el 是否是页面内容的前几个元素之一
    if (!isMarkdownContainer) {
      // 检查 el 是否是 markdown 预览区域的直接子元素
      const markdownPreview = el.closest('.markdown-preview-view, .markdown-reading-view');
      if (!markdownPreview) return;
      
      // 确保是在 markdown 预览区域的顶部
      const allChildren = Array.from(markdownPreview.children);
      const elIndex = allChildren.indexOf(el);
      if (elIndex > 3) return; // 只在页面顶部前几个元素时渲染
    }

    // 延迟渲染，确保 DOM 已稳定
    setTimeout(() => {
      // 再次检查容器是否还在 DOM 中
      if (!containerEl.isConnected) return;
      
      // 再次检查是否已经渲染过面包屑
      if (containerEl.querySelector('.pm-breadcrumb')) return;
      
      this.breadcrumb.renderForFile(file, containerEl);
    }, 0);
  }

  /**
   * 添加文件菜单项
   */
  private addFileMenuItems(menu: any, file: TFile): void {
    const isVersion = file.path.startsWith('ProjectManager/Versions/');
    const isProject = file.path.startsWith('ProjectManager/Projects/');
    const isFeature = file.path.startsWith('ProjectManager/Features/');

    if (!isVersion && !isProject && !isFeature) return;

    menu.addSeparator();

    // 状态变更子菜单
    menu.addItem((item: any) => {
      item.setTitle('变更状态');
      item.setIcon('switch');
      item.onClick(() => {
        if (isVersion) {
          this.showVersionStatusMenu(file);
        } else if (isProject) {
          this.showProjectStatusMenu(file);
        } else if (isFeature) {
          this.showFeatureStatusMenu(file);
        }
      });
    });

    // 特性快速编辑
    if (isFeature) {
      menu.addItem((item: any) => {
        item.setTitle('快速编辑');
        item.setIcon('pencil');
        item.onClick(() => {
          this.openEditFeatureModal(file);
        });
      });
    }

    menu.addSeparator();
  }

  /**
   * 显示版本状态菜单
   */
  private showVersionStatusMenu(file: TFile): void {
    const menu = new (require('obsidian').Menu)();

    for (const status of VERSION_STATUSES) {
      menu.addItem((item: any) => {
        item.setTitle(status.label);
        item.onClick(async () => {
          await this.changeFileStatus(file, status.value);
        });
      });
    }

    menu.showAtPosition({ x: 0, y: 0 });
  }

  /**
   * 显示项目状态菜单
   */
  private showProjectStatusMenu(file: TFile): void {
    const menu = new (require('obsidian').Menu)();

    for (const status of PROJECT_STATUSES) {
      menu.addItem((item: any) => {
        item.setTitle(status.label);
        item.onClick(async () => {
          await this.changeFileStatus(file, status.value);
        });
      });
    }

    menu.showAtPosition({ x: 0, y: 0 });
  }

  /**
   * 显示特性状态菜单
   */
  private showFeatureStatusMenu(file: TFile): void {
    const menu = new (require('obsidian').Menu)();
    const cache = this.app.metadataCache.getFileCache(file);
    const currentStatus = cache?.frontmatter?.status;

    for (const status of FEATURE_STATUSES) {
      menu.addItem((item: any) => {
        item.setTitle(status.label);
        item.setDisabled(currentStatus === status.value);
        item.onClick(async () => {
          if (needsStatusConfirmation(currentStatus, status.value)) {
            new ConfirmModal(
              this.app,
              '确认状态变更',
              `确定要将状态从 "${getStatusLabel(currentStatus)}" 变更为 "${status.label}" 吗？`,
              async () => {
                await this.changeFileStatus(file, status.value);
              }
            ).open();
          } else {
            await this.changeFileStatus(file, status.value);
          }
        });
      });
    }

    menu.showAtPosition({ x: 0, y: 0 });
  }

  /**
   * 打开编辑特性模态框
   */
  private async openEditFeatureModal(file: TFile): Promise<void> {
    const cache = this.app.metadataCache.getFileCache(file);
    const id = cache?.frontmatter?.id;
    if (!id) return;

    const feature = await this.entityManager.getFeature(String(id));
    if (!feature) return;

    new EditFeatureModal(
      this.app,
      this.entityManager,
      feature,
      async (data) => {
        try {
          await this.entityManager.updateFeature(feature.id, data);
        } catch (error) {
          if (error instanceof ValidationError) {
            console.error('验证失败:', (error as ValidationError).message);
          } else {
            console.error('更新特性失败:', error);
          }
        }
      },
      async () => {
        try {
          await this.entityManager.deleteFeature(feature.id);
        } catch (error) {
          console.error('删除特性失败:', error);
        }
      }
    ).open();
  }

  /**
   * 变更文件状态
   */
  private async changeFileStatus(file: TFile, newStatus: string): Promise<void> {
    const content = await this.app.vault.read(file);
    const newContent = content.replace(/^(status:\s*)\S+$/m, `$1${newStatus}`);

    if (content !== newContent) {
      await this.app.vault.modify(file, newContent);
    }
  }

  /**
   * 打开创建版本模态框
   */
  private openCreateVersionModal(): void {
    new CreateVersionModal(
      this.app,
      async (data: CreateVersionData) => {
        try {
          await this.entityManager.createVersion(data);
          ErrorHandler.handleSuccess('版本创建成功');
        } catch (error) {
          if (error instanceof ValidationError) {
            ErrorHandler.handleUserError((error as ValidationError).message, '创建版本');
          } else {
            ErrorHandler.handleSystemError(error, '创建版本失败');
          }
        }
      }
    ).open();
  }

  /**
   * 打开创建项目模态框
   */
  private openCreateProjectModal(): void {
    new CreateProjectModal(
      this.app,
      this.entityManager,
      null,
      async (data: CreateProjectData) => {
        try {
          await this.entityManager.createProject(data);
          ErrorHandler.handleSuccess('项目创建成功');
        } catch (error) {
          if (error instanceof ValidationError) {
            ErrorHandler.handleUserError((error as ValidationError).message, '创建项目');
          } else {
            ErrorHandler.handleSystemError(error, '创建项目失败');
          }
        }
      }
    ).open();
  }

  /**
   * 打开创建特性模态框
   */
  private openCreateFeatureModal(): void {
    new CreateFeatureModal(
      this.app,
      this.entityManager,
      null,
      null,
      async (data: CreateFeatureData) => {
        try {
          await this.entityManager.createFeature(data);
          ErrorHandler.handleSuccess('特性创建成功');
        } catch (error) {
          if (error instanceof ValidationError) {
            ErrorHandler.handleUserError((error as ValidationError).message, '创建特性');
          } else {
            ErrorHandler.handleSystemError(error, '创建特性失败');
          }
        }
      }
    ).open();
  }

  /**
   * 导出 ICS 文件
   */
  private exportICS(): void {
    new ExportICSModal(this.app, this.entityManager).open();
  }

  /**
   * 打开变更历史视图
   */
  private openChangelogView(): void {
    // 创建一个新文件来展示变更历史
    const fileName = `ProjectManager/变更历史_${new Date().toISOString().split('T')[0]}.md`;

    const content = '---\n' +
      'title: 变更历史\n' +
      '---\n\n' +
      '# 📜 项目变更历史\n\n' +
      '> 生成时间: ' + new Date().toLocaleString('zh-CN') + '\n\n' +
      '## 使用说明\n\n' +
      '在任意代码块中使用以下配置查看变更历史:\n\n' +
      '```pm-view\n' +
      'mode: changelog\n' +
      'entityType: feature  # 可选: version/project/feature\n' +
      'limit: 50\n' +
      'days: 30\n' +
      '```\n\n' +
      '变更日志会自动记录在 ProjectManager/.changelog/ 目录下。\n';

    // 检查文件是否存在
    const existingFile = this.app.vault.getAbstractFileByPath(fileName);
    if (existingFile instanceof TFile) {
      this.app.workspace.openLinkText(fileName, '', false);
    } else {
      this.app.vault.create(fileName, content).then((file) => {
        this.app.workspace.openLinkText(file.path, '', false);
      }).catch(() => {
        // 文件已存在，直接打开
        this.app.workspace.openLinkText(fileName, '', false);
      });
    }
  }
}
