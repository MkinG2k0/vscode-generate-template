export const logger =
	(message: string) =>
	(...args: any[]) =>
		console.log(`${message}: `, ...args)
