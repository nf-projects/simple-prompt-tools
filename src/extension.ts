import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	console.log(
		'Congratulations, your extension "nils-prompt-tools" is now active!'
	);

	const openFilesToMarkdownCommand = vscode.commands.registerCommand(
		"nils-prompt-tools.openFilesToMarkdown",
		async () => {
			const tabGroups = vscode.window.tabGroups.all;

			let markdownText = "";

			for (const group of tabGroups) {
				for (const tab of group.tabs) {
					if (tab.input instanceof vscode.TabInputText) {
						const document = await vscode.workspace.openTextDocument(
							tab.input.uri
						);
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
	);

	const selectOpenFilesToMarkdownCommand = vscode.commands.registerCommand(
		"nils-prompt-tools.selectOpenFilesToMarkdown",
		async () => {
			const tabGroups = vscode.window.tabGroups.all;
			const tabItems: {
				label: string;
				description: string;
				uri: vscode.Uri;
			}[] = [];

			for (const group of tabGroups) {
				for (const tab of group.tabs) {
					if (tab.input instanceof vscode.TabInputText) {
						const uri = tab.input.uri;
						const label = uri.path.split("/").pop() || uri.path;
						tabItems.push({ label, description: uri.fsPath, uri });
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
				const document = await vscode.workspace.openTextDocument(item.uri);
				const fileName = document.fileName.split("/").pop();
				const fileContent = document.getText();
				markdownText += `\`\`\`${fileName}\n${fileContent}\n\`\`\`\n\n`;
			}

			await vscode.env.clipboard.writeText(markdownText);
			vscode.window.showInformationMessage(
				"Selected open files content copied as markdown to clipboard!"
			);
		}
	);

	const copyCurrentFileToMarkdownCommand = vscode.commands.registerCommand(
		"nils-prompt-tools.copyCurrentFileToMarkdown",
		async () => {
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
	);

	context.subscriptions.push(openFilesToMarkdownCommand);
	context.subscriptions.push(selectOpenFilesToMarkdownCommand);
	context.subscriptions.push(copyCurrentFileToMarkdownCommand);

	const treeDataProvider = new PromptToolsProvider();
	vscode.window.registerTreeDataProvider("promptToolsView", treeDataProvider);
}

export function deactivate() {}

class PromptToolsProvider implements vscode.TreeDataProvider<PromptToolItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<
		PromptToolItem | undefined | null | void
	> = new vscode.EventEmitter<PromptToolItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<
		PromptToolItem | undefined | null | void
	> = this._onDidChangeTreeData.event;

	getTreeItem(element: PromptToolItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: PromptToolItem): Thenable<PromptToolItem[]> {
		if (element) {
			return Promise.resolve([]);
		} else {
			return Promise.resolve(this.getPromptTools());
		}
	}

	private getPromptTools(): PromptToolItem[] {
		return [
			new PromptToolButtonItem(
				"Open Files to Markdown",
				"nils-prompt-tools.openFilesToMarkdown",
				"Copy all open files as markdown to clipboard"
			),
			new PromptToolButtonItem(
				"Select Open Files to Markdown",
				"nils-prompt-tools.selectOpenFilesToMarkdown",
				"Select specific open files to copy as markdown"
			),
			new PromptToolButtonItem(
				"Copy Current File to Markdown",
				"nils-prompt-tools.copyCurrentFileToMarkdown",
				"Copy the currently active file as markdown"
			),
		];
	}
}

class PromptToolItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly description?: string
	) {
		super(label, collapsibleState);
		this.description = description;
	}
}

class PromptToolButtonItem extends PromptToolItem {
	constructor(
		public readonly label: string,
		private commandId: string,
		public readonly description: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None, description);
		this.command = {
			command: commandId,
			title: this.label,
			arguments: [],
		};
		this.tooltip = this.description;
		this.iconPath = new vscode.ThemeIcon(
			"play-circle",
			new vscode.ThemeColor("button.background")
		);
		this.contextValue = "promptToolButton";
	}
}
