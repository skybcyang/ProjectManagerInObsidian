export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskItem {
  sourceName: string;
  sourceType: 'version' | 'project' | 'feature';
  sourcePath?: string;
  type: string;
  description: string;
  level: RiskLevel;
  owner: string;
  foundDate: string;
  closeDate?: string;
  status: string;
}

export interface ProgressLogItem {
  time: string;
  content: string;
  author?: string;
}

export interface RiskSummary {
  total: number;
  open: number;
  high: number;
  medium: number;
  low: number;
}

export interface EntityLogSummary {
  latestProgress?: string;
  riskSummary: RiskSummary;
}
