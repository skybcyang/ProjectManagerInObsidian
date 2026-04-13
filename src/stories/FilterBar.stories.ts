import type { Meta, StoryObj } from '@storybook/html';

interface FilterBarProps {
  filters: Array<{
    label: string;
    value: string;
    color: string;
    options: string[];
  }>;
}

const createFilterBar = ({ filters }: FilterBarProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view';
  container.style.cssText = 'padding: 20px; background: #1e1e1e;';

  const filterBar = document.createElement('div');
  filterBar.style.cssText = `
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    align-items: center;
    flex-wrap: wrap;
  `;

  filters.forEach((filter) => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative;';

    const badge = document.createElement('button');
    badge.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      background-color: ${filter.color}26;
      color: ${filter.color};
      border: 1px solid ${filter.color}4d;
      transition: all 0.2s ease;
    `;
    badge.textContent = filter.value;

    const arrow = document.createElement('span');
    arrow.textContent = '▼';
    arrow.style.cssText = 'font-size: 10px; opacity: 0.7; margin-left: 2px;';
    badge.appendChild(arrow);

    wrapper.appendChild(badge);
    filterBar.appendChild(wrapper);
  });

  // 添加搜索框
  const searchWrapper = document.createElement('div');
  searchWrapper.style.cssText = 'margin-left: auto; display: flex; align-items: center; gap: 8px;';

  const search = document.createElement('input');
  search.type = 'text';
  search.placeholder = '搜索...';
  search.style.cssText = `
    padding: 4px 12px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 12px;
    background: var(--background-secondary);
    color: var(--text-normal);
    font-size: 13px;
    width: 150px;
  `;

  searchWrapper.appendChild(search);
  filterBar.appendChild(searchWrapper);

  container.appendChild(filterBar);
  return container;
};

const meta: Meta<FilterBarProps> = {
  title: 'Components/FilterBar',
  tags: ['autodocs'],
  render: (args) => createFilterBar(args),
};

export default meta;

type Story = StoryObj<FilterBarProps>;

export const Default: Story = {
  args: {
    filters: [
      { label: '实体类型', value: '📄 特性', color: '#22c55e', options: ['版本', '项目', '特性'] },
      { label: '状态', value: '全部状态', color: '#9ca3af', options: ['待处理', '进行中', '已完成'] },
      { label: '优先级', value: '全部优先级', color: '#9ca3af', options: ['紧急', '高', '中', '低'] },
      { label: '负责人', value: '全部负责人', color: '#8b5cf6', options: ['张三', '李四', '王五'] },
    ],
  },
};

export const WithSelection: Story = {
  args: {
    filters: [
      { label: '实体类型', value: '📄 特性', color: '#22c55e', options: [] },
      { label: '状态', value: '进行中', color: '#f59e0b', options: [] },
      { label: '优先级', value: '高', color: '#f97316', options: [] },
      { label: '负责人', value: '@张三', color: '#8b5cf6', options: [] },
    ],
  },
};

export const Compact: Story = {
  args: {
    filters: [
      { label: '类型', value: '特性', color: '#22c55e', options: [] },
      { label: '状态', value: '进行中', color: '#3b82f6', options: [] },
    ],
  },
};

export const AllEntityTypes: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'pm-view';
    container.style.cssText = 'padding: 20px; background: #1e1e1e; display: flex; flex-direction: column; gap: 16px;';

    const configs = [
      {
        label: '版本视图',
        filters: [
          { label: '实体类型', value: '📁 版本', color: '#6366f1', options: [] },
          { label: '状态', value: '规划中', color: '#8b5cf6', options: [] },
          { label: '负责人', value: '产品组', color: '#8b5cf6', options: [] },
        ],
      },
      {
        label: '项目视图',
        filters: [
          { label: '实体类型', value: '📂 项目', color: '#3b82f6', options: [] },
          { label: '状态', value: '进行中', color: '#f59e0b', options: [] },
          { label: '优先级', value: '高', color: '#f97316', options: [] },
        ],
      },
      {
        label: '特性视图',
        filters: [
          { label: '实体类型', value: '📄 特性', color: '#22c55e', options: [] },
          { label: '状态', value: '测试中', color: '#ec4899', options: [] },
          { label: '优先级', value: '紧急', color: '#ef4444', options: [] },
        ],
      },
    ];

    configs.forEach(({ label, filters }) => {
      const wrap = document.createElement('div');
      const labelEl = document.createElement('div');
      labelEl.textContent = label;
      labelEl.style.cssText = 'margin-bottom: 8px; color: var(--text-muted); font-size: 12px;';
      wrap.appendChild(labelEl);
      wrap.appendChild(createFilterBar({ filters }));
      container.appendChild(wrap);
    });

    return container;
  },
};
