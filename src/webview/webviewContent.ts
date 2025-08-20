import * as vscode from "vscode";

export function getWebviewContent(webview: vscode.Webview): string {
	return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prompt Tools</title>
        <style>
            body {
                padding: 10px;
                color: var(--vscode-foreground);
                font-size: var(--vscode-font-size);
                font-weight: var(--vscode-font-weight);
                font-family: var(--vscode-font-family);
            }
            .button {
                display: block;
                width: 100%;
                padding: 8px 12px;
                margin-bottom: 10px;
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                text-align: left;
                cursor: pointer;
                font-size: 13px;
                border-radius: 2px;
            }
            .button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .button .description {
                display: block;
                font-size: 11px;
                opacity: 0.8;
                margin-top: 4px;
            }
            .checkbox-container {
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <div class="checkbox-container">
            <button class="button" id="copySelectedProjectPrompt">
                <span>Copy Project Prompt</span>
                <span class="description">Select and copy a prompt from prompts.md</span>
            </button>
            <label><input type="checkbox" id="appendcopySelectedProjectPrompt"> Append</label>
        </div>
        <div class="checkbox-container">
            <button class="button" id="copyFolderStructure">
                <span>Copy Folder Structure</span>
                <span class="description">Copy the structure of a selected folder</span>
            </button>
            <label><input type="checkbox" id="appendcopyFolderStructure"> Append</label>
        </div>
        <div class="checkbox-container">
            <button class="button" id="copyFolder">
                <span>Copy Folder</span>
                <span class="description">Copy all files from a selected folder</span>
            </button>
            <label><input type="checkbox" id="appendcopyFolder"> Append</label>
        </div>
        <div class="checkbox-container">
            <button class="button" id="copyCurrentFileToMarkdown">
                <span>Copy Current File</span>
                <span class="description">Copy the currently active file as markdown</span>
            </button>
            <label><input type="checkbox" id="appendcopyCurrentFileToMarkdown"> Append</label>
        </div>
        <div class="checkbox-container">
            <button class="button" id="openFilesToMarkdown">
                <span>Copy All Editor Tabs</span>
                <span class="description">Copy all open files as markdown to clipboard</span>
            </button>
            <label><input type="checkbox" id="appendopenFilesToMarkdown"> Append</label>
        </div>
        <div class="checkbox-container">
            <button class="button" id="selectOpenFilesToMarkdown">
                <span>Select Editor Tabs...</span>
                <span class="description">Select specific open files to copy as markdown</span>
            </button>
            <label><input type="checkbox" id="appendselectOpenFilesToMarkdown"> Append</label>
        </div>
        <div class="checkbox-container">
            <button class="button" id="copyAllOpenFilePaths">
                <span>Copy All Open File Paths</span>
                <span class="description">Copy paths of all open editor tabs as a Markdown list</span>
            </button>
            <label><input type="checkbox" id="appendcopyAllOpenFilePaths"> Append</label>
        </div>
        <div class="checkbox-container">
            <button class="button" id="copyErrorsInCurrentFile">
                <span>Copy Errors in Current File</span>
                <span class="description">Copy all errors in the currently active file as markdown</span>
            </button>
            <label><input type="checkbox" id="appendcopyErrorsInCurrentFile"> Append</label>
        </div>
        <div class="checkbox-container">
            <button class="button" id="copyErrorsInAllOpenFiles">
                <span>Copy All Errors</span>
                <span class="description">Copy errors from all open editor tabs</span>
            </button>
            <label><input type="checkbox" id="appendcopyErrorsInAllOpenFiles"> Append</label>
        </div>

        <script nonce="${webview.cspSource}">
            (function() {
                const vscode = acquireVsCodeApi();

                // Set up button click handlers
                const buttonIds = [
                    'copySelectedProjectPrompt',
                    'copyFolderStructure',
                    'copyFolder',
                    'openFilesToMarkdown',
                    'selectOpenFilesToMarkdown',
                    'copyAllOpenFilePaths',
                    'copyCurrentFileToMarkdown',
                    'copyErrorsInCurrentFile',
                    'copyErrorsInAllOpenFiles'
                ];

                buttonIds.forEach(id => {
                    const button = document.getElementById(id);
                    if (button) {
                        button.addEventListener('click', () => {
                            const appendCheckbox = document.getElementById('append' + id);
                            const append = appendCheckbox ? appendCheckbox.checked : false;
                            console.log('Sending message:', { type: id, append });
                            vscode.postMessage({ type: id, append });
                        });
                    }
                });
            }());
        </script>
    </body>
    </html>`;
}
