// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TextDecoder, TextEncoder } from 'util';




interface RawNotebookData {
	cells: RawNotebookCell[]
}

interface RawNotebookCell {
	language: string;
	value: string;
	kind: vscode.NotebookCellKind;
	editable?: boolean;
}

export class SampleContentSerializer implements vscode.NotebookSerializer {
	public readonly label: string = 'My Sample Content Serializer';
  
	public async deserializeNotebook(data: Uint8Array, token: vscode.CancellationToken): Promise<vscode.NotebookData> {
	  var contents = new TextDecoder().decode(data);    // convert to String to make JSON object
  
	  // Read file contents
	  let raw: RawNotebookData;
	  try {
		raw = <RawNotebookData>JSON.parse(contents);
	  } catch {
		raw = { cells: [] };
	  }
  
	  // Create array of Notebook cells for the VS Code API from file contents
	  const cells = raw.cells.map(item => new vscode.NotebookCellData(
		item.kind,
		item.value,
		item.language
	  ));
  
	  // Pass read and formatted Notebook Data to VS Code to display Notebook with saved cells
	  return new vscode.NotebookData(
		cells
	  );
	}
  
	public async serializeNotebook(data: vscode.NotebookData, token: vscode.CancellationToken): Promise<Uint8Array> {
	  // Map the Notebook data into the format we want to save the Notebook data as
	  let contents: RawNotebookData = { cells: []};
  
	  for (const cell of data.cells) {
		contents.cells.push({
		  kind: cell.kind,
		  language: cell.languageId,
		  value: cell.value
		});
	  }
  
	  // Give a string of all the data to save and VS Code will handle the rest
	  return new TextEncoder().encode(JSON.stringify(contents));
	}
}

export class SampleKernel {
	readonly id = 'test-notebook-renderer-kernel';
	public readonly label = 'Sample Notebook Kernel';
	readonly supportedLanguages = ['json'];

	private _executionOrder = 0;
	private readonly _controller: vscode.NotebookController;

	constructor() {
		console.log("SampleKernel created");
		this._controller = vscode.notebooks.createNotebookController(
			this.id, 'test-notebook-renderer', this.label
		);

		this._controller.supportedLanguages = this.supportedLanguages;
		this._controller.supportsExecutionOrder = true;
		this._controller.executeHandler = this._executeAll.bind(this);
	}

	dispose(): void {
			this._controller.dispose();
		}

	private _executeAll(
		cells: vscode.NotebookCell[], _notebook: vscode.NotebookDocument, _controller: vscode.NotebookController): void 
	{
		console.log("_executeAll");
		for (let cell of cells) {
			this._doExecution(cell);
		}
	}

	private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
		console.log("_doExecution");
		const execution = this._controller.createNotebookCellExecution(cell);

		execution.executionOrder = ++this._executionOrder;
		execution.start(Date.now());

		try {
			execution.replaceOutput([
					new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.json(JSON.parse(cell.document.getText()), "x-application/sample-json-renderer"),
					vscode.NotebookCellOutputItem.json(JSON.parse(cell.document.getText())),
					vscode.NotebookCellOutputItem.json(
						JSON.parse(cell.document.getText())
					)
				])
			]);

			execution.end(true, Date.now());
		} catch (err) {
			execution.replaceOutput([
				new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text("Some error happeend!")
				])
			]);
			execution.end(false, Date.now());
		}
	}
}


export function activate(context: vscode.ExtensionContext) {

	console.log("Mike extension activated");
	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer(
		  'test-notebook-renderer', 
		  new SampleContentSerializer(), 
		  { transientOutputs: true }
		),
		new SampleKernel()
	);

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
		if (editor){
			// Print all cells
			
			var all_cells = new Array<vscode.NotebookCell>();
			const edit = new vscode.WorkspaceEdit();
			editor?.notebook.getCells().forEach(cell => {
				all_cells.push(cell);
				
				var cell_text = cell.document.getText();
				cell_text = cell_text + "# Commented by Mike\n"
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

			// Insert new cell
			edit.insert(
				editor?.notebook.uri,
				new vscode.Position(0, 0),
				all_cells_text,
			);
			
			vscode.workspace.applyEdit(edit);

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

}


// This method is called when your extension is deactivated
export function deactivate() {}
