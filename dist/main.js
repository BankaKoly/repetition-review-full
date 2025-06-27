var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Plugin, ItemView, PluginSettingTab, Setting, moment } from 'obsidian';
const DEFAULT_SETTINGS = {
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
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            this.registerView(VIEW_TYPE, (leaf) => new RepetitionView(leaf, this));
            this.addCommand({
                id: 'open-repetition-review',
                name: 'Open Repetition Review',
                callback: () => {
                    this.activateView();
                }
            });
            this.addSettingTab(new RepetitionSettingTab(this.app, this));
        });
    }
    activateView() {
        return __awaiter(this, void 0, void 0, function* () {
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
            if (leaves.length === 0) {
                yield this.app.workspace.getRightLeaf(false).setViewState({
                    type: VIEW_TYPE,
                    active: true
                });
            }
            else {
                leaves[0].activate();
            }
        });
    }
    onunload() {
        this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => leaf.detach());
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
}
class RepetitionView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
    }
    getViewType() {
        return VIEW_TYPE;
    }
    getDisplayText() {
        return 'Repetition Review';
    }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            this.draw();
        });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            // Nothing
        });
    }
    draw() {
        return __awaiter(this, void 0, void 0, function* () {
            const container = this.containerEl.children[1];
            container.empty();
            const heading = container.createEl('h2', { text: 'Repetition Review' });
            for (const cat of this.plugin.settings.categories) {
                const header = container.createEl('h3', { text: `${cat.name} - ${cat.days} days` });
                const list = container.createEl('ul');
                const files = this.getFilesForCategory(cat);
                if (files.length === 0) {
                    list.createEl('li', { text: 'Nothing due.' });
                }
                else {
                    for (const file of files) {
                        const li = list.createEl('li');
                        li.createEl('a', {
                            text: file.basename,
                            href: file.path
                        });
                    }
                }
            }
        });
    }
    getFilesForCategory(cat) {
        var _a;
        const files = [];
        const tag = this.plugin.settings.tag;
        const days = cat.days;
        const allFiles = this.app.vault.getMarkdownFiles();
        for (const file of allFiles) {
            const cache = this.app.metadataCache.getFileCache(file);
            const tags = ((_a = cache === null || cache === void 0 ? void 0 : cache.tags) === null || _a === void 0 ? void 0 : _a.map(t => t.tag)) || [];
            if (!tags.includes(tag))
                continue;
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
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Repetition Review Settings' });
        new Setting(containerEl)
            .setName('Tag')
            .setDesc('Tag used to mark notes for repetition')
            .addText(text => text
            .setPlaceholder('#review')
            .setValue(this.plugin.settings.tag)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.tag = value.trim();
            yield this.plugin.saveSettings();
        })));
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
                    .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    this.plugin.settings.categories[index].name = value;
                    yield this.plugin.saveSettings();
                    renderCategories();
                })))
                    .addText(text => text
                    .setPlaceholder('Days')
                    .setValue(cat.days.toString())
                    .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    const num = parseInt(value);
                    if (!isNaN(num)) {
                        this.plugin.settings.categories[index].days = num;
                        yield this.plugin.saveSettings();
                    }
                })))
                    .addExtraButton(button => {
                    button.setIcon('cross');
                    button.setTooltip('Remove');
                    button.onClick(() => __awaiter(this, void 0, void 0, function* () {
                        this.plugin.settings.categories.splice(index, 1);
                        yield this.plugin.saveSettings();
                        renderCategories();
                    }));
                });
            });
        };
        renderCategories();
        new Setting(containerEl)
            .addButton(btn => {
            btn.setButtonText('Add Category');
            btn.onClick(() => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.categories.push({ name: 'new', days: 1 });
                yield this.plugin.saveSettings();
                renderCategories();
            }));
        });
    }
}
