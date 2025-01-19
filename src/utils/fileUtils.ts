import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

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

// Shared gitignore reading function
export async function readGitignore(dir: string): Promise<string[]> {
	const gitignorePath = path.join(dir, ".gitignore");
	if (fs.existsSync(gitignorePath)) {
		const content = await fs.promises.readFile(gitignorePath, "utf-8");
		return content
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith("#"));
	}
	return [];
}

// Shared ignore logic for both folder structure and file copying
export async function shouldIgnorePath(
	filePath: string,
	rootPath: string
): Promise<boolean> {
	const relativePath = path.relative(rootPath, filePath);
	const pathParts = relativePath.split(path.sep);

	// Always ignore .git and node_modules
	if (pathParts.includes(".git") || pathParts.includes("node_modules")) {
		return true;
	}

	const ignorePatterns = await readGitignore(rootPath);
	return ignorePatterns.some((pattern) => {
		if (pattern.endsWith("/")) {
			return pathParts.some((part) => part === pattern.slice(0, -1));
		}
		return pathParts.includes(pattern) || relativePath.endsWith(pattern);
	});
}
