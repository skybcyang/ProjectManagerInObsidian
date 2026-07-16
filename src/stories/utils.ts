/**
 * Storybook 渲染辅助函数
 * 提供基于真实 Renderer 的 Storybook 渲染能力
 */

import type { Version, Project, Feature, Requirement } from '../types';
import type { ViewConfig, ViewContext, Entity, SortConfig } from '../view-engine/types';
import { App } from '../__mocks__/obsidian';
import { KanbanRenderer } from '../view-engine/renderers/KanbanRenderer';
import { CascadeRenderer } from '../view-engine/renderers/CascadeRenderer';
import { TimeViewRenderer } from '../view-engine/renderers/TimeViewRenderer';

type EntityManagerLike = {
  listVersions(): Promise<Version[]>;
  listProjects(filters?: { versionId?: string }): Promise<Project[]>;
  listFeatures(filters?: { versionId?: string; projectId?: string }): Promise<Feature[]>;
  listRequirements(filters?: { versionId?: string; projectId?: string }): Promise<Requirement[]>;
  getVersion(id: string): Promise<Version | null>;
  getProject(id: string): Promise<Project | null>;
  getFeature(id: string): Promise<Feature | null>;
  getRequirement(id: string): Promise<Requirement | null>;
  getVersionProjects(versionId: string): Promise<Project[]>;
  getProjectFeatures(projectId: string): Promise<Feature[]>;
  getOwners(): string[];
  cache: { getLogSummary(id: string): { latestProgress?: string; riskSummary?: { total: number; open: number; high: number; medium: number; low: number } } | null };
  getEntityPath(type: 'version' | 'project' | 'feature' | 'requirement', id: string): Promise<string | null>;
};

/**
 * 创建 Storybook 用的 mock EntityManager
 */
export function createStoryEntityManager(
  versions: Version[],
  projects: Project[],
  features: Feature[],
  requirements: Requirement[] = []
): EntityManagerLike {
  return {
    listVersions: async () => versions,
    listProjects: async () => projects,
    listFeatures: async () => features,
    listRequirements: async () => requirements,
    getVersion: async (id) => versions.find(v => v.id === id) || null,
    getProject: async (id) => projects.find(p => p.id === id) || null,
    getFeature: async (id) => features.find(f => f.id === id) || null,
    getRequirement: async (id) => requirements.find(r => r.id === id) || null,
    getVersionProjects: async (versionId) => projects.filter(p => p.versionId === versionId),
    getProjectFeatures: async (projectId) => features.filter(f => f.projectId === projectId),
    getOwners: () => {
      const owners = new Set<string>();
      [...versions, ...projects, ...features, ...requirements].forEach(e => {
        if (e.owner) owners.add(e.owner);
      });
      return Array.from(owners);
    },
    cache: {
      getLogSummary: () => null,
    },
    getEntityPath: async (type, id) => `${type}/${id}.md`,
  };
}

/**
 * 创建 Storybook 渲染上下文
 */
export function createStoryContext(): ViewContext {
  return {
    sourcePath: 'Storybook/Preview.md',
    el: document.createElement('div'),
  };
}

/**
 * Storybook 用的简化 DataService
 * 仅实现渲染器需要的 loadEntities / applyFilters / applySort
 */
class StoryDataService {
  constructor(
    private app: App,
    private entityManager: EntityManagerLike
  ) {}

  async loadEntities(config: ViewConfig): Promise<Entity[]> {
    const entityType = config.entityType || 'feature';

    if (entityType === 'feature') {
      let items = await this.entityManager.listFeatures();
      if (config.features?.length) items = items.filter(f => config.features!.includes(f.id));
      if (config.projects?.length) items = items.filter(f => config.projects!.includes(f.projectId));
      if (config.versions?.length) items = items.filter(f => config.versions!.includes(f.versionId));
      return items as Entity[];
    }

    if (entityType === 'project') {
      let items = await this.entityManager.listProjects();
      if (config.projects?.length) items = items.filter(p => config.projects!.includes(p.id));
      if (config.versions?.length) items = items.filter(p => config.versions!.includes(p.versionId));
      return items as Entity[];
    }

    if (entityType === 'version') {
      let items = await this.entityManager.listVersions();
      if (config.versions?.length) items = items.filter(v => config.versions!.includes(v.id));
      return items as Entity[];
    }

    if (entityType === 'requirement') {
      let items = await this.entityManager.listRequirements();
      if (config.requirements?.length) items = items.filter(r => config.requirements!.includes(r.id));
      if (config.features?.length) items = items.filter(r => r.featureId && config.features!.includes(r.featureId));
      if (config.projects?.length) items = items.filter(r => r.projectId && config.projects!.includes(r.projectId));
      if (config.versions?.length) items = items.filter(r => config.versions!.includes(r.versionId));
      return items as Entity[];
    }

    return [];
  }

