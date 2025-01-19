import * as vscode from "vscode";
import { getWebviewContent } from "./webviewContent";
import { handleWebviewMessage } from "./messageHandler";

export class PromptToolsViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "promptToolsView";

	constructor(private readonly _extensionUri: vscode.Uri) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};

		webviewView.webview.html = getWebviewContent(webviewView.webview);

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(async (data) => {
			console.log("Received message:", data);
			try {
				await handleWebviewMessage(data);
			} catch (error) {
				console.error("Error handling message:", error);
				vscode.window.showErrorMessage(`Error: ${(error as any)?.message}`);
			}
		});
	}
}
