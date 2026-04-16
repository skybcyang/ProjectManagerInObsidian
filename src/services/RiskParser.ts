import type { RiskItem, ProgressLogItem, RiskSummary, EntityLogSummary, RiskLevel } from '../types';

export class RiskParser {
  /**
   * 从文件内容中解析风险表格
   */
  parseRisks(content: string): RiskItem[] {
    const section = this.extractSection(content, '## ⚠️ 风险跟踪');
    if (!section) return [];

    const rows = this.parseTableRows(section).filter(
      (cells) => cells[0] !== '风险类型'
    );
    return rows.map((cells) => ({
      sourceName: '',
      sourceType: 'feature' as const,
      type: cells[0] || '',
      description: cells[1] || '',
      level: this.parseRiskLevel(cells[2]),
      owner: cells[3] || '',
      foundDate: cells[4] || '',
      closeDate: cells[5] || undefined,
      status: cells[6] || '',
    }));
  }

  /**
   * 从文件内容中解析进展反馈表格
   */
  parseProgressLogs(content: string): ProgressLogItem[] {
    const section = this.extractSection(content, '## 📈 进展反馈');
    if (!section) return [];

    const rows = this.parseTableRows(section).filter(
      (cells) => cells[0] !== '时间'
    );
    return rows.map((cells) => ({
      time: cells[0] || '',
      content: cells[1] || '',
      author: cells[2] || undefined,
    }));
  }

  /**
   * 计算风险摘要
   */
  calculateRiskSummary(risks: RiskItem[]): RiskSummary {
    const summary: RiskSummary = { total: 0, open: 0, high: 0, medium: 0, low: 0 };
    for (const risk of risks) {
      summary.total++;
      if (risk.status !== '已闭环') summary.open++;
      if (risk.level === 'high') summary.high++;
      else if (risk.level === 'medium') summary.medium++;
      else if (risk.level === 'low') summary.low++;
    }
    return summary;
  }

  /**
   * 解析单个文件的日志摘要
   */
  parseLogSummary(content: string): EntityLogSummary {
    const progressLogs = this.parseProgressLogs(content);
    const risks = this.parseRisks(content);
    return {
      latestProgress: progressLogs.length > 0 ? progressLogs[progressLogs.length - 1].content : undefined,
      riskSummary: this.calculateRiskSummary(risks),
    };
  }

  /**
   * 提取指定章节内容
   */
  private extractSection(content: string, header: string): string | null {
    const index = content.indexOf(header);
    if (index === -1) return null;

    const afterHeader = content.slice(index + header.length);
    const nextHeaderIndex = afterHeader.search(/\n## /);
    return nextHeaderIndex === -1 ? afterHeader : afterHeader.slice(0, nextHeaderIndex);
  }

  /**
   * 解析 Markdown 表格行
   */
  private parseTableRows(section: string): string[][] {
    const lines = section.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
    const rows: string[][] = [];

    for (const line of lines) {
      // 跳过分隔行 |---|---|
      if (line.replace(/\|/g, '').replace(/[-:\s]/g, '') === '') continue;

      const cells = line
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim())
        .filter((_, i, arr) => i < arr.length); // 安全处理

      if (cells.length >= 3) {
        rows.push(cells);
      }
    }

    return rows;
  }

  private parseRiskLevel(level: string): RiskLevel {
    const normalized = level.trim().toLowerCase();
    if (normalized === '高' || normalized === 'high') return 'high';
    if (normalized === '中' || normalized === 'medium') return 'medium';
    return 'low';
  }
}
