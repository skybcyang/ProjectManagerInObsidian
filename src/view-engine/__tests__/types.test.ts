import { getEntityType, ViewConfig } from '../types';
import type { Version, Project, Feature, Requirement } from '../../types';

describe('getEntityType', () => {
  it('should identify version entity', () => {
    const version = { id: 'ver-001', name: 'v1.0' } as Version;
    expect(getEntityType(version)).toBe('version');
  });
  
  it('should identify project entity', () => {
    const project = { id: 'proj-001', name: 'Test Project', versionId: 'ver-001' } as Project;
    expect(getEntityType(project)).toBe('project');
  });
  
  it('should identify feature entity', () => {
    const feature = { id: 'feat-001', name: 'Test Feature', projectId: 'proj-001' } as Feature;
    expect(getEntityType(feature)).toBe('feature');
  });
  
  it('should identify feature by projectId precedence', () => {
    // Feature has both projectId and versionId, but projectId should take precedence
    const feature = {
      id: 'feat-001',
      name: 'Test Feature',
      projectId: 'proj-001',
      versionId: 'ver-001'
    } as any;
    // Fixed: projectId is checked first, so this correctly returns 'feature'
    expect(getEntityType(feature)).toBe('feature');
  });

  it('should identify requirement entity', () => {
    const requirement = {
      id: 'req-001',
      name: 'Test Requirement',
      type: 'requirement',
      versionId: 'ver-001',
    } as Requirement;
    expect(getEntityType(requirement)).toBe('requirement');
  });

  it('should identify requirement by type precedence over projectId', () => {
    const requirement = {
      id: 'req-001',
      name: 'Test Requirement',
      type: 'requirement',
      versionId: 'ver-001',
      projectId: 'proj-001',
      featureId: 'feat-001',
    } as Requirement;
    expect(getEntityType(requirement)).toBe('requirement');
  });
});

describe('ViewConfig types', () => {
  it('should allow valid view modes', () => {
    const config: ViewConfig = {
      mode: 'kanban',
      groupBy: 'status',
    };
    expect(config.mode).toBe('kanban');
  });

  it('should allow filter configuration', () => {
    const config: ViewConfig = {
      mode: 'cascade',
      version: 'ver-001',
      project: 'proj-001',
      status: 'in-progress',
      priority: 'high',
    };
    expect(config.version).toBe('ver-001');
    expect(config.project).toBe('proj-001');
    expect(config.status).toBe('in-progress');
    expect(config.priority).toBe('high');
  });

  it('should allow array-based hierarchy filters', () => {
    const config: ViewConfig = {
      mode: 'cascade',
      entityType: 'feature',
      versions: ['ver-001', 'ver-002'],
      projects: ['proj-001'],
      features: ['feat-001'],
      status: 'in-progress',
    };
    expect(config.versions).toEqual(['ver-001', 'ver-002']);
    expect(config.projects).toEqual(['proj-001']);
    expect(config.features).toEqual(['feat-001']);
  });

  it('should allow sort configuration with status field', () => {
    const config: ViewConfig = {
      mode: 'cascade',
      sortBy: 'status',
      sortOrder: 'desc',
    };
    expect(config.sortBy).toBe('status');
    expect(config.sortOrder).toBe('desc');
  });
});
