/**
 * TemplateService 单元测试
 */

import { App } from 'obsidian';
import { TemplateService } from '../TemplateService';
import { DEFAULT_TEMPLATES } from '../../templates/defaults';
import type { ProjectManagerSettings } from '../../types/template';

describe('TemplateService', () => {
  let app: App;
  let service: TemplateService;
  const defaultSettings: ProjectManagerSettings = {
    enableCustomTemplates: false,
    customTemplates: {},
  };

  beforeEach(() => {
    app = new App();
    service = new TemplateService(app, defaultSettings);
  });

  describe('renderTemplate', () => {
    it('should replace simple variables', () => {
      const result = service.renderTemplate('Hello {{name}}!', { name: 'World' } as any);
      expect(result).toBe('Hello World!');
    });

    it('should render empty string for missing variables', () => {
      const result = service.renderTemplate('Hello {{missing}}!', {} as any);
      expect(result).toBe('Hello !');
    });

    it('should support {{#if}} conditional blocks', () => {
      const template = '{{#if show}}visible{{/if}}';
      expect(service.renderTemplate(template, { show: true } as any)).toBe('visible');
      expect(service.renderTemplate(template, { show: false } as any)).toBe('');
      expect(service.renderTemplate(template, {} as any)).toBe('');
    });

    it('should support {{#each}} loops with objects', () => {
      const template = '{{#each items}}{{name}},{{/each}}';
      const result = service.renderTemplate(template, {
        items: [{ name: 'A' }, { name: 'B' }],
      } as any);
      expect(result).toBe('A,B,');
    });

    it('should support {{#each}} loops with primitive values', () => {
      const template = '{{#each tags}}#{{this}} {{/each}}';
      const result = service.renderTemplate(template, { tags: ['frontend', 'backend'] } as any);
      expect(result).toBe('#frontend #backend ');
    });

    it('should enrich context with emojis and createTime', () => {
      const template = '{{priorityEmoji}}{{statusEmoji}} {{name}} {{createTime}}';
      const result = service.renderTemplate(template, {
        name: 'Test',
        priority: 'high',
        status: 'in-progress',
      } as any);
      expect(result).toContain('🟠');
      expect(result).toContain('🔄');
      expect(result).toContain('Test');
      expect(result).toMatch(/\d{2}\/\d{2} \d{2}:\d{2}/);
    });

    it('should calculate days deviation', () => {
      const template = '{{daysDeviationText}}';
      expect(service.renderTemplate(template, { estimatedDays: 10, actualDays: 12 } as any)).toBe('+2d');
      expect(service.renderTemplate(template, { estimatedDays: 10, actualDays: 8 } as any)).toBe('-2d');
    });

    it('should handle if wrapping each block', () => {
      const template = '{{#if items}}{{#each items}}[{{name}}]{{/each}}{{/if}}';
      const result = service.renderTemplate(template, {
        items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
      } as any);
      expect(result).toBe('[A][B][C]');
    });

    it('should skip each block when wrapping if is falsy', () => {
      const template = '{{#if items}}{{#each items}}[{{name}}]{{/each}}{{/if}}';
      const result = service.renderTemplate(template, { items: [] } as any);
      expect(result).toBe('');
    });
  });

  describe('getTemplate', () => {
    it('should return default template when no custom config', async () => {
      const template = await service.getTemplate('feature');
      expect(template).toBe(DEFAULT_TEMPLATES.feature);
    });

    it('should return custom template when enabled', async () => {
      const customService = new TemplateService(app, {
        enableCustomTemplates: true,
        customTemplates: { feature: '# Custom Feature' },
      });
      const template = await customService.getTemplate('feature');
      expect(template).toBe('# Custom Feature');
    });

    it('should return default template for types without custom template', async () => {
      const customService = new TemplateService(app, {
        enableCustomTemplates: true,
        customTemplates: { feature: '# Custom Feature' },
      });
      const template = await customService.getTemplate('project');
      expect(template).toBe(DEFAULT_TEMPLATES.project);
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return built-in default templates', () => {
      expect(service.getDefaultTemplate('overview')).toBe(DEFAULT_TEMPLATES.overview);
      expect(service.getDefaultTemplate('version')).toBe(DEFAULT_TEMPLATES.version);
      expect(service.getDefaultTemplate('project')).toBe(DEFAULT_TEMPLATES.project);
      expect(service.getDefaultTemplate('feature')).toBe(DEFAULT_TEMPLATES.feature);
    });
  });

  describe('updateSettings', () => {
    it('should clear cache when settings updated', async () => {
      const customService = new TemplateService(app, {
        enableCustomTemplates: true,
        customTemplates: { feature: '# Old Custom' },
      });
      await customService.getTemplate('feature');

      customService.updateSettings({
        enableCustomTemplates: true,
        customTemplates: { feature: '# New Custom' },
      });

      const template = await customService.getTemplate('feature');
      expect(template).toBe('# New Custom');
    });
  });
});
