import { App, TFile } from 'obsidian';
import type { RiskItem, ProgressLogItem } from '../types';

export class LogWriterService {
  constructor(private app: App) {}

  /**
   * 在指定文件的风险跟踪表格中追加一行
   */
  async appendRisk(path: string, risk: Omit<RiskItem, 'sourceName' | 'sourceType'>): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;

    let content = await this.app.vault.read(file);
    const riskRow = `| ${risk.type} | ${risk.description} | ${this.formatRiskLevel(risk.level)} | ${risk.owner} | ${risk.foundDate} | ${risk.closeDate || ''} | ${risk.status} |`;

    if (!content.includes('## ⚠️ 风险跟踪')) {
      content += '\n\n## ⚠️ 风险跟踪\n\n' +
        '| 风险类型 | 风险描述 | 风险等级 | 责任人 | 发现时间 | 闭环时间 | 状态 |\n' +
        '|---------|---------|---------|--------|----------|----------|------|\n' +
        riskRow;
    } else {
      const sectionIndex = content.indexOf('## ⚠️ 风险跟踪');
      const afterSection = content.slice(sectionIndex);
      const lines = afterSection.split('\n');

      let insertIndex = sectionIndex;
      for (let i = 0; i < lines.length; i++) {
        insertIndex += lines[i].length + 1;
        if (lines[i].startsWith('|') && !lines[i].includes('---')) {
          // 找到最后一行表格数据
          if (i + 1 >= lines.length || !lines[i + 1].trim().startsWith('|')) {
            insertIndex -= 1; // 调整换行
            break;
          }
        }
      }

      content = content.slice(0, insertIndex) + '\n' + riskRow + content.slice(insertIndex);
    }

    await this.app.vault.modify(file, content);
  }

  /**
   * 在指定文件的进展反馈表格中追加一行
   */
  async appendProgressLog(path: string, log: ProgressLogItem): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;

    let content = await this.app.vault.read(file);
    const logRow = `| ${log.time} | ${log.content} | ${log.author || ''} |`;

    if (!content.includes('## 📈 进展反馈')) {
      content += '\n\n## 📈 进展反馈\n\n' +
        '| 时间 | 反馈内容 | 记录人 |\n' +
        '|------|---------|--------|\n' +
        logRow;
    } else {
      const sectionIndex = content.indexOf('## 📈 进展反馈');
      const afterSection = content.slice(sectionIndex);
      const lines = afterSection.split('\n');

      let insertIndex = sectionIndex;
      for (let i = 0; i < lines.length; i++) {
        insertIndex += lines[i].length + 1;
        if (lines[i].startsWith('|') && !lines[i].includes('---')) {
          if (i + 1 >= lines.length || !lines[i + 1].trim().startsWith('|')) {
            insertIndex -= 1;
            break;
          }
        }
      }

      content = content.slice(0, insertIndex) + '\n' + logRow + content.slice(insertIndex);
    }

    await this.app.vault.modify(file, content);
  }

  private formatRiskLevel(level: string): string {
    const map: Record<string, string> = {
      high: '高',
      medium: '中',
      low: '低',
    };
    return map[level] || level;
  }
}
