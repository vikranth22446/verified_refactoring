// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios from 'axios';

async function refactorCode(code: string, vars: string): Promise<string> {
    return axios.post('http://127.0.0.1:5000/refactor', {code, vars})
        .then(response => response.data.refactored_code)
        .catch(error => {
            console.error('Error during the HTTP request', error);
            throw new Error('Failed to refactor code');
        });
}


async function refactorCodeV2(code: string, vars: string, newCell: vscode.NotebookCellData, notebookEdits: vscode.NotebookEdit[], cellIndex: number): Promise<void> {
    const response = await fetch('http://127.0.0.1:5000/refactor_v2', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, vars })
    });

    if (!response.body) {
        throw new Error('Response body is empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let refactored_code = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        refactored_code = chunk;
        updateNotebookCellV2(refactored_code, newCell, notebookEdits, cellIndex, "text"); // Update the notebook cell with the current refactored code
    }
    updateNotebookCellV2(refactored_code, newCell, notebookEdits, cellIndex, "python"); // Update the notebook cell with the current refactored code
}

function updateNotebookCellV2(refactored_code: string, newCellOld: vscode.NotebookCellData, notebookEdits: vscode.NotebookEdit[], cellIndex: number, cellType: string): void {
    const editor = vscode.window.activeNotebookEditor;
    if (editor) {
        const edit = new vscode.WorkspaceEdit();
        const cell = editor.notebook.cellAt(cellIndex);

        // Update the existing cell content
        // newCell.value = refactored_code;
        // notebookEdits.push(vscode.NotebookEdit.updateCellMetadata(cellIndex, newCell.metadata?.metadata || {}));
        const newCell = new vscode.NotebookCellData(
            vscode.NotebookCellKind.Code,
            refactored_code,
            cellType
        );
        // Create a notebook edit to insert the new cell
        const notebookEdits = [vscode.NotebookEdit.replaceCells(new vscode.NotebookRange(cellIndex, cellIndex + 1), [newCell])];

        edit.set(editor.notebook.uri, notebookEdits);
        vscode.workspace.applyEdit(edit);
    }
}

// Function to check if a cell has the refactor tag
function hasRefactorTag(cell: any) {
    const metadata = cell.metadata.metadata || {};
    const tags = metadata.tags || [];
    return tags.indexOf("refactor") >= 0;
}

function getCellText(cell: any) {
    // Get cell index
    console.log(cell.index);
    const cell_index = "# In[" + cell.index + "]:\n";
    return cell_index + cell.document.getText() + "\n";
}

function processNotebookCells(editor: any) {

    // Get all cells
    const allCells = editor?.notebook.getCells();


    // Initialize all_cells and all_cells_text
    let all_cells = new Array<vscode.NotebookCell>();
    let refactor_cells = new Array<vscode.NotebookCell>();
    let all_cells_text = String();
    let refactor_cells_text = String();

    // Process cells based on the presence of the refactor tag
    allCells.forEach((cell: vscode.NotebookCell) => {
        all_cells.push(cell);
        const cell_text = getCellText(cell);
        all_cells_text += cell_text;
    });

    // If any cells have the refactor tag,
    // push the process cells with the refactor scope
    // TODO(future): Syntactically analyze the code and extract vars / expressions to refactor
    allCells.filter((cell: any) => hasRefactorTag(cell)).forEach((cell: vscode.NotebookCell) => {
        refactor_cells.push(cell);
        const cell_text = getCellText(cell);
        refactor_cells_text += cell_text;
    });

    // Now `all_cells_text` contains the concatenated text based on the presence of the refactor tag
    console.log(all_cells_text);
    return [all_cells_text, refactor_cells_text];
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
        var edit = new vscode.WorkspaceEdit();
        var processedResult = processNotebookCells(editor);
        const all_cells_text = processedResult[0];
        const refactor_cells_text = processedResult[1];

        vscode.workspace.applyEdit(edit).then(
            (success) => console.log("Apply notebook metadata edit success."),
            (reason) => console.log(`Apply notebook metadata edit failed with reason: ${reason}`)
        );
        vscode.window.showInformationMessage('Querying the LLM for updated code...');
        var refactored_code = "";

        const newCell = new vscode.NotebookCellData(
            vscode.NotebookCellKind.Code,
            refactored_code,
            'python'
        );
        // Create a notebook edit to insert the new cell
        const notebookEdits = [vscode.NotebookEdit.insertCells(editor.notebook.cellCount, [newCell])];
        refactorCodeV2(all_cells_text, refactor_cells_text, newCell, notebookEdits, editor.notebook.cellCount).then(() => {
            vscode.window.showInformationMessage('Refactoring complete and notebook updated');
        }).catch(error => {
            vscode.window.showErrorMessage('Failed to refactor code: ' + error.message);
        });

        // refactorCode(all_cells_text, refactor_cells_text)
        //     .then(refactored_code => {
        //         console.log(refactored_code);
        //         vscode.window.showInformationMessage('Updating the jupyter cells');
        //         // Insert new cell with the refactored code
        //         newCell.value = refactored_code;
        //         const edit = new vscode.WorkspaceEdit();
        //         edit.set(editor.notebook.uri, notebookEdits);
        //         return vscode.workspace.applyEdit(edit);
        //     })
        //     .catch(error => {
        //         vscode.window.showErrorMessage('Failed to refactor code');
        //     });


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
