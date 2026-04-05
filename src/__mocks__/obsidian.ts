// Mock for Obsidian API

export class App {
  vault = {
    getAbstractFileByPath: jest.fn(),
    read: jest.fn(),
    modify: jest.fn(),
    create: jest.fn(),
    getFolderByPath: jest.fn(),
    adapter: {
      exists: jest.fn(),
      mkdir: jest.fn(),
    },
  };
  metadataCache = {
    getFileCache: jest.fn(),
    getFirstLinkpathDest: jest.fn(),
  };
  workspace = {
    getLeaf: jest.fn().mockReturnValue({
      openFile: jest.fn(),
    }),
  };
  fileManager = {
    processFrontMatter: jest.fn(),
  };
}

export class TFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
  
  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    this.basename = this.name.replace(/\.[^/.]+$/, '');
    this.extension = this.name.split('.').pop() || '';
  }
}

export class TFolder {
  path: string;
  name: string;
  
  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
  }
}

export class Modal {
  app: App;
  contentEl: HTMLElement;
  
  constructor(app: App) {
    this.app = app;
    this.contentEl = document.createElement('div');
  }
  
  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

export class Setting {
  settingEl: HTMLElement;
  
  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement('div');
    containerEl.appendChild(this.settingEl);
  }
  
  setName(name: string) {
    return this;
  }
  
  setDesc(desc: string) {
    return this;
  }
  
  addText(cb: any) {
    const component = { inputEl: document.createElement('input'), onChange: jest.fn() };
    cb(component);
    return this;
  }
  
  addDropdown(cb: any) {
    const component = { 
      selectEl: document.createElement('select'),
      addOption: jest.fn(),
      setValue: jest.fn(),
      onChange: jest.fn()
    };
    cb(component);
    return this;
  }
  
  addButton(cb: any) {
    const component = { 
      buttonEl: document.createElement('button'),
      setButtonText: jest.fn(),
      onClick: jest.fn()
    };
    cb(component);
    return this;
  }
  
  addToggle(cb: any) {
    const component = { 
      toggleEl: document.createElement('input'),
      setValue: jest.fn(),
      onChange: jest.fn()
    };
    cb(component);
    return this;
  }
}

export class Notice {
  constructor(message: string, timeout?: number) {}
}

export class Plugin {
  app: App;
  manifest: any;
  
  constructor(app: App, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }
  
  addCommand() {}
  addRibbonIcon() {}
  addSettingTab() {}
  registerEvent() {}
  registerInterval() {}
  registerEditorExtension() {}
  registerMarkdownCodeBlockProcessor() {}
  registerMarkdownPostProcessor() {}
  loadData() { return Promise.resolve({}); }
  saveData() { return Promise.resolve(); }
}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  
  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
  }
  
  display() {}
}

export function parseYaml(yaml: string): any {
  // Simple YAML parser mock
  const result: any = {};
  const lines = yaml.split('\n');
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      result[key] = value.trim();
    }
  }
  return result;
}

export function stringifyYaml(obj: any): string {
  return Object.entries(obj)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}
