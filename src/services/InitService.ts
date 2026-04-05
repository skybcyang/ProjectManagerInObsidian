import { App, TFile } from 'obsidian';

export class InitService {
  private readonly BASE_FOLDER = 'ProjectManager';
  private readonly SUB_FOLDERS = ['Versions', 'Projects', 'Features'];
  private readonly DASHBOARD_FILE = '总览.md';

  constructor(private app: App) {}

  async isInitialized(): Promise<boolean> {
    const folder = this.app.vault.getAbstractFileByPath(this.BASE_FOLDER);
    if (!folder) return false;

    const dashboardPath = `${this.BASE_FOLDER}/${this.DASHBOARD_FILE}`;
    const dashboardFile = this.app.vault.getAbstractFileByPath(dashboardPath);
    return dashboardFile instanceof TFile;
  }

  async initialize(): Promise<void> {
    await this.ensureFolder(this.BASE_FOLDER);

    for (const subFolder of this.SUB_FOLDERS) {
      await this.ensureFolder(`${this.BASE_FOLDER}/${subFolder}`);
    }

    await this.createDashboard();
  }

  async openDashboard(): Promise<void> {
    const dashboardPath = `${this.BASE_FOLDER}/${this.DASHBOARD_FILE}`;
    const file = this.app.vault.getAbstractFileByPath(dashboardPath);

    if (file instanceof TFile) {
      await this.app.workspace.getLeaf().openFile(file);
    } else {
      await this.initialize();
      await this.openDashboard();
    }
  }

  getDashboardPath(): string {
    return `${this.BASE_FOLDER}/${this.DASHBOARD_FILE}`;
  }

  private async ensureFolder(path: string): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(path);
    if (!folder) {
      await this.app.vault.createFolder(path);
    }
  }

  private async createDashboard(): Promise<void> {
    const dashboardPath = `${this.BASE_FOLDER}/${this.DASHBOARD_FILE}`;
    const content = this.generateDashboardContent();

    const existingFile = this.app.vault.getAbstractFileByPath(dashboardPath);
    if (existingFile instanceof TFile) {
      await this.app.vault.modify(existingFile, content);
    } else {
      await this.app.vault.create(dashboardPath, content);
    }
  }

  private generateDashboardContent(): string {
    const date = new Date().toISOString().split('T')[0];

    return `---
pm-dashboard: true
---

# 📊 项目管理总览

> 最后更新: ${date} · 系统状态: 正常运行

---

## 🚀 快速操作

--- start-multi-column: ID_quick_actions
\`\`\`column-settings
Number of Columns: 4
Largest Column: standard
Border: off
\`\`\`

<span class="pm-btn pm-btn--primary" data-action="create-version">📦 创建版本</span>

--- column-break ---

<span class="pm-btn pm-btn--primary" data-action="create-project">📁 创建项目</span>

--- column-break ---

<span class="pm-btn pm-btn--primary" data-action="create-feature">✨ 创建特性</span>

--- column-break ---

<span class="pm-btn" data-action="export-ics">📅 导出ICS</span>

--- end-multi-column

---

## 📦 版本概览

\`\`\`pm-selector
type: version
\`\`\`

---

## 📁 项目概览

\`\`\`pm-selector
type: project
\`\`\`

---

*Powered by Project Manager Plugin*
`;
  }
}
