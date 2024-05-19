"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = exports.SampleKernel = exports.SampleContentSerializer = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const util_1 = require("util");
class SampleContentSerializer {
    label = 'My Sample Content Serializer';
    async deserializeNotebook(data, token) {
        var contents = new util_1.TextDecoder().decode(data); // convert to String to make JSON object
        // Read file contents
        let raw;
        try {
            raw = JSON.parse(contents);
        }
        catch {
            raw = { cells: [] };
        }
        // Create array of Notebook cells for the VS Code API from file contents
        const cells = raw.cells.map(item => new vscode.NotebookCellData(item.kind, item.value, item.language));
        // Pass read and formatted Notebook Data to VS Code to display Notebook with saved cells
        return new vscode.NotebookData(cells);
    }
    async serializeNotebook(data, token) {
        // Map the Notebook data into the format we want to save the Notebook data as
        let contents = { cells: [] };
        for (const cell of data.cells) {
            contents.cells.push({
                kind: cell.kind,
                language: cell.languageId,
                value: cell.value
            });
        }
        // Give a string of all the data to save and VS Code will handle the rest
        return new util_1.TextEncoder().encode(JSON.stringify(contents));
    }
}
exports.SampleContentSerializer = SampleContentSerializer;
class SampleKernel {
    id = 'test-notebook-renderer-kernel';
    label = 'Sample Notebook Kernel';
    supportedLanguages = ['json'];
    _executionOrder = 0;
    _controller;
    constructor() {
        console.log("SampleKernel created");
        this._controller = vscode.notebooks.createNotebookController(this.id, 'test-notebook-renderer', this.label);
        this._controller.supportedLanguages = this.supportedLanguages;
        this._controller.supportsExecutionOrder = true;
        this._controller.executeHandler = this._executeAll.bind(this);
    }
    dispose() {
        this._controller.dispose();
    }
    _executeAll(cells, _notebook, _controller) {
        console.log("_executeAll");
        for (let cell of cells) {
            this._doExecution(cell);
        }
    }
    async _doExecution(cell) {
        console.log("_doExecution");
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        execution.start(Date.now());
        try {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.json(JSON.parse(cell.document.getText()), "x-application/sample-json-renderer"),
                    vscode.NotebookCellOutputItem.json(JSON.parse(cell.document.getText())),
                    vscode.NotebookCellOutputItem.json(JSON.parse(cell.document.getText()))
                ])
            ]);
            execution.end(true, Date.now());
        }
        catch (err) {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.text("Some error happeend!")
                ])
            ]);
            execution.end(false, Date.now());
        }
    }
}
exports.SampleKernel = SampleKernel;
function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
        console.log('Triggered hello world!');
        const editor = vscode.window.activeNotebookEditor;
        console.log(editor);
        if (editor) {
            // Print all cells
            var all_cells = new Array();
            var edit = new vscode.WorkspaceEdit();
            editor?.notebook.getCells().forEach(cell => {
                all_cells.push(cell);
                var cell_text = cell.document.getText();
                cell_text = cell_text + "# Commented by Ginda\n";
                console.log(cell_text);
                edit.replace(cell.document.uri, new vscode.Range(0, 0, cell.document.lineCount + 1, 0), cell_text);
            });
            // Concat all cells into one string
            var all_cells_text = String();
            all_cells.forEach(cell => {
                all_cells_text += cell.document.getText();
            });
            vscode.workspace.applyEdit(edit).then((success) => console.log("Apply notebook metadata edit success."), (reason) => console.log(`Apply notebook metadata edit failed with reason: ${reason}`));
        }
    });
    context.subscriptions.push(disposable);
    let toggleRefactorTag = vscode.commands.registerCommand('extension.toggleRefactorTag', () => {
        // Exmaple code to update cell tags... 
        // 	 https://github.com/microsoft/vscode-jupyter-cell-tags/blob/main/src/helper.ts#L12
        console.debug('Triggered addRefactorTag!');
        const editor = vscode.window.activeNotebookEditor;
        if (!editor) {
            return;
        }
        // Get the current selected cell, and in the metadata field, add a tag
        // Tweak the selection cell with the tag
        const edit = new vscode.WorkspaceEdit();
        const currentNotebook = editor?.notebook;
        const selection = editor.selection;
        const cells = currentNotebook?.getCells(selection);
        const cell = cells[0];
        console.debug(cell);
        // Get the current metadata and add / remove the tag
        var metadata = JSON.parse(JSON.stringify(cell.metadata));
        console.debug(metadata);
        metadata.metadata = metadata.metadata || {};
        metadata.metadata.tags = metadata.metadata.tags || [];
        // Toggle the refactor tags
        // // Old version of vscode may need to use the metadata.custom field to modify metadata.
        // metadata.custom = metadata.custom || {};
        // metadata.custom.metadata = metadata.custom.metadata || {};
        // metadata.custom.metadata.tags = metadata.custom.metadata.tags || [];
        // if (metadata.custom.metadata.tags.indexOf("refactor") >= 0){
        // 	metadata.custom.metadata.tags.pop("refactor");
        // } else{
        // 	metadata.custom.metadata.tags.push("refactor");
        // }
        if (metadata.metadata.tags.indexOf("refactor") >= 0) {
            metadata.metadata.tags.pop("refactor");
        }
        else {
            metadata.metadata.tags.push("refactor");
        }
        // Update the metadata
        const nbEdit = vscode.NotebookEdit.updateCellMetadata(cell.index, metadata);
        edit.set(cell.notebook.uri, [nbEdit]);
        vscode.workspace.applyEdit(edit).then((success) => console.log("Apply notebook metadata edit success."), (reason) => console.log(`Apply notebook metadata edit failed with reason: ${reason}`)).then(
        // Save notebook upon success
        () => {
            console.log("Save notebook");
            editor.notebook.save();
        });
    });
    context.subscriptions.push(toggleRefactorTag);
}
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map