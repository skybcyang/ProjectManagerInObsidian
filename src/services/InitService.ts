import { App, TFile } from 'obsidian';
import { TemplateService } from './TemplateService';
import type { ProjectManagerSettings } from '../types';

export class InitService {
  private readonly BASE_FOLDER = 'ProjectManager';
  private readonly SUB_FOLDERS = ['Versions', 'Projects', 'Features'];
  private readonly DASHBOARD_FILE = '总览.md';
  private app: App;
  private templateService: TemplateService;

  constructor(app: App, settings?: ProjectManagerSettings) {
    this.app = app;
    this.templateService = new TemplateService(app, settings);
  }

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
    
    // 使用模板服务渲染总览页面
    const date = new Date().toISOString().split('T')[0];
    const content = await this.templateService.renderOverviewTemplate({ date });

    const existingFile = this.app.vault.getAbstractFileByPath(dashboardPath);
    if (existingFile instanceof TFile) {
      await this.app.vault.modify(existingFile, content);
    } else {
      await this.app.vault.create(dashboardPath, content);
    }
  }
}
