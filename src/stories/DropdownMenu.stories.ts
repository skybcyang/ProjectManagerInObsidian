import type { Meta, StoryObj } from '@storybook/html';

interface DropdownMenuProps {
  items: Array<{ label: string; icon?: string; danger?: boolean }>;
  triggerText: string;
}

const createDropdownMenuDemo = ({ items, triggerText }: DropdownMenuProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view';
  container.style.cssText = 'padding: 40px; background: #1e1e1e; min-height: 100vh;';

  // Trigger button
  const trigger = document.createElement('button');
  trigger.textContent = triggerText;
  trigger.style.cssText = `
    padding: 8px 16px;
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  trigger.innerHTML = `${triggerText} <span style="font-size: 10px;">▼</span>`;

  trigger.onclick = () => {
    // Remove existing dropdown
    const existing = document.querySelector('.pm-dropdown-menu');
    if (existing) {
      existing.remove();
      return;
    }

    // Create dropdown
    const menu = document.createElement('div');
    menu.className = 'pm-dropdown-menu';
    const rect = trigger.getBoundingClientRect();
    menu.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 4}px;
      left: ${rect.left}px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 4px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 180px;
    `;

    items.forEach((item, index) => {
      const menuItem = document.createElement('div');
      menuItem.className = 'pm-dropdown-item';
      menuItem.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        color: ${item.danger ? '#ef4444' : 'var(--text-normal)'};
      `;
      menuItem.innerHTML = `
        ${item.icon ? `<span style="width: 16px; text-align: center;">${item.icon}</span>` : '<span style="width: 16px;"></span>'}
        <span>${item.label}</span>
      `;
      menuItem.onmouseenter = () => {
        menuItem.style.background = 'var(--background-modifier-hover)';
      };
      menuItem.onmouseleave = () => {
        menuItem.style.background = '';
      };
      menuItem.onclick = () => {
        menu.remove();
      };
      menu.appendChild(menuItem);

      // Add divider after certain items if needed
      if (index === items.length - 2 && items.length > 2) {
        const divider = document.createElement('div');
        divider.style.cssText = 'height: 1px; background: var(--background-modifier-border); margin: 4px 0;';
        menu.appendChild(divider);
      }
    });

    document.body.appendChild(menu);

    // Close on outside click
    setTimeout(() => {
      const closeHandler = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
          menu.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 0);

    // Close on escape
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        menu.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  };

  container.appendChild(trigger);

  // Multiple dropdown examples
  const examplesTitle = document.createElement('div');
  examplesTitle.textContent = '更多下拉菜单样式：';
  examplesTitle.style.cssText = 'margin-top: 40px; margin-bottom: 16px; color: var(--text-muted); font-size: 13px;';
  container.appendChild(examplesTitle);

  const examplesRow = document.createElement('div');
  examplesRow.style.cssText = 'display: flex; gap: 16px; flex-wrap: wrap;';

  // Example 1: Filter dropdown
  const filterBtn = document.createElement('button');
  filterBtn.textContent = '筛选 ▼';
  filterBtn.style.cssText = `
    padding: 6px 12px;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
  `;
  examplesRow.appendChild(filterBtn);

  // Example 2: Sort dropdown
  const sortBtn = document.createElement('button');
  sortBtn.textContent = '排序 ▼';
  sortBtn.style.cssText = `
    padding: 6px 12px;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
  `;
  examplesRow.appendChild(sortBtn);

  // Example 3: More actions
  const moreBtn = document.createElement('button');
  moreBtn.textContent = '更多 ▼';
  moreBtn.style.cssText = `
    padding: 6px 12px;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
  `;
  examplesRow.appendChild(moreBtn);

  container.appendChild(examplesRow);

  // Info text
  const info = document.createElement('div');
  info.textContent = '点击按钮查看下拉菜单效果。支持点击外部关闭、ESC键关闭。';
  info.style.cssText = 'margin-top: 40px; padding: 12px 16px; background: var(--background-secondary); border-radius: 6px; font-size: 12px; color: var(--text-muted);';
  container.appendChild(info);

  return container;
};

const meta: Meta<DropdownMenuProps> = {
  title: 'Components/DropdownMenu',
  tags: ['autodocs'],
  render: (args) => createDropdownMenuDemo(args),
};

export default meta;

type Story = StoryObj<DropdownMenuProps>;

export const Default: Story = {
  args: {
    triggerText: '操作',
    items: [
      { label: '编辑', icon: '✏️' },
      { label: '复制', icon: '📋' },
      { label: '分享', icon: '🔗' },
      { label: '删除', icon: '🗑️', danger: true },
    ],
  },
};

export const FilterMenu: Story = {
  args: {
    triggerText: '筛选',
    items: [
      { label: '全部' },
      { label: '进行中' },
      { label: '已完成' },
      { label: '已归档' },
    ],
  },
};

export const SortMenu: Story = {
  args: {
    triggerText: '排序',
    items: [
      { label: '按名称' },
      { label: '按状态' },
      { label: '按优先级' },
      { label: '按截止日期' },
    ],
  },
};

export const LongMenu: Story = {
  args: {
    triggerText: '更多',
    items: [
      { label: '查看详情', icon: '👁️' },
      { label: '编辑', icon: '✏️' },
      { label: '复制链接', icon: '🔗' },
      { label: '导出', icon: '📤' },
      { label: '打印', icon: '🖨️' },
      { label: '重命名', icon: '📝' },
      { label: '移动', icon: '📁' },
      { label: '删除', icon: '🗑️', danger: true },
    ],
  },
};
