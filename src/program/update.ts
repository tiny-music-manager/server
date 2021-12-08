import { Config } from '../libs/config'
import { dbv } from '../libs/dbv'

interface ITMMDUpdateOption {
	/** 配置文件路径 */
	config?: string
	/** 版本号 */
	version?: number | string
}


export async function tmmd_update(option: ITMMDUpdateOption) {
	//配置
	Config.init(option.config)
	await dbv.loadAll()
	await dbv.update(option.version ? parseFloat(option.version as any) : undefined)
}