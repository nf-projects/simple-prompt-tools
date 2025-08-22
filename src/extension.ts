import * as vscode from "vscode";
import { PromptToolsViewProvider } from "./webview/PromptToolsViewProvider";
import { registerCommands } from "./commands/registerCommands";
import { cleanup } from "./utils/tokenUtils";

export function activate(context: vscode.ExtensionContext) {
	const provider = new PromptToolsViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			PromptToolsViewProvider.viewType,
			provider
		)
	);

	// Register all commands
	registerCommands(context);
}

export function deactivate() {
	// Clean up tiktoken encoder to free memory
	cleanup();
}
