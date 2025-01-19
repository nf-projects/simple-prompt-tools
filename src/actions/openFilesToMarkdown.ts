import * as vscode from "vscode";
import { getRelativePath, appendToClipboard } from "../utils/fileUtils";

export async function openFilesToMarkdown(append: boolean) {
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
		await appendToClipboard(markdownText, append);
		vscode.window.showInformationMessage(
			`Open files copied! ${append ? "(APPEND)" : ""}`
		);
	}
}
