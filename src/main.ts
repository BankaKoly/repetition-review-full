import { Plugin, TFile, WorkspaceLeaf, ItemView, App, PluginSettingTab, Setting, moment } from 'obsidian';

interface Category {
  name: string;
  days: number;
}

interface RepetitionSettings {
  tag: string;
  categories: Category[];
}

const DEFAULT_SETTINGS: RepetitionSettings = {
  tag: '#review',
  categories: [
    { name: '1st', days: 1 },
    { name: '2nd', days: 3 },
    { name: '3rd', days: 7 },
    { name: '4th', days: 14 },
    { name: '5th', days: 30 },
    { name: '6th', days: 60 }
  ]
};

const VIEW_TYPE = 'repetition-review-view';

export default class RepetitionReviewPlugin extends Plugin {
  settings: RepetitionSettings;

  async onload() {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE,
      (leaf) => new RepetitionView(leaf, this)
    );

    this.addCommand({
      id: 'open-repetition-review',
      name: 'Open Repetition Review',
      callback: () => {
        this.activateView();
      }
    });

    this.addSettingTab(new RepetitionSettingTab(this.app, this));
  }

  async activateView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length === 0) {
      await this.app.workspace.getRightLeaf(false).setViewState({
        type: VIEW_TYPE,
        active: true
      });
    } else {
      leaves[0].activate();
    }
  }

  onunload() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => leaf.detach());
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class RepetitionView extends ItemView {
  plugin: RepetitionReviewPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: RepetitionReviewPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return 'Repetition Review';
  }

  async onOpen() {
    this.draw();
  }

  async onClose() {
    // Nothing
  }

  async draw() {
    const container = this.containerEl.children[1];
    container.empty();

    const heading = container.createEl('h2', { text: 'Repetition Review' });

    for (const cat of this.plugin.settings.categories) {
      const header = container.createEl('h3', { text: `${cat.name} - ${cat.days} days` });
      const list = container.createEl('ul');

      const files = this.getFilesForCategory(cat);
      if (files.length === 0) {
        list.createEl('li', { text: 'Nothing due.' });
      } else {
        for (const file of files) {
          const li = list.createEl('li');
          li.createEl('a', {
            text: file.basename,
            href: file.path
          });
        }
      }
    }
  }

  getFilesForCategory(cat: Category): TFile[] {
    const files: TFile[] = [];
    const tag = this.plugin.settings.tag;
    const days = cat.days;

    const allFiles = this.app.vault.getMarkdownFiles();
    for (const file of allFiles) {
      const cache = this.app.metadataCache.getFileCache(file);
      const tags = cache?.tags?.map(t => t.tag) || [];
      if (!tags.includes(tag)) continue;

      const mtime = file.stat.mtime;
      const diffDays = moment().diff(moment(mtime), 'days');
      if (diffDays >= days) {
        files.push(file);
      }
    }
    return files;
  }
}

class RepetitionSettingTab extends PluginSettingTab {
  plugin: RepetitionReviewPlugin;

  constructor(app: App, plugin: RepetitionReviewPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Repetition Review Settings' });

    new Setting(containerEl)
      .setName('Tag')
      .setDesc('Tag used to mark notes for repetition')
      .addText(text => text
        .setPlaceholder('#review')
        .setValue(this.plugin.settings.tag)
        .onChange(async (value) => {
          this.plugin.settings.tag = value.trim();
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: 'Categories' });

    const listContainer = containerEl.createDiv();

    const renderCategories = () => {
      listContainer.empty();
      this.plugin.settings.categories.forEach((cat, index) => {
        const div = listContainer.createDiv();
        new Setting(div)
          .addText(text => text
            .setPlaceholder('Name')
            .setValue(cat.name)
            .onChange(async (value) => {
              this.plugin.settings.categories[index].name = value;
              await this.plugin.saveSettings();
              renderCategories();
            }))
          .addText(text => text
            .setPlaceholder('Days')
            .setValue(cat.days.toString())
            .onChange(async (value) => {
              const num = parseInt(value);
              if (!isNaN(num)) {
                this.plugin.settings.categories[index].days = num;
                await this.plugin.saveSettings();
              }
            }))
          .addExtraButton(button => {
            button.setIcon('cross');
            button.setTooltip('Remove');
            button.onClick(async () => {
              this.plugin.settings.categories.splice(index, 1);
              await this.plugin.saveSettings();
              renderCategories();
            });
          });
      });
    };

    renderCategories();

    new Setting(containerEl)
      .addButton(btn => {
        btn.setButtonText('Add Category');
        btn.onClick(async () => {
          this.plugin.settings.categories.push({ name: 'new', days: 1 });
          await this.plugin.saveSettings();
          renderCategories();
        });
      });
  }
}
