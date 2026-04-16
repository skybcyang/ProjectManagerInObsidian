// UI Components
export { Breadcrumb } from './components/Breadcrumb';
export { Button, ButtonContainer } from './components/Button';
export { ProgressInput, ProgressInputContainer } from './components/ProgressInput';
export { formatDateDisplay, getRelativeDateDesc } from './components/DatePicker';

// 旧代码块配置类型（兼容层，内部映射到 ViewEngine）
export interface KanbanConfig {
  view?: 'all' | 'by-version' | 'by-project';
  version?: string;
  project?: string;
  owner?: string;
  tag?: string;
  cardStyle?: 'default' | 'compact';
  columns?: number;
}

export interface SingleCardConfig {
  id: string;
  expanded?: boolean;
  maxProjects?: number;
  maxFeaturesPerProject?: number;
}

export interface EntitySelectorConfig {
  type: 'version' | 'project';
  defaultId?: string;
}
