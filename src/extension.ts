import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	console.log(
		'Congratulations, your extension "nils-prompt-tools" is now active!'
	);

	const provider = new PromptToolsViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			PromptToolsViewProvider.viewType,
			provider
		)
	);

	// Register the commands
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"nils-prompt-tools.openFilesToMarkdown",
			openFilesToMarkdown
		),
		vscode.commands.registerCommand(
			"nils-prompt-tools.selectOpenFilesToMarkdown",
			selectOpenFilesToMarkdown
		),
		vscode.commands.registerCommand(
			"nils-prompt-tools.copyCurrentFileToMarkdown",
			copyCurrentFileToMarkdown
		)
	);
}

class PromptToolsViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "promptToolsView";

	constructor(private readonly _extensionUri: vscode.Uri) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage((data) => {
			switch (data.type) {
				case "openFilesToMarkdown":
					vscode.commands.executeCommand(
						"nils-prompt-tools.openFilesToMarkdown"
					);
					break;
				case "selectOpenFilesToMarkdown":
					vscode.commands.executeCommand(
						"nils-prompt-tools.selectOpenFilesToMarkdown"
					);
					break;
				case "copyCurrentFileToMarkdown":
					vscode.commands.executeCommand(
						"nils-prompt-tools.copyCurrentFileToMarkdown"
					);
					break;
			}
		});
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Prompt Tools</title>
                <style>
                    body {
                        padding: 10px;
                        color: var(--vscode-foreground);
                        font-size: var(--vscode-font-size);
                        font-weight: var(--vscode-font-weight);
                        font-family: var(--vscode-font-family);
                    }
                    .button {
                        display: block;
                        width: 100%;
                        padding: 8px 12px;
                        margin-bottom: 10px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        text-align: left;
                        cursor: pointer;
                        font-size: 13px;
                        border-radius: 2px;
                    }
                    .button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .button .description {
                        display: block;
                        font-size: 11px;
                        opacity: 0.8;
                        margin-top: 4px;
                    }
                </style>
            </head>
            <body>
                <button class="button" id="openFilesToMarkdown">
                    <span>Open Files to Markdown</span>
                    <span class="description">Copy all open files as markdown to clipboard</span>
                </button>
                <button class="button" id="selectOpenFilesToMarkdown">
                    <span>Select Open Files to Markdown</span>
                    <span class="description">Select specific open files to copy as markdown</span>
                </button>
                <button class="button" id="copyCurrentFileToMarkdown">
                    <span>Copy Current File to Markdown</span>
                    <span class="description">Copy the currently active file as markdown</span>
                </button>
                <script>
                    (function() {
                        const vscode = acquireVsCodeApi();
                        document.getElementById('openFilesToMarkdown').addEventListener('click', () => {
                            vscode.postMessage({ type: 'openFilesToMarkdown' });
                        });
                        document.getElementById('selectOpenFilesToMarkdown').addEventListener('click', () => {
                            vscode.postMessage({ type: 'selectOpenFilesToMarkdown' });
                        });
                        document.getElementById('copyCurrentFileToMarkdown').addEventListener('click', () => {
                            vscode.postMessage({ type: 'copyCurrentFileToMarkdown' });
                        });
                    }())
                </script>
            </body>
            </html>`;
	}
}

async function openFilesToMarkdown() {
	const tabGroups = vscode.window.tabGroups.all;
	let markdownText = "";

	for (const group of tabGroups) {
		for (const tab of group.tabs) {
			if (tab.input instanceof vscode.TabInputText) {
				const document = await vscode.workspace.openTextDocument(tab.input.uri);
				const fileName = document.fileName.split("/").pop();
				const fileContent = document.getText();
				markdownText += `\`\`\`${fileName}\n${fileContent}\n\`\`\`\n\n`;
			}
		}
	}

	if (markdownText === "") {
		vscode.window.showInformationMessage("No open files found.");
	} else {
		await vscode.env.clipboard.writeText(markdownText);
		vscode.window.showInformationMessage(
			"Open files content copied as markdown to clipboard!"
		);
	}
}

async function selectOpenFilesToMarkdown() {
	const tabGroups = vscode.window.tabGroups.all;
	const tabItems: vscode.QuickPickItem[] = [];

	for (const group of tabGroups) {
		for (const tab of group.tabs) {
			if (tab.input instanceof vscode.TabInputText) {
				const uri = tab.input.uri;
				const label = uri.path.split("/").pop() || uri.path;
				tabItems.push({ label, description: uri.fsPath });
			}
		}
	}

	const selectedTabs = await vscode.window.showQuickPick(tabItems, {
		canPickMany: true,
		placeHolder: "Select the open tabs to include in the markdown",
	});

	if (!selectedTabs || selectedTabs.length === 0) {
		vscode.window.showInformationMessage("No tabs selected.");
		return;
	}

	let markdownText = "";

	for (const item of selectedTabs) {
		const document = await vscode.workspace.openTextDocument(
			vscode.Uri.file(item.description!)
		);
		const fileName = document.fileName.split("/").pop();
		const fileContent = document.getText();
		markdownText += `\`\`\`${fileName}\n${fileContent}\n\`\`\`\n\n`;
	}

	await vscode.env.clipboard.writeText(markdownText);
	vscode.window.showInformationMessage(
		"Selected open files content copied as markdown to clipboard!"
	);
}

async function copyCurrentFileToMarkdown() {
	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor) {
		const document = activeEditor.document;
		const fileName = document.fileName.split("/").pop();
		const fileContent = document.getText();
		const markdownText = `\`\`\`${fileName}\n${fileContent}\n\`\`\`\n\n`;

		await vscode.env.clipboard.writeText(markdownText);
		vscode.window.showInformationMessage(
			"Current file content copied as markdown to clipboard!"
		);
	} else {
		vscode.window.showInformationMessage("No active editor found.");
	}
}

export function deactivate() {}
