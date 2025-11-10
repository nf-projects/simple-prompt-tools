import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Storage location in user's home directory
const STORAGE_DIR = path.join(os.homedir(), ".simple-prompt-tools");
const TEMPLATES_FILE = path.join(STORAGE_DIR, "editor-templates.json");

interface EditorTemplates {
	[projectPath: string]: {
		[templateName: string]: string[];
	};
}

// Ensure storage directory and file exist
function ensureStorageExists(): void {
	if (!fs.existsSync(STORAGE_DIR)) {
		fs.mkdirSync(STORAGE_DIR, { recursive: true });
	}
	if (!fs.existsSync(TEMPLATES_FILE)) {
		fs.writeFileSync(TEMPLATES_FILE, JSON.stringify({}, null, 2));
	}
}

// Read templates from storage
function readTemplates(): EditorTemplates {
	ensureStorageExists();
	try {
		const content = fs.readFileSync(TEMPLATES_FILE, "utf-8");
		return JSON.parse(content);
	} catch (error) {
		console.error("Error reading templates:", error);
		return {};
	}
}

// Write templates to storage
function writeTemplates(templates: EditorTemplates): void {
	ensureStorageExists();
	try {
		fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
	} catch (error) {
		console.error("Error writing templates:", error);
		throw new Error(`Failed to save templates: ${error}`);
	}
}

// Get current workspace path as a key
function getWorkspaceKey(): string | null {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return null;
	}
	return workspaceFolders[0].uri.fsPath;
}

// Get all currently open editor file paths
function getCurrentOpenFiles(): string[] {
	const openFiles: string[] = [];
	const tabGroups = vscode.window.tabGroups.all;

	for (const group of tabGroups) {
		for (const tab of group.tabs) {
			if (tab.input instanceof vscode.TabInputText) {
				openFiles.push(tab.input.uri.fsPath);
			}
		}
	}

	return openFiles;
}

// Save current editor set as a template
export async function saveEditorTemplate() {
	const workspaceKey = getWorkspaceKey();
	if (!workspaceKey) {
		vscode.window.showErrorMessage("No workspace folder open.");
		return;
	}

	const openFiles = getCurrentOpenFiles();
	if (openFiles.length === 0) {
		vscode.window.showInformationMessage("No files are currently open.");
		return;
	}

	const templateName = await vscode.window.showInputBox({
		prompt: `Save ${openFiles.length} open file(s) as template`,
		placeHolder: "Enter template name (e.g., 'frontend-work', 'api-debugging')",
		validateInput: (value) => {
			if (!value || value.trim().length === 0) {
				return "Template name cannot be empty";
			}
			if (value.includes("/") || value.includes("\\")) {
				return "Template name cannot contain slashes";
			}
			return null;
		},
	});

	if (!templateName) {
		return;
	}

	try {
		const templates = readTemplates();

		if (!templates[workspaceKey]) {
			templates[workspaceKey] = {};
		}

		// Check if template already exists
		if (templates[workspaceKey][templateName]) {
			const overwrite = await vscode.window.showWarningMessage(
				`Template "${templateName}" already exists. Overwrite?`,
				"Yes",
				"No"
			);
			if (overwrite !== "Yes") {
				return;
			}
		}

		templates[workspaceKey][templateName] = openFiles;
		writeTemplates(templates);

		vscode.window.showInformationMessage(
			`Template "${templateName}" saved with ${openFiles.length} file(s)!`
		);
	} catch (error) {
		vscode.window.showErrorMessage(`Error saving template: ${error}`);
	}
}

