import { copySelectedProjectPrompt } from "../actions/copySelectedProjectPrompt";
import { openFilesToMarkdown } from "../actions/openFilesToMarkdown";
import { selectOpenFilesToMarkdown } from "../actions/selectOpenFilesToMarkdown";
import { copyCurrentFileToMarkdown } from "../actions/copyCurrentFileToMarkdown";
import { copyErrorsInCurrentFile } from "../actions/copyErrorsInCurrentFile";
import { copyFolderStructure } from "../actions/copyFolderStructure";

interface WebviewMessage {
	type: string;
	append: boolean;
}

export async function handleWebviewMessage(data: WebviewMessage) {
	console.log("Handling message:", data);

	try {
		switch (data.type) {
			case "copySelectedProjectPrompt":
				await copySelectedProjectPrompt(data.append);
				break;
			case "copyFolderStructure":
				await copyFolderStructure(data.append);
				break;
			case "openFilesToMarkdown":
				await openFilesToMarkdown(data.append);
				break;
			case "selectOpenFilesToMarkdown":
				await selectOpenFilesToMarkdown(data.append);
				break;
			case "copyCurrentFileToMarkdown":
				await copyCurrentFileToMarkdown(data.append);
				break;
			case "copyErrorsInCurrentFile":
				await copyErrorsInCurrentFile(data.append);
				break;
			default:
				console.warn("Unknown message type:", data.type);
		}
	} catch (error) {
		console.error("Error in message handler:", error);
		throw error;
	}
}
