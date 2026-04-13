import type { Meta, StoryObj } from '@storybook/html';

interface ProgressPickerProps {
  currentProgress: number;
}

const createProgressPickerDemo = ({ currentProgress }: ProgressPickerProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view';
  container.style.cssText = 'padding: 40px; background: #1e1e1e; min-height: 100vh;';

  // Demo section
  const demoSection = document.createElement('div');
  demoSection.style.cssText = 'margin-bottom: 40px;';

  const label = document.createElement('div');
  label.textContent = '点击按钮选择进度：';
  label.style.cssText = 'margin-bottom: 16px; color: var(--text-muted); font-size: 13px;';
  demoSection.appendChild(label);

  // Trigger button showing current progress
  const trigger = document.createElement('button');
  trigger.className = 'pm-progress-trigger';
  trigger.style.cssText = `
    padding: 8px 16px;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 10px;
  `;

  const updateTriggerDisplay = (progress: number) => {
    trigger.innerHTML = `
      <div style="width: 60px; height: 6px; background: var(--background-modifier-border); border-radius: 3px; overflow: hidden;">
        <div style="width: ${progress}%; height: 100%; background: var(--interactive-accent);"></div>
      </div>
      <span style="font-weight: 600;">${progress}%</span>
    `;
  };
  updateTriggerDisplay(currentProgress);

  trigger.onclick = () => {
    // Remove existing picker
    const existing = document.querySelector('.pm-progress-picker');
    if (existing) existing.remove();

    // Create picker
    const menu = document.createElement('div');
    menu.className = 'pm-progress-picker';
    const rect = trigger.getBoundingClientRect();
    menu.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 4}px;
      left: ${rect.left}px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      padding: 12px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 180px;
    `;

    // Title
    const title = document.createElement('div');
    title.textContent = '更新进度';
    title.style.cssText = 'font-size: 12px; color: var(--text-muted); margin-bottom: 10px; font-weight: 500;';
    menu.appendChild(title);

    // Slider container
    const sliderContainer = document.createElement('div');
    sliderContainer.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;';

    let currentValue = currentProgress;

    // Slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(currentProgress);
    slider.style.cssText = `
      flex: 1;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: var(--background-modifier-border);
      border-radius: 2px;
      outline: none;
    `;

    // Value display
    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = `${currentProgress}%`;
    valueDisplay.style.cssText = 'min-width: 40px; text-align: right; font-size: 13px; font-weight: 500; color: var(--text-normal);';

    slider.oninput = () => {
      currentValue = parseInt(slider.value);
      valueDisplay.textContent = `${currentValue}%`;
    };

    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(valueDisplay);
    menu.appendChild(sliderContainer);

    // Quick buttons
    const quickBtnsContainer = document.createElement('div');
    quickBtnsContainer.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--background-modifier-border);';

    [0, 25, 50, 75, 100].forEach(value => {
      const btn = document.createElement('button');
      btn.textContent = `${value}%`;
      const isSelected = value === currentProgress;
      btn.style.cssText = `
        padding: 4px 10px;
        font-size: 11px;
        border: 1px solid ${isSelected ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'};
        background: ${isSelected ? 'var(--interactive-accent)' : 'var(--background-secondary)'};
        color: ${isSelected ? 'var(--text-on-accent)' : 'var(--text-normal)'};
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s;
      `;
      btn.onclick = (e) => {
        e.stopPropagation();
        currentValue = value;
        slider.value = String(value);
        valueDisplay.textContent = `${value}%`;
      };
      quickBtnsContainer.appendChild(btn);
    });

    menu.appendChild(quickBtnsContainer);

    // Buttons
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = `
      padding: 6px 14px;
      font-size: 12px;
      border: 1px solid var(--background-modifier-border);
      background: var(--background-secondary);
      color: var(--text-normal);
      border-radius: 4px;
      cursor: pointer;
    `;
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      menu.remove();
    };

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '更新';
    confirmBtn.style.cssText = `
      padding: 6px 14px;
      font-size: 12px;
      border: none;
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    `;
    confirmBtn.onclick = (e) => {
      e.stopPropagation();
      updateTriggerDisplay(currentValue);
      menu.remove();
    };

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(confirmBtn);
    menu.appendChild(btnContainer);

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
  };

  demoSection.appendChild(trigger);
  container.appendChild(demoSection);

  // Progress bar examples
  const examplesTitle = document.createElement('div');
  examplesTitle.textContent = '进度条样式：';
  examplesTitle.style.cssText = 'margin-bottom: 16px; color: var(--text-muted); font-size: 13px;';
  container.appendChild(examplesTitle);

  const examples = [0, 25, 50, 75, 100];
  examples.forEach(progress => {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 16px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      margin-bottom: 8px;
      max-width: 400px;
    `;

    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      flex: 1;
      height: 8px;
      background: var(--background-modifier-border);
      border-radius: 4px;
      overflow: hidden;
    `;
    const fill = document.createElement('div');
    fill.style.cssText = `
      width: ${progress}%;
      height: 100%;
      background: ${progress === 100 ? '#22c55e' : progress >= 50 ? '#3b82f6' : '#f59e0b'};
      transition: width 0.3s ease;
    `;
    progressBar.appendChild(fill);

    const label = document.createElement('span');
    label.textContent = `${progress}%`;
    label.style.cssText = 'min-width: 40px; font-weight: 500; font-size: 13px;';

    row.appendChild(progressBar);
    row.appendChild(label);
    container.appendChild(row);
  });

  return container;
};

const meta: Meta<ProgressPickerProps> = {
  title: 'Components/ProgressPicker',
  tags: ['autodocs'],
  render: (args) => createProgressPickerDemo(args),
  argTypes: {
    currentProgress: { control: { type: 'range', min: 0, max: 100 } },
  },
};

export default meta;

type Story = StoryObj<ProgressPickerProps>;

export const Default: Story = {
  args: {
    currentProgress: 50,
  },
};

export const NotStarted: Story = {
  args: {
    currentProgress: 0,
  },
};

export const InProgress: Story = {
  args: {
    currentProgress: 75,
  },
};

export const Completed: Story = {
  args: {
    currentProgress: 100,
  },
};
