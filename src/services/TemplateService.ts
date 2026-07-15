/**
 * 模板服务
 * 管理自定义模板的加载、渲染和持久化
 */

import { App, TFile } from 'obsidian';
import type { 
  TemplateType, 
  TemplateConfig, 
  TemplateContext,
  VersionTemplateContext,
  ProjectTemplateContext,
  FeatureTemplateContext,
  OverviewTemplateContext,
  ProjectManagerSettings 
} from '../types/template';
import { 
  DEFAULT_TEMPLATES, 
  PRIORITY_EMOJI, 
  STATUS_EMOJI 
} from '../templates/defaults';

/** 模板文件默认路径 */
const DEFAULT_TEMPLATE_FOLDER = 'ProjectManager/.templates';

export class TemplateService {
  private app: App;
  private settings: ProjectManagerSettings;
  private templateCache: Map<TemplateType, string> = new Map();

  constructor(app: App, settings?: ProjectManagerSettings) {
    this.app = app;
    this.settings = settings ?? {
      enableCustomTemplates: false,
      customTemplates: {},
    };
  }

  /**
   * 更新设置
   */
  updateSettings(settings: ProjectManagerSettings): void {
    this.settings = settings;
    this.templateCache.clear();
  }

  /**
   * 获取当前设置
   */
  getSettings(): ProjectManagerSettings {
    return { ...this.settings };
  }

  /**
   * 获取模板内容
   * 优先顺序：1. 缓存 2. 自定义模板文件 3. 内置自定义模板 4. 默认模板
   */
  async getTemplate(type: TemplateType): Promise<string> {
    // 1. 检查缓存
    if (this.templateCache.has(type)) {
      return this.templateCache.get(type)!;
    }

    let template: string | null = null;

    // 2. 尝试从文件加载（如果配置了模板文件夹）
    if (this.settings.templateFolder) {
      template = await this.loadTemplateFromFile(type);
    }

    // 3. 使用内置自定义模板
    if (!template && this.settings.enableCustomTemplates && this.settings.customTemplates[type]) {
      template = this.settings.customTemplates[type]!;
    }

    // 4. 使用默认模板
    if (!template) {
      template = DEFAULT_TEMPLATES[type];
    }

    // 缓存并返回
    this.templateCache.set(type, template);
    return template;
  }

  /**
   * 从文件加载模板
   */
  private async loadTemplateFromFile(type: TemplateType): Promise<string | null> {
    const folder = this.settings.templateFolder || DEFAULT_TEMPLATE_FOLDER;
    const fileName = `${type}.md`;
    const filePath = `${folder}/${fileName}`;

    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (file instanceof TFile) {
      try {
        const content = await this.app.vault.read(file);
        return content;
      } catch (error) {
        console.warn(`[TemplateService] 读取模板文件失败: ${filePath}`, error);
      }
    }
    return null;
  }

  /**
   * 获取默认模板
   */
  getDefaultTemplate(type: TemplateType): string {
    return DEFAULT_TEMPLATES[type];
  }

