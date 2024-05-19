// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {TextDecoder, TextEncoder} from 'util';


export function activate(context: vscode.ExtensionContext) {
    console.debug(context);

    let refactorNotebook = vscode.commands.registerCommand('extension.refactorNotebook', () => {

        console.log('Triggered hello world!');
        const editor = vscode.window.activeNotebookEditor;
        if (!editor) {
            return;
        }
        // Print all cells
        var all_cells = new Array<vscode.NotebookCell>();
        var edit = new vscode.WorkspaceEdit();
        editor?.notebook.getCells().forEach(cell => {
            all_cells.push(cell);

            var cell_text = cell.document.getText();
            cell_text = cell_text + "\n# Commented by Ginda";
            console.log(cell_text);

            edit.replace(
                cell.document.uri,
                new vscode.Range(0, 0, cell.document.lineCount + 1, 0),
                cell_text
            );
        });


        // Concat all cells into one string
        var all_cells_text = String();
        all_cells.forEach(cell => {
            all_cells_text += cell.document.getText();
        });

        vscode.workspace.applyEdit(edit).then(
            (success) => console.log("Apply notebook metadata edit success."),
            (reason) => console.log(`Apply notebook metadata edit failed with reason: ${reason}`)
        );


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
        )
    });

    context.subscriptions.push(toggleRefactorTag);

}


// This method is called when your extension is deactivated
export function deactivate() {
}
