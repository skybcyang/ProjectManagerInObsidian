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

    return `---\npm-dashboard: true\n---\n\n# 📊 项目管理总览\n\n> 最后更新: ${date} · 系统状态: 正常运行\n\n---\n\n## 🚀 快速操作\n\n<span class=\"pm-btn pm-btn--primary\" data-action=\"create-version\" style=\"cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; margin-right: 8px; background: var(--interactive-accent); color: var(--text-on-accent); border-radius: 6px; font-weight: 600;\">📦 创建版本</span>\n\n<span class=\"pm-btn pm-btn--primary\" data-action=\"create-project\" style=\"cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; margin-right: 8px; background: var(--interactive-accent); color: var(--text-on-accent); border-radius: 6px; font-weight: 600;\">📁 创建项目</span>\n\n<span class=\"pm-btn pm-btn--primary\" data-action=\"create-feature\" style=\"cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; margin-right: 8px; background: var(--interactive-accent); color: var(--text-on-accent); border-radius: 6px; font-weight: 600;\">✨ 创建特性</span>\n\n<span class=\"pm-btn\" data-action=\"export-ics\" style=\"cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; background: var(--background-modifier-form-field); color: var(--text-normal); border: 1px solid var(--background-modifier-border); border-radius: 6px; font-weight: 500;\">📅 导出日历</span>\n\n---\n\n## 📈 数据统计\n\n\`\`\`dataviewjs\nconst versions = dv.pages('"ProjectManager/Versions"');\nconst projects = dv.pages('"ProjectManager/Projects"');\nconst features = dv.pages('"ProjectManager/Features"');\n\ndv.el('div', \`\n<div style=\"display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0;\">\n  <div style=\"text-align: center; padding: 20px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);\">\n    <div style=\"font-size: 36px; font-weight: 700; color: var(--text-normal);\">\${versions.length}</div>\n    <div style=\"font-size: 12px; color: var(--text-muted); text-transform: uppercase; margin-top: 4px;\">版本</div>\n  </div>\n  <div style=\"text-align: center; padding: 20px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);\">\n    <div style=\"font-size: 36px; font-weight: 700; color: var(--text-normal);\">\${projects.length}</div>\n    <div style=\"font-size: 12px; color: var(--text-muted); text-transform: uppercase; margin-top: 4px;\">项目</div>\n  </div>\n  <div style=\"text-align: center; padding: 20px; background: var(--background-primary); border-radius: 8px; border: 1px solid var(--background-modifier-border);\">\n    <div style=\"font-size: 36px; font-weight: 700; color: var(--text-normal);\">\${features.length}</div>\n    <div style=\"font-size: 12px; color: var(--text-muted); text-transform: uppercase; margin-top: 4px;\">特性</div>\n  </div>\n</div>\n\`);\n\`\`\`\n\n---\n\n## 🎯 特性看板\n\n\`\`\`pm-kanban\nview: all\n\`\`\`\n\n---\n\n## 📋 版本概览\n\n\`\`\`dataview\nTABLE file.link as \"版本\", status as \"状态\", startDate as \"开始日期\", endDate as \"结束日期\"\nFROM \"ProjectManager/Versions\"\nSORT startDate DESC\n\`\`\`\n\n---\n\n## 🔥 高优先级特性\n\n\`\`\`dataview\nTABLE file.link as \"特性\", projectId as \"项目\", progress as \"进度\", dueDate as \"截止日期\"\nFROM \"ProjectManager/Features\"\nWHERE priority = \"high\" AND status != \"completed\"\nSORT dueDate ASC\nLIMIT 10\n\`\`\`\n\n---\n\n## ⚠️ 即将到期\n\n\`\`\`dataview\nTABLE file.link as \"特性\", projectId as \"项目\", progress + \"%\" as \"进度\", dueDate as \"截止日期\"\nFROM \"ProjectManager/Features\"\nWHERE dueDate <= date(today) + dur(7 days) AND status != \"completed\" AND dueDate != null\nSORT dueDate ASC\n\`\`\`\n\n---\n\n## 📊 项目进度\n\n\`\`\`dataviewjs\nconst projects = dv.pages('"ProjectManager/Projects"').limit(5);\nconst features = dv.pages('"ProjectManager/Features"');\n\nfor (const project of projects) {\n  const projectFeatures = features.filter(f => f.projectId === project.id);\n  const total = projectFeatures.length;\n  const completed = projectFeatures.filter(f => f.status === 'completed').length;\n  const avgProgress = total > 0 ? Math.round(projectFeatures.reduce((sum, f) => sum + (f.progress || 0), 0) / total) : 0;\n  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;\n  \n  dv.el('div', \`\n    <div style=\"margin-bottom: 12px; padding: 12px; background: var(--background-primary); border-radius: 6px; border: 1px solid var(--background-modifier-border);\">\n      <div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;\">\n        <span style=\"font-weight: 600;\">\${project.name}</span>\n        <span style=\"font-size: 12px; color: var(--text-muted);\">\${completed}/\${total} 特性</span>\n      </div>\n      <div style=\"height: 6px; background: var(--background-modifier-border); border-radius: 3px; overflow: hidden;\">\n        <div style=\"width: \${progress}%; height: 100%; background: var(--interactive-accent); border-radius: 3px;\"></div>\n      </div>\n      <div style=\"text-align: right; font-size: 11px; color: var(--text-muted); margin-top: 4px;\">平均进度: \${avgProgress}%</div>\n    </div>\n  \`);\n}\n\`\`\`\n\n---\n\n## 📝 最近更新\n\n\`\`\`dataview\nTABLE file.link as \"文件\", file.mtime as \"修改时间\"\nFROM \"ProjectManager\"\nWHERE file.name != \"总览\"\nSORT file.mtime DESC\nLIMIT 10\n\`\`\`\n\n---\n\n*由 Project Manager 插件自动生成*\n`;
  }
}
