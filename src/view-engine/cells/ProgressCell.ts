import { BaseCell } from './BaseCell';

export class ProgressCell extends BaseCell<number> {
  constructor(
    app: any,
    entityManager: any,
    entityId: string,
    entityType: string,
    field: string,
    value: number,
    onChange?: (value: number) => void
  ) {
    super(app, entityManager, entityId, entityType, field, value ?? 0, onChange);
  }

  renderDisplay(container: HTMLElement): void {
    const progressBar = container.createDiv('pm-cell-progress');
    
    const barContainer = progressBar.createDiv('pm-cell-progress-bar');
    const barFill = barContainer.createDiv('pm-cell-progress-fill');
    barFill.style.width = `${this.value}%`;
    barFill.style.background = this.getProgressColor(this.value);

    const percentText = progressBar.createSpan('pm-cell-progress-text');
    percentText.textContent = `${Math.round(this.value)}%`;

    progressBar.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startEdit();
    });
  }

  renderEdit(container: HTMLElement): void {
    const wrapper = this.createInputWrapper(container);
    wrapper.addClass('pm-cell-dropdown');

    const slider = wrapper.createEl('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(this.value);
    slider.style.width = '100%';

    const valueDisplay = wrapper.createDiv();
    valueDisplay.textContent = `${this.value}%`;

    slider.addEventListener('input', () => {
      this.value = parseInt(slider.value);
      valueDisplay.textContent = `${this.value}%`;
    });

    const quickValues = [0, 25, 50, 75, 100];
    const quickRow = wrapper.createDiv();
    quickValues.forEach(val => {
      const btn = quickRow.createEl('button');
      btn.textContent = `${val}%`;
      btn.onclick = () => {
        this.value = val;
        slider.value = String(val);
        valueDisplay.textContent = `${val}%`;
      };
    });

    const buttonRow = wrapper.createDiv();
    const cancelBtn = buttonRow.createEl('button');
    cancelBtn.textContent = '取消';
    cancelBtn.onclick = () => this.endEdit(false);

    const saveBtn = buttonRow.createEl('button');
    saveBtn.textContent = '保存';
    saveBtn.onclick = () => this.endEdit(true);

    setTimeout(() => slider.focus(), 0);
  }

  private getProgressColor(value: number): string {
    if (value === 100) return '#22c55e';
    if (value >= 75) return '#3b82f6';
    if (value >= 50) return '#8b5cf6';
    if (value >= 25) return '#f59e0b';
    return '#ef4444';
  }
}
