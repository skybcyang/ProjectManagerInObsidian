import { Plugin, TFile, MarkdownPostProcessorContext, parseYaml, MarkdownRenderChild } from 'obsidian';
import { VersionService, ProjectService, FeatureService, InitService, DashboardService } from './services';
import { KanbanRenderer, ButtonRenderer, ButtonContainer, BreadcrumbRenderer } from './components';
import { CreateVersionModal, CreateProjectModal, CreateFeatureModal, EditFeatureModal, ConfirmModal, ExportICSModal } from './modals';
import { ValidationError, needsStatusConfirmation } from './utils';
import { getStatusLabel, VERSION_STATUSES, PROJECT_STATUSES, FEATURE_STATUSES } from './constants';
import type { VersionStatusValue, ProjectStatusValue, FeatureStatusValue } from './constants';
import type { CreateVersionData, CreateProjectData, CreateFeatureData, Feature } from './types';

export default class ProjectManagerPlugin extends Plugin {
  private versionService: VersionService;
  private projectService: ProjectService;
  private featureService: FeatureService;
  private initService: InitService;
  private dashboardService: DashboardService;
  private kanbanRenderer: KanbanRenderer;
  private buttonRenderer: ButtonRenderer;
  private breadcrumbRenderer: BreadcrumbRenderer;

  async onload(): Promise<void> {
    // 初始化服务
    this.versionService = new VersionService(this.app);
    this.projectService = new ProjectService(this.app);
    this.featureService = new FeatureService(this.app);
    this.initService = new InitService(this.app);
    this.dashboardService = new DashboardService(this.app);
    
    // 初始化渲染器
    this.kanbanRenderer = new KanbanRenderer(
      this.app,
      this.versionService,
      this.projectService,
      this.featureService
    );
    this.buttonRenderer = new ButtonRenderer(
      this.app,
      this.versionService,
      this.projectService,
      this.featureService,
      this.dashboardService
    );
    this.breadcrumbRenderer = new BreadcrumbRenderer(
      this.app,
      this.versionService,
      this.projectService,
      this.featureService
    );

    // 注册代码块处理器：pm-kanban
    this.registerMarkdownCodeBlockProcessor('pm-kanban', this.processKanbanBlock.bind(this));

    // 注册 post-processor：处理 pm-btn 按钮
    // 使用较高优先级确保在其他处理器之后运行
    this.registerMarkdownPostProcessor((el, ctx) => {
      this.processButtons(el, ctx);
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
        // 延迟执行确保 DOM 已更新
        setTimeout(() => {
          const activeLeaf = this.app.workspace.activeLeaf;
          if (activeLeaf && activeLeaf.view) {
            const view = activeLeaf.view;
            // 尝试获取容器元素
            const container = (view as any).contentEl || (view as any).containerEl;
            if (container) {
              this.buttonRenderer.processButtons(container);
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
   * 如果未初始化，先初始化
   */
  private async openDashboard(): Promise<void> {
    const initialized = await this.initService.isInitialized();
    
    if (!initialized) {
      await this.initService.initialize();
    }
    
    await this.initService.openDashboard();
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
      const config = parseYaml(source) || {};
      await this.kanbanRenderer.render(el, config);
    } catch (error) {
      el.createEl('div', {
        text: `看板配置错误: ${(error as Error).message}`,
        cls: 'pm-error',
      });
    }
  }

  /**
   * 处理按钮
   */
  private processButtons(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    // 检查是否有按钮
    const buttons = el.querySelectorAll('.pm-btn[data-action]');
    if (buttons.length === 0) return;

    console.log('处理按钮:', buttons.length);
    
    // 处理按钮
    this.buttonRenderer.processButtons(el);
    
    // 添加容器来保持事件监听
    const container = new ButtonContainer(el, this.buttonRenderer);
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

    // 使用 containerEl 来插入面包屑
    const containerEl = (ctx as any).containerEl as HTMLElement | undefined;
    if (!containerEl) return;

    // 只在处理第一个可见元素时触发，避免重复调用
    const firstEl = containerEl.querySelector(':scope > *');
    if (firstEl !== el) return;

    // 延迟执行，确保容器已准备好
    setTimeout(() => {
      this.breadcrumbRenderer.renderForFile(file, containerEl);
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

    const feature = await this.featureService.getFeature(String(id));
    if (!feature) return;

    new EditFeatureModal(
      this.app,
      this.featureService,
      feature,
      async (data) => {
        try {
          await this.featureService.updateFeature(feature.id, data);
          await this.dashboardService.updateLastModified();
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
          await this.featureService.deleteFeature(feature.id);
          await this.dashboardService.updateLastModified();
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
    
    // 替换 frontmatter 中的 status
    const newContent = content.replace(
      /^(status:\s*)\S+$/m,
      `$1${newStatus}`
    );

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
          await this.versionService.createVersion(data);
          
          // 更新总览页面
          await this.dashboardService.updateLastModified();
          
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
      this.versionService,
      null,
      async (data: CreateProjectData) => {
        try {
          await this.projectService.createProject(data);
          
          // 更新总览页面
          await this.dashboardService.updateLastModified();
          
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
      this.versionService,
      this.projectService,
      null,
      null,
      async (data: CreateFeatureData) => {
        try {
          await this.featureService.createFeature(data);
          
          // 更新总览页面
          await this.dashboardService.updateLastModified();
          
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
    new ExportICSModal(
      this.app,
      this.versionService,
      this.projectService,
      this.featureService
    ).open();
  }
}
