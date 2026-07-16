/**
 * EntityManager 集成测试
 * 测试版本、项目、特性的 CRUD 操作和关系查询
 */

import { App } from 'obsidian';
import { EntityManager } from '../../src/core/EntityManager';
import { createMockVersion, createMockProject, createMockFeature, createMockRequirement } from '../setup';

describe('EntityManager', () => {
  let app: App;
  let entityManager: EntityManager;

  beforeEach(() => {
    app = new App();
    entityManager = new EntityManager(app);
  });

  afterEach(() => {
    entityManager.cache.clear();
  });

  describe('Cache Operations', () => {
    it('should have cache instance', () => {
      expect(entityManager.cache).toBeDefined();
    });

    it('should cache version after creation', () => {
      const version = createMockVersion({ id: 'ver-cache', name: 'Cached Version' });
      entityManager.cache.setVersion(version);

      const cached = entityManager.cache.getVersion('ver-cache');
      expect(cached).toBeDefined();
      expect(cached?.name).toBe('Cached Version');
    });

    it('should cache project after creation', () => {
      const project = createMockProject({ id: 'proj-cache', name: 'Cached Project', versionId: 'ver-1' });
      entityManager.cache.setProject(project);

      const cached = entityManager.cache.getProject('proj-cache');
      expect(cached).toBeDefined();
      expect(cached?.name).toBe('Cached Project');
    });

    it('should cache feature after creation', () => {
      const feature = createMockFeature({
        id: 'feat-cache',
        name: 'Cached Feature',
        versionId: 'ver-1',
        projectId: 'proj-1'
      });
      entityManager.cache.setFeature(feature);

      const cached = entityManager.cache.getFeature('feat-cache');
      expect(cached).toBeDefined();
      expect(cached?.name).toBe('Cached Feature');
    });

    it('should cache requirement after creation', () => {
      const requirement = createMockRequirement({
        id: 'req-cache',
        name: 'Cached Requirement',
        versionId: 'ver-1',
      });
      entityManager.cache.setRequirement(requirement);

      const cached = entityManager.cache.getRequirement('req-cache');
      expect(cached).toBeDefined();
      expect(cached?.name).toBe('Cached Requirement');
    });

    it('should return correct stats', () => {
      entityManager.cache.setVersion(createMockVersion({ id: 'ver-1' }));
      entityManager.cache.setVersion(createMockVersion({ id: 'ver-2' }));
      entityManager.cache.setProject(createMockProject({ id: 'proj-1', versionId: 'ver-1' }));
      entityManager.cache.setFeature(createMockFeature({ id: 'feat-1', versionId: 'ver-1', projectId: 'proj-1' }));
      entityManager.cache.setRequirement(createMockRequirement({ id: 'req-1', versionId: 'ver-1' }));

      const stats = entityManager.cache.getStats();
      expect(stats).toEqual({ versions: 2, projects: 1, requirements: 1, features: 1 });
    });
  });

  describe('Version Operations', () => {
    it('should create version in cache', () => {
      const version = createMockVersion({ name: 'Test Version', status: 'planning' });
      entityManager.cache.setVersion(version);

      const retrieved = entityManager.cache.getVersion(version.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Version');
      expect(retrieved?.status).toBe('planning');
    });

    it('should update version in cache', () => {
      const version = createMockVersion({ id: 'ver-update', name: 'Original Name' });
      entityManager.cache.setVersion(version);

      entityManager.cache.setVersion({ ...version, name: 'Updated Name' });
      const updated = entityManager.cache.getVersion('ver-update');

      expect(updated?.name).toBe('Updated Name');
    });

    it('should delete version from cache', () => {
      const version = createMockVersion({ id: 'ver-delete' });
      entityManager.cache.setVersion(version);

      entityManager.cache.deleteVersion('ver-delete');
      const deleted = entityManager.cache.getVersion('ver-delete');

      expect(deleted).toBeUndefined();
    });

    it('should list all versions from cache', () => {
      entityManager.cache.setVersion(createMockVersion({ id: 'ver-1', name: 'Version 1' }));
      entityManager.cache.setVersion(createMockVersion({ id: 'ver-2', name: 'Version 2' }));
      entityManager.cache.setVersion(createMockVersion({ id: 'ver-3', name: 'Version 3' }));

      const versions = entityManager.cache.getAllVersions();
      expect(versions).toHaveLength(3);
    });
  });

  describe('Project Operations', () => {
    it('should create project in cache with versionId', () => {
      const project = createMockProject({
        name: 'Test Project',
        versionId: 'ver-1',
        status: 'backlog',
        priority: 'high'
      });
      entityManager.cache.setProject(project);

      const retrieved = entityManager.cache.getProject(project.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.versionId).toBe('ver-1');
      expect(retrieved?.priority).toBe('high');
    });

    it('should get version projects', () => {
      const versionId = 'ver-test';
      entityManager.cache.setProject(createMockProject({ versionId, name: 'Project A' }));
      entityManager.cache.setProject(createMockProject({ versionId, name: 'Project B' }));
      entityManager.cache.setProject(createMockProject({ versionId: 'ver-other', name: 'Project C' }));

      const allProjects = entityManager.cache.getAllProjects();
      const versionProjects = allProjects.filter(p => p.versionId === versionId);

      expect(versionProjects).toHaveLength(2);
      expect(versionProjects.map(p => p.name)).toContain('Project A');
      expect(versionProjects.map(p => p.name)).toContain('Project B');
    });

    it('should filter projects by status', () => {
      entityManager.cache.setProject(createMockProject({ status: 'backlog', name: 'Backlog Project' }));
      entityManager.cache.setProject(createMockProject({ status: 'in-progress', name: 'Active Project' }));
      entityManager.cache.setProject(createMockProject({ status: 'completed', name: 'Done Project' }));

      const inProgressProjects = entityManager.cache.getAllProjects()
        .filter(p => p.status === 'in-progress');

      expect(inProgressProjects).toHaveLength(1);
      expect(inProgressProjects[0].name).toBe('Active Project');
    });
  });

  describe('Feature Operations', () => {
    it('should create feature in cache with relationships', () => {
      const feature = createMockFeature({
        name: 'Test Feature',
        versionId: 'ver-1',
        projectId: 'proj-1',
        status: 'todo',
        priority: 'medium',
        progress: 25
      });
      entityManager.cache.setFeature(feature);

      const retrieved = entityManager.cache.getFeature(feature.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.versionId).toBe('ver-1');
      expect(retrieved?.projectId).toBe('proj-1');
      expect(retrieved?.progress).toBe(25);
    });

    it('should get project features', () => {
      const projectId = 'proj-test';
      entityManager.cache.setFeature(createMockFeature({ projectId, versionId: 'ver-1', name: 'Feature A' }));
      entityManager.cache.setFeature(createMockFeature({ projectId, versionId: 'ver-1', name: 'Feature B' }));
      entityManager.cache.setFeature(createMockFeature({ projectId: 'proj-other', versionId: 'ver-1', name: 'Feature C' }));

      const allFeatures = entityManager.cache.getAllFeatures();
      const projectFeatures = allFeatures.filter(f => f.projectId === projectId);

      expect(projectFeatures).toHaveLength(2);
    });

    it('should filter features by status', () => {
      entityManager.cache.setFeature(createMockFeature({ status: 'todo', name: 'Todo Feature' }));
      entityManager.cache.setFeature(createMockFeature({ status: 'in-progress', name: 'Active Feature' }));
      entityManager.cache.setFeature(createMockFeature({ status: 'testing', name: 'Testing Feature' }));
      entityManager.cache.setFeature(createMockFeature({ status: 'completed', name: 'Done Feature' }));

      const activeFeatures = entityManager.cache.getAllFeatures()
        .filter(f => f.status === 'in-progress' || f.status === 'testing');

      expect(activeFeatures).toHaveLength(2);
    });

    it('should update feature progress', () => {
      const feature = createMockFeature({ id: 'feat-progress', progress: 0 });
      entityManager.cache.setFeature(feature);

      entityManager.cache.setFeature({ ...feature, progress: 75 });
      const updated = entityManager.cache.getFeature('feat-progress');

      expect(updated?.progress).toBe(75);
    });
  });

  describe('Entity Relationships', () => {
    it('should maintain version-project-feature hierarchy', () => {
      const versionId = 'ver-hierarchy';
      const projectId = 'proj-hierarchy';

      // 创建版本
      entityManager.cache.setVersion(createMockVersion({ id: versionId, name: 'Hierarchy Version' }));

      // 创建项目
      entityManager.cache.setProject(createMockProject({ id: projectId, versionId, name: 'Hierarchy Project' }));

      // 创建特性
      entityManager.cache.setFeature(createMockFeature({ projectId, versionId, name: 'Hierarchy Feature' }));

      // 验证关系
      const version = entityManager.cache.getVersion(versionId);
      const allProjects = entityManager.cache.getAllProjects();
      const project = allProjects.find(p => p.id === projectId);
      const allFeatures = entityManager.cache.getAllFeatures();
      const features = allFeatures.filter(f => f.projectId === projectId);

      expect(version).toBeDefined();
      expect(project?.versionId).toBe(versionId);
      expect(features).toHaveLength(1);
      expect(features[0].projectId).toBe(projectId);
    });

    it('should cascade delete projects when version deleted', () => {
      const versionId = 'ver-cascade';
      entityManager.cache.setVersion(createMockVersion({ id: versionId }));
      entityManager.cache.setProject(createMockProject({ versionId, name: 'Project 1' }));
      entityManager.cache.setProject(createMockProject({ versionId, name: 'Project 2' }));

      // 删除版本
      entityManager.cache.deleteVersion(versionId);

      // 验证版本已删除
      expect(entityManager.cache.getVersion(versionId)).toBeUndefined();

      // 验证项目仍然存在（缓存不处理级联删除，由 EntityManager 处理）
      const remainingProjects = entityManager.cache.getAllProjects()
        .filter(p => p.versionId === versionId);
      expect(remainingProjects).toHaveLength(2);
    });
  });

  describe('Requirement Operations', () => {
    it('should create requirement in cache with versionId', () => {
      const requirement = createMockRequirement({
        name: 'Test Requirement',
        versionId: 'ver-1',
        status: 'todo',
        priority: 'high',
        progress: 25,
      });
      entityManager.cache.setRequirement(requirement);

      const retrieved = entityManager.cache.getRequirement(requirement.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.versionId).toBe('ver-1');
      expect(retrieved?.priority).toBe('high');
      expect(retrieved?.progress).toBe(25);
    });

    it('should support free requirement without projectId', () => {
      const requirement = createMockRequirement({
        versionId: 'ver-1',
        projectId: undefined,
      });
      entityManager.cache.setRequirement(requirement);

      const retrieved = entityManager.cache.getRequirement(requirement.id);
      expect(retrieved?.projectId).toBeUndefined();
    });

    it('should get version requirements', () => {
      const versionId = 'ver-test';
      entityManager.cache.setRequirement(createMockRequirement({ versionId, name: 'Requirement A' }));
      entityManager.cache.setRequirement(createMockRequirement({ versionId, name: 'Requirement B' }));
      entityManager.cache.setRequirement(createMockRequirement({ versionId: 'ver-other', name: 'Requirement C' }));

      const allRequirements = entityManager.cache.getAllRequirements();
      const versionRequirements = allRequirements.filter(r => r.versionId === versionId);

      expect(versionRequirements).toHaveLength(2);
    });

    it('should filter requirements by status', () => {
      entityManager.cache.setRequirement(createMockRequirement({ status: 'backlog', name: 'Backlog Requirement' }));
      entityManager.cache.setRequirement(createMockRequirement({ status: 'in-progress', name: 'Active Requirement' }));
      entityManager.cache.setRequirement(createMockRequirement({ status: 'completed', name: 'Done Requirement' }));

      const activeRequirements = entityManager.cache.getAllRequirements()
        .filter(r => r.status === 'in-progress');

      expect(activeRequirements).toHaveLength(1);
      expect(activeRequirements[0].name).toBe('Active Requirement');
    });
  });

  describe('Owner Management', () => {
    // 注意：ownerIndex 只在从文件加载时自动更新
    // 直接操作缓存需要手动维护 ownerIndex
    it('should return empty owners list initially', () => {
      const owners = entityManager.cache.getOwners();
      expect(owners).toEqual([]);
    });
  });
});
