import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
	const provider = new PromptToolsViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			PromptToolsViewProvider.viewType,
			provider
		)
	);

	// Register the commands for the commands palette
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"simple-prompt-tools.copySelectedProjectPrompt",
			copySelectedProjectPrompt
		),
		vscode.commands.registerCommand(
			"simple-prompt-tools.openFilesToMarkdown",
			openFilesToMarkdown
		),
		vscode.commands.registerCommand(
			"simple-prompt-tools.selectOpenFilesToMarkdown",
			selectOpenFilesToMarkdown
		),
		vscode.commands.registerCommand(
			"simple-prompt-tools.copyCurrentFileToMarkdown",
			copyCurrentFileToMarkdown
		),
		vscode.commands.registerCommand(
			"simple-prompt-tools.copyErrorsInCurrentFile",
			copyErrorsInCurrentFile
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
				case "copySelectedProjectPrompt":
					copySelectedProjectPrompt(data.append);
					break;
				case "copyFolderStructure":
					copyFolderStructure(data.append);
					break;

				case "openFilesToMarkdown":
					openFilesToMarkdown(data.append);
					break;
				case "selectOpenFilesToMarkdown":
					selectOpenFilesToMarkdown(data.append);
					break;
				case "copyCurrentFileToMarkdown":
					copyCurrentFileToMarkdown(data.append);
					break;
				case "copyErrorsInCurrentFile":
					copyErrorsInCurrentFile(data.append);
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
					.checkbox-container {
						margin-bottom: 20px;
					}
                </style>
            </head>
            <body>
                <div class="checkbox-container">
					<button class="button" id="copySelectedProjectPrompt">
						<span>Copy Project Prompt</span>
						<span class="description">Select and copy a prompt from prompts.md</span>
					</button>
					<label><input type="checkbox" id="appendCopySelectedProjectPrompt"> Append</label>
				</div>
				<div class="checkbox-container">
					<button class="button" id="copyFolderStructure">
    					<span>Copy Folder Structure</span>
    					<span class="description">Copy the structure of a selected folder</span>
					</button>
					<label><input type="checkbox" id="appendCopyFolderStructure"> Append</label>
				</div>
                <div class="checkbox-container">
					<button class="button" id="copyCurrentFileToMarkdown">
						<span>Copy Current File</span>
						<span class="description">Copy the currently active file as markdown</span>
					</button>
					<label><input type="checkbox" id="appendCopyCurrentFileToMarkdown"> Append</label>
				</div>
				<div class="checkbox-container">
					<button class="button" id="openFilesToMarkdown">
						<span>Copy All Editor Tabs</span>
						<span class="description">Copy all open files as markdown to clipboard</span>
					</button>
					<label><input type="checkbox" id="appendOpenFilesToMarkdown"> Append</label>
				</div>
				<div class="checkbox-container">
					<button class="button" id="selectOpenFilesToMarkdown">
						<span>Select Editor Tabs...</span>
						<span class="description">Select specific open files to copy as markdown</span>
					</button>
					<label><input type="checkbox" id="appendSelectOpenFilesToMarkdown"> Append</label>
				</div>
				<div class="checkbox-container">
					<button class="button" id="copyErrorsInCurrentFile">
						<span>Copy Errors in Current File</span>
						<span class="description">Copy all errors in the currently active file as markdown</span>
					</button>
					<label><input type="checkbox" id="appendCopyErrorsInCurrentFile"> Append</label>
				</div>

                <script>
                    (function() {
                        const vscode = acquireVsCodeApi();
                        document.getElementById('copySelectedProjectPrompt').addEventListener('click', () => {
							const append = document.getElementById('appendCopySelectedProjectPrompt').checked;
                            vscode.postMessage({ type: 'copySelectedProjectPrompt', append });
                        });
						document.getElementById('copyFolderStructure').addEventListener('click', () => {
							const append = document.getElementById('appendCopyFolderStructure').checked;
							vscode.postMessage({ type: 'copyFolderStructure', append });
						});						
                        document.getElementById('openFilesToMarkdown').addEventListener('click', () => {
							const append = document.getElementById('appendOpenFilesToMarkdown').checked;
                            vscode.postMessage({ type: 'openFilesToMarkdown', append });
                        });
                        document.getElementById('selectOpenFilesToMarkdown').addEventListener('click', () => {
							const append = document.getElementById('appendSelectOpenFilesToMarkdown').checked;
                            vscode.postMessage({ type: 'selectOpenFilesToMarkdown', append });
                        });
                        document.getElementById('copyCurrentFileToMarkdown').addEventListener('click', () => {
							const append = document.getElementById('appendCopyCurrentFileToMarkdown').checked;
                            vscode.postMessage({ type: 'copyCurrentFileToMarkdown', append });
                        });
                        document.getElementById('copyErrorsInCurrentFile').addEventListener('click', () => {
							const append = document.getElementById('appendCopyErrorsInCurrentFile').checked;
                            vscode.postMessage({ type: 'copyErrorsInCurrentFile', append });
                        });
                    }())
                </script>
            </body>
            </html>`;
	}
}

async function copySelectedProjectPrompt(append: boolean) {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		vscode.window.showErrorMessage("No workspace folder found.");
		return;
	}

	const rootPath = workspaceFolders[0].uri.fsPath;
	const promptsFilePath = path.join(rootPath, "prompts.md");

	if (!fs.existsSync(promptsFilePath)) {
		vscode.window.showErrorMessage(
			"prompts.md file not found in the project root."
		);
		return;
	}

	try {
		const promptsContent = fs.readFileSync(promptsFilePath, "utf-8");
		const promptSections = promptsContent.split(/^# /m).slice(1);

		const promptItems = promptSections.map((section) => {
			const [name, ...contentLines] = section.split("\n");
			const content = contentLines.join("\n").trim();
			return {
				label: name.trim(),
				description: content.substring(0, 50) + "...",
				prompt: content,
			};
		});

		type SelectedPrompt =
			| {
					label: string;
					description: string;
					prompt: string;
			  }
			| undefined;

		const selectedPrompt = (await vscode.window.showQuickPick(promptItems, {
			placeHolder: "Select a prompt to copy",
		})) as SelectedPrompt;

		if (selectedPrompt) {
			let clipboardContent = selectedPrompt.prompt;

			if (append) {
				const currentClipboard = await vscode.env.clipboard.readText();
				clipboardContent = currentClipboard + "\n\n" + clipboardContent;
			}

			await vscode.env.clipboard.writeText(clipboardContent);
			vscode.window.showInformationMessage(
				`Prompt "${selectedPrompt.label}" copied! ${append ? "(APPEND)" : ""}`
			);
		}
	} catch (error) {
		vscode.window.showErrorMessage(
			`Error reading or parsing prompts.md: ${error}`
		);
	}
}

async function copyFolderStructure(append: boolean) {
	const options: vscode.OpenDialogOptions = {
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: "Select Folder",
	};

	const folderUri = await vscode.window.showOpenDialog(options);
	if (!folderUri || folderUri.length === 0) {
		return;
	}

	const folderPath = folderUri[0].fsPath;
	const folderName = path.basename(folderPath);

	// Helper function to read .gitignore files
	async function readGitignore(dir: string): Promise<string[]> {
		const gitignorePath = path.join(dir, ".gitignore");
		if (fs.existsSync(gitignorePath)) {
			const content = await fs.promises.readFile(gitignorePath, "utf-8");
			return content
				.split("\n")
				.map((line) => line.trim())
				.filter((line) => line && !line.startsWith("#"));
		}
		return [];
	}

	// Helper function to check if a path should be ignored
	async function shouldIgnore(
		filePath: string,
		rootPath: string
	): Promise<boolean> {
		const relativePath = path.relative(rootPath, filePath);
		const pathParts = relativePath.split(path.sep);

		// Always ignore .git and node_modules
		if (pathParts.includes(".git") || pathParts.includes("node_modules")) {
			return true;
		}

		const ignorePatterns = await readGitignore(rootPath);
		return ignorePatterns.some((pattern) => {
			if (pattern.endsWith("/")) {
				return pathParts.some((part) => part === pattern.slice(0, -1));
			}
			return pathParts.includes(pattern) || relativePath.endsWith(pattern);
		});
	}

	// Helper function to generate folder structure
	async function generateFolderStructure(
		currentPath: string,
		rootPath: string,
		prefix: string = "",
		isLast: boolean = true,
		useAscii: boolean = false
	): Promise<string> {
		let structure = "";
		const entries = await fs.promises.readdir(currentPath, {
			withFileTypes: true,
		});
		const filteredEntries = [];

		for (const entry of entries) {
			const fullPath = path.join(currentPath, entry.name);
			if (!(await shouldIgnore(fullPath, rootPath))) {
				filteredEntries.push(entry);
			}
		}

		// Symbols for tree branches
		const symbols = useAscii
			? { corner: "`-- ", cross: "|-- ", vertical: "|   ", space: "    " }
			: { corner: "└── ", cross: "├── ", vertical: "│   ", space: "    " };

		for (let i = 0; i < filteredEntries.length; i++) {
			const entry = filteredEntries[i];
			const isLastEntry = i === filteredEntries.length - 1;
			structure += `${prefix}${isLastEntry ? symbols.corner : symbols.cross}${
				entry.name
			}\n`;

			if (entry.isDirectory()) {
				const newPrefix = prefix + (isLast ? symbols.space : symbols.vertical);
				structure += await generateFolderStructure(
					path.join(currentPath, entry.name),
					rootPath,
					newPrefix,
					isLastEntry,
					useAscii
				);
			}
		}

		return structure;
	}

	// Main logic
	let folderStructure = `Folder structure of ${folderName}:\n\n`;
	folderStructure += await generateFolderStructure(folderPath, folderPath);

	if (append) {
		const currentClipboard = await vscode.env.clipboard.readText();
		await vscode.env.clipboard.writeText(
			currentClipboard + "\n\n" + folderStructure
		);
	} else {
		await vscode.env.clipboard.writeText(folderStructure);
	}

	vscode.window.showInformationMessage("Folder structure copied to clipboard!");
}

