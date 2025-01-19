import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { appendToClipboard } from "../utils/fileUtils";

export async function copySelectedProjectPrompt(append: boolean) {
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

		const selectedPrompt = await vscode.window.showQuickPick(promptItems, {
			placeHolder: "Select a prompt to copy",
		});

		if (selectedPrompt) {
			await appendToClipboard(selectedPrompt.prompt, append);
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
