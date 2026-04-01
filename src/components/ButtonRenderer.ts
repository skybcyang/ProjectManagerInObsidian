import { App, MarkdownRenderChild } from 'obsidian';
import type { VersionService } from '../services/VersionService';
import type { ProjectService } from '../services/ProjectService';
import type { FeatureService } from '../services/FeatureService';
import type { DashboardService } from '../services/DashboardService';
import { CreateVersionModal, CreateProjectModal, CreateFeatureModal, ExportICSModal } from '../modals';

/**
 * 按钮渲染器
 * 将 HTML button 元素转换为可点击的按钮
 */
export class ButtonRenderer {
  constructor(
    private app: App,
    private versionService: VersionService,
    private projectService: ProjectService,
    private featureService: FeatureService,
    private dashboardService: DashboardService
  ) {}

  /**
   * 处理容器中的所有按钮
   */
  processButtons(container: HTMLElement): void {
    // 查找所有 pm-btn 按钮
    const buttons = container.querySelectorAll('.pm-btn[data-action]');
    
    buttons.forEach(button => {
      // 跳过已处理的按钮
      if (button.hasClass('pm-btn--processed')) return;
      
      const action = button.getAttribute('data-action');
      if (!action) return;

      // 确保按钮样式正确
      (button as HTMLElement).style.cursor = 'pointer';
      (button as HTMLElement).style.pointerEvents = 'auto';
      
      // 添加点击事件
      button.addEventListener('click', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('按钮被点击:', action);
        this.handleAction(action);
      });

      // 添加已处理标记
      button.addClass('pm-btn--processed');
      
      console.log('按钮已注册:', action);
    });
  }

  /**
   * 处理按钮动作
   */
  private async handleAction(action: string): Promise<void> {
    console.log('处理动作:', action);
    switch (action) {
      case 'create-version':
        await this.handleCreateVersion();
        break;
      case 'create-project':
        await this.handleCreateProject();
        break;
      case 'create-feature':
        await this.handleCreateFeature();
        break;
      case 'export-ics':
        await this.handleExportICS();
        break;
      default:
        console.log('未知动作:', action);
    }
  }

  /**
   * 导出 ICS 日历
   */
  private handleExportICS(): void {
    new ExportICSModal(
      this.app,
      this.versionService,
      this.projectService,
      this.featureService
    ).open();
  }

  /**
   * 创建版本
   */
  private async handleCreateVersion(): Promise<void> {
    console.log('打开创建版本模态框');
    new CreateVersionModal(
      this.app,
      async (data) => {
        try {
          await this.versionService.createVersion(data);
          
          // 更新总览页面
          await this.dashboardService.updateLastModified();
          
          this.showNotice('版本创建成功', 3000);
        } catch (error) {
          console.error('创建版本失败:', error);
          this.showNotice('创建版本失败: ' + (error as Error).message, 5000);
        }
      }
    ).open();
  }

  /**
   * 创建项目
   */
  private async handleCreateProject(): Promise<void> {
    console.log('打开创建项目模态框');
    // 检查是否有版本
    const versions = await this.versionService.listVersions();
    if (versions.length === 0) {
      this.showNotice('请先创建版本后再创建项目', 3000);
      return;
    }

    new CreateProjectModal(
      this.app,
      this.versionService,
      null,
      async (data) => {
        try {
          await this.projectService.createProject(data);
          
          // 更新总览页面
          await this.dashboardService.updateLastModified();
          
          this.showNotice('项目创建成功', 3000);
        } catch (error) {
          console.error('创建项目失败:', error);
          this.showNotice('创建项目失败: ' + (error as Error).message, 5000);
        }
      }
    ).open();
  }

  /**
   * 创建特性
   */
  private async handleCreateFeature(): Promise<void> {
    console.log('打开创建特性模态框');
    // 检查是否有版本和项目
    const versions = await this.versionService.listVersions();
    const projects = await this.projectService.listProjects();
    
    if (versions.length === 0) {
      this.showNotice('请先创建版本后再创建特性', 3000);
      return;
    }
    
    if (projects.length === 0) {
      this.showNotice('请先创建项目后再创建特性', 3000);
      return;
    }

    new CreateFeatureModal(
      this.app,
      this.versionService,
      this.projectService,
      null,
      null,
      async (data) => {
        try {
          await this.featureService.createFeature(data);
          
          // 更新总览页面
          await this.dashboardService.updateLastModified();
          
          this.showNotice('特性创建成功', 3000);
        } catch (error) {
          console.error('创建特性失败:', error);
          this.showNotice('创建特性失败: ' + (error as Error).message, 5000);
        }
      }
    ).open();
  }

  /**
   * 显示通知
   */
  private showNotice(message: string, timeout: number = 4000): void {
    const { Notice } = require('obsidian');
    new Notice(message, timeout);
  }
}

/**
 * 按钮容器 - 用于保持按钮的事件监听
 */
export class ButtonContainer extends MarkdownRenderChild {
  constructor(
    containerEl: HTMLElement,
    private buttonRenderer: ButtonRenderer
  ) {
    super(containerEl);
  }

  onload(): void {
    // 立即处理按钮
    this.buttonRenderer.processButtons(this.containerEl);
    
    // 使用 MutationObserver 监视变化
    const observer = new MutationObserver(() => {
      this.buttonRenderer.processButtons(this.containerEl);
    });
    
    observer.observe(this.containerEl, {
      childList: true,
      subtree: true
    });
    
    // 保存 observer 以便卸载时清理
    (this as any)._observer = observer;
  }

  onunload(): void {
    const observer = (this as any)._observer;
    if (observer) {
      observer.disconnect();
    }
  }
}
