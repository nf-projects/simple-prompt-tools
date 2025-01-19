import * as vscode from "vscode";
import { getRelativePath, appendToClipboard } from "../utils/fileUtils";

export async function copyErrorsInAllOpenFiles(append: boolean) {
	const tabGroups = vscode.window.tabGroups.all;
	let markdownText = "";
	let totalErrors = 0;
	let filesWithErrors = 0;

	for (const group of tabGroups) {
		for (const tab of group.tabs) {
			if (tab.input instanceof vscode.TabInputText) {
				const document = await vscode.workspace.openTextDocument(tab.input.uri);
				const diagnostics = vscode.languages.getDiagnostics(document.uri);
				const errors = diagnostics.filter(
					(diag) => diag.severity === vscode.DiagnosticSeverity.Error
				);

				if (errors.length > 0) {
					filesWithErrors++;
					totalErrors += errors.length;
					const relativePath = await getRelativePath(document.fileName);
					markdownText += `\nFile: ${relativePath}\n`;

					for (const error of errors) {
						const line = document.lineAt(error.range.start.line);
						markdownText += `- Error in line ${error.range.start.line + 1} (${
							line.text
						}): ${error.message}\n`;
					}
					markdownText += "\n";
				}
			}
		}
	}

	if (totalErrors === 0) {
		vscode.window.showInformationMessage("No errors found in any open files.");
		return;
	}

	const header = `Found ${totalErrors} error${
		totalErrors === 1 ? "" : "s"
	} in ${filesWithErrors} file${filesWithErrors === 1 ? "" : "s"}:\n`;
	markdownText = header + markdownText;

	await appendToClipboard(markdownText, append);
	vscode.window.showInformationMessage(
		`Copied ${totalErrors} errors from ${filesWithErrors} files! ${
			append ? "(APPEND)" : ""
		}`
	);
}
