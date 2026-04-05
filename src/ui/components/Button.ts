import { App, MarkdownRenderChild, Notice } from 'obsidian';
import type { EntityManager } from '../../core';
import { CreateVersionModal, CreateProjectModal, CreateFeatureModal, ExportICSModal } from '../../modals';

/**
 * 按钮组件
 * 处理 Markdown 中的 pm-btn 按钮交互
 */
export class Button {
  constructor(
    private app: App,
    private entityManager: EntityManager
  ) {}

  /**
   * 处理容器中的所有按钮
   */
  processButtons(container: HTMLElement): void {
    // 查找所有 pm-btn 按钮
    const buttons = container.querySelectorAll('.pm-btn[data-action]');

    buttons.forEach((button) => {
      // 跳过已处理的按钮
      if (button.hasClass('pm-btn--processed')) return;

      const action = button.getAttribute('data-action');
      if (!action) return;

      // 获取预填充参数
      const versionId = button.getAttribute('data-version-id');
      const projectId = button.getAttribute('data-project-id');

      // 确保按钮样式正确
      (button as HTMLElement).style.cursor = 'pointer';
      (button as HTMLElement).style.pointerEvents = 'auto';

      // 添加点击事件
      button.addEventListener('click', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleAction(action, versionId, projectId);
      });

      // 添加已处理标记
      button.addClass('pm-btn--processed');
    });
  }

  /**
   * 处理按钮动作
   */
  private async handleAction(
    action: string, 
    versionId: string | null = null, 
    projectId: string | null = null
  ): Promise<void> {
    switch (action) {
      case 'create-version':
        await this.handleCreateVersion();
        break;
      case 'create-project':
        await this.handleCreateProject(versionId);
        break;
      case 'create-feature':
        await this.handleCreateFeature(versionId, projectId);
        break;
      case 'export-ics':
        await this.handleExportICS();
        break;
      default:
        // 未知动作: action
    }
  }

  /**
   * 创建版本
   */
  private async handleCreateVersion(): Promise<void> {
    new CreateVersionModal(this.app, async (data) => {
      try {
        await this.entityManager.createVersion(data);
        this.showNotice('版本创建成功', 3000);
      } catch (error) {
        console.error('创建版本失败:', error);
        this.showNotice('创建版本失败: ' + (error as Error).message, 5000);
      }
    }).open();
  }

  /**
   * 创建项目
   * @param defaultVersionId - 预填充的版本ID（从版本页面点击时传入）
   */
  private async handleCreateProject(defaultVersionId: string | null = null): Promise<void> {
    const versions = await this.entityManager.listVersions();
    if (versions.length === 0) {
      this.showNotice('请先创建版本后再创建项目', 3000);
      return;
    }

    new CreateProjectModal(
      this.app,
      this.entityManager,
      defaultVersionId,
      async (data) => {
        try {
          await this.entityManager.createProject(data);
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
   * @param defaultVersionId - 预填充的版本ID（从版本/项目页面点击时传入）
   * @param defaultProjectId - 预填充的项目ID（从项目页面点击时传入）
   */
  private async handleCreateFeature(
    defaultVersionId: string | null = null,
    defaultProjectId: string | null = null
  ): Promise<void> {
    const versions = await this.entityManager.listVersions();
    const projects = await this.entityManager.listProjects();

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
      this.entityManager,
      defaultVersionId,
      defaultProjectId,
      async (data) => {
        try {
          await this.entityManager.createFeature(data);
          this.showNotice('特性创建成功', 3000);
        } catch (error) {
          console.error('创建特性失败:', error);
          this.showNotice('创建特性失败: ' + (error as Error).message, 5000);
        }
      }
    ).open();
  }

  /**
   * 导出 ICS 日历
   */
  private handleExportICS(): void {
    new ExportICSModal(
      this.app,
      this.entityManager,
    ).open();
  }

  /**
   * 显示通知
   */
  private showNotice(message: string, timeout: number = 4000): void {
    new Notice(message, timeout);
  }
}

/**
 * 按钮容器 - 用于保持按钮的事件监听
 */
export class ButtonContainer extends MarkdownRenderChild {
  constructor(
    containerEl: HTMLElement,
    private button: Button
  ) {
    super(containerEl);
  }

  onload(): void {
    // 立即处理按钮
    this.button.processButtons(this.containerEl);

    // 使用 MutationObserver 监视变化
    const observer = new MutationObserver(() => {
      this.button.processButtons(this.containerEl);
    });

    observer.observe(this.containerEl, {
      childList: true,
      subtree: true,
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
