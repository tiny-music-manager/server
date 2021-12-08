import fs from 'fs'
import { consts } from "../libs/consts"

interface ITMMDUpdateOption { }


export async function tmmd_exit(option: ITMMDUpdateOption) {
	//没有pid文件，表示没有运行
	if (!fs.existsSync(consts.PID_FILE)) return

	//读取pid
	const pid = parseInt(fs.readFileSync(consts.PID_FILE) + '')
	if (isNaN(pid)) return

	//杀死进程
	try {
		process.kill(pid, 'SIGKILL')
	} catch (err) { }
}