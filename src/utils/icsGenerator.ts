import type { Feature } from '../types';

/**
 * 生成 .ics 文件内容
 * @param features - 特性列表
 * @param projectName - 项目名称（可选）
 * @returns .ics 格式的字符串
 */
export function generateICS(features: Feature[], projectName?: string): string {
  const now = new Date();
  const timestamp = formatDateTime(now);
  const uid = generateUID();
  
  const events: string[] = [];
  
  for (const feature of features) {
    if (feature.dueDate) {
      events.push(generateEvent(feature, timestamp, uid));
    }
  }
  
  const calendarName = projectName ? `${projectName} - 项目管理` : '项目管理';
  
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Obsidian Project Manager//EN',
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * 生成单个事件
 */
function generateEvent(feature: Feature, timestamp: string, uid: string): string {
  const dueDate = new Date(feature.dueDate!);
  const endDate = new Date(dueDate);
  endDate.setDate(endDate.getDate() + 1); // 全天事件结束日期为次日
  
  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${feature.id}@${uid}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART;VALUE=DATE:${formatDate(dueDate)}`,
    `DTEND;VALUE=DATE:${formatDate(endDate)}`,
    `SUMMARY:${escapeICS(feature.name)}`,
  ];
  
  if (feature.owner) {
    lines.push(`DESCRIPTION:${escapeICS(`负责人: ${feature.owner}`)}`);
  }
  
  lines.push('STATUS:CONFIRMED');
  lines.push('END:VEVENT');
  
  return lines.join('\r\n');
}

/**
 * 格式化日期为 YYYYMMDD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 格式化日期时间为 ICS 格式
 */
function formatDateTime(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * 生成唯一标识符
 */
function generateUID(): string {
  return `obsidian-pm-${Date.now()}`;
}

/**
 * 转义 ICS 特殊字符
 */
function escapeICS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * 下载 ICS 文件
 */
export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
