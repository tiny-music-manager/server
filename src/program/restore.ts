import { Config } from '../libs/config'
import { dbv } from '../libs/dbv'

interface ITMMDUpdateOption {
	/** 配置文件路径 */
	config?: string
	/** 备份文件路径 */
	file?: string
}


export async function tmmd_restore(option: ITMMDUpdateOption) {
	//配置
	Config.init(option.config)
	await dbv.restore(option.file)
}