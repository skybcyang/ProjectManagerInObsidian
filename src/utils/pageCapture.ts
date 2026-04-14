import { App, MarkdownView, Notice } from 'obsidian';

export interface CapturedPage {
  html: string;
  plain: string;
  title: string;
}

const INTERACTIVE_SELECTORS = [
  '.pm-btn',
  '.pm-progress-input',
  '.pm-filter-container',
  '.copy-code-button',
  '.edit-block-button',
  '.metadata-container',
  '.metadata-properties-heading',
  '.metadata-add-button',
  '.metadata-properties',
  '.inline-title',
  '.outline',
  '.embedded-backlinks',
  '.collapse-icon',
  '.collapse-indicator',
  '.heading-collapse-indicator',
  'button',
  'input',
  'select',
  'textarea',
  'script',
  'style',
].join(', ');

const BLOCK_TAGS = new Set([
  'DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'TR', 'SECTION', 'ARTICLE', 'BLOCKQUOTE', 'PRE',
]);

const EMAIL_RELEVANT_STYLES = [
  'color',
  'background-color',
  'background',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'text-align',
  'border',
  'border-radius',
  'padding',
  'margin',
  'display',
  'flex-direction',
  'align-items',
  'justify-content',
  'gap',
  'width',
  'height',
  'min-width',
  'min-height',
  'box-shadow',
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'overflow',
  'white-space',
  'text-decoration',
  'vertical-align',
];

export async function captureRenderedPage(app: App): Promise<CapturedPage | null> {
  try {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      new Notice('请先在 Markdown 预览模式下打开一个页面');
      return null;
    }

    if (view.getMode() !== 'preview') {
      new Notice('请切换到阅读视图（Reading view）后再导出邮件');
      return null;
    }

    let previewEl: HTMLElement | null = null;
    try {
      previewEl = (view as any).previewMode?.containerEl as HTMLElement;
    } catch {
      previewEl = null;
    }

    if (!previewEl || isEmptyPreview(previewEl)) {
      previewEl = view.containerEl.querySelector('.markdown-preview-view, .markdown-reading-view') as HTMLElement;
    }

    if (!previewEl || isEmptyPreview(previewEl)) {
      new Notice('当前页面内容为空或尚未渲染完成，请稍后重试');
      return null;
    }

    const clone = previewEl.cloneNode(true) as HTMLElement;

    // 1. 对 .pm-view 树内联样式
    const pmViewRoots = clone.querySelectorAll('.pm-view');
    const originalPmViewRoots = previewEl.querySelectorAll('.pm-view');
    pmViewRoots.forEach((clonedRoot, index) => {
      const originalRoot = originalPmViewRoots[index];
      if (originalRoot) {
        inlineStyles(clonedRoot as HTMLElement, originalRoot as HTMLElement);
      }
    });

    // 2. 移除交互元素和 Obsidian UI
    clone.querySelectorAll(INTERACTIVE_SELECTORS).forEach(el => el.remove());

    // 3. 清理多列原始标记
    cleanMultiColumnArtifacts(clone);

    // 4. 检查内容
    const textContent = clone.textContent?.trim() || '';
    if (textContent.length < 10) {
      new Notice('当前页面内容为空或尚未渲染完成，请稍后重试');
      return null;
    }

    // 5. 获取样式
    const [pluginStyles, cssVars] = await Promise.all([
      fetchPluginStyles(),
      captureCssVariables(),
    ]);

    // 6. 包装成完整 HTML 文档
    const title = view.file?.basename || '导出邮件';
    const html = buildHtmlDocument(title, clone.innerHTML, pluginStyles, cssVars);
    const plain = domToPlainText(clone);

    return { html, plain, title };
  } catch (error) {
    console.error('captureRenderedPage error:', error);
    new Notice('页面捕获失败: ' + (error as Error).message);
    return null;
  }
}

function isEmptyPreview(el: HTMLElement): boolean {
  const text = (el.textContent || '').trim();
  return text.length < 10;
}

function inlineStyles(cloned: HTMLElement, original: HTMLElement): void {
  const clonedNodes = cloned.querySelectorAll('*');
  const originalNodes = original.querySelectorAll('*');
  const pairs: [HTMLElement, HTMLElement][] = [[cloned, original]];

  clonedNodes.forEach((c, i) => {
    const o = originalNodes[i];
    if (o && c instanceof HTMLElement && o instanceof HTMLElement) {
      pairs.push([c, o]);
    }
  });

  pairs.forEach(([c, o]) => {
    const computed = window.getComputedStyle(o);
    const inline: string[] = [];
    const existingStyle = c.getAttribute('style') || '';

    for (const prop of EMAIL_RELEVANT_STYLES) {
      const value = computed.getPropertyValue(prop);
      if (!value) continue;
      if (['initial', 'normal', 'auto', '0px', 'rgba(0, 0, 0, 0)', 'transparent'].includes(value)) continue;
      if (existingStyle.toLowerCase().includes(prop.toLowerCase() + ':')) continue;
      inline.push(`${prop}: ${value}`);
    }

    if (inline.length > 0) {
      c.setAttribute('style', existingStyle ? `${existingStyle}; ${inline.join('; ')}` : inline.join('; '));
    }
  });
}

