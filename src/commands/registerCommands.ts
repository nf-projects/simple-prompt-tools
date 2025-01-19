import * as vscode from "vscode";
import { copySelectedProjectPrompt } from "../actions/copySelectedProjectPrompt";
import { openFilesToMarkdown } from "../actions/openFilesToMarkdown";
import { selectOpenFilesToMarkdown } from "../actions/selectOpenFilesToMarkdown";
import { copyCurrentFileToMarkdown } from "../actions/copyCurrentFileToMarkdown";
import { copyErrorsInCurrentFile } from "../actions/copyErrorsInCurrentFile";

export function registerCommands(context: vscode.ExtensionContext) {
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
