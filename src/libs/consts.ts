import os from 'os'
import path from 'path'
import fs from 'fs'

export namespace consts {
	/** token加密密码 */
	export const TOKEN_PASSWORD = Buffer.from('tmm-server')
	/** 音乐类型和后缀关系字典 */
	export const MUSIC_TYPE_EXT: { [i: string]: string } = {
		flac: '.flac',
		mp3: '.mp3',
	}
	/** 配置目录 */
	export const TMMD_DIR = path.join(os.homedir(), '.tmmd')
	if (!fs.existsSync(TMMD_DIR)) fs.mkdirSync(TMMD_DIR)

	/** pid文件 */
	export const PID_FILE = path.join(TMMD_DIR, 'pid')
}