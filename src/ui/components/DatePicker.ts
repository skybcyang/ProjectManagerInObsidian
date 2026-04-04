import { Setting } from 'obsidian';

export interface DatePickerOptions {
  placeholder?: string;
  value?: string;
  onChange: (value: string | undefined) => void;
}

/**
 * 日期选择器组件
 * 使用 HTML5 date input，添加 Obsidian 风格样式
 */
export function createDatePicker(
  setting: Setting,
  options: DatePickerOptions
): void {
  const { placeholder = '选择日期', value, onChange } = options;

  setting.addMomentFormat(format => {
    format
      .setPlaceholder(placeholder)
      .setValue(value || '')
      .setDefaultFormat('YYYY-MM-DD')
      .onChange((value: string) => {
        onChange(value || undefined);
      });
  });
}

/**
 * 创建快捷日期按钮
 * 今天、明天、一周后
 */
export function createQuickDateButtons(
  container: HTMLElement,
  onSelect: (date: string) => void
): void {
  const quickButtons = container.createDiv({ cls: 'pm-date-picker__quick' });
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const buttons = [
    { label: '今天', date: formatDate(today) },
    { label: '明天', date: formatDate(tomorrow) },
    { label: '一周后', date: formatDate(nextWeek) },
  ];

  buttons.forEach(({ label, date }) => {
    const btn = quickButtons.createEl('button', {
      text: label,
      cls: 'pm-date-picker__quick-btn',
    });
    btn.addEventListener('click', () => onSelect(date));
  });
}

/**
 * 格式化日期显示
 */
export function formatDateDisplay(dateStr: string | undefined): string {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return `${dateStr} (今天)`;
  if (diffDays === 1) return `${dateStr} (明天)`;
  if (diffDays === -1) return `${dateStr} (昨天)`;
  if (diffDays > 0 && diffDays <= 7) return `${dateStr} (${diffDays}天后)`;
  if (diffDays < 0 && diffDays >= -7) return `${dateStr} (${Math.abs(diffDays)}天前)`;
  
  return dateStr;
}

/**
 * 获取相对日期描述
 */
export function getRelativeDateDesc(dateStr: string | undefined): string {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return '已延期';
  if (diffDays === 0) return '今天截止';
  if (diffDays <= 3) return '即将到期';
  return '';
}