  /**
   * 导出模板到文件
   */
  async exportTemplateToFile(type: TemplateType, folder?: string): Promise<string | null> {
    const targetFolder = folder || this.settings.templateFolder || DEFAULT_TEMPLATE_FOLDER;
    const fileName = `${type}.md`;
    const filePath = `${targetFolder}/${fileName}`;

    // 确保文件夹存在
    const folderExists = this.app.vault.getAbstractFileByPath(targetFolder);
    if (!folderExists) {
      await this.app.vault.createFolder(targetFolder);
    }

    const template = await this.getTemplate(type);
    
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (file instanceof TFile) {
      await this.app.vault.modify(file, template);
    } else {
      await this.app.vault.create(filePath, template);
    }

    return filePath;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * 渲染模板
   * 使用简单的模板语法：{{variable}}, {{#if condition}}...{{/if}}, {{#each array}}...{{/each}}
   */
  renderTemplate(template: string, context: TemplateContext): string {
    let result = template;

    // 添加辅助变量
    const enrichedContext = this.enrichContext(context);

    // 处理 {{#if}} 条件
    result = this.processIfBlocks(result, enrichedContext);

    // 处理 {{#each}} 循环
    result = this.processEachBlocks(result, enrichedContext);

    // 处理简单变量 {{variable}}
    result = this.processVariables(result, enrichedContext);

    return result;
  }

  /**
   * 处理 {{#each}} 循环
   */
  private processEachBlocks(template: string, context: Record<string, unknown>): string {
    const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    
    return template.replace(eachRegex, (match, variable, content) => {
      const array = context[variable];
      if (!Array.isArray(array)) return '';
      
      return array.map((item, index) => {
        let itemContent = content;
        
        // 如果 item 是对象，处理其属性
        if (typeof item === 'object' && item !== null) {
          const itemContext = item as Record<string, unknown>;
          
          // 处理 {{#if}} 条件
          itemContent = this.processIfBlocks(itemContent, itemContext);
          
          // 处理简单变量
          itemContent = itemContent.replace(/\{\{(\w+)\}\}/g, (_m: string, varName: string) => {
            const value = itemContext[varName];
            return value !== undefined && value !== null ? String(value) : '';
          });
        }
        
        // 替换 {{this}}
        itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
        // 替换 {{@index}}
        itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
        
        return itemContent;
      }).join('');
    });
  }

  /**
   * 丰富上下文，添加辅助变量
   */
  private enrichContext(context: TemplateContext): Record<string, unknown> {
    const enriched: Record<string, unknown> = { ...context };

    // 添加优先级表情
    if ('priority' in context) {
      enriched.priorityEmoji = PRIORITY_EMOJI[context.priority] || '⚪';
    }

    // 添加状态表情
    if ('status' in context) {
      enriched.statusEmoji = STATUS_EMOJI[context.status] || '⚪';
    }

    // 添加创建时间
    enriched.createTime = new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 预计算人天偏差
    if ('estimatedDays' in context || 'actualDays' in context) {
      const est = Number(context.estimatedDays) || 0;
      const act = Number(context.actualDays) || 0;
      enriched.daysDeviation = act - est;
      enriched.daysDeviationText = act >= est ? `+${act - est}d` : `${act - est}d`;
    }

    return enriched;
  }

  /**
   * 处理 {{#if}} 块，支持嵌套
   * 每次循环只处理最内层没有嵌套 {{#if}} 的块
   */
  private processIfBlocks(template: string, context: Record<string, unknown>): string {
    let result = template;
    let changed = true;
    while (changed) {
      changed = false;
      result = result.replace(/\{\{#if\s+(\w+)\}\}((?:(?!\{\{#if)[\s\S])*?)\{\{\/if\}\}/g, (match, variable, content) => {
        changed = true;
        const value = context[variable];
        const hasValue = Boolean(value) && !(Array.isArray(value) && value.length === 0);
        return hasValue ? content : '';
      });
    }
    return result;
  }

  /**
   * 处理简单变量（支持嵌套属性，如 tr3.status）
   */
  private processVariables(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{([\w.]+)\}\}/g, (match, variable) => {
      // 支持嵌套属性访问，如 tr3.status
      const parts = variable.split('.');
      let value: unknown = context;
      for (const part of parts) {
        if (value === null || value === undefined) {
          return '';
        }
        value = (value as Record<string, unknown>)[part];
      }
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  /**
   * 渲染版本模板
   */
  async renderVersionTemplate(context: VersionTemplateContext): Promise<string> {
    const template = await this.getTemplate('version');
    return this.renderTemplate(template, context);
  }

  /**
   * 渲染项目模板
   */
  async renderProjectTemplate(context: ProjectTemplateContext): Promise<string> {
    const template = await this.getTemplate('project');
    return this.renderTemplate(template, context);
  }

  /**
   * 渲染特性模板
   */
  async renderFeatureTemplate(context: FeatureTemplateContext): Promise<string> {
    const template = await this.getTemplate('feature');
    return this.renderTemplate(template, context);
  }

  /**
   * 渲染总览模板
   */
  async renderOverviewTemplate(context: OverviewTemplateContext): Promise<string> {
    const template = await this.getTemplate('overview');
    return this.renderTemplate(template, context);
  }
}