function cleanMultiColumnArtifacts(root: HTMLElement): void {
  const toRemove: Element[] = [];

  // 移除 multi-column 标记文本
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (/---\s*(start-multi-column|column-break|end-multi-column)/.test(node.textContent || '')) {
      let el: Element | null = node.parentElement;
      while (el && !['DIV', 'P', 'PRE', 'LI', 'BLOCKQUOTE', 'SECTION'].includes(el.tagName)) {
        el = el.parentElement;
      }
      if (el) toRemove.push(el);
    }
  }

  // 移除 multi-column 配置文本
  root.querySelectorAll('*').forEach(el => {
    if (el.children.length === 0) {
      const text = el.textContent || '';
      if (/^(Number of Columns|Largest Column|Border):\s*/m.test(text)) {
        let parent: Element | null = el;
        while (parent && !['DIV', 'P', 'LI', 'BLOCKQUOTE', 'SECTION'].includes(parent.tagName)) {
          parent = parent.parentElement;
        }
        if (parent) toRemove.push(parent);
      }
    }
  });

  toRemove.forEach(el => {
    if (el.isConnected) el.remove();
  });
}

async function fetchPluginStyles(): Promise<string> {
  try {
    // Obsidian 通常将插件 CSS 直接以 <style> 标签注入 head
    const styleTags = Array.from(document.querySelectorAll('style'));
    for (const tag of styleTags) {
      const text = tag.textContent || '';
      if (text.includes('.pm-view') || text.includes('pm-kanban') || text.includes('pm-list') || text.includes('pm-grid')) {
        return text;
      }
    }
    // fallback: 尝试从 link 标签拉取
    const link = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .find((l: any) => l.href?.includes('styles.css') || l.href?.includes('project-manager')) as HTMLLinkElement | undefined;
    if (link && link.href) {
      const res = await fetch(link.href);
      if (res.ok) return await res.text();
    }
  } catch {
    // ignore
  }
  return '';
}

function captureCssVariables(): string {
  const vars = new Map<string, string>();

  // 从所有可访问的 styleSheets 收集变量声明
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSStyleRule) {
          const selectors = rule.selectorText?.split(',').map(s => s.trim()) || [];
          if (selectors.some(s => s === ':root' || s === 'html' || s.includes('.pm-view'))) {
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop.startsWith('--')) {
                vars.set(prop, rule.style.getPropertyValue(prop).trim());
              }
            }
          }
        }
      }
    } catch {
      // 跨域 stylesheet 无法读取 cssRules
    }
  }

  // 从 document.documentElement 的内联样式获取
  const inline = document.documentElement.style;
  for (let i = 0; i < inline.length; i++) {
    const prop = inline[i];
    if (prop.startsWith('--')) {
      vars.set(prop, inline.getPropertyValue(prop).trim());
    }
  }

  // 从计算样式获取（兜底）
  const computed = getComputedStyle(document.documentElement);
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    if (prop.startsWith('--')) {
      vars.set(prop, computed.getPropertyValue(prop).trim());
    }
  }

  const entries = Array.from(vars.entries()).filter(([, v]) => v);
  if (entries.length === 0) return '';
  return `:root {\n${entries.map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`;
}

function buildHtmlDocument(title: string, body: string, pluginStyles: string, cssVars: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
/* CSS 变量快照 */
${cssVars}

/* 插件样式 */
${pluginStyles}

/* 邮件兼容性修复 */
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif; line-height: 1.6; color: #333; }
table { border-collapse: collapse; width: 100%; }
td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
img { max-width: 100%; height: auto; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function domToPlainText(element: HTMLElement): string {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (['script', 'style', 'button', 'input', 'select', 'textarea', 'noscript'].includes(tag)) continue;

      const isBlock = BLOCK_TAGS.has(el.tagName);
      if (isBlock && text && !text.endsWith('\n')) text += '\n';
      text += domToPlainText(el);
      if (isBlock && !text.endsWith('\n')) text += '\n';
      if (tag === 'td' || tag === 'th') text += '\t';
      if (tag === 'br') text += '\n';
    }
  }
  return text;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
