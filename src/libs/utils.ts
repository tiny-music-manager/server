import { ObjectID } from 'bson'
import JSON5 from 'json5'
import moment from "moment"
import { consts } from './consts'
import { request } from './request'
import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { Config } from './config'
import { IMongoCollectionMap } from '../collections'
import zlib from 'zlib'
import { pyDict } from './pinyin'

export namespace utils {
	/**
	 * 下载文件
	 * @param url 下载地址
	 * @param saveto 保存位置
	 */
	export async function download(url: string, saveto: string | ((opt: { md5: string, ext?: string }) => string)) {
		return await request.get(url).then(res => {
			if (res.status != 200) throw new Error(`status ${res.status} of ${url}`)

			const cache = {} as any

			const dst = (typeof saveto == 'string') ? saveto : saveto({
				get md5() {
					return cache.md5 = cache.md5 ?? crypto.createHash('md5').update(res.body).digest('hex')
				},
				get ext() {
					if (cache.ext) return cache.ext
					let ext = path.extname(url.replace(/\?[\s\S]+$/, '').replace(/^https?:\/\//, '')) || undefined
					if (!ext && res.headers['content-type']) {
						const type = res.headers['content-type']
						if (/^image\/(jpeg|jpg)/.test(type)) ext = '.jpg'
						else if (/^image\/bmp/.test(type)) ext = '.png'
						else if (/^image\/gif/.test(type)) ext = '.gif'
						else if (/^image\/webp/.test(type)) ext = '.webp'
					}
					return cache.ext = ext
				}
			})
			const filepath = path.resolve(Config.server.staticdir, dst)
			const dirpath = path.dirname(filepath)
			if (!fs.existsSync(dirpath)) fs.mkdirSync(dirpath, { recursive: true })
			fs.writeFileSync(filepath, res.body)
		})
	}

	/**
	 * 生成token
	 * @param info 要加密的信息
	 * @returns token字符串
	 */
	export function entoken(info: any) {
		const data = {
			time: moment().unix(),
			// duration: 7 * 24 * 60 * 60,
			duration: 0,
			info,
		}
		const body = Buffer.from(JSON5.stringify(data))
		for (let i = 0; i < body.length; ++i) {
			body[i] ^= consts.TOKEN_PASSWORD[i % consts.TOKEN_PASSWORD.length]
		}
		return body.toString('base64')
	}

	/**
	 * 解码token
	 * @param token 要解码的token
	 * @returns 解码成功返回原信息，过期返回undefined，失败抛出错误
	 */
	export function detoken(token: string) {
		const body = Buffer.from(token, 'base64')
		//解密
		for (let i = 0; i < body.length; ++i) {
			body[i] ^= consts.TOKEN_PASSWORD[i % consts.TOKEN_PASSWORD.length]
		}
		//解密数据
		let data
		try {
			data = JSON5.parse(body + '')
		} catch (err) {
			throw new Error('detoken failed (1)')
		}
		//验证
		if (!data || !data.time) throw new Error('detoken failed (2)')
		//过期
		try {
			if (data.duration > 0 && moment().diff(moment.unix(data.time), 'second') > data.duration) return undefined
		} catch (err) {
			throw new Error('detoken failed (3)')
		}
		//深度拷贝并返回信息
		return copyObject(data.info)
	}

	/**
	 * 深度拷贝对象
	 * @param obj 要拷贝的对象
	 * @returns 拷贝后的对象
	 */
	export function copyObject<T = any>(obj: T): T {
		//深度拷贝
		const dcopy = (data: any): any => {
			typeof data == 'string'
			//基本数据了
			if (['number', 'boolean', 'bigint', 'string'].includes(typeof data)) return data
			//数组
			else if (data instanceof Array) return data.map(di => dcopy(di))
			//对象
			if (typeof data == 'object') {
				const buf: any = {}
				Object.keys(data).forEach(key => buf[key] = dcopy(data[key]))
				return buf
			}
			//其他不支持
			else return undefined
		}
		return dcopy(obj)
	}

	/**
	 * 创建mongodb的id
	 * @returns 包含_id和id的对象
	 */
	export function mkid() {
		const _id = new ObjectID()
		return { _id, id: _id.toString() }
	}

	/**
	 * 对lyric歌词信息编码
	 * @param lyric lyric歌词信息
	 * @returns base64编码结果
	 */
	export function lyricEncode(lyric: IMongoCollectionMap['lyric']) {
		return Buffer.from(zlib.gzipSync(JSON.stringify({
			ti: lyric.name,
			ar: lyric.artist,
			al: lyric.album,
			body: lyric.body
		}))).toString('base64')
	}

	/**
	 * 获取拼音首字母，如果是多音字，返回的数组长度回大于1，如果没有找到对应的拼音，返回['#']
	 * @param ch 字符串
	 * @returns 首字母
	 */
	export function pinyinCH(ch: string) {
		const code = ch.charCodeAt(0)

		//无效的内容
		if (code < 19968 || code > 40869) {
			const first = ch.match(/^([A-Za-z0-9])/)?.[0]?.toUpperCase?.()
			return [first ?? '#']
		}

		//多音字
		let py = pyDict.oMultiDiff[code]
		if (py) return py.split('')

		//正常的文字
		py = pyDict.strChineseFirstPY[code - 19968]
		return [py || '#']
	}


	/**
	 * 检测pid对应的进程是否在运行
	 * @param pid pid
	 * @returns 
	 */
	export function checkRunning(pid: number) {
		try {
			return process.kill(pid, 0);
		} catch (error: any) {
			// console.error(error);
			return error.code === 'EPERM';
		}
	}

}