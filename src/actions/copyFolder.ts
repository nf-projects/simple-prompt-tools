import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getRelativePath, appendToClipboard } from "../utils/fileUtils";

async function readFileAsMarkdown(
	filePath: string,
	rootPath: string
): Promise<string> {
	const content = await fs.promises.readFile(filePath, "utf-8");
	const relativePath = path.relative(rootPath, filePath);
	return `\`\`\`${relativePath}\n${content}\n\`\`\`\n\n`;
}

async function shouldIgnoreFile(
	filePath: string,
	rootPath: string
): Promise<boolean> {
	const relativePath = path.relative(rootPath, filePath);
	const pathParts = relativePath.split(path.sep);

	// Ignore common binary and system files
	const ignoredExtensions = [
		".exe",
		".dll",
		".so",
		".dylib",
		".png",
		".jpg",
		".jpeg",
		".gif",
		".ico",
		".vsix",
	];
	if (ignoredExtensions.some((ext) => filePath.toLowerCase().endsWith(ext))) {
		return true;
	}

	// Ignore common system directories
	if (
		pathParts.some((part) =>
			[".git", "node_modules", "dist", "out"].includes(part)
		)
	) {
		return true;
	}

	// Check .gitignore patterns
	const gitignorePath = path.join(rootPath, ".gitignore");
	if (fs.existsSync(gitignorePath)) {
		const ignorePatterns = (await fs.promises.readFile(gitignorePath, "utf-8"))
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith("#"));

		return ignorePatterns.some((pattern) => {
			if (pattern.endsWith("/")) {
				return pathParts.includes(pattern.slice(0, -1));
			}
			return pathParts.includes(pattern) || relativePath.endsWith(pattern);
		});
	}

	return false;
}

async function getAllFiles(dir: string, rootPath: string): Promise<string[]> {
	const files: string[] = [];
	const entries = await fs.promises.readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (await shouldIgnoreFile(fullPath, rootPath)) {
			continue;
		}

		if (entry.isDirectory()) {
			files.push(...(await getAllFiles(fullPath, rootPath)));
		} else {
			files.push(fullPath);
		}
	}

	return files;
}

export async function copyFolder(append: boolean) {
	const options: vscode.OpenDialogOptions = {
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: "Select Folder to Copy",
	};

	const folderUri = await vscode.window.showOpenDialog(options);
	if (!folderUri || folderUri.length === 0) {
		return;
	}

	const folderPath = folderUri[0].fsPath;

	try {
		// Get all files in the folder
		const files = await getAllFiles(folderPath, folderPath);

		if (files.length === 0) {
			vscode.window.showInformationMessage(
				"No suitable files found in the selected folder."
			);
			return;
		}

		// Allow user to select which files to include
		const fileItems = await Promise.all(
			files.map(async (file) => ({
				label: await getRelativePath(file),
				description: file,
			}))
		);

		const selectedItems = await vscode.window.showQuickPick(fileItems, {
			canPickMany: true,
			placeHolder: "Select files to copy (ESC to cancel)",
		});

		if (!selectedItems || selectedItems.length === 0) {
			return;
		}

		// Generate markdown content for selected files
		const markdownContent = await Promise.all(
			selectedItems.map((item) =>
				readFileAsMarkdown(item.description!, folderPath)
			)
		);

		await appendToClipboard(markdownContent.join(""), append);
		vscode.window.showInformationMessage(
			`${selectedItems.length} files copied! ${append ? "(APPEND)" : ""}`
		);
	} catch (error) {
		vscode.window.showErrorMessage(`Error copying folder: ${error}`);
	}
}
