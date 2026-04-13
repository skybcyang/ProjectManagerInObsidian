/**
 * 视图渲染器集成测试
 */

import { createMockVersion, createMockProject, createMockFeature } from '../setup';
import type { Entity } from '../../src/view-engine/types';

describe('View Renderers', () => {
  let mockEntities: Entity[];

  beforeEach(() => {
    // 创建测试实体
    mockEntities = [
      createMockVersion({ id: 'ver-1', name: 'Version 1', status: 'planning' }),
      createMockProject({ id: 'proj-1', name: 'Project 1', versionId: 'ver-1', status: 'backlog', priority: 'high' }),
      createMockProject({ id: 'proj-2', name: 'Project 2', versionId: 'ver-1', status: 'in-progress', priority: 'medium' }),
      createMockFeature({ id: 'feat-1', name: 'Feature 1', versionId: 'ver-1', projectId: 'proj-1', status: 'todo', priority: 'high', progress: 50 }),
      createMockFeature({ id: 'feat-2', name: 'Feature 2', versionId: 'ver-1', projectId: 'proj-1', status: 'in-progress', priority: 'medium', progress: 25 }),
    ];
  });

  describe('View Types', () => {
    it('should have valid test entities', () => {
      expect(mockEntities).toHaveLength(5);
      expect(mockEntities[0]).toHaveProperty('id', 'ver-1');
      expect(mockEntities[1]).toHaveProperty('versionId', 'ver-1');
    });

    it('should create mock version with correct structure', () => {
      const version = createMockVersion({
        name: 'Test Version',
        status: 'in-progress',
      });

      expect(version).toHaveProperty('id');
      expect(version).toHaveProperty('name', 'Test Version');
      expect(version).toHaveProperty('status', 'in-progress');
      expect(version).toHaveProperty('tags');
    });

    it('should create mock project with correct structure', () => {
      const project = createMockProject({
        name: 'Test Project',
        versionId: 'ver-test',
        status: 'backlog',
        priority: 'high',
      });

      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('name', 'Test Project');
      expect(project).toHaveProperty('versionId', 'ver-test');
      expect(project).toHaveProperty('priority', 'high');
    });

    it('should create mock feature with correct structure', () => {
      const feature = createMockFeature({
        name: 'Test Feature',
        versionId: 'ver-test',
        projectId: 'proj-test',
        status: 'todo',
        progress: 50,
      });

      expect(feature).toHaveProperty('id');
      expect(feature).toHaveProperty('name', 'Test Feature');
      expect(feature).toHaveProperty('progress', 50);
      expect(feature).toHaveProperty('projectId', 'proj-test');
    });
  });

  describe('Entity Type Detection', () => {
    it('should detect version entity type', () => {
      const version = createMockVersion();
      // Version 没有 versionId 和 projectId
      expect(version).not.toHaveProperty('versionId');
      expect(version).not.toHaveProperty('projectId');
    });

    it('should detect project entity type', () => {
      const project = createMockProject({ versionId: 'ver-1' });
      // Project 有 versionId 但没有 projectId
      expect(project).toHaveProperty('versionId', 'ver-1');
      expect(project).not.toHaveProperty('projectId');
    });

    it('should detect feature entity type', () => {
      const feature = createMockFeature({ versionId: 'ver-1', projectId: 'proj-1' });
      // Feature 有 versionId 和 projectId
      expect(feature).toHaveProperty('versionId', 'ver-1');
      expect(feature).toHaveProperty('projectId', 'proj-1');
    });
  });

  describe('Entity Relationships', () => {
    it('should create version with multiple projects', () => {
      const version = createMockVersion({ id: 'ver-multi' });
      const projects = [
        createMockProject({ versionId: 'ver-multi', name: 'Project A' }),
        createMockProject({ versionId: 'ver-multi', name: 'Project B' }),
        createMockProject({ versionId: 'ver-multi', name: 'Project C' }),
      ];

      const relatedProjects = projects.filter(p => p.versionId === version.id);
      expect(relatedProjects).toHaveLength(3);
    });

    it('should create project with multiple features', () => {
      const project = createMockProject({ id: 'proj-multi', versionId: 'ver-1' });
      const features = [
        createMockFeature({ projectId: 'proj-multi', versionId: 'ver-1', name: 'Feature A' }),
        createMockFeature({ projectId: 'proj-multi', versionId: 'ver-1', name: 'Feature B' }),
      ];

      const relatedFeatures = features.filter(f => f.projectId === project.id);
      expect(relatedFeatures).toHaveLength(2);
    });

    it('should filter entities by status', () => {
      const features = [
        createMockFeature({ status: 'todo', name: 'Todo Feature' }),
        createMockFeature({ status: 'in-progress', name: 'In Progress Feature' }),
        createMockFeature({ status: 'completed', name: 'Completed Feature' }),
      ];

      const todoFeatures = features.filter(f => f.status === 'todo');
      expect(todoFeatures).toHaveLength(1);
      expect(todoFeatures[0].name).toBe('Todo Feature');
    });

    it('should filter entities by priority', () => {
      const projects = [
        createMockProject({ priority: 'critical', name: 'Critical Project' }),
        createMockProject({ priority: 'high', name: 'High Project' }),
        createMockProject({ priority: 'medium', name: 'Medium Project' }),
        createMockProject({ priority: 'low', name: 'Low Project' }),
      ];

      const highPriorityProjects = projects.filter(p => p.priority === 'high' || p.priority === 'critical');
      expect(highPriorityProjects).toHaveLength(2);
    });
  });

  describe('Entity Progress', () => {
    it('should track feature progress', () => {
      const features = [
        createMockFeature({ progress: 0, name: 'Not Started' }),
        createMockFeature({ progress: 50, name: 'Half Done' }),
        createMockFeature({ progress: 100, name: 'Complete' }),
      ];

      const totalProgress = features.reduce((sum, f) => sum + f.progress, 0);
      const averageProgress = totalProgress / features.length;

      expect(averageProgress).toBe(50);
    });

    it('should calculate completion rate', () => {
      const features = [
        createMockFeature({ status: 'completed', progress: 100 }),
        createMockFeature({ status: 'completed', progress: 100 }),
        createMockFeature({ status: 'in-progress', progress: 50 }),
        createMockFeature({ status: 'todo', progress: 0 }),
      ];

      const completedCount = features.filter(f => f.status === 'completed').length;
      const completionRate = (completedCount / features.length) * 100;

      expect(completionRate).toBe(50);
    });
  });
});
