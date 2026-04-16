import type { Preview } from '@storybook/html';
import '../styles.css';

// Polyfill Obsidian DOM helpers for Storybook
if (!('createDiv' in HTMLElement.prototype)) {
  (HTMLElement.prototype as any).createDiv = function (cls?: string): HTMLElement {
    const el = document.createElement('div');
    if (cls) el.className = cls;
    this.appendChild(el);
    return el;
  };
}

if (!('createSpan' in HTMLElement.prototype)) {
  (HTMLElement.prototype as any).createSpan = function (
    options?: string | { cls?: string; text?: string }
  ): HTMLElement {
    const el = document.createElement('span');
    if (typeof options === 'string') {
      el.className = options;
    } else if (options) {
      if (options.cls) el.className = options.cls;
      if (options.text) el.textContent = options.text;
    }
    this.appendChild(el);
    return el;
  };
}

if (!('createEl' in HTMLElement.prototype)) {
  (HTMLElement.prototype as any).createEl = function (
    tag: string,
    options?: { cls?: string; text?: string; attr?: Record<string, string>; title?: string }
  ): HTMLElement {
    const el = document.createElement(tag);
    if (options) {
      if (options.cls) el.className = options.cls;
      if (options.text) el.textContent = options.text;
      if (options.title) el.title = options.title;
      if (options.attr) {
        Object.entries(options.attr).forEach(([k, v]) => el.setAttribute(k, v));
      }
    }
    this.appendChild(el);
    return el;
  };
}

if (!('addClass' in HTMLElement.prototype)) {
  (HTMLElement.prototype as any).addClass = function (...classes: string[]) {
    classes.forEach((c) => this.classList.add(c));
  };
}

if (!('removeClass' in HTMLElement.prototype)) {
  (HTMLElement.prototype as any).removeClass = function (...classes: string[]) {
    classes.forEach((c) => this.classList.remove(c));
  };
}

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#1e1e1e',
        },
        {
          name: 'light',
          value: '#f5f5f5',
        },
      ],
    },
    layout: 'fullscreen',
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'dark',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
        ],
        showName: true,
      },
    },
  },
  decorators: [
    (storyFn, context) => {
      const theme = context.globals.theme || 'dark';
      const story = storyFn();

      // If story is an HTMLElement, apply theme class
      if (story instanceof HTMLElement) {
        story.style.background = theme === 'dark' ? '#1e1e1e' : '#f5f5f5';
      }

      return story;
    },
  ],
};

export default preview;