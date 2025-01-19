import * as vscode from "vscode";
import * as path from "path";

export async function getRelativePath(filePath: string): Promise<string> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		return filePath;
	}
	const rootPath = workspaceFolders[0].uri.fsPath;
	return path.relative(rootPath, filePath);
}

export async function appendToClipboard(
	content: string,
	append: boolean
): Promise<void> {
	try {
		if (append) {
			console.log("Appending to clipboard");
			const currentClipboard = await vscode.env.clipboard.readText();
			if (currentClipboard) {
				content = currentClipboard + "\n\n" + content;
			}
		}
		await vscode.env.clipboard.writeText(content);
	} catch (error) {
		console.error("Error with clipboard operation:", error);
		throw error;
	}
}
