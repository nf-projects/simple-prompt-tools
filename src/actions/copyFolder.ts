import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
	getRelativePath,
	appendToClipboard,
	shouldIgnorePath,
} from "../utils/fileUtils";

const BATCH_SIZE = 50; // Process 50 files at a time

async function readFileAsMarkdown(
	filePath: string,
	rootPath: string
): Promise<string> {
	try {
		const content = await fs.promises.readFile(filePath, "utf-8");
		const relativePath = path.relative(rootPath, filePath);
		return `\`\`\`${relativePath}\n${content}\n\`\`\`\n\n`;
	} catch (error) {
		console.error(`Error reading file ${filePath}:`, error);
		return `\`\`\`${path.relative(rootPath, filePath)}\nError reading file: ${
			(error as any)?.message
		}\n\`\`\`\n\n`;
	}
}

async function* getAllFiles(
	dir: string,
	rootPath: string
): AsyncGenerator<string> {
	const entries = await fs.promises.readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (await shouldIgnorePath(fullPath, rootPath)) {
			continue;
		}

		if (entry.isDirectory()) {
			yield* getAllFiles(fullPath, rootPath);
		} else {
			yield fullPath;
		}
	}
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
		// Collect files with progress bar
		const files: string[] = [];
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: "Scanning files...",
				cancellable: true,
			},
			async (progress, token) => {
				let count = 0;
				for await (const file of getAllFiles(folderPath, folderPath)) {
					if (token.isCancellationRequested) {
						return;
					}
					files.push(file);
					count++;
					if (count % 100 === 0) {
						progress.report({ message: `Found ${count} files...` });
					}
				}
			}
		);

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
			placeHolder: `Select files to copy (${files.length} files found, ESC to cancel)`,
		});

		if (!selectedItems || selectedItems.length === 0) {
			return;
		}

		// Process selected files in batches with progress bar
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: "Copying files...",
				cancellable: true,
			},
			async (progress, token) => {
				let processedFiles = 0;
				const totalFiles = selectedItems.length;
				let markdownContent = "";

				// Process files in batches
				for (let i = 0; i < selectedItems.length; i += BATCH_SIZE) {
					if (token.isCancellationRequested) {
						return;
					}

					const batch = selectedItems.slice(i, i + BATCH_SIZE);
					const batchContent = await Promise.all(
						batch.map((item) =>
							readFileAsMarkdown(item.description!, folderPath)
						)
					);

					markdownContent += batchContent.join("");
					processedFiles += batch.length;

					progress.report({
						message: `Processing files... ${processedFiles}/${totalFiles}`,
						increment: (batch.length / totalFiles) * 100,
					});

					// Periodically clear the batch content to help with memory
					if (i % (BATCH_SIZE * 4) === 0) {
						await appendToClipboard(markdownContent, append || i > 0);
						markdownContent = "";
					}
				}

				// Final append if there's remaining content
				if (markdownContent) {
					await appendToClipboard(
						markdownContent,
						append || processedFiles > BATCH_SIZE
					);
				}
			}
		);

		vscode.window.showInformationMessage(
			`${selectedItems.length} files copied! ${append ? "(APPEND)" : ""}`
		);
	} catch (error) {
		vscode.window.showErrorMessage(`Error copying folder: ${error}`);
		console.error("Detailed error:", error);
	}
}
