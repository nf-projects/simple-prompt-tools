import * as vscode from "vscode";
import { getRelativePath, appendToClipboard } from "../utils/fileUtils";

export async function selectOpenFilesToMarkdown(append: boolean) {
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

	await appendToClipboard(markdownText, append);
	vscode.window.showInformationMessage(
		`Selected files content copied! ${append ? "(APPEND)" : ""}`
	);
}
