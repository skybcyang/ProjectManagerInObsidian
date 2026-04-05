import { BaseStore } from '../BaseStore';
import { App } from 'obsidian';
import { FileSystem } from '../../filesystem/FileSystem';

// Mock entity for testing
interface TestEntity {
  id: string;
  name: string;
  status: string;
}

interface TestCreateData {
  name: string;
  status?: string;
}

interface TestUpdateData {
  name?: string;
  status?: string;
}

class TestStore extends BaseStore<TestEntity, TestCreateData, TestUpdateData> {
  async create(data: TestCreateData): Promise<TestEntity> {
    return {
      id: this.generateId('test-'),
      name: data.name,
      status: data.status || 'active',
    };
  }
  
  async update(id: string, data: TestUpdateData): Promise<TestEntity> {
    return {
      id,
      name: data.name || 'Updated',
      status: data.status || 'active',
    };
  }
  
  async delete(id: string): Promise<boolean> {
    return true;
  }
  
  async getById(id: string): Promise<TestEntity | null> {
    return { id, name: 'Test', status: 'active' };
  }
  
  async list(): Promise<TestEntity[]> {
    return [];
  }
  
  // Expose protected method for testing
  public testGenerateId(prefix: string): string {
    return this.generateId(prefix);
  }
}

describe('BaseStore', () => {
  let app: App;
  let fs: FileSystem;
  let store: TestStore;
  
  beforeEach(() => {
    app = new App();
    fs = new FileSystem(app);
    store = new TestStore(fs, app);
  });
  
  describe('generateId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = store.testGenerateId('test-');
      const id2 = store.testGenerateId('test-');
      
      expect(id1).toMatch(/^test-[a-z0-9]+$/);
      expect(id2).toMatch(/^test-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
    
    it('should use custom prefix when provided', () => {
      const id = store.testGenerateId('custom-');
      expect(id).toMatch(/^custom-[a-z0-9]+$/);
    });
  });
  
  describe('CRUD operations', () => {
    it('should create entity', async () => {
      const entity = await store.create({ name: 'Test Entity' });
      expect(entity.name).toBe('Test Entity');
      expect(entity.status).toBe('active');
      expect(entity.id).toMatch(/^test-/);
    });
    
    it('should update entity', async () => {
      const entity = await store.update('test-123', { name: 'Updated Name' });
      expect(entity.id).toBe('test-123');
      expect(entity.name).toBe('Updated Name');
    });
    
    it('should delete entity', async () => {
      const result = await store.delete('test-123');
      expect(result).toBe(true);
    });
    
    it('should get entity by id', async () => {
      const entity = await store.getById('test-123');
      expect(entity).not.toBeNull();
      expect(entity?.id).toBe('test-123');
    });
    
    it('should list entities', async () => {
      const entities = await store.list();
      expect(Array.isArray(entities)).toBe(true);
    });
  });
});
