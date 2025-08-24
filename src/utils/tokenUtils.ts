/**
 * Utility functions for accurate token counting using OpenAI's tiktoken library.
 * Uses lazy loading with the lite version to avoid blocking extension startup.
 */

// Lazy-loaded tiktoken modules to avoid blocking extension startup
let Tiktoken: any = null;
let cl100k_base: any = null;
let encoder: any = null;
let isLoading = false;

/**
 * Lazily loads tiktoken lite version only when needed
 */
async function loadTiktoken() {
	if (encoder) {
		return encoder;
	}

	if (isLoading) {
		// Wait for ongoing load to complete
		while (isLoading) {
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
		return encoder;
	}

	try {
		isLoading = true;

		// Dynamically import the lite version to avoid blocking startup
		const tiktokenModule = await import("tiktoken/lite");
		Tiktoken = tiktokenModule.Tiktoken;

		// Load the cl100k_base encoding (used by GPT-4, GPT-3.5-turbo, etc.)
		cl100k_base = require("tiktoken/encoders/cl100k_base.json");

		// Create the encoder
		encoder = new Tiktoken(
			cl100k_base.bpe_ranks,
			cl100k_base.special_tokens,
			cl100k_base.pat_str
		);

		console.log("Tiktoken loaded successfully");
		return encoder;
	} catch (error) {
		console.warn("Failed to load tiktoken:", error);
		return null;
	} finally {
		isLoading = false;
	}
}

/**
 * Simple approximation fallback for when tiktoken isn't available
 */
function getApproximateTokenCount(text: string): number {
	const words = text
		.trim()
		.split(/\s+/)
		.filter((word) => word.length > 0);
	const wordCount = words.length;
	const charCount = text.replace(/\s/g, "").length;
	return Math.ceil(wordCount + charCount / 4);
}

/**
 * Gets token count of a given text string. Uses exact tiktoken counting when available,
 * falls back to approximation for fast startup.
 */
export async function getTokenCount(text: string): Promise<number> {
	if (!text) {
		return 0;
	}

	try {
		const enc = await loadTiktoken();
		if (enc) {
			const tokens = enc.encode(text);
			// WHY: Adjust for the overestimation of tokens by the downloaded tokenizer
			// (which estimates ~1.75 tokens per true GPT-4 token).
			return Math.ceil(tokens.length / 1.75);
		}
	} catch (error) {
		console.warn("Error using tiktoken:", error);
	}

	// Fallback to approximation
	return getApproximateTokenCount(text);
}

/**
 * Synchronous version that uses approximation for immediate results,
 * but starts loading tiktoken in the background for future calls.
 */
export function estimateTokenCount(text: string): number {
	if (!text) {
		return 0;
	}

	// Start loading tiktoken in the background if not already loaded/loading
	if (!encoder && !isLoading) {
		loadTiktoken().catch(() => {
			// Silently handle errors - we'll use approximation
		});
	}

	// For synchronous calls, always use approximation to avoid blocking
	return Math.ceil(getApproximateTokenCount(text) / 1.75);
}

/**
 * Cleanup function to free the encoder when no longer needed.
 */
export function cleanup() {
	if (encoder) {
		encoder.free();
		encoder = null;
	}
	Tiktoken = null;
	cl100k_base = null;
}

/**
 * Estimates token count for markdown code blocks with file content.
 * Takes into account the markdown formatting overhead.
 */
export function estimateMarkdownFileTokenCount(
	filename: string,
	content: string
): number {
	// The markdown format is: ```filename\ncontent\n```\n\n
	const markdownOverhead = `\`\`\`${filename}\n\n\`\`\`\n\n`;
	const totalContent = markdownOverhead + content;
	return estimateTokenCount(totalContent);
}

/**
 * Async version for more accurate token counting when tiktoken is available
 */
export async function getMarkdownFileTokenCount(
	filename: string,
	content: string
): Promise<number> {
	// The markdown format is: ```filename\ncontent\n```\n\n
	const markdownOverhead = `\`\`\`${filename}\n\n\`\`\`\n\n`;
	const totalContent = markdownOverhead + content;
	return await getTokenCount(totalContent);
}

/**
 * Parses clipboard content that contains multiple files in markdown format.
 * Returns an array of file objects with their content and estimated token counts.
 */
export interface ParsedFile {
	filename: string;
	content: string;
	tokenCount: number;
	rawMarkdown: string;
}

export function parseClipboardFiles(clipboardContent: string): ParsedFile[] {
	const files: ParsedFile[] = [];

	// Regular expression to match ```filename\ncontent\n``` blocks
	const fileBlockRegex = /```([^\n]*)\n([\s\S]*?)```/g;
	let match;

	while ((match = fileBlockRegex.exec(clipboardContent)) !== null) {
		const filename = match[1].trim();
		const content = match[2];
		const rawMarkdown = match[0] + "\n\n";

		if (filename) {
			const tokenCount = estimateMarkdownFileTokenCount(filename, content);
			files.push({
				filename,
				content,
				tokenCount,
				rawMarkdown,
			});
		}
	}

	return files;
}

/**
 * Async version with more accurate token counting
 */
export async function parseClipboardFilesAsync(
	clipboardContent: string
): Promise<ParsedFile[]> {
	const files: ParsedFile[] = [];

	// Regular expression to match ```filename\ncontent\n``` blocks
	const fileBlockRegex = /```([^\n]*)\n([\s\S]*?)```/g;
	let match;

	while ((match = fileBlockRegex.exec(clipboardContent)) !== null) {
		const filename = match[1].trim();
		const content = match[2];
		const rawMarkdown = match[0] + "\n\n";

		if (filename) {
			const tokenCount = await getMarkdownFileTokenCount(filename, content);
			files.push({
				filename,
				content,
				tokenCount,
				rawMarkdown,
			});
		}
	}

	return files;
}

/**
 * Groups files into chunks that don't exceed the maximum token count.
 * Prioritizes keeping individual files together when possible.
 */
export function groupFilesByTokenLimit(
	files: ParsedFile[],
	maxTokensPerGroup: number
): ParsedFile[][] {
	const groups: ParsedFile[][] = [];
	let currentGroup: ParsedFile[] = [];
	let currentGroupTokens = 0;

	for (const file of files) {
		// If this single file exceeds the limit, it gets its own group
		if (file.tokenCount > maxTokensPerGroup) {
			// Finish current group if it has content
			if (currentGroup.length > 0) {
				groups.push(currentGroup);
				currentGroup = [];
				currentGroupTokens = 0;
			}

			// Add the oversized file as its own group
			groups.push([file]);
			continue;
		}

		// If adding this file would exceed the limit, start a new group
		if (currentGroupTokens + file.tokenCount > maxTokensPerGroup) {
			if (currentGroup.length > 0) {
				groups.push(currentGroup);
				currentGroup = [];
				currentGroupTokens = 0;
			}
		}

		// Add file to current group
		currentGroup.push(file);
		currentGroupTokens += file.tokenCount;
	}

	// Add the last group if it has content
	if (currentGroup.length > 0) {
		groups.push(currentGroup);
	}

	return groups;
}

/**
 * Converts a group of files back to markdown format.
 */
export function filesToMarkdown(files: ParsedFile[]): string {
	return files.map((file) => file.rawMarkdown).join("");
}

// WHY: This function implements a binary search-like approach to find the largest prefix of a given text
// that fits within a specified token limit. It is crucial for ensuring that no generated chunk
// (whether it's a file part or plain text) ever exceeds the maximum token count, thus guaranteeing
// compliance with API limits.
async function findLongestPrefixWithinTokenLimit(
	text: string,
	maxTokens: number,
	tokenCounter: (s: string) => Promise<number>
): Promise<number> {
	let low = 0;
	let high = text.length;
	let best = 0;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const candidate = text.slice(0, mid);
		const tokens = await tokenCounter(candidate);
		if (tokens <= maxTokens) {
			best = mid;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}

	// Ensure we make forward progress even in worst cases
	return Math.max(1, best);
}

// WHY: This generic splitting function uses `findLongestPrefixWithinTokenLimit` to iteratively
// break down any given text into an array of chunks, each guaranteed to be within the `maxTokensPerChunk`.
// It forms the core logic for all token-based splitting, whether for files or plain text.
export async function splitByTokenLimit(
	text: string,
	maxTokensPerChunk: number,
	tokenCounter: (s: string) => Promise<number>
): Promise<string[]> {
	const chunks: string[] = [];
	let remaining = text;

	while (remaining.length > 0) {
		const take = await findLongestPrefixWithinTokenLimit(
			remaining,
			maxTokensPerChunk,
			tokenCounter
		);
		const part = remaining.slice(0, take);
		chunks.push(part);
		remaining = remaining.slice(take);
	}

	return chunks;
}

// WHY: A specialized version of `splitByTokenLimit` for plain text, directly using `getTokenCount`.
// This simplifies the interface for splitting unstructured text.
export async function splitTextByTokenLimit(
	text: string,
	maxTokensPerChunk: number
): Promise<string[]> {
	return splitByTokenLimit(text, maxTokensPerChunk, getTokenCount);
}

// WHY: This function handles splitting individual markdown-formatted file blocks (like ` ```filename\ncontent\n``` `)
// into multiple smaller blocks if their token count exceeds `maxTokensPerChunk`. It maintains the markdown
// fencing for each sub-chunk, ensuring that the output remains valid and parsable as distinct file blocks.
// This is critical for files that are themselves too large to fit into a single token-limited attachment.
export async function splitMarkdownFileIntoTokenChunks(
	filename: string,
	content: string,
	maxTokensPerChunk: number
): Promise<ParsedFile[]> {
	const parts = await splitByTokenLimit(
		content,
		maxTokensPerChunk,
		async (s: string) => await getMarkdownFileTokenCount(filename, s)
	);

	const result: ParsedFile[] = [];
	for (const part of parts) {
		const rawMarkdown = `\`\`\`${filename}\n${part}\n\`\`\`\n\n`;
		const tokenCount = await getTokenCount(rawMarkdown);
		result.push({ filename, content: part, tokenCount, rawMarkdown });
	}
	return result;
}