// Load an existing template
export async function loadEditorTemplate() {
	const workspaceKey = getWorkspaceKey();
	if (!workspaceKey) {
		vscode.window.showErrorMessage("No workspace folder open.");
		return;
	}

	const templates = readTemplates();
	const projectTemplates = templates[workspaceKey];

	if (!projectTemplates || Object.keys(projectTemplates).length === 0) {
		vscode.window.showInformationMessage(
			"No templates saved for this project."
		);
		return;
	}

	// Create quick pick items with file count
	const templateItems = Object.entries(projectTemplates).map(
		([name, files]) => ({
			label: name,
			description: `${files.length} file(s)`,
			files,
		})
	);

	const selectedTemplate = await vscode.window.showQuickPick(templateItems, {
		placeHolder: "Select a template to load",
	});

	if (!selectedTemplate) {
		return;
	}

	// Ask user if they want to close current editors
	const closeExisting = await vscode.window.showQuickPick(
		[
			{
				label: "Close existing editors",
				description: "Close all current editors before opening template",
				value: true,
			},
			{
				label: "Keep existing editors open",
				description: "Add template files to current editors",
				value: false,
			},
		],
		{ placeHolder: "How should template files be opened?" }
	);

	if (closeExisting === undefined) {
		return;
	}

	try {
		// Close existing editors if requested
		if (closeExisting.value) {
			await vscode.commands.executeCommand("workbench.action.closeAllEditors");
		}

		// Open template files with progress indicator
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Opening template "${selectedTemplate.label}"...`,
				cancellable: true,
			},
			async (progress, token) => {
				const files = selectedTemplate.files;
				let openedCount = 0;
				let skippedCount = 0;

				for (let i = 0; i < files.length; i++) {
					if (token.isCancellationRequested) {
						break;
					}

					const filePath = files[i];

					// Check if file still exists
					if (!fs.existsSync(filePath)) {
						skippedCount++;
						continue;
					}

					try {
						const document = await vscode.workspace.openTextDocument(filePath);
						await vscode.window.showTextDocument(document, {
							preview: false,
							preserveFocus: true,
						});
						openedCount++;
					} catch (error) {
						console.error(`Error opening file ${filePath}:`, error);
						skippedCount++;
					}

					progress.report({
						message: `${openedCount}/${files.length} files opened...`,
						increment: (1 / files.length) * 100,
					});

					// Small delay to prevent overwhelming the editor
					await new Promise((resolve) => setTimeout(resolve, 50));
				}

				if (skippedCount > 0) {
					vscode.window.showWarningMessage(
						`Opened ${openedCount} file(s). ${skippedCount} file(s) were skipped (no longer exist).`
					);
				} else {
					vscode.window.showInformationMessage(
						`Template "${selectedTemplate.label}" loaded: ${openedCount} file(s) opened!`
					);
				}
			}
		);
	} catch (error) {
		vscode.window.showErrorMessage(`Error loading template: ${error}`);
	}
}

// Delete a template
export async function deleteEditorTemplate() {
	const workspaceKey = getWorkspaceKey();
	if (!workspaceKey) {
		vscode.window.showErrorMessage("No workspace folder open.");
		return;
	}

	const templates = readTemplates();
	const projectTemplates = templates[workspaceKey];

	if (!projectTemplates || Object.keys(projectTemplates).length === 0) {
		vscode.window.showInformationMessage(
			"No templates saved for this project."
		);
		return;
	}

	// Create quick pick items
	const templateItems = Object.entries(projectTemplates).map(
		([name, files]) => ({
			label: name,
			description: `${files.length} file(s)`,
		})
	);

	const selectedTemplate = await vscode.window.showQuickPick(templateItems, {
		placeHolder: "Select a template to delete",
	});

	if (!selectedTemplate) {
		return;
	}

	// Confirm deletion
	const confirm = await vscode.window.showWarningMessage(
		`Delete template "${selectedTemplate.label}"?`,
		"Delete",
		"Cancel"
	);

	if (confirm !== "Delete") {
		return;
	}

	try {
		delete templates[workspaceKey][selectedTemplate.label];

		// Clean up empty project entries
		if (Object.keys(templates[workspaceKey]).length === 0) {
			delete templates[workspaceKey];
		}

		writeTemplates(templates);
		vscode.window.showInformationMessage(
			`Template "${selectedTemplate.label}" deleted.`
		);
	} catch (error) {
		vscode.window.showErrorMessage(`Error deleting template: ${error}`);
	}
}

