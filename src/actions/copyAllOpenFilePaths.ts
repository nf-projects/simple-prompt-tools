import * as vscode from "vscode";
import { getRelativePath, appendToClipboard } from "../utils/fileUtils";

export async function copyAllOpenFilePaths(append: boolean) {
    const tabGroups = vscode.window.tabGroups.all;

    const paths: string[] = [];
    const seen = new Set<string>();

    for (const group of tabGroups) {
        for (const tab of group.tabs) {
            if (tab.input instanceof vscode.TabInputText) {
                const document = await vscode.workspace.openTextDocument(tab.input.uri);
                const relativePath = await getRelativePath(document.fileName);
                if (!seen.has(relativePath)) {
                    seen.add(relativePath);
                    paths.push(relativePath);
                }
            }
        }
    }

    if (paths.length === 0) {
        vscode.window.showInformationMessage("No open files found.");
        return;
    }

    const markdownList = paths.map((p) => `- ${p}`).join("\n") + "\n";
    await appendToClipboard(markdownList, append);
    vscode.window.showInformationMessage(
        `Copied ${paths.length} file path${paths.length === 1 ? "" : "s"}! ${append ? "(APPEND)" : ""}`
    );
}

