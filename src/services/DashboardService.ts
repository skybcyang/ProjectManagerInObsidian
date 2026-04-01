import { App, TFile } from 'obsidian';

/**
 * 总览页面管理服务
 * 用于更新总览页面的内容
 */
export class DashboardService {
  private readonly DASHBOARD_PATH = 'ProjectManager/总览.md';

  constructor(private app: App) {}

  /**
   * 更新总览页面的最后更新时间
   */
  async updateLastModified(): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(this.DASHBOARD_PATH);
    if (!(file instanceof TFile)) return;

    const content = await this.app.vault.read(file);
    const date = new Date().toISOString().split('T')[0];
    
    // 替换最后更新时间
    const newContent = content.replace(
      /> 最后更新: \d{4}-\d{2}-\d{2}/,
      `> 最后更新: ${date}`
    );

    if (content !== newContent) {
      await this.app.vault.modify(file, newContent);
    }
  }

  /**
   * 刷新总览页面（更新统计等）
   */
  async refresh(): Promise<void> {
    await this.updateLastModified();
  }
}
