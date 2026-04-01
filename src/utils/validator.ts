import type { CreateProjectData, UpdateProjectData, CreateFeatureData, UpdateFeatureData } from '../types';
import { PROJECT_STATUSES, FEATURE_STATUSES, PRIORITIES } from '../constants';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 验证创建项目数据
 */
export function validateCreateProject(data: CreateProjectData): void {
  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError('项目名称不能为空');
  }
  if (data.name.length > 100) {
    throw new ValidationError('项目名称不能超过100个字符');
  }
  if (data.status && !PROJECT_STATUSES.some(s => s.value === data.status)) {
    throw new ValidationError(`无效的项目状态: ${data.status}`);
  }
  if (data.priority && !PRIORITIES.some(p => p.value === data.priority)) {
    throw new ValidationError(`无效的优先级: ${data.priority}`);
  }
}

/**
 * 验证更新项目数据
 */
export function validateUpdateProject(data: UpdateProjectData): void {
  if (data.name !== undefined) {
    if (data.name.trim().length === 0) {
      throw new ValidationError('项目名称不能为空');
    }
    if (data.name.length > 100) {
      throw new ValidationError('项目名称不能超过100个字符');
    }
  }
  if (data.status && !PROJECT_STATUSES.some(s => s.value === data.status)) {
    throw new ValidationError(`无效的项目状态: ${data.status}`);
  }
  if (data.priority && !PRIORITIES.some(p => p.value === data.priority)) {
    throw new ValidationError(`无效的优先级: ${data.priority}`);
  }
}

/**
 * 验证创建特性数据
 */
export function validateCreateFeature(data: CreateFeatureData): void {
  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError('特性名称不能为空');
  }
  if (data.name.length > 100) {
    throw new ValidationError('特性名称不能超过100个字符');
  }
  if (!data.projectId || data.projectId.trim().length === 0) {
    throw new ValidationError('必须关联一个项目');
  }
  if (data.status && !FEATURE_STATUSES.some(s => s.value === data.status)) {
    throw new ValidationError(`无效的特性状态: ${data.status}`);
  }
  if (data.priority && !PRIORITIES.some(p => p.value === data.priority)) {
    throw new ValidationError(`无效的优先级: ${data.priority}`);
  }
  if (data.progress !== undefined) {
    if (data.progress < 0 || data.progress > 100) {
      throw new ValidationError('进度必须在 0-100 之间');
    }
  }
  if (data.dueDate) {
    validateDateFormat(data.dueDate, '截止日期');
  }
}

/**
 * 验证更新特性数据
 */
export function validateUpdateFeature(data: UpdateFeatureData): void {
  if (data.name !== undefined) {
    if (data.name.trim().length === 0) {
      throw new ValidationError('特性名称不能为空');
    }
    if (data.name.length > 100) {
      throw new ValidationError('特性名称不能超过100个字符');
    }
  }
  if (data.status && !FEATURE_STATUSES.some(s => s.value === data.status)) {
    throw new ValidationError(`无效的特性状态: ${data.status}`);
  }
  if (data.priority && !PRIORITIES.some(p => p.value === data.priority)) {
    throw new ValidationError(`无效的优先级: ${data.priority}`);
  }
  if (data.progress !== undefined) {
    if (data.progress < 0 || data.progress > 100) {
      throw new ValidationError('进度必须在 0-100 之间');
    }
  }
  if (data.dueDate) {
    validateDateFormat(data.dueDate, '截止日期');
  }
}

/**
 * 验证日期格式 (YYYY-MM-DD)
 */
function validateDateFormat(date: string, fieldName: string): void {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) {
    throw new ValidationError(`${fieldName}格式无效，应为 YYYY-MM-DD`);
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new ValidationError(`${fieldName}不是有效的日期`);
  }
}

/**
 * 检查是否需要确认状态变更
 * 从 completed 状态变更到其他状态需要确认
 */
export function needsStatusConfirmation(currentStatus: string, newStatus: string): boolean {
  return currentStatus === 'completed' && newStatus !== 'completed';
}
