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
    console.log("Mike extension activated");
    context.subscriptions.push(vscode.workspace.registerNotebookSerializer('test-notebook-renderer', new SampleContentSerializer(), { transientOutputs: true }), new SampleKernel());
    // on open notebook
    vscode.workspace.onDidOpenNotebookDocument((e) => {
        console.log("onDidOpenNotebookDocument");
        console.log(e);
    });
    // onDidSaveNotebookDocument
    vscode.workspace.onDidSaveNotebookDocument((e) => {
        console.log("onDidSaveNotebookDocument");
        console.log(e);
    });
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
    // add the extension.helloWorld command to the notebook toolbar
    // vscode.commands.executeCommand('setContext', 'notebookToolbarButtons', [
    // 	{
    // 		id: 'extension.helloWorld',
    // 		title: 'Hello World',
    // 		icon: 'codicon-debug-stackframe-dot',
    // 		tooltip: 'Hello World',
    // 		// when: 'notebookEditorFocused && !inputFocused'
    // 	}
    // ]);
    context.subscriptions.push(disposable);
    let toggleRefactorTag = vscode.commands.registerCommand('extension.toggleRefactorTag', () => {
        console.log('Triggered addRefactorTag!');
        const editor = vscode.window.activeNotebookEditor;
        if (editor) {
            // Get the current selected cell, and in the metadata field, add a tag
            // Tweak the selection cell with the tag
            const edit = new vscode.WorkspaceEdit();
            const selection = editor.selection;
            const lastCell = editor.notebook.cellCount;
            edit.set(editor.notebook.uri, [
                vscode.NotebookEdit.updateCellMetadata(selection.start, { tags: ["refactor"] }),
                vscode.NotebookEdit.updateNotebookMetadata({ author: "hello Mike" }),
                // vscode.NotebookEdit.insertCells(
                // 	lastCell, [
                // 		new vscode.NotebookCellData(
                // 			vscode.NotebookCellKind.Code,
                // 			"print('Hello World')",
                // 			"python"
                // 		)
                // 	]
                // )
            ]);
            console.debug(edit);
            vscode.workspace.applyEdit(edit).then((success) => console.log("Apply notebook metadata edit success."), (reason) => console.log(`Apply notebook metadata edit failed with reason: ${reason}`));
        }
    });
    context.subscriptions.push(toggleRefactorTag);
}
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map