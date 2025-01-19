import * as vscode from "vscode";
import { getRelativePath, appendToClipboard } from "../utils/fileUtils";

export async function copyCurrentFileToMarkdown(append: boolean) {
	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor) {
		const document = activeEditor.document;
		const relativePath = await getRelativePath(document.fileName);
		const fileContent = document.getText();
		let markdownText = `\`\`\`${relativePath}\n${fileContent}\n\`\`\`\n\n`;

		await appendToClipboard(markdownText, append);
		vscode.window.showInformationMessage(
			`Current file copied! ${append ? "(APPEND)" : ""}`
		);
	} else {
		vscode.window.showInformationMessage("No active editor found.");
	}
}
