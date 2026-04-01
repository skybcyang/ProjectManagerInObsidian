import { App, TFile, Vault } from 'obsidian';

export class FileManager {
  constructor(private app: App) {}

  get vault(): Vault {
    return this.app.vault;
  }

  /**
   * 确保文件夹存在
   */
  async ensureFolder(path: string): Promise<void> {
    const folder = this.vault.getAbstractFileByPath(path);
    if (!folder) {
      await this.vault.createFolder(path);
    }
  }

  /**
   * 读取 Markdown 文件的 frontmatter 和正文
   */
  async readFile(path: string): Promise<{ frontmatter: Record<string, unknown>; content: string } | null> {
    const file = this.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      return null;
    }

    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter ?? {};
    const rawContent = await this.vault.cachedRead(file);
    // 去除 frontmatter，只保留正文
    const content = this.stripFrontmatter(rawContent);
    return { frontmatter, content };
  }

  /**
   * 写入 Markdown 文件
   */
  async writeFile(path: string, frontmatter: object, content: string): Promise<void> {
    const yaml = this.stringifyFrontmatter(frontmatter);
    const fullContent = `---\n${yaml}---\n\n${content}`;

    const existingFile = this.vault.getAbstractFileByPath(path);
    if (existingFile instanceof TFile) {
      await this.vault.modify(existingFile, fullContent);
    } else {
      await this.vault.create(path, fullContent);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(path: string): Promise<void> {
    const file = this.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.vault.delete(file);
    }
  }

  /**
   * 列出文件夹下所有 Markdown 文件
   */
  listMarkdownFiles(folder: string): TFile[] {
    const files = this.vault.getMarkdownFiles();
    return files.filter(f => f.path.startsWith(folder + '/'));
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
  private stringifyFrontmatter(frontmatter: object): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(frontmatter as Record<string, unknown>)) {
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