async function getRelativePath(filePath: string): Promise<string> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		return filePath;
	}
	const rootPath = workspaceFolders[0].uri.fsPath;
	return path.relative(rootPath, filePath);
}

async function openFilesToMarkdown(append: boolean) {
	const tabGroups = vscode.window.tabGroups.all;
	let markdownText = "";

	for (const group of tabGroups) {
		for (const tab of group.tabs) {
			if (tab.input instanceof vscode.TabInputText) {
				const document = await vscode.workspace.openTextDocument(tab.input.uri);
				const relativePath = await getRelativePath(document.fileName);
				const fileContent = document.getText();
				markdownText += `\`\`\`${relativePath}\n${fileContent}\n\`\`\`\n\n`;
			}
		}
	}

	if (markdownText === "") {
		vscode.window.showInformationMessage("No open files found.");
	} else {
		if (append) {
			const currentClipboard = await vscode.env.clipboard.readText();
			markdownText = currentClipboard + "\n\n" + markdownText;
		}
		await vscode.env.clipboard.writeText(markdownText);
		vscode.window.showInformationMessage(
			`Open files copied! ${append ? "(APPEND)" : ""}`
		);
	}
}

async function selectOpenFilesToMarkdown(append: boolean) {
	const tabGroups = vscode.window.tabGroups.all;
	const tabItems: vscode.QuickPickItem[] = [];

	for (const group of tabGroups) {
		for (const tab of group.tabs) {
			if (tab.input instanceof vscode.TabInputText) {
				const uri = tab.input.uri;
				const relativePath = await getRelativePath(uri.fsPath);
				tabItems.push({ label: relativePath, description: uri.fsPath });
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
		const relativePath = await getRelativePath(document.fileName);
		const fileContent = document.getText();
		markdownText += `\`\`\`${relativePath}\n${fileContent}\n\`\`\`\n\n`;
	}

	if (append) {
		const currentClipboard = await vscode.env.clipboard.readText();
		markdownText = currentClipboard + "\n\n" + markdownText;
	}
	await vscode.env.clipboard.writeText(markdownText);
	vscode.window.showInformationMessage(
		`Selected files content copied! ${append ? "(APPEND)" : ""}`
	);
}

async function copyCurrentFileToMarkdown(append: boolean) {
	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor) {
		const document = activeEditor.document;
		const relativePath = await getRelativePath(document.fileName);
		const fileContent = document.getText();
		let markdownText = `\`\`\`${relativePath}\n${fileContent}\n\`\`\`\n\n`;

		if (append) {
			const currentClipboard = await vscode.env.clipboard.readText();
			markdownText = currentClipboard + "\n\n" + markdownText;
		}
		await vscode.env.clipboard.writeText(markdownText);
		vscode.window.showInformationMessage(
			`Current file copied! ${append ? "(APPEND)" : ""}`
		);
	} else {
		vscode.window.showInformationMessage("No active editor found.");
	}
}

async function copyErrorsInCurrentFile(append: boolean) {
	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor) {
		const document = activeEditor.document;
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		const errors = diagnostics.filter(
			(diag) => diag.severity === vscode.DiagnosticSeverity.Error
		);
		if (errors.length === 0) {
			vscode.window.showInformationMessage(
				"No errors found in the current file."
			);
			return;
		}

		const relativePath = await getRelativePath(document.fileName);

		let markdownText = `The following errors were found in the file ${relativePath}:`;

		for (const error of errors) {
			const line = document.lineAt(error.range.start.line);
			markdownText += `- Error in line ${error.range.start.line + 1} (${
				line.text
			}): ${error.message}\n`;
		}

		if (append) {
			const currentClipboard = await vscode.env.clipboard.readText();
			markdownText = currentClipboard + "\n\n" + markdownText;
		}
		await vscode.env.clipboard.writeText(markdownText);
		vscode.window.showInformationMessage(
			`${errors.length} errors copied! ${append ? "(APPEND)" : ""}`
		);
	} else {
		vscode.window.showInformationMessage("No active editor found.");
	}
}

export function deactivate() {}
