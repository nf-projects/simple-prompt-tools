import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	console.log(
		'Congratulations, your extension "nils-prompt-tools" is now active!'
	);

	const helloWorldCommand = vscode.commands.registerCommand(
		"nils-prompt-tools.helloWorld",
		() => {
			vscode.window.showInformationMessage(
				"Hello World from nils-prompt-tools!"
			);
		}
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

	context.subscriptions.push(helloWorldCommand);
	context.subscriptions.push(openFilesToMarkdownCommand);
	context.subscriptions.push(selectOpenFilesToMarkdownCommand);
}

export function deactivate() {}
