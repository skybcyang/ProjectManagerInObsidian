/**
 * 生成短 UUID（8位）
 * @returns 8位随机字符串
 */
export function generateId(): string {
  return Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
}
