// This action provides functionality to split the user's clipboard content
// into multiple attachments based on accurate token counts using OpenAI's tiktoken library.
// This is useful for interacting with tools or APIs that have strict token limits
// for input, allowing large clipboard contents (e.g., copied files) to be
// broken down into manageable chunks while trying to preserve file integrity.
// The token counting is precise and matches what OpenAI models actually use.
import * as vscode from "vscode";
import {
	getTokenCount,
	parseClipboardFiles,
	parseClipboardFilesAsync,
	groupFilesByTokenLimit,
	filesToMarkdown,
	ParsedFile,
	splitTextByTokenLimit,
	splitMarkdownFileIntoTokenChunks,
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

		// WHY: Introduce a user preference for how the clipboard content should be split.
		// This addresses the limitation where the system previously broke if file content
		// was not present or sufficient, and now allows for a strict token-based split
		// regardless of the content structure.
		const strategy = await vscode.window.showQuickPick(
			[
				{
					label: "Prefer file-based grouping",
					description:
						"Keep files together when possible; fallback to strict token chunks",
				},
				{
					label: "Strict token chunks",
					description: "Ignore file boundaries; split by tokens only",
				},
			],
			{ placeHolder: "Choose splitting strategy" }
		);

		const preferFiles = strategy?.label === "Prefer file-based grouping";

		// Try to parse as file-based content first (quick check)
		const parsedFiles = parseClipboardFiles(clipboardContent);

		// WHY: Based on the user's strategy preference, either try to group by file boundaries
		// or strictly enforce token limits, even if it means splitting individual files or lines.
		if (preferFiles && parsedFiles.length > 0) {
			// Re-parse with accurate token counting
			const accurateParsedFiles = await parseClipboardFilesAsync(
				clipboardContent
			);
			// WHY: Handle file-based content with smart splitting, but now guarantee
			// that no individual chunk (or file within a chunk) exceeds the token limit.
			await handleFileBasedContent(accurateParsedFiles, maxTokensPerSplit);
		} else {
			// WHY: For plain text or when strict token splitting is preferred, ensure
			// content is broken down solely based on the token limit, ignoring file structure.
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
	// WHY: This first step ensures that even individual files that are larger than the maxTokensPerSplit
	// are themselves broken down into smaller, token-compliant chunks. This guarantees that no single
	// output chunk will ever exceed the user-defined token limit.
	const normalizedFiles: ParsedFile[] = [];
	for (const file of files) {
		if (file.tokenCount > maxTokensPerSplit) {
			const splitParts = await splitMarkdownFileIntoTokenChunks(
				file.filename,
				file.content,
				maxTokensPerSplit
			);
			normalizedFiles.push(...splitParts);
		} else {
			normalizedFiles.push(file);
		}
	}

	// Show analysis
	const totalFiles = normalizedFiles.length;
	const totalTokens = normalizedFiles.reduce((sum, f) => sum + f.tokenCount, 0);

	const proceed = await vscode.window.showInformationMessage(
		`Prepared ${totalFiles} file block(s) with ~${totalTokens} total tokens. Proceed with grouping and output?`,
		"Yes",
		"No"
	);
	if (proceed !== "Yes") {
		return;
	}

	// WHY: After ensuring individual files are within limits, group them into larger attachments.
	// The `groupFilesByTokenLimit` function intelligently combines files while respecting the
	// overall `maxTokensPerSplit` for each group, trying to keep related file blocks together.
	const fileGroups = groupFilesByTokenLimit(normalizedFiles, maxTokensPerSplit);

	// WHY: Prompt the user for the desired output method, enhancing user experience
	// by providing options beyond just opening new editor tabs.
	const output = await vscode.window.showQuickPick(
		[
			{ label: "Open in editors", description: "Create one editor per chunk" },
			{
				label: "Interactive clipboard copy",
				description: "Copy chunk-by-chunk with Next button",
			},
		],
		{ placeHolder: "Choose output method" }
	);
	const openEditors = output?.label === "Open in editors";

	const chunkStrings = fileGroups.map((group) => filesToMarkdown(group));
	// WHY: Execute the chosen output method based on user preference.
	// `createEditorsForChunks` handles opening new editor tabs.
	// `interactiveClipboardCopy` provides a guided, chunk-by-chunk copy experience.
	if (openEditors) {
		await createEditorsForChunks(chunkStrings, "markdown");
		const summary = fileGroups
			.map((group, index) => {
				const tokens = group.reduce((sum, file) => sum + file.tokenCount, 0);
				return `• Attachment ${index + 1}: ${
					group.length
				} file block(s), ~${tokens} tokens`;
			})
			.join("\n");

		vscode.window.showInformationMessage(
			`Successfully split into ${fileGroups.length} attachments:\n\n${summary}`
		);
	} else {
		await interactiveClipboardCopy(chunkStrings);
	}
}

async function handlePlainTextContent(
	content: string,
	maxTokensPerSplit: number
) {
	const totalTokens = await getTokenCount(content);

	const proceed = await vscode.window.showInformationMessage(
		`Plain text content (~${totalTokens} tokens). Proceed to split into token-bounded chunks (≤ ${maxTokensPerSplit}) and choose output method?`,
		"Yes",
		"No"
	);

	if (proceed !== "Yes") {
		return;
	}

	// WHY: Strictly split the plain text content into chunks that adhere to the maximum token limit.
	// This ensures that even large blocks of unstructured text are manageable for tools with token constraints.
	const chunks = await splitTextByTokenLimit(content, maxTokensPerSplit);

	// WHY: Prompt the user for their preferred output method, enhancing usability.
	const output = await vscode.window.showQuickPick(
		[
			{ label: "Open in editors", description: "Create one editor per chunk" },
			{
				label: "Interactive clipboard copy",
				description: "Copy chunk-by-chunk with Next button",
			},
		],
		{ placeHolder: "Choose output method" }
	);
	const openEditors = output?.label === "Open in editors";

	// WHY: Execute the selected output method.
	if (openEditors) {
		await createEditorsForChunks(chunks, "plaintext");
		vscode.window.showInformationMessage(
			`Successfully split text into ${chunks.length} chunks.`
		);
	} else {
		await interactiveClipboardCopy(chunks);
	}
}

// WHY: Helper function to standardize the process of opening new untitled editor tabs for content chunks.
// This improves code reusability and maintains consistency in how split results are presented to the user.
async function createEditorsForChunks(
	chunks: string[],
	language: "markdown" | "plaintext"
) {
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title:
				language === "markdown"
					? "Creating split attachments..."
					: "Creating text chunks...",
			cancellable: false,
		},
		async (progress) => {
			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				const chunkTokens = await getTokenCount(chunk);

				const document = await vscode.workspace.openTextDocument({
					content: chunk,
					language,
				});
				await vscode.window.showTextDocument(document, {
					viewColumn: vscode.ViewColumn.Beside,
					preview: false,
				});
				progress.report({
					message: `Created chunk ${i + 1}/${
						chunks.length
					} (~${chunkTokens} tokens)`,
					increment: (1 / chunks.length) * 100,
				});
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}
	);
}

// WHY: Provides an alternative, user-friendly way to handle split content by copying chunks sequentially
// to the clipboard with explicit user interaction. This is useful for users who prefer to paste content
// directly into other applications without creating multiple temporary editor tabs.
async function interactiveClipboardCopy(chunks: string[]) {
	if (chunks.length === 0) {
		vscode.window.showInformationMessage("No chunks to copy.");
		return;
	}
	let index = 0;
	await vscode.env.clipboard.writeText(chunks[index]);
	let action: string | undefined = await vscode.window.showInformationMessage(
		`First chunk copied (1/${chunks.length}). Copy next?`,
		"Copy next",
		"Cancel"
	);
	while (action === "Copy next") {
		index++;
		if (index >= chunks.length) {
			vscode.window.showInformationMessage("All chunks copied.");
			return;
		}
		await vscode.env.clipboard.writeText(chunks[index]);
		action = await vscode.window.showInformationMessage(
			`Chunk ${index + 1}/${chunks.length} copied. Copy next?`,
			"Copy next",
			"Cancel"
		);
	}
}
