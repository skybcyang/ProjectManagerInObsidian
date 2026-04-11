import type { ViewConfig, ViewMode, EntityType, ListColumnField } from '../view-engine/types';

/**
 * 配置验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: ViewConfig;
}

/**
 * 有效的视图模式
 */
const VALID_VIEW_MODES: ViewMode[] = ['kanban', 'list', 'grid', 'cascade', 'timeline', 'timeview', 'burndown', 'workload'];

/**
 * 有效的实体类型
 */
const VALID_ENTITY_TYPES: EntityType[] = ['version', 'project', 'feature'];

/**
 * 有效的排序字段
 */
const VALID_SORT_FIELDS = ['name', 'startDate', 'endDate', 'priority', 'progress', 'created'] as const;

/**
 * 有效的排序方向
 */
const VALID_SORT_ORDERS = ['asc', 'desc'] as const;

/**
 * 有效的分组方式
 */
const VALID_GROUP_BY = ['status', 'priority', 'version', 'project', 'startDate', 'endDate'] as const;

/**
 * 有效的网格列数
 */
const VALID_COLS = [1, 2, 3, 4] as const;

/**
 * 有效的列表列字段
 */
const VALID_LIST_COLUMNS: ListColumnField[] = [
  'name', 'status', 'priority', 'owner', 'startDate', 'endDate', 'progress', 'tags', 'versionId', 'projectId'
];

/**
 * 配置验证器
 * 验证 pm-view 代码块配置的有效性
 */
