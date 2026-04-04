import { Plugin, TFile, MarkdownPostProcessorContext, parseYaml, MarkdownRenderChild } from 'obsidian';
import { EntityManager } from './core';
import { CardRegistry, KanbanBoard, SingleCardRenderer, Breadcrumb, Button, ButtonContainer, ProgressInput, ProgressInputContainer, EntitySelector, GridRenderer } from './ui';
import type { EntitySelectorConfig, GridConfig } from './ui';
import { CreateVersionModal, CreateProjectModal, CreateFeatureModal, EditFeatureModal, ConfirmModal, ExportICSModal } from './modals';
import { ValidationError, needsStatusConfirmation } from './utils';
import { getStatusLabel, VERSION_STATUSES, PROJECT_STATUSES, FEATURE_STATUSES } from './constants';
import type { CreateVersionData, CreateProjectData, CreateFeatureData, Feature } from './types';
import type { KanbanConfig } from './ui';
import type { SingleCardConfig } from './ui';
import { ViewEngine } from './view-engine';

export default class ProjectManagerPlugin extends Plugin {
  private entityManager: EntityManager;
  private cardRegistry: CardRegistry;
  private kanbanBoard: KanbanBoard;
  private singleCardRenderer: SingleCardRenderer;
  private entitySelector: EntitySelector;
  private breadcrumb: Breadcrumb;
  private button: Button;
  private progressInput: ProgressInput;
  private gridRenderer: GridRenderer;
  private viewEngine: ViewEngine;

  async onload(): Promise<void> {
    // 初始化核心层
    this.entityManager = new EntityManager(this.app);
    
    // 初始化 UI 层
    this.cardRegistry = CardRegistry.createDefault();
    this.kanbanBoard = new KanbanBoard(this.app, this.entityManager, this.cardRegistry);
    this.singleCardRenderer = new SingleCardRenderer(this.app, this.entityManager, this.cardRegistry);
    this.entitySelector = new EntitySelector(this.app, this.entityManager, this.singleCardRenderer);
    this.breadcrumb = new Breadcrumb(this.app, this.entityManager);
    this.button = new Button(this.app, this.entityManager);
    this.progressInput = new ProgressInput(this.app);
    this.gridRenderer = new GridRenderer(this.app, this.entityManager, this.cardRegistry);
    this.viewEngine = new ViewEngine(this.app, this.entityManager, this.cardRegistry);

    // 注册代码块处理器：pm-view（新的统一视图）
    this.registerMarkdownCodeBlockProcessor('pm-view', this.processViewBlock.bind(this));

    // 注册代码块处理器：pm-kanban
    this.registerMarkdownCodeBlockProcessor('pm-kanban', this.processKanbanBlock.bind(this));

    // 注册代码块处理器：pm-card
    this.registerMarkdownCodeBlockProcessor('pm-card', this.processCardBlock.bind(this));

    // 注册代码块处理器：pm-selector
    this.registerMarkdownCodeBlockProcessor('pm-selector', this.processSelectorBlock.bind(this));

    // 注册代码块处理器：pm-grid
    this.registerMarkdownCodeBlockProcessor('pm-grid', this.processGridBlock.bind(this));

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

    console.log('Project Manager 插件已加载');
  }

  onunload(): void {
    console.log('Project Manager 插件已卸载');
  }

  /**
   * 打开总览页面
   */
  private async openDashboard(): Promise<void> {
    const { InitService } = await import('./services/InitService');
    const initService = new InitService(this.app);
    
    const initialized = await initService.isInitialized();
    if (!initialized) {
      await initService.initialize();
    }
    await initService.openDashboard();
  }

  /**
   * 处理 pm-kanban 代码块
   */
  private async processKanbanBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): Promise<void> {
    try {
      const config = (parseYaml(source) || {}) as KanbanConfig;
      await this.kanbanBoard.render(el, config);
    } catch (error) {
      el.createEl('div', {
        text: `看板配置错误: ${(error as Error).message}`,
        cls: 'pm-error',
      });
    }
  }

  /**
   * 处理 pm-card 代码块
   */
  private async processCardBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): Promise<void> {
    try {
      const config = (parseYaml(source) || {}) as SingleCardConfig;
      await this.singleCardRenderer.render(el, config);
    } catch (error) {
      el.createEl('div', {
        text: `卡片配置错误: ${(error as Error).message}`,
        cls: 'pm-error',
      });
    }
  }

  /**
   * 处理 pm-grid 代码块
   */
  private async processGridBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): Promise<void> {
    try {
      const config = (parseYaml(source) || {}) as GridConfig;
      await this.gridRenderer.render(el, config);
    } catch (error) {
      el.createEl('div', {
        text: `网格配置错误: ${(error as Error).message}`,
        cls: 'pm-error',
      });
    }
  }

  /**
   * 处理 pm-selector 代码块
   */
  private async processSelectorBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): Promise<void> {
    console.log('[processSelectorBlock] 处理 pm-selector, source:', source);
    try {
      const config = (parseYaml(source) || {}) as EntitySelectorConfig;
      console.log('[processSelectorBlock] 解析配置:', config);
      await this.entitySelector.render(el, config);
    } catch (error) {
      console.error('[processSelectorBlock] 错误:', error);
      el.createEl('div', {
        text: `选择器配置错误: ${(error as Error).message}`,
        cls: 'pm-error',
      });
    }
  }

  /**
   * 处理 pm-view 代码块（新的统一视图）
   */
  private async processViewBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): Promise<void> {
    try {
      const config = this.viewEngine.parseConfig(source);
      
      // 延迟渲染，确保 DOM 已准备好
      const renderView = async () => {
        const viewContext: import('./view-engine').ViewContext = {
          sourcePath: ctx.sourcePath,
          el,
        };
        try {
          await this.viewEngine.render(el, config, viewContext);
        } catch (error) {
          console.error('[processViewBlock] 渲染错误:', error);
          el.empty();
          el.createEl('div', {
            text: `渲染失败: ${(error as Error).message}`,
            cls: 'pm-error',
          });
        }
      };

      // 使用 requestAnimationFrame 确保 DOM 已准备好
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          setTimeout(renderView, 100);
        });
      } else {
        await renderView();
      }
    } catch (error) {
      console.error('[processViewBlock] 错误:', error);
      el.createEl('div', {
        text: `视图配置错误: ${(error as Error).message}`,
        cls: 'pm-error',
      });
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

    const containerEl = (ctx as any).containerEl as HTMLElement | undefined;
    if (!containerEl) return;

    const firstEl = containerEl.querySelector(':scope > *');
    if (firstEl !== el) return;

    setTimeout(() => {
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
          new (require('obsidian').Notice)('版本创建成功', 3000);
        } catch (error) {
          if (error instanceof ValidationError) {
            console.error('验证失败:', (error as ValidationError).message);
          } else {
            console.error('创建版本失败:', error);
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
          new (require('obsidian').Notice)('项目创建成功', 3000);
        } catch (error) {
          if (error instanceof ValidationError) {
            console.error('验证失败:', (error as ValidationError).message);
          } else {
            console.error('创建项目失败:', error);
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
          new (require('obsidian').Notice)('特性创建成功', 3000);
        } catch (error) {
          if (error instanceof ValidationError) {
            console.error('验证失败:', (error as ValidationError).message);
          } else {
            console.error('创建特性失败:', error);
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
}
