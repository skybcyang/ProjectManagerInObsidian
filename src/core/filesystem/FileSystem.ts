import { App, TFile, TAbstractFile } from 'obsidian';

export interface FileData {
  frontmatter: Record<string, unknown>;
  content: string;
}

/**
 * 底层文件系统操作类
 * 负责所有 Markdown 文件的读写、查询和路径管理
 */
export class FileSystem {
  constructor(private app: App) {}

  /**
   * 读取 Markdown 文件的 frontmatter 和正文
   */
  async readFile(path: string): Promise<FileData | null> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      return null;
    }

    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter ?? {};
    const rawContent = await this.app.vault.cachedRead(file);
    const content = this.stripFrontmatter(rawContent);
    
    return { frontmatter, content };
  }

  /**
   * 写入 Markdown 文件
   */
  async writeFile(path: string, frontmatter: Record<string, unknown>, content: string): Promise<void> {
    const yaml = this.stringifyFrontmatter(frontmatter);
    const fullContent = `---\n${yaml}---\n\n${content}`;

    const existingFile = this.app.vault.getAbstractFileByPath(path);
    if (existingFile instanceof TFile) {
      await this.app.vault.modify(existingFile, fullContent);
    } else {
      await this.app.vault.create(path, fullContent);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.app.vault.delete(file);
    }
  }

  /**
   * 移动/重命名文件
   */
  async moveFile(oldPath: string, newPath: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(oldPath);
    if (file instanceof TFile) {
      await this.app.vault.rename(file, newPath);
    }
  }

  /**
   * 列出文件夹下所有 Markdown 文件
   */
  listFiles(folder: string): TFile[] {
    const files = this.app.vault.getMarkdownFiles();
    return files.filter(f => f.path.startsWith(folder + '/'));
  }

  /**
   * 根据 ID 查找文件
   */
  findById(folder: string, id: string): TFile | null {
    const files = this.listFiles(folder);
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter?.id === id) {
        return file;
      }
    }
    return null;
  }

  /**
   * 确保文件夹存在
   */
  async ensureFolder(path: string): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(path);
    if (!folder) {
      await this.app.vault.createFolder(path);
    }
  }

  /**
   * 确保路径唯一（处理同名文件）
   */
  async ensureUniquePath(path: string): Promise<string> {
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (!existing) return path;
    
    const base = path.replace(/\.md$/, '');
    let i = 1;
    while (true) {
      const newPath = `${base} (${i}).md`;
      if (!this.app.vault.getAbstractFileByPath(newPath)) return newPath;
      i++;
    }
  }

  /**
   * 清理文件名中的非法字符
   */
  sanitizeFileName(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '-');
  }

  /**
   * 检查文件是否存在
   */
  exists(path: string): boolean {
    return this.app.vault.getAbstractFileByPath(path) !== null;
  }

  /**
   * 去除文件内容中的 frontmatter，返回正文
   */
  private stripFrontmatter(content: string): string {
    const match = content.match(/^---\n[\s\S]*?\n---\n?/);
    if (match) {
      return content.slice(match[0].length).trimStart();
    }
    return content;
  }

  /**
   * 将 frontmatter 对象序列化为 YAML 字符串
   */
  private stringifyFrontmatter(frontmatter: Record<string, unknown>): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(frontmatter)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        if (value.length === 0) {
          lines.push(`${key}: []`);
        } else {
          lines.push(`${key}:`);
          for (const item of value) {
            lines.push(`  - ${item}`);
          }
        }
      } else if (typeof value === 'string' && value.includes('\n')) {
        lines.push(`${key}: |`);
        for (const line of value.split('\n')) {
          lines.push(`  ${line}`);
        }
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    return lines.join('\n') + '\n';
  }
}
