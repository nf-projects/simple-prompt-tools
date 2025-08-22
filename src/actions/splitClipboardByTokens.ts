// This action provides functionality to split the user's clipboard content
// into multiple attachments based on accurate token counts using OpenAI's tiktoken library.
// This is useful for interacting with tools or APIs that have strict token limits
// for input, allowing large clipboard contents (e.g., copied files) to be
// broken down into manageable chunks while trying to preserve file integrity.
// The token counting is precise and matches what OpenAI models actually use.
import * as vscode from "vscode";
import {
	estimateTokenCount,
	getTokenCount,
	parseClipboardFiles,
	parseClipboardFilesAsync,
	groupFilesByTokenLimit,
	filesToMarkdown,
	ParsedFile,
} from "../utils/tokenUtils";

export async function splitClipboardByTokens() {
	try {
		// Read current clipboard content
		const clipboardContent = await vscode.env.clipboard.readText();

		if (!clipboardContent) {
			vscode.window.showInformationMessage("Clipboard is empty.");
			return;
		}

		// Get more accurate token count (this will load tiktoken if not already loaded)
		const totalTokens = await getTokenCount(clipboardContent);

		// Show current clipboard stats
		const proceed = await vscode.window.showInformationMessage(
			`Clipboard contains approximately ${totalTokens} tokens. Do you want to split it?`,
			"Yes",
			"No"
		);

		if (proceed !== "Yes") {
			return;
		}

		// Get max tokens per split from user
		const maxTokensInput = await vscode.window.showInputBox({
			prompt: "Enter maximum tokens per attachment",
			placeHolder: "e.g., 4000, 8000, 16000",
			value: "4000",
			validateInput: (value) => {
				const num = parseInt(value);
				if (isNaN(num) || num <= 0) {
					return "Please enter a valid positive number";
				}
				if (num < 100) {
					return "Token limit should be at least 100";
				}
				return null;
			},
		});

		if (!maxTokensInput) {
			return;
		}

		const maxTokensPerSplit = parseInt(maxTokensInput);

		// Try to parse as file-based content first (quick check)
		const parsedFiles = parseClipboardFiles(clipboardContent);

		if (parsedFiles.length > 0) {
			// Re-parse with accurate token counting
			const accurateParsedFiles = await parseClipboardFilesAsync(clipboardContent);
			// Handle file-based content with smart splitting
			await handleFileBasedContent(accurateParsedFiles, maxTokensPerSplit);
		} else {
			// Handle plain text content
			await handlePlainTextContent(clipboardContent, maxTokensPerSplit);
		}
	} catch (error) {
		vscode.window.showErrorMessage(`Error splitting clipboard: ${error}`);
		console.error("Detailed error:", error);
	}
}

async function handleFileBasedContent(
	files: ParsedFile[],
	maxTokensPerSplit: number
) {
	// Show file analysis
	const totalFiles = files.length;
	const totalTokens = files.reduce((sum, file) => sum + file.tokenCount, 0);
	const oversizedFiles = files.filter(
		(file) => file.tokenCount > maxTokensPerSplit
	);

	let message = `Found ${totalFiles} file(s) with ~${totalTokens} total tokens.`;
	if (oversizedFiles.length > 0) {
		message += `\n⚠️  ${oversizedFiles.length} file(s) exceed the token limit and will be in separate attachments.`;
	}

	const proceed = await vscode.window.showInformationMessage(
		message + "\n\nProceed with splitting?",
		"Yes",
		"No"
	);

	if (proceed !== "Yes") {
		return;
	}

	// Group files by token limit
	const fileGroups = groupFilesByTokenLimit(files, maxTokensPerSplit);

	// Create new editors for each group
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: "Creating split attachments...",
			cancellable: false,
		},
		async (progress) => {
			for (let i = 0; i < fileGroups.length; i++) {
				const group = fileGroups[i];
				const groupTokens = group.reduce(
					(sum, file) => sum + file.tokenCount,
					0
				);
				const groupContent = filesToMarkdown(group);

				// Create new untitled document
				const document = await vscode.workspace.openTextDocument({
					content: groupContent,
					language: "markdown",
				});

				// Show the document in a new editor
				await vscode.window.showTextDocument(document, {
					viewColumn: vscode.ViewColumn.Beside,
					preview: false,
				});

				// Update progress
				progress.report({
					message: `Created attachment ${i + 1}/${
						fileGroups.length
					} (~${groupTokens} tokens, ${group.length} files)`,
					increment: (1 / fileGroups.length) * 100,
				});

				// Small delay to prevent overwhelming the UI
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}
	);

	const summary = fileGroups
		.map((group, index) => {
			const tokens = group.reduce((sum, file) => sum + file.tokenCount, 0);
			return `• Attachment ${index + 1}: ${
				group.length
			} files, ~${tokens} tokens`;
		})
		.join("\n");

	vscode.window.showInformationMessage(
		`Successfully split into ${fileGroups.length} attachments:\n\n${summary}`
	);
}

async function handlePlainTextContent(
	content: string,
	maxTokensPerSplit: number
) {
	const totalTokens = await getTokenCount(content);

	if (totalTokens <= maxTokensPerSplit) {
		vscode.window.showInformationMessage(
			`Content (~${totalTokens} tokens) is already within the limit (${maxTokensPerSplit}). No splitting needed.`
		);
		return;
	}

	const proceed = await vscode.window.showInformationMessage(
		`Plain text content (~${totalTokens} tokens) will be split into chunks. Proceed?`,
		"Yes",
		"No"
	);

	if (proceed !== "Yes") {
		return;
	}

	// Split text into roughly equal chunks
	const chunks = splitTextIntoChunks(content, maxTokensPerSplit);

	// Create new editors for each chunk
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: "Creating text chunks...",
			cancellable: false,
		},
		async (progress) => {
			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				const chunkTokens = await getTokenCount(chunk);

				// Create new untitled document
				const document = await vscode.workspace.openTextDocument({
					content: chunk,
					language: "plaintext",
				});

				// Show the document in a new editor
				await vscode.window.showTextDocument(document, {
					viewColumn: vscode.ViewColumn.Beside,
					preview: false,
				});

				// Update progress
				progress.report({
					message: `Created chunk ${i + 1}/${
						chunks.length
					} (~${chunkTokens} tokens)`,
					increment: (1 / chunks.length) * 100,
				});

				// Small delay to prevent overwhelming the UI
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}
	);

	vscode.window.showInformationMessage(
		`Successfully split text into ${chunks.length} chunks.`
	);
}

function splitTextIntoChunks(
	text: string,
	maxTokensPerChunk: number
): string[] {
	const chunks: string[] = [];
	const lines = text.split("\n");

	let currentChunk = "";
	let currentTokens = 0;

	for (const line of lines) {
		const lineTokens = estimateTokenCount(line + "\n");

		// If this line alone exceeds the limit, add it as its own chunk
		if (lineTokens > maxTokensPerChunk) {
			// Save current chunk if it has content
			if (currentChunk) {
				chunks.push(currentChunk.trim());
				currentChunk = "";
				currentTokens = 0;
			}

			// Add the long line as its own chunk
			chunks.push(line);
			continue;
		}

		// If adding this line would exceed the limit, start a new chunk
		if (currentTokens + lineTokens > maxTokensPerChunk) {
			if (currentChunk) {
				chunks.push(currentChunk.trim());
				currentChunk = "";
				currentTokens = 0;
			}
		}

		// Add line to current chunk
		currentChunk += line + "\n";
		currentTokens += lineTokens;
	}

	// Add the last chunk if it has content
	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim());
	}

	return chunks;
}
