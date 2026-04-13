import type { Preview } from '@storybook/html';
import '../styles.css';

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