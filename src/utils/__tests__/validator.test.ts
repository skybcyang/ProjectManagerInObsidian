import { 
  ValidationError, 
  validateCreateFeature, 
  validateCreateProject, 
  needsStatusConfirmation 
} from '../validator';
import type { CreateFeatureData, CreateProjectData } from '../../types';

describe('ValidationError', () => {
  it('should create error with message', () => {
    const error = new ValidationError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ValidationError');
  });
});

describe('validateCreateFeature', () => {
  it('should pass for valid feature', () => {
    const data: CreateFeatureData = {
      name: 'Test Feature',
      versionId: 'ver-001',
      projectId: 'proj-001',
      status: 'todo',
      priority: 'medium',
      progress: 0,
      tags: [],
    };
    expect(() => validateCreateFeature(data)).not.toThrow();
  });
  
  it('should throw for empty name', () => {
    const data: CreateFeatureData = {
      name: '',
      versionId: 'ver-001',
      projectId: 'proj-001',
      status: 'todo',
      priority: 'medium',
      progress: 0,
      tags: [],
    };
    expect(() => validateCreateFeature(data)).toThrow(ValidationError);
    expect(() => validateCreateFeature(data)).toThrow('特性名称不能为空');
  });
  
  it('should throw for whitespace-only name', () => {
    const data: CreateFeatureData = {
      name: '   ',
      versionId: 'ver-001',
      projectId: 'proj-001',
      status: 'todo',
      priority: 'medium',
      progress: 0,
      tags: [],
    };
    expect(() => validateCreateFeature(data)).toThrow('特性名称不能为空');
  });
  
  it('should throw for missing projectId', () => {
    const data: CreateFeatureData = {
      name: 'Test Feature',
      versionId: 'ver-001',
      projectId: '',
      status: 'todo',
      priority: 'medium',
      progress: 0,
      tags: [],
    };
    expect(() => validateCreateFeature(data)).toThrow('必须关联一个项目');
  });
});

describe('validateCreateProject', () => {
  it('should pass for valid project', () => {
    const data: CreateProjectData = {
      name: 'Test Project',
      versionId: 'ver-001',
      status: 'in-progress',
    };
    expect(() => validateCreateProject(data)).not.toThrow();
  });
  
  it('should throw for empty name', () => {
    const data: CreateProjectData = {
      name: '',
      versionId: 'ver-001',
      status: 'in-progress',
    };
    expect(() => validateCreateProject(data)).toThrow('项目名称不能为空');
  });
});



describe('needsStatusConfirmation', () => {
  it('should require confirmation when moving from completed to non-completed', () => {
    expect(needsStatusConfirmation('completed', 'todo')).toBe(true);
    expect(needsStatusConfirmation('completed', 'in-progress')).toBe(true);
  });
  
  it('should not require confirmation for other transitions', () => {
    expect(needsStatusConfirmation('todo', 'in-progress')).toBe(false);
    expect(needsStatusConfirmation('in-progress', 'completed')).toBe(false);
    // completed -> archived also needs confirmation per current logic
    expect(needsStatusConfirmation('completed', 'archived')).toBe(true);
  });
  
  it('should handle undefined current status', () => {
    expect(needsStatusConfirmation(undefined as any, 'todo')).toBe(false);
  });
});
