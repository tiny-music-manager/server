import http from 'http'
import https from 'https'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import FormData from 'form-data'
import JSON5 from 'json5'

interface ICommonOption {
	headers?: Record<string, string>
	timeout?: number
	type?: 'text' | 'json' | 'json5'
	params?: any
}

interface IGetOption extends ICommonOption {
}

export interface IRequestOption extends ICommonOption {
	method: 'post' | 'put' | 'delete'
	body?: (headers: { [i: string]: string }) => ((req: http.ClientRequest) => any)
}

interface IConfig {
	baseurl?: string
}

interface IRequestResult<T> {
	res: http.IncomingMessage,
	status: number,
	headers: http.IncomingHttpHeaders,
	body: T
}


interface IAppendFile {
	filename: string
	content: string | Buffer | ArrayBuffer | Blob
	type?: string
}

let config: IConfig = {}

//获取request函数
function requestFunc(url: string) {
	if (/^https:\/\//.test(url)) return https
	return http
}

//获取实际URL
function realUrl(url: string) {
	if (/https?:\/\//.test(url)) return url
	url = config.baseurl + url
	if (!/https?:\/\//.test(url)) throw new Error(`bad url of ${url}`)
	return url
}

function resHandller(res: http.IncomingMessage, option: ICommonOption, resolve: (data: any) => any, reject: (err: Error) => any) {
	let buffer: Array<Buffer> = []
	let err: Error | undefined = undefined
	res.on('data', d => {
		if (d instanceof Buffer) buffer.push(d)
		else buffer.push(Buffer.from(d))
	})
	res.once('error', _err => err = _err)
	res.once('close', () => {
		if (err) return reject(err)
		let result: any
		try {
			let data = Buffer.concat(buffer)
			switch (res.headers['content-encoding']) {
				case 'gzip':
					data = zlib.gunzipSync(data)
					break
			}
			result = (() => {
				switch (option?.type) {
					case 'text':
						return data + ''
					case 'json':
						return JSON.parse(data + '')
					case 'json5':
						return JSON5.parse(data + '')
					default:
						return data
				}
			})()
		} catch (err: any) {
			reject(err)
			return
		}
		resolve({ res, status: res.statusCode, body: result, headers: res.headers } as IRequestResult<any>)
	})
}

function _request<T>(url: string, option?: IRequestOption) {
	const headers: any = {}
	let sender: any
	if (option?.body) sender = option.body(headers)

	return new Promise<IRequestResult<T>>(async (resolve, reject) => {
		const req = requestFunc(url).request(url, {
			method: option?.method ?? 'post',
			timeout: option?.timeout,
			headers: {
				...option?.headers ?? {},
				...headers,
			},
		}, res => resHandller(res, option ?? {}, resolve, reject))
		req.on('error', reject)
		try {
			if (sender) await sender(req)
			req.end()
		} catch (err) {
			reject(err)
			req.destroy()
		}
	})
}

function readArrayBuffer(ab: ArrayBuffer) {
	const dv = new DataView(ab)
	const result = Buffer.alloc(dv.byteLength)
	for (let i = 0; i < dv.byteLength; ++i) {
		result[i] = dv.getUint8(i)
	}
	return result
}


export const request = {

	/**
	 * 配置
	 * @param key 键名称
	 * @param val 值
	 */
	config<K extends keyof IConfig>(key: K, val: IConfig[K]) {
		config[key] = val
	},

	/**
	 * 对数据进行urlencoded编码
	 * @param data 要编码的数据
	 */
	urlencoded(data: { [k: string]: any }) {
		let buffer: Array<string> = []
		function parseOne(key: string, val: any) {
			if (val instanceof Array) {
				val.forEach(item => {
					parseOne(`${key}[]`, item)
				})
			}
			else if (typeof val == 'object') {
				Object.keys(val).forEach(k => {
					parseOne(`${key}[${k as string}]`, val[k])
				})
			}
			else {
				buffer.push(`${key}=${encodeURIComponent(val + '')}`)
			}
		}

		return function (headers: { [i: string]: any }) {
			Object.keys(data).forEach(key => parseOne(key as string, data[key]))
			const str = buffer.join('&')
			headers['content-type'] = 'application/x-www-form-urlencoded'
			headers['content-length'] = str.length
			return async (req: http.ClientRequest) => {
				await new Promise<void>((resolve, reject) => {
					req.write(str, err => err ? reject(err) : resolve())
				})
			}
		}

	},

	/**
	 * 对数据进行json编码
	 * @param data 要编码的数据
	 */
	json(data: any) {
		return function (headers: { [i: string]: any }) {
			const str = Buffer.from(JSON.stringify(data))
			headers['content-type'] = 'application/json'
			headers['content-length'] = str.length
			return async (req: http.ClientRequest) => {
				await new Promise<void>((resolve, reject) => {
					req.write(str, err => err ? reject(err) : resolve())
				})
			}
		}
	},

	/**
	 * 对数据进行json5编码
	 * @param data 要编码的数据
	 */
	json5(data: any) {
		return function (headers: { [i: string]: any }) {
			const str = Buffer.from(JSON5.stringify(data))
			headers['content-type'] = 'application/json5'
			headers['content-length'] = str.length
			return async (req: http.ClientRequest) => {
				await new Promise<void>((resolve, reject) => {
					req.write(str, err => err ? reject(err) : resolve())
				})
			}
		}
	},

	/**
	 * 创建formdata数据
	 */
	formdata() {
		interface IFile {
			filename: string
			body: Buffer | fs.ReadStream
			type: string
		}


		const data: Array<{ name: string, val: Buffer | IFile }> = []

		const funcs = {
			/**
			 * 添加一个普通键值
			 * @param key 键
			 * @param val 值
			 */
			append(key: string, val: string) {
				data.push({ name: key, val: Buffer.from(val) })
				return funcs
			},
			/**
			 * 添加一个文件
			 * @param key 键
			 * @param file 文件（可以是路径，也可以是具体文件信息）
			 */
			appendFile(key: string, file: string | IAppendFile) {
				//文件名称
				if (typeof file == 'string') {
					if (!fs.existsSync(file)) throw new Error(`file "${file}" not exists`)
					if (fs.statSync(file).isDirectory()) throw new Error(`"${file}" is not a file`)
					const stream = fs.createReadStream(file)
					data.push({
						name: key, val: { filename: path.basename(file), body: stream, type: 'application/octet-stream' }
					})
				}
				//自定义文件
				else {
					let body: Buffer | fs.ReadStream
					if (typeof file.content == 'string') body = Buffer.from(file.content)
					else if (file.content instanceof Buffer) body = file.content
					else if (file.content instanceof ArrayBuffer) body = readArrayBuffer(file.content)
					// else if (file.content instanceof Blob) body = file.content.stream()
					else throw new Error('unsupport data type')
					data.push({ name: key, val: { filename: file.filename, body, type: file.type ?? 'application/octet-stream' } })
				}
				return funcs
			},
			/**
			 * 添加完成
			 */
			done() {
				return (headers: { [i: string]: any }) => {
					const fd = new FormData()
					for (let i = 0; i < data.length; ++i) {
						const di = data[i]
						if (di.val instanceof Buffer) fd.append(di.name, di.val)
						else if (di.val.body) fd.append(di.name, di.val.body, { filename: di.val.filename, contentType: di.val.type })
					}
					const h = fd.getHeaders()
					Object.keys(h).forEach(k => headers[k] = h[k])

					return async (req: http.ClientRequest) => {
						return new Promise<void>((resolve, reject) => {
							fd.pipe(req).once('finish', resolve).once('error', reject)
						})
					}
				}
			}
		}
		return funcs
	},

	/**
	 * 使用get方式请求数据
	 * @param url URL地址
	 * @param option 请求选项
	 */
	get<T = any>(url: string, option?: IGetOption) {
		url = realUrl(url)
		let params = option?.params ? '?' + new URLSearchParams(option.params).toString() : ''
		url += params

		return new Promise<IRequestResult<T>>((resolve, reject) => {
			const req = requestFunc(url).get(url, {
				method: 'get',
				timeout: option?.timeout,
				headers: option?.headers,
			}, res => resHandller(res, option ?? {}, resolve, reject))
			req.on('error', reject)
		})
	},

	/**
	 * 以post方式请求数据
	 * @param url URL地址
	 * @param option 请求选项
	 * @returns 
	 */
	post<T = any>(url: string, option?: Omit<IRequestOption, 'method'>) {
		return _request<T>(url, { ...option ?? {}, method: 'post' })
	},

	/**
	 * 以put方式请求数据
	 * @param url URL地址
	 * @param option 请求选项
	 * @returns 
	 */
	put<T = any>(url: string, option?: Omit<IRequestOption, 'method'>) {
		return _request<T>(url, { ...option ?? {}, method: 'put' })
	},

	/**
	 * 以delete方式请求数据
	 * @param url URL地址
	 * @param option 请求选项
	 * @returns 
	 */
	delete<T = any>(url: string, option?: Omit<IRequestOption, 'method'>) {
		return _request<T>(url, { ...option ?? {}, method: 'delete' })
	},
}