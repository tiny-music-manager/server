/** 日志控制 */
export const logger = {
	/**
	 * 打印信息
	 * @param tag 标记
	 * @param msg 消息
	 */
	info(tag: string, msg: string) {
		console.log(`\x1b[0G\x1b[0K\x1b[40m\x1b[38;2;255;255;255m\x1b[1m ${tag} \x1b[0m\x1b[30m ${msg}\x1b[0m`)
	},
	/**
	 * 打印成功信息
	 * @param tag 标记
	 * @param msg 消息
	 */
	success(tag: string, msg: string) {
		console.log(`\x1b[0G\x1b[0K\x1b[42m\x1b[38;2;255;255;255m\x1b[1m ${tag} \x1b[0m\x1b[32m ${msg}\x1b[0m`)
	},
	/**
	 * 打印警告信息
	 * @param tag 标记
	 * @param msg 消息
	 */
	warn(tag: string, msg: string) {
		console.log(`\x1b[0G\x1b[0K\x1b[43m\x1b[38;2;255;255;255m\x1b[1m ${tag} \x1b[0m\x1b[33m ${msg}\x1b[0m`)
	},
	/**
	 * 打印错误信息
	 * @param tag 标记
	 * @param msg 消息
	 */
	error(tag: string, msg: string) {
		console.error(`\x1b[0G\x1b[0K\x1b[41m\x1b[38;2;255;255;255m\x1b[1m ${tag} \x1b[0m\x1b[31m ${msg}\x1b[0m`)
	},
	/**
	 * 清除行
	 */
	clearLine() {
		if (process.stdout.writable) process.stdout.write(`\x1b[0G\x1b[0K`)
	},
	/**
	 * 打印提示信息
	 * @param tag 标记
	 * @param msg 消息
	 */
	tip(tag: string, msg: string) {
		if (process.stdout.writable) process.stdout.write(`\x1b[0G\x1b[0K\x1b[45m\x1b[38;2;255;255;255m\x1b[1m ${tag} \x1b[0m\x1b[35m ${msg}\x1b[0m`)
	},
	/**
	 * 打印百分比信息
	 * @param tag 标记
	 * @param msg 消息
	 * @param task 任务，支持promise
	 */
	persent<T>(tag: string, msg: string, task: (onProgress: (current: number, total: number) => any) => T): Promise<T> {
		return task((current, total) => {
			let persent = (total) ? (current / total) : 0
			if (persent < 0) persent = 0
			if (persent > 100) persent = 100
			this.tip(tag, `[${parseInt(current / total * 100 as any)}%] ${msg}`)
		}) as any
	},
	/**
	 * 打印错误
	 * @param tag 标记
	 * @param err 错误信息
	 */
	derr(tag: string, err: Error) {
		this.error(tag, err.message)
		if ((global as any).devmode && err.stack) console.log(err.stack)
	}
}