import * as vscode from 'vscode'
import { init } from './modules/init'
import { Generate } from './modules/generate'

// vscode.executeDocumentHighlights - Выполнить поставщика выделения документа.

export function activate(context: vscode.ExtensionContext) {
	const generate = new Generate(context)

	let disposable = vscode.commands.registerCommand('generate-template.generate', (path, e) => generate.dialog(path, e))

	context.subscriptions.push(disposable)
}

export function deactivate() {}
