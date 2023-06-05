import * as vscode from 'vscode'
import { init } from './modules/init'
import { Generate } from './modules/generate'
import { GLOBAL_PATH_KEY } from './constant'

// vscode.executeDocumentHighlights - Выполнить поставщика выделения документа.

export function activate(ctx: vscode.ExtensionContext) {
	const generate = new Generate(ctx)
	console.log('started')

	let generateCommand = vscode.commands.registerCommand('generate-template.generate', (path, e) =>
		generate.dialog(path, e)
	)

	let saveGlobalPath = vscode.commands.registerCommand('generate-template.save-global-path', (path, e) => {
		const globalPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || ''
		ctx.globalState.update(GLOBAL_PATH_KEY, globalPath)

		vscode.window.showInformationMessage(`"${ctx.globalState.get(GLOBAL_PATH_KEY) || ''}" path saved`)
	})

	ctx.subscriptions.push(generateCommand)
	ctx.subscriptions.push(saveGlobalPath)
}

export function deactivate() {}
