/**
 * 测试辅助工具
 * 提供 Mock App、测试数据生成器等
 */

import type { Version, VersionStatus, CreateVersionData } from '../src/types/version';
import type { Project, ProjectStatus, CreateProjectData, Priority } from '../src/types/project';
import type { Feature, FeatureStatus, CreateFeatureData } from '../src/types/feature';

// ID 生成器
let idCounter = 0;
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

// 默认测试数据
export const defaultVersion: CreateVersionData = {
  name: 'v1.0',
  status: 'planning',
  tags: [],
};

export const defaultProject: CreateProjectData = {
  name: 'Test Project',
  versionId: 'ver-test',
  status: 'backlog',
  priority: 'medium',
  tags: [],
};

export const defaultFeature: CreateFeatureData = {
  name: 'Test Feature',
  versionId: 'ver-test',
  projectId: 'proj-test',
  status: 'todo',
  priority: 'medium',
  progress: 0,
  tags: [],
};

// 测试数据生成器
export function createTestVersion(overrides: Partial<CreateVersionData> = {}): CreateVersionData {
  return {
    ...defaultVersion,
    ...overrides,
  };
}

export function createTestProject(overrides: Partial<CreateProjectData> = {}): CreateProjectData {
  return {
    ...defaultProject,
    ...overrides,
  };
}

export function createTestFeature(overrides: Partial<CreateFeatureData> = {}): CreateFeatureData {
  return {
    ...defaultFeature,
    ...overrides,
  };
}

// 创建完整实体（带 ID）
export function createMockVersion(overrides: Partial<Version> = {}): Version {
  return {
    id: generateId('ver'),
    name: 'v1.0',
    status: 'planning',
    tags: [],
    ...overrides,
  };
}

export function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: generateId('proj'),
    name: 'Test Project',
    versionId: 'ver-test',
    status: 'backlog',
    priority: 'medium',
    tags: [],
    ...overrides,
  };
}

export function createMockFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: generateId('feat'),
    name: 'Test Feature',
    versionId: 'ver-test',
    projectId: 'proj-test',
    status: 'todo',
    priority: 'medium',
    progress: 0,
    tags: [],
    ...overrides,
  };
}

// 批量创建测试数据
export function createMockVersions(count: number): Version[] {
  return Array.from({ length: count }, (_, i) =>
    createMockVersion({ name: `v${i + 1}.0` })
  );
}

export function createMockProjects(count: number, versionId: string): Project[] {
  return Array.from({ length: count }, (_, i) =>
    createMockProject({
      name: `Project ${i + 1}`,
      versionId,
    })
  );
}

export function createMockFeatures(count: number, versionId: string, projectId: string): Feature[] {
  return Array.from({ length: count }, (_, i) =>
    createMockFeature({
      name: `Feature ${i + 1}`,
      versionId,
      projectId,
    })
  );
}

// 状态枚举值
export const versionStatuses: VersionStatus[] = ['planning', 'in-progress', 'completed', 'archived'];
export const projectStatuses: ProjectStatus[] = ['backlog', 'in-progress', 'completed', 'archived'];
export const featureStatuses: FeatureStatus[] = ['backlog', 'todo', 'in-progress', 'testing', 'completed', 'archived'];
export const priorities: Priority[] = ['critical', 'high', 'medium', 'low'];

// 测试工具函数
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createDomElement(tag: string, className?: string): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}
