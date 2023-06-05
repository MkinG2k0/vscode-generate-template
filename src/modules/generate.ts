import * as vscode from 'vscode'
import { GLOBAL_PATH_KEY, LOCAL_PATH_FOLDER, LOCAL_PATH_KEY, TEMPLATES } from '../constant'
import * as fs from 'node:fs/promises'
import * as path from 'path'
import * as recursive from 'recursive-readdir'
import { logger } from '../utils'

interface IGenerate {
	selectTemplate?: string
	selectName?: string
	folder: { path: string }
}

interface IStruct {
	path: string
	name: string
	ext: string
	fullName: string
	code: string
	data: string
}

export class Generate {
	constructor(private readonly ctx: vscode.ExtensionContext) {}

	dialog(folder: { path: string }, e: any) {
		const templates = this.ctx.workspaceState.get<string[]>(TEMPLATES) || []
		const select = vscode.window.showQuickPick(templates)

		select.then(selectTemplate => {
			const name = vscode.window.showInputBox({ title: 'Generate template name' })
			name.then(selectName => {
				this.generate({ selectTemplate, selectName, folder })
			})
		})
	}

	async generate(data: IGenerate) {
		const { selectTemplate, selectName, folder } = data
		if (!selectTemplate || !selectName) {
			return
		}
		// console.log(selectTemplate, selectName, folder.path)
		const workspacePath = this.ctx.workspaceState.get<string>(LOCAL_PATH_KEY) || ''
		const localPath = path.join(workspacePath, LOCAL_PATH_FOLDER, selectTemplate)
		const generatePath = path.join(folder.path, selectName)
		const structure = await this.structure(localPath)
		await this.writeStructure(structure, generatePath)
	}

	async structure(localPath: string) {
		const paths = await recursive(localPath)

		const structure = paths.map(async pathFile => {
			const pathParse = path.parse(pathFile)
			const { name } = pathParse

			const data = await fs.readFile(pathFile, 'utf8')
			// TODO compute data
			const findExt = data.match(/```.*/)

			const code = data.slice(data.indexOf('```'), data.lastIndexOf('```')).split('\n').slice(1, -1).join('')

			const currentExt = findExt?.[0]
			const ext = currentExt ? '.'.concat(currentExt.slice(3)) : pathParse.ext

			const fullName = name.concat(ext)

			return {
				path: pathFile,
				name,
				ext,
				fullName,
				code,
				data
			}
		})

		return await Promise.all(structure)
	}

	async writeStructure(structures: IStruct[], generatePath: string) {
		structures.forEach(structure => {
			const join = path.join(structure.path, generatePath)
			console.log(structure.path, generatePath, join)
		})
	}

	getWorkspaceFolder() {
		return vscode.workspace.workspaceFolders?.[0].uri.fsPath || ''
	}

	getGlobalTemplatePath() {
		return this.ctx.globalState.get<string>(GLOBAL_PATH_KEY) || ''
	}

	getLocalTemplatePath() {
		return path.join(this.getWorkspaceFolder(), LOCAL_PATH_FOLDER)
	}

	async readTemplate(templatePath: string): Promise<string[]> {
		return await fs
			.access(templatePath)
			.then(async () => {
				return await fs
					.readdir(templatePath)
					.then(files => files)
					.catch(e => {
						logger(`Доступ к папке "${templatePath}"`)(e)
						return []
					})
			})
			.catch(e => {
				logger(`Доступ к папке "${templatePath}"`)(e)
				return []
			})
	}

	async getLocalTemplate() {
		return await this.readTemplate(this.getLocalTemplatePath())
	}

	async getGlobalTemplate() {
		return await this.readTemplate(this.getGlobalTemplatePath())
	}
}
