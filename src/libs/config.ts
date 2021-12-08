import fs from 'fs'
import path from 'path'

export class Config {
	//配置文件内容
	static #obj: { [i: string]: { [i: string]: string | number | boolean } } = {}
	//配置文件路径
	static #configfile: string
	//配置文件目录
	static #configdir: string

	public static init(file?: string) {
		if (!file) file = path.join(process.cwd(), 'config/tmmd.conf')
		file = path.resolve(process.cwd(), file)
		this.#configfile = file
		this.#configdir = path.dirname(file)
		if (!fs.existsSync(file)) throw new Error(`config file not exists at: ${file}`)
		const content = fs.readFileSync(file) + ''

		const obj = this.#obj
		let group: string
		content.split(/\r?\n/).forEach(line => {
			line = line.trim()
			if (!line) return							//空行
			if (line[0] == '#') return					//注释行
			//分组行
			if (line[0] == '[') {
				const end = line.indexOf(']')
				if (end == -1) return
				group = line.substring(1, end).trim()
				obj[group] = {}
			}
			//配置行
			else {
				const eq = line.indexOf('=')
				if (eq == -1) return
				const key = line.substring(0, eq).trim()
				let cur = eq + 1
				for (cur = 0; cur < line.length; ++cur) {
					if (line[cur] == '#') break
				}
				let val = line.substring(eq + 1, cur).trim()
				//字符串
				if ((val[0] == '"' && val[val.length - 1] == '"') || (val[0] == "'" && val[val.length - 1] == "'")) obj[group][key] = val.substring(1, val.length - 1)
				//整数
				else if (/^\d+$/.test(val)) obj[group][key] = parseInt(val)
				//布尔
				else if (val == 'true') obj[group][key] = true
				else if (val == 'false') obj[group][key] = false
				//小数
				else obj[group][key] = parseFloat(val)
			}
		})
	}

	/** 服务器配置 */
	public static get server() {
		const server = this.#obj.server
		const cfg = this
		return {
			listen: server.listen as number,
			bind: server.bind as string,
			get staticdir() {
				return path.resolve(cfg.#configdir, server.staticdir + '')
			},
			get cachedir() {
				return path.resolve(cfg.#configdir, server.cachedir + '')
			},
		}
	}

	/** 网络发现服务器配置 */
	public static get discover() {
		const discover = this.#obj.discover
		return {
			listen: discover.listen as number,
			bind: discover.bind as string,
		}
	}

	/** 数据库配置 */
	public static get database() {
		const db = this.#obj.database
		const cfg = this
		return {
			host: (db.host ?? '127.0.0.1') as string,
			port: (db.port ?? 27017) as number,
			database: (db.database ?? 'ttm') as string,
			username: (db.username || undefined) as string | undefined,
			password: (db.password || undefined) as string | undefined,
			get backupdir() {
				let dir = (db.backupdir || '../backup') as string
				dir = path.resolve(cfg.#configdir, dir)
				return dir
			},
			get url() {
				let url = [
					'mongodb://',
					this.username ? `${this.username}${this.password ? `:${this.password}` : ''}@` : '',
					`${this.host}:${this.port}`,
				].join('')
				const opt: any = { maxPoolSize: db.maxPoolSize }
				const optStr = Object.keys(opt).filter(k => !!opt[k]).map(k => `${k as string}=${opt[k]}`).join('&')
				if (optStr) url += '/?' + optStr
				return url
			}
		}
	}

	/** 音乐配置 */
	public static get music() {
		const music: { [i: string]: string } = this.#obj.music as any
		return {
			allowed: music.allowed.split(',').map(s => s.trim()),
			tomp3: music.tomp3.split(',').map(s => s.trim()),
			toflac: music.toflac.split(',').map(s => s.trim()),
		}
	}
}