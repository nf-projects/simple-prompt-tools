import * as vscode from "vscode";
import { getRelativePath, appendToClipboard } from "../utils/fileUtils";

export async function copyErrorsInCurrentFile(append: boolean) {
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
		let markdownText = `The following errors were found in the file ${relativePath}:\n\n`;

		for (const error of errors) {
			const line = document.lineAt(error.range.start.line);
			markdownText += `- Error in line ${error.range.start.line + 1} (${
				line.text
			}): ${error.message}\n`;
		}

		await appendToClipboard(markdownText, append);
		vscode.window.showInformationMessage(
			`${errors.length} errors copied! ${append ? "(APPEND)" : ""}`
		);
	} else {
		vscode.window.showInformationMessage("No active editor found.");
	}
}
