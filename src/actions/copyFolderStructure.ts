import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { appendToClipboard, shouldIgnorePath } from "../utils/fileUtils";

// Helper function to generate folder structure
async function generateFolderStructure(
	currentPath: string,
	rootPath: string,
	prefix: string = "",
	isLast: boolean = true,
	useAscii: boolean = false
): Promise<string> {
	let structure = "";
	const entries = await fs.promises.readdir(currentPath, {
		withFileTypes: true,
	});
	const filteredEntries = [];

	for (const entry of entries) {
		const fullPath = path.join(currentPath, entry.name);
		if (!(await shouldIgnorePath(fullPath, rootPath))) {
			filteredEntries.push(entry);
		}
	}

	// Symbols for tree branches
	const symbols = useAscii
		? { corner: "`-- ", cross: "|-- ", vertical: "|   ", space: "    " }
		: { corner: "└── ", cross: "├── ", vertical: "│   ", space: "    " };

	for (let i = 0; i < filteredEntries.length; i++) {
		const entry = filteredEntries[i];
		const isLastEntry = i === filteredEntries.length - 1;
		structure += `${prefix}${isLastEntry ? symbols.corner : symbols.cross}${
			entry.name
		}\n`;

		if (entry.isDirectory()) {
			const newPrefix = prefix + (isLast ? symbols.space : symbols.vertical);
			structure += await generateFolderStructure(
				path.join(currentPath, entry.name),
				rootPath,
				newPrefix,
				isLastEntry,
				useAscii
			);
		}
	}

	return structure;
}

export async function copyFolderStructure(append: boolean) {
	const options: vscode.OpenDialogOptions = {
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: "Select Folder",
	};

	const folderUri = await vscode.window.showOpenDialog(options);
	if (!folderUri || folderUri.length === 0) {
		return;
	}

	const folderPath = folderUri[0].fsPath;
	const folderName = path.basename(folderPath);

	let folderStructure = `Folder structure of ${folderName}:\n\n`;
	folderStructure += await generateFolderStructure(folderPath, folderPath);

	await appendToClipboard(folderStructure, append);
	vscode.window.showInformationMessage("Folder structure copied to clipboard!");
}
