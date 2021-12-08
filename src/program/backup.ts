import { Config } from '../libs/config'
import { dbv } from '../libs/dbv'

interface ITMMDUpdateOption {
	/** 配置文件路径 */
	config?: string
}


export async function tmmd_backup(option: ITMMDUpdateOption) {
	//配置
	Config.init(option.config)
	await dbv.backup()
}