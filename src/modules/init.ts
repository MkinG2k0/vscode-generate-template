import * as vscode from 'vscode'
import * as path from 'path'
import { GLOBAL_PATH_KEY, LOCAL_PATH_KEY, TEMPLATES, LOCAL_PATH_FOLDER } from '../constant'
import * as fs from 'node:fs/promises'
import { logger } from '../utils'

const getWorkspacePath = () => vscode.workspace.workspaceFolders?.[0].uri.fsPath || ''

export const init = async (context: vscode.ExtensionContext) => {}