export class ConfigValidator {
  /**
   * 验证配置
   */
  static validate(config: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 确保是对象
    if (!config || typeof config !== 'object') {
      errors.push('配置必须是一个对象');
      return { valid: false, errors, warnings, config: { mode: 'kanban' } };
    }

    const input = config as Partial<ViewConfig>;
    const result: Partial<ViewConfig> = {};

    // 验证 mode（必填）
    const modeValidation = this.validateMode(input.mode);
    if (modeValidation.error) {
      errors.push(modeValidation.error);
      result.mode = 'kanban';
    } else {
      result.mode = modeValidation.value!;
    }

    // 验证 entityType
    if (input.entityType !== undefined) {
      const entityTypeValidation = this.validateEntityType(input.entityType);
      if (entityTypeValidation.error) {
        warnings.push(entityTypeValidation.error);
      } else {
        result.entityType = entityTypeValidation.value;
      }
    }

    // 验证 title
    if (input.title !== undefined) {
      if (typeof input.title === 'string' && input.title.length > 0) {
        result.title = input.title;
      } else if (input.title !== '') {
        warnings.push('title 必须是字符串');
      }
    }

    // 验证 version
    if (input.version !== undefined) {
      if (typeof input.version === 'string' && input.version.length > 0) {
        result.version = input.version;
      } else {
        warnings.push('version 必须是有效的 ID 字符串');
      }
    }

    // 验证 project
    if (input.project !== undefined) {
      if (typeof input.project === 'string' && input.project.length > 0) {
        result.project = input.project;
      } else {
        warnings.push('project 必须是有效的 ID 字符串');
      }
    }

    // 验证 feature
    if (input.feature !== undefined) {
      if (typeof input.feature === 'string' && input.feature.length > 0) {
        result.feature = input.feature;
      } else {
        warnings.push('feature 必须是有效的 ID 字符串');
      }
    }

    // 验证 status
    if (input.status !== undefined) {
      if (typeof input.status === 'string') {
        result.status = input.status;
      } else {
        warnings.push('status 必须是字符串');
      }
    }

    // 验证 priority
    if (input.priority !== undefined) {
      if (typeof input.priority === 'string') {
        result.priority = input.priority;
      } else {
        warnings.push('priority 必须是字符串');
      }
    }

    // 验证 owner
    if (input.owner !== undefined) {
      if (typeof input.owner === 'string') {
        result.owner = input.owner;
      } else {
        warnings.push('owner 必须是字符串');
      }
    }

    // 验证 tag
    if (input.tag !== undefined) {
      if (typeof input.tag === 'string') {
        result.tag = input.tag;
      } else {
        warnings.push('tag 必须是字符串');
      }
    }

    // 验证 sortBy
    if (input.sortBy !== undefined) {
      const sortByValidation = this.validateSortBy(input.sortBy);
      if (sortByValidation.error) {
        warnings.push(sortByValidation.error);
      } else {
        result.sortBy = sortByValidation.value;
      }
    }

    // 验证 sortOrder
    if (input.sortOrder !== undefined) {
      const sortOrderValidation = this.validateSortOrder(input.sortOrder);
      if (sortOrderValidation.error) {
        warnings.push(sortOrderValidation.error);
      } else {
        result.sortOrder = sortOrderValidation.value;
      }
    }

    // 验证 limit
    if (input.limit !== undefined) {
      const limitValidation = this.validateLimit(input.limit);
      if (limitValidation.error) {
        warnings.push(limitValidation.error);
      } else {
        result.limit = limitValidation.value;
      }
    }

    // 验证 groupBy
    if (input.groupBy !== undefined) {
      const groupByValidation = this.validateGroupBy(input.groupBy);
      if (groupByValidation.error) {
        warnings.push(groupByValidation.error);
      } else {
        result.groupBy = groupByValidation.value;
      }
    }

    // 验证 cols
    if (input.cols !== undefined) {
      const colsValidation = this.validateCols(input.cols);
      if (colsValidation.error) {
        warnings.push(colsValidation.error);
      } else {
        result.cols = colsValidation.value;
      }
    }

    // 验证 expanded
    if (input.expanded !== undefined) {
      if (typeof input.expanded === 'boolean') {
        result.expanded = input.expanded;
      } else if (input.expanded === 'true') {
        result.expanded = true;
      } else if (input.expanded === 'false') {
        result.expanded = false;
      } else {
        warnings.push('expanded 必须是布尔值');
      }
    }

    // 验证 listColumns
    if (input.listColumns !== undefined) {
      const listColumnsValidation = this.validateListColumns(input.listColumns);
      if (listColumnsValidation.error) {
        warnings.push(listColumnsValidation.error);
      } else {
        result.listColumns = listColumnsValidation.value;
      }
    }

    // 验证 cardFields
    if (input.cardFields !== undefined) {
      if (typeof input.cardFields === 'object' && input.cardFields !== null) {
        result.cardFields = input.cardFields as ViewConfig['cardFields'];
      } else {
        warnings.push('cardFields 必须是对象');
      }
    }

    // 复制其他未验证的属性（向后兼容）
    const validatedKeys = Object.keys(result);
    Object.keys(input).forEach(key => {
      if (!validatedKeys.includes(key)) {
        (result as Record<string, unknown>)[key] = input[key as keyof ViewConfig];
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      config: result as ViewConfig
    };
  }

  /**
   * 验证视图模式
   */
  private static validateMode(mode: unknown): { value?: ViewMode; error?: string } {
    if (!mode) {
      return { error: 'mode 是必填项，使用默认 kanban' };
    }

    const modeStr = String(mode);
    if (!VALID_VIEW_MODES.includes(modeStr as ViewMode)) {
      return {
        error: `无效的视图模式: "${modeStr}"，有效值: ${VALID_VIEW_MODES.join(', ')}，使用默认 kanban`
      };
    }

    return { value: modeStr as ViewMode };
  }

  /**
   * 验证实体类型
   */
  private static validateEntityType(entityType: unknown): { value?: EntityType; error?: string } {
    const entityTypeStr = String(entityType);
    if (!VALID_ENTITY_TYPES.includes(entityTypeStr as EntityType)) {
      return {
        error: `无效的实体类型: "${entityTypeStr}"，有效值: ${VALID_ENTITY_TYPES.join(', ')}`
      };
    }
    return { value: entityTypeStr as EntityType };
  }

  /**
   * 验证排序字段
   */
  private static validateSortBy(sortBy: unknown): { value?: typeof VALID_SORT_FIELDS[number]; error?: string } {
    const sortByStr = String(sortBy);
    if (!VALID_SORT_FIELDS.includes(sortByStr as typeof VALID_SORT_FIELDS[number])) {
      return {
        error: `无效的排序字段: "${sortByStr}"，有效值: ${VALID_SORT_FIELDS.join(', ')}`
      };
    }
    return { value: sortByStr as typeof VALID_SORT_FIELDS[number] };
  }

  /**
   * 验证排序方向
   */
  private static validateSortOrder(sortOrder: unknown): { value?: typeof VALID_SORT_ORDERS[number]; error?: string } {
    const sortOrderStr = String(sortOrder);
    if (!VALID_SORT_ORDERS.includes(sortOrderStr as typeof VALID_SORT_ORDERS[number])) {
      return {
        error: `无效的排序方向: "${sortOrderStr}"，有效值: ${VALID_SORT_ORDERS.join(', ')}`
      };
    }
    return { value: sortOrderStr as typeof VALID_SORT_ORDERS[number] };
  }

  /**
   * 验证限制数量
   */
  private static validateLimit(limit: unknown): { value?: number; error?: string } {
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : Number(limit);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return {
        error: `limit 必须是 1-1000 之间的数字，当前: ${limit}`
      };
    }

    return { value: limitNum };
  }

  /**
   * 验证分组方式
   */
  private static validateGroupBy(groupBy: unknown): { value?: typeof VALID_GROUP_BY[number]; error?: string } {
    const groupByStr = String(groupBy);
    if (!VALID_GROUP_BY.includes(groupByStr as typeof VALID_GROUP_BY[number])) {
      return {
        error: `无效的分组方式: "${groupByStr}"，有效值: ${VALID_GROUP_BY.join(', ')}`
      };
    }
    return { value: groupByStr as typeof VALID_GROUP_BY[number] };
  }

  /**
   * 验证网格列数
   */
  private static validateCols(cols: unknown): { value?: 1 | 2 | 3 | 4; error?: string } {
    const colsNum = typeof cols === 'string' ? parseInt(cols, 10) : Number(cols);

    if (!VALID_COLS.includes(colsNum as typeof VALID_COLS[number])) {
      return {
        error: `cols 必须是 ${VALID_COLS.join(', ')} 之一，当前: ${cols}`
      };
    }

    return { value: colsNum as 1 | 2 | 3 | 4 };
  }

  /**
   * 验证列表列配置
   */
  private static validateListColumns(columns: unknown): { value?: ListColumnField[]; error?: string } {
    if (!Array.isArray(columns)) {
      return { error: 'listColumns 必须是数组' };
    }

    const validColumns: ListColumnField[] = [];
    const invalidColumns: string[] = [];

    for (const col of columns) {
      const colStr = String(col);
      if (VALID_LIST_COLUMNS.includes(colStr as ListColumnField)) {
        validColumns.push(colStr as ListColumnField);
      } else {
        invalidColumns.push(colStr);
      }
    }

    if (invalidColumns.length > 0) {
      return {
        value: validColumns,
        error: `忽略无效的列表列: ${invalidColumns.join(', ')}`
      };
    }

    return { value: validColumns };
  }

  /**
   * 类型守卫：检查是否是有效的视图模式
   */
  static isViewMode(value: string): value is ViewMode {
    return VALID_VIEW_MODES.includes(value as ViewMode);
  }

  /**
   * 类型守卫：检查是否是有效的实体类型
   */
  static isEntityType(value: string): value is EntityType {
    return VALID_ENTITY_TYPES.includes(value as EntityType);
  }

  /**
   * 类型守卫：检查是否是有效的排序字段
   */
  static isSortField(value: string): value is typeof VALID_SORT_FIELDS[number] {
    return VALID_SORT_FIELDS.includes(value as typeof VALID_SORT_FIELDS[number]);
  }

  /**
   * 类型守卫：检查是否是有效的排序方向
   */
  static isSortOrder(value: string): value is typeof VALID_SORT_ORDERS[number] {
    return VALID_SORT_ORDERS.includes(value as typeof VALID_SORT_ORDERS[number]);
  }

  /**
   * 类型守卫：检查是否是有效的分组方式
   */
  static isGroupBy(value: string): value is typeof VALID_GROUP_BY[number] {
    return VALID_GROUP_BY.includes(value as typeof VALID_GROUP_BY[number]);
  }
}
