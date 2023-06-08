import * as vscode from 'vscode'
import { GLOBAL_PATH_KEY, LOCAL_PATH_FOLDER, LOCAL_PATH_KEY, TEMPLATES } from '../constant'
import * as fs from 'node:fs/promises'
import * as path from 'path'
import * as recursive from 'recursive-readdir'
import { logger } from '../utils'
import toCase from 'js-convert-case'
interface IGenerate {
	selectTemplate?: string
	selectName?: string
	folder: { path: string }
}

interface IStruct {
	path: string
	localPath: string
	name: string
	ext: string
	fullName: string
	code: string
	data: string
}

export class Generate {
	// localVar
	// pathToFile , pathToDir ,
	globalVariable: { from: string; to: string }[] = []
	constructor(private readonly ctx: vscode.ExtensionContext) {}

	async dialog(folder: { path: string }, e: any) {
		const localTemplates = await this.getLocalTemplates()
		const globalTemplates = await this.getGlobalTemplates()
		const templates = [...new Set(localTemplates.concat(globalTemplates))]

		const select = vscode.window.showQuickPick(templates, { title: 'Choose template' })

		select.then((selectTemplate) => {
			const name = vscode.window.showInputBox({ title: 'Generate template name' })
			name.then((selectName) => {
				this.generate({ selectTemplate, selectName, folder })
			})
		})
	}

	async generate(data: IGenerate) {
		const { selectTemplate, selectName, folder } = data
		if (!selectTemplate || !selectName) {
			return
		}

		this.createGlobalVariable(selectName)
		const workspacePathTemplates = this.getWorkspacePath()
		const globalPathTemplates = this.getGlobalTemplatesPath()
		const localPath = path.join(workspacePathTemplates, LOCAL_PATH_FOLDER, selectTemplate)
		const globalPath = path.join(globalPathTemplates, selectTemplate)

		const isExistLocal = await this.isExist(localPath)
		const isExistGlobal = await this.isExist(globalPath)

		const generatePath = path.join(folder.path, selectName).slice(1)

		const structure = await this.structure(isExistLocal ? localPath : globalPath, data)
		await this.writeStructure(structure, generatePath)

		// vscode.window.showInformationMessage(`Generated in path "${generatePath}"`)
	}

	async isExist(path: string) {
		return await fs
			.access(path)
			.then(() => true)
			.catch(() => false)
	}

	async structure(localPathTemplates: string, generate: IGenerate) {
		const paths = await recursive(localPathTemplates)

		const structure = paths.map(async (pathFile) => {
			const pathParse = path.parse(pathFile)
			const { name } = pathParse

			const dataFile = await fs.readFile(pathFile, 'utf8')
			const findExt = dataFile.match(/```.*/)
			const dirName = path.dirname(pathFile)
			const isMdFile = pathParse.ext === '.md'
			// split 2
			const localPath = dirName.split(LOCAL_PATH_FOLDER)[1].split(path.sep).slice(2).join(path.sep)

			const code = dataFile
				.slice(dataFile.indexOf('```'), dataFile.lastIndexOf('```'))
				.split('\n')
				.slice(1, -1)
				.join('')

			const mdFileOrOtherFile = isMdFile ? code : dataFile
			const codeWithVar = this.dataVariable(mdFileOrOtherFile)

			const currentExt = findExt?.[0]
			const ext = currentExt ? '.'.concat(currentExt.slice(3)) : pathParse.ext

			const fullName = this.dataVariable(name).concat(ext)

			return {
				path: pathFile,
				localPath,
				name,
				ext,
				fullName,
				code: codeWithVar,
				data: dataFile,
			}
		})

		return await Promise.all(structure)
	}

	dataVariable(data: string) {
		let str = data
		this.globalVariable.forEach(({ from, to }) => {
			const reg = new RegExp(this.saveRegExp(from), 'g')
			str = str.replace(reg, to)
		})
		return str
	}

	saveRegExp(text: string) {
		return `\\$${text}\\$`
	}

	createGlobalVariable(name: string) {
		this.globalVariable = [
			{ from: 'name', to: name },
			{ from: 'upper', to: name.toUpperCase() },
			{ from: 'lower', to: name.toLowerCase() },
			{ from: 'camel', to: toCase.toCamelCase(name) },
			{ from: 'pascal', to: toCase.toPascalCase(name) },
			{ from: 'snake', to: toCase.toSnakeCase(name) },
			{ from: 'upperSnake', to: toCase.toCamelCase(name).toUpperCase() },
			{ from: 'kebab', to: toCase.toKebabCase(name) },
			{ from: 'upperKebab', to: toCase.toCamelCase(name).toUpperCase() },
			{ from: 'dot', to: toCase.toDotCase(name) },
			{ from: 'upperDot', to: toCase.toCamelCase(name).toUpperCase() },
			//
			{ from: 'time', to: new Date().toString() },
		]
	}

	async writeStructure(structures: IStruct[], generatePath: string) {
		await structures.forEach(async (structure) => {
			const join = path.join(generatePath, structure.localPath, structure.fullName)
			await this.writeFile(join, structure.code)
		})
	}

	async writeFile(pathFile: string, data: string) {
		const dirName = path.dirname(pathFile)

		await fs
			.mkdir(dirName, { recursive: true })
			.then(async () => {
				await fs.writeFile(pathFile, data).catch(logger(`Создание файла "${pathFile}"`))
			})
			.catch(logger(`Создание папки "${dirName}"`))
	}

	getWorkspacePath() {
		return vscode.workspace.workspaceFolders?.[0].uri.fsPath || ''
	}

	getGlobalTemplatesPath() {
		return this.ctx.globalState.get<string>(GLOBAL_PATH_KEY) || ''
	}

	getLocalTemplatesPath() {
		return path.join(this.getWorkspacePath(), LOCAL_PATH_FOLDER)
	}

	async readTemplates(templatePath: string): Promise<string[]> {
		return await fs
			.access(templatePath)
			.then(async () => {
				return await fs
					.readdir(templatePath)
					.then((files) => files)
					.catch((e) => {
						logger(`Чтение в папке "${templatePath}"`)(e)
						return []
					})
			})
			.catch((e) => {
				logger(`Доступ к папке "${templatePath}"`)(e)
				return []
			})
	}

	async getLocalTemplates() {
		return await this.readTemplates(this.getLocalTemplatesPath())
	}

	async getGlobalTemplates() {
		return await this.readTemplates(this.getGlobalTemplatesPath())
	}
}
