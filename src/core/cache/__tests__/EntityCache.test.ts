import { EntityCache } from '../EntityCache';
import { App } from 'obsidian';
import type { Version, Project, Feature } from '../../../types';

describe('EntityCache', () => {
  let app: App;
  let cache: EntityCache;

  beforeEach(() => {
    app = new App();
    cache = new EntityCache(app);
  });

  afterEach(() => {
    cache.clear();
  });



  describe('basic operations', () => {
    it('should set and get version', () => {
      const version: Version = {
        id: 'ver-001',
        name: 'v1.0',
        status: 'planning',
        tags: [],
      };
      cache.setVersion(version);
      expect(cache.getVersion('ver-001')).toEqual(version);
    });

    it('should set and get project', () => {
      const project: Project = {
        id: 'proj-001',
        name: 'Test Project',
        versionId: 'ver-001',
        status: 'backlog',
        priority: 'medium',
        tags: [],
      };
      cache.setProject(project);
      expect(cache.getProject('proj-001')).toEqual(project);
    });

    it('should set and get feature', () => {
      const feature: Feature = {
        id: 'feat-001',
        name: 'Test Feature',
        projectId: 'proj-001',
        versionId: 'ver-001',
        status: 'todo',
        priority: 'medium',
        progress: 0,
        tags: [],
      };
      cache.setFeature(feature);
      expect(cache.getFeature('feat-001')).toEqual(feature);
    });

    it('should return undefined for non-existent entity', () => {
      expect(cache.getVersion('non-existent')).toBeUndefined();
      expect(cache.getProject('non-existent')).toBeUndefined();
      expect(cache.getFeature('non-existent')).toBeUndefined();
    });
  });

  describe('delete operations', () => {
    it('should delete version from cache', () => {
      const version: Version = { id: 'ver-001', name: 'v1.0', status: 'planning', tags: [] };
      cache.setVersion(version);
      cache.deleteVersion('ver-001');
      expect(cache.getVersion('ver-001')).toBeUndefined();
    });

    it('should delete project from cache', () => {
      const project: Project = { id: 'proj-001', name: 'Test', versionId: 'ver-001', status: 'backlog', priority: 'medium', tags: [] };
      cache.setProject(project);
      cache.deleteProject('proj-001');
      expect(cache.getProject('proj-001')).toBeUndefined();
    });

    it('should delete feature from cache', () => {
      const feature: Feature = { id: 'feat-001', name: 'Test', projectId: 'proj-001', versionId: 'ver-001', status: 'todo', priority: 'medium', progress: 0, tags: [] };
      cache.setFeature(feature);
      cache.deleteFeature('feat-001');
      expect(cache.getFeature('feat-001')).toBeUndefined();
    });
  });

  describe('list operations', () => {
    it('should get all versions', () => {
      const v1: Version = { id: 'ver-001', name: 'v1.0', status: 'planning', tags: [] };
      const v2: Version = { id: 'ver-002', name: 'v2.0', status: 'planning', tags: [] };
      cache.setVersion(v1);
      cache.setVersion(v2);
      expect(cache.getAllVersions()).toHaveLength(2);
    });

    it('should get all projects', () => {
      const p1: Project = { id: 'proj-001', name: 'P1', versionId: 'ver-001', status: 'backlog', priority: 'medium', tags: [] };
      const p2: Project = { id: 'proj-002', name: 'P2', versionId: 'ver-001', status: 'backlog', priority: 'medium', tags: [] };
      cache.setProject(p1);
      cache.setProject(p2);
      expect(cache.getAllProjects()).toHaveLength(2);
    });

    it('should get all features', () => {
      const f1: Feature = { id: 'feat-001', name: 'F1', projectId: 'proj-001', versionId: 'ver-001', status: 'todo', priority: 'medium', progress: 0, tags: [] };
      const f2: Feature = { id: 'feat-002', name: 'F2', projectId: 'proj-001', versionId: 'ver-001', status: 'todo', priority: 'medium', progress: 0, tags: [] };
      cache.setFeature(f1);
      cache.setFeature(f2);
      expect(cache.getAllFeatures()).toHaveLength(2);
    });
  });

  describe('stats', () => {
    it('should return correct stats', () => {
      cache.setVersion({ id: 'ver-001', name: 'v1.0', status: 'planning', tags: [] });
      cache.setProject({ id: 'proj-001', name: 'P1', versionId: 'ver-001', status: 'backlog', priority: 'medium', tags: [] });
      cache.setFeature({ id: 'feat-001', name: 'F1', projectId: 'proj-001', versionId: 'ver-001', status: 'todo', priority: 'medium', progress: 0, tags: [] });
      
      const stats = cache.getStats();
      expect(stats).toEqual({ versions: 1, projects: 1, features: 1 });
    });
  });

  describe('clear', () => {
    it('should clear all caches', () => {
      cache.setVersion({ id: 'ver-001', name: 'v1.0', status: 'planning', tags: [] });
      cache.setProject({ id: 'proj-001', name: 'P1', versionId: 'ver-001', status: 'backlog', priority: 'medium', tags: [] });
      cache.setFeature({ id: 'feat-001', name: 'F1', projectId: 'proj-001', versionId: 'ver-001', status: 'todo', priority: 'medium', progress: 0, tags: [] });
      
      cache.clear();
      
      expect(cache.getStats()).toEqual({ versions: 0, projects: 0, features: 0 });
      expect(cache.getVersion('ver-001')).toBeUndefined();
      expect(cache.getProject('proj-001')).toBeUndefined();
      expect(cache.getFeature('feat-001')).toBeUndefined();
    });
  });
});
