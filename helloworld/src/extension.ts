// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {TextDecoder, TextEncoder} from 'util';
import axios from 'axios';

async function refactorCode(code: string): Promise<string> {
    return axios.post('http://127.0.0.1:5000/refactor', { code })
        .then(response => response.data.refactored_code)
        .catch(error => {
            console.error('Error during the HTTP request', error);
            throw new Error('Failed to refactor code');
        });
}

function processNotebookCells(editor: any) {
    // Function to check if a cell has the refactor tag
    function hasRefactorTag(cell: any) {
        const metadata = cell.metadata || {};
        const tags = metadata.tags || [];
        return tags.indexOf("refactor") >= 0;
    }

    // Get all cells
    const allCells = editor?.notebook.getCells();

    // Check if any cell has the refactor tag
    const anyRefactorTag = allCells.some((cell: any) => hasRefactorTag(cell));

    // Initialize all_cells and all_cells_text
    let all_cells = new Array<vscode.NotebookCell>();
    let all_cells_text = String();
    // Process cells based on the presence of the refactor tag
    if (!anyRefactorTag) {
        // If no cells have the refactor tag, process all cells
        allCells.forEach((cell: vscode.NotebookCell) => {
            all_cells.push(cell);
            var cell_text = cell.document.getText();
            all_cells_text += cell_text;
        });
    } else {
        // If any cells have the refactor tag, only process cells with the refactor tag
        allCells.filter((cell: any) => hasRefactorTag(cell)).forEach((cell: vscode.NotebookCell) => {
            all_cells.push(cell);
            var cell_text = cell.document.getText();
            all_cells_text += cell_text;
        });
    }

    // Now `all_cells_text` contains the concatenated text based on the presence of the refactor tag
    console.log(all_cells_text);
    return all_cells_text;
}

export function activate(context: vscode.ExtensionContext) {
    console.debug(context);

    let refactorNotebook = vscode.commands.registerCommand('extension.refactorNotebook', () => {
        const editor = vscode.window.activeNotebookEditor;
        if (!editor) {
            return;
        }
        vscode.window.showInformationMessage('Refactoring the active notebook...');
        // Print all cells
        var all_cells = new Array<vscode.NotebookCell>();
        var edit = new vscode.WorkspaceEdit();
        editor?.notebook.getCells().forEach(cell => {
            all_cells.push(cell);

            var cell_text = cell.document.getText();
            cell_text = cell_text + "\n# Commented by Ginda";
            console.log(cell_text);
        });


        // Concat all cells into one string
        var all_cells_text = String();
        all_cells.forEach(cell => {
            all_cells_text += cell.document.getText();
        });
        all_cells_text = processNotebookCells(editor);

        vscode.workspace.applyEdit(edit).then(
            (success) => console.log("Apply notebook metadata edit success."),
            (reason) => console.log(`Apply notebook metadata edit failed with reason: ${reason}`)
        );
        vscode.window.showInformationMessage('Quering the LLM for updated code...');
        refactorCode(all_cells_text)
            .then(refactored_code => {
                console.log(refactored_code);
                vscode.window.showInformationMessage('Updating the jupyter cells');
                // Insert new cell with the refactored code
                const newCell = new vscode.NotebookCellData(
                    vscode.NotebookCellKind.Code,
                    refactored_code,
                    'python'
                );
                // Create a notebook edit to insert the new cell
                const notebookEdits = [vscode.NotebookEdit.insertCells(editor.notebook.cellCount, [newCell])];
                const edit = new vscode.WorkspaceEdit();
                edit.set(editor.notebook.uri, notebookEdits);
                return vscode.workspace.applyEdit(edit);
            })
            .catch(error => {
                vscode.window.showErrorMessage('Failed to refactor code');
            });


    });

    context.subscriptions.push(refactorNotebook);


    let toggleRefactorTag = vscode.commands.registerCommand('extension.toggleRefactorTag', () => {
        // Example code to update cell tags:
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
        var metadata = JSON.parse(JSON.stringify(
            cell.metadata
        ));
        console.debug(metadata);
        metadata.metadata = metadata.metadata || {};
        metadata.metadata.tags = metadata.metadata.tags || [];

        if (metadata.metadata.tags.indexOf("refactor") >= 0) {
            metadata.metadata.tags.pop("refactor")
        } else {
            metadata.metadata.tags.push("refactor");
        }

        // Update the metadata
        const nbEdit = vscode.NotebookEdit.updateCellMetadata(cell.index, metadata);
        edit.set(cell.notebook.uri, [nbEdit]);
        vscode.workspace.applyEdit(edit).then(
            (success) => console.log("Apply notebook metadata edit success."),
            (reason) => console.log(`Apply notebook metadata edit failed with reason: ${reason}`)
        ).then(
            // Save notebook upon success
            () => {
                console.log("Save notebook");
                editor.notebook.save();
            }
        );
        


    });

    context.subscriptions.push(toggleRefactorTag);

}


// This method is called when your extension is deactivated
export function deactivate() {
}