  applyFilters(entities: Entity[], config: ViewConfig): Entity[] {
    return entities.filter((entity) => {
      if (config.status && 'status' in entity && entity.status !== config.status) return false;
      if (config.priority && 'priority' in entity && entity.priority !== config.priority) return false;
      if (config.owner && entity.owner !== config.owner) return false;
      if (config.tag && 'tags' in entity && !entity.tags?.includes(config.tag)) return false;
      if (config.version && 'versionId' in entity && entity.versionId !== config.version) return false;
      if (config.project && 'projectId' in entity && entity.projectId !== config.project) return false;
      return true;
    });
  }

  applySort(
    entities: Entity[],
    sortBy?: string | SortConfig[],
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Entity[] {
    if (!sortBy) return entities;
    const field = typeof sortBy === 'string' ? sortBy : sortBy[0]?.field;
    if (!field) return entities;

    const sorted = [...entities].sort((a: any, b: any) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'endDate':
          comparison = new Date(a.endDate || 0).getTime() - new Date(b.endDate || 0).getTime();
          break;
        case 'startDate':
          comparison = new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
          break;
        case 'priority': {
          const order = { critical: 0, high: 1, medium: 2, low: 3 };
          comparison = (order[a.priority as keyof typeof order] ?? 99) - (order[b.priority as keyof typeof order] ?? 99);
          break;
        }
        case 'progress':
          comparison = (a.progress || 0) - (b.progress || 0);
          break;
        case 'status': {
          const order = { backlog: 0, todo: 1, 'in-progress': 2, testing: 3, completed: 4, archived: 5 };
          comparison = (order[a.status as keyof typeof order] ?? 99) - (order[b.status as keyof typeof order] ?? 99);
          break;
        }
        case 'owner':
          comparison = (a.owner || '').localeCompare(b.owner || '');
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    return sorted;
  }
}

/**
 * Storybook 用的简化 ActionService
 * 仅实现渲染器需要的 openEntity
 */
class StoryActionService {
  constructor(
    private app: App,
    private entityManager: EntityManagerLike
  ) {}

  async openEntity(type: 'version' | 'project' | 'feature' | 'requirement', id: string): Promise<void> {
    const path = await this.entityManager.getEntityPath(type, id);
    if (path) {
      console.log(`[Storybook] 打开实体: ${type}/${id} -> ${path}`);
    }
  }

  onRefresh(): () => void {
    return () => {};
  }
}

/**
 * 使用真实 KanbanRenderer 渲染看板视图
 */
export async function renderKanbanStory(
  container: HTMLElement,
  config: ViewConfig,
  versions: Version[],
  projects: Project[],
  features: Feature[],
  requirements: Requirement[] = []
): Promise<void> {
  const app = new App() as any;
  const entityManager = createStoryEntityManager(versions, projects, features, requirements) as any;
  const dataService = new StoryDataService(app, entityManager) as any;
  const actionService = new StoryActionService(app, entityManager) as any;
  const renderer = new KanbanRenderer(app, entityManager, dataService, actionService);

  renderer.init(config, createStoryContext(), { onSaveConfig: () => {} });
  await renderer.render(container);
}

/**
 * 使用真实 CascadeRenderer 渲染级联视图
 */
export async function renderCascadeStory(
  container: HTMLElement,
  config: ViewConfig,
  versions: Version[],
  projects: Project[],
  features: Feature[]
): Promise<void> {
  const app = new App() as any;
  const entityManager = createStoryEntityManager(versions, projects, features) as any;
  const dataService = new StoryDataService(app, entityManager) as any;
  const actionService = new StoryActionService(app, entityManager) as any;
  const renderer = new CascadeRenderer(app, entityManager, dataService, actionService);

  renderer.init(config, createStoryContext(), { onSaveConfig: () => {} });
  await renderer.render(container);
}

/**
 * 使用真实 TimeViewRenderer 渲染时间视图
 */
export async function renderTimeViewStory(
  container: HTMLElement,
  config: ViewConfig,
  versions: Version[],
  projects: Project[],
  features: Feature[]
): Promise<void> {
  const app = new App() as any;
  const entityManager = createStoryEntityManager(versions, projects, features) as any;
  const dataService = new StoryDataService(app, entityManager) as any;
  const actionService = new StoryActionService(app, entityManager) as any;
  const renderer = new TimeViewRenderer(app, entityManager, dataService, actionService);

  renderer.init(config, createStoryContext(), { onSaveConfig: () => {} });
  await renderer.render(container);
}
