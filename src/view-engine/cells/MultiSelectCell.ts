import { BaseCell } from './BaseCell';

export class MultiSelectCell extends BaseCell<string[]> {
  private availableOptions: string[];

  constructor(
    app: any,
    entityManager: any,
    entityId: string,
    entityType: string,
    field: string,
    value: string[],
    onChange?: (value: string[]) => void,
    options?: string[]
  ) {
    super(app, entityManager, entityId, entityType, field, value || [], onChange);
    this.availableOptions = options || [];
  }

  renderDisplay(container: HTMLElement): void {
    const tagsContainer = container.createDiv('pm-cell-tags');
    
    if (!this.value || this.value.length === 0) {
      tagsContainer.createSpan({ text: '-', cls: 'pm-cell-empty' });
    } else {
      this.value.forEach(tag => {
        const tagEl = tagsContainer.createSpan('pm-cell-tag');
        tagEl.textContent = tag;
        tagEl.style.background = this.getTagColor(tag);
      });
    }

    tagsContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startEdit();
    });
  }

  renderEdit(container: HTMLElement): void {
    const wrapper = this.createInputWrapper(container);
    wrapper.addClass('pm-cell-dropdown');

    const title = wrapper.createDiv();
    title.textContent = '编辑标签';

    const selectedArea = wrapper.createDiv('pm-cell-tags-selected');
    this.renderSelectedTags(selectedArea);

    const inputContainer = wrapper.createDiv();
    const input = inputContainer.createEl('input');
    input.placeholder = '输入新标签...';
    
    const addBtn = inputContainer.createEl('button');
    addBtn.textContent = '添加';
    addBtn.onclick = () => {
      const newTag = input.value.trim();
      if (newTag && !this.value.includes(newTag)) {
        this.value = [...this.value, newTag];
        this.renderSelectedTags(selectedArea);
        input.value = '';
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBtn.click();
      }
    });

    const buttonRow = wrapper.createDiv();
    const cancelBtn = buttonRow.createEl('button');
    cancelBtn.textContent = '取消';
    cancelBtn.onclick = () => this.endEdit(false);

    const saveBtn = buttonRow.createEl('button');
    saveBtn.textContent = '保存';
    saveBtn.onclick = () => this.endEdit(true);
  }

  private renderSelectedTags(container: HTMLElement): void {
    container.empty();
    if (this.value.length === 0) {
      container.createSpan({ text: '暂无标签' });
    } else {
      this.value.forEach((tag, index) => {
        const tagEl = container.createDiv('pm-cell-tag-item');
        tagEl.style.background = this.getTagColor(tag);
        tagEl.createSpan({ text: tag });
        const removeBtn = tagEl.createSpan({ text: ' x' });
        removeBtn.onclick = () => {
          this.value = this.value.filter((_, i) => i !== index);
          this.renderSelectedTags(container);
        };
      });
    }
  }

  private getTagColor(tag: string): string {
    const colors = [
      'rgba(59, 130, 246, 0.2)',
      'rgba(34, 197, 94, 0.2)',
      'rgba(245, 158, 11, 0.2)',
      'rgba(239, 68, 68, 0.2)',
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = ((hash << 5) - hash) + tag.charCodeAt(i);
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  }
}
