import http from 'http'
import dgram from 'dgram'
import ws from 'ws'
import fs from 'fs'
import os from 'os'
import Koa from 'koa'
import JSON5 from 'json5'
import KoaRouter from 'koa-router'
import koaBody from 'koa-body'
import { Config } from '../libs/config'
import { logger } from '../libs/log'
import { installRoutes } from '../libs/route'
import { mongo } from '../libs/mongo'
import path from 'path'
import { consts } from '../libs/consts'
import { utils } from '../libs/utils'

interface ITMMDStartOption {
	/** 配置文件路径 */
	config?: string
}

//koa初始化
async function koaInit() {
	const app = new Koa()
	//错误处理
	app.use(async (ctx, next) => {
		let err: { message: string, status: number, codes: Array<number> } | undefined
		let stack: string | undefined
		try {
			await next()
			if (ctx.status == 404) {
				err = { message: 'Not Found', status: 404, codes: [] }
			}
		} catch (_err: any) {
			err = { message: _err.message, status: 500, codes: [] }
			if (_err.codes) err.codes = _err.codes
			stack = _err.stack
		}
		if (err) {
			//返回结果
			ctx.status = err.status
			ctx.headers['content-type'] = 'application/json'
			ctx.body = JSON5.stringify(err)
			logger.error('apis', err.message)
			if (stack) console.error(stack)
		}
	})
	//跨域
	app.use(async (ctx, next) => {
		ctx.set("Access-Control-Allow-Origin", "*")
		await next()
	})
	//路由定义
	const router = new KoaRouter()
	//其他静态资源
	// app.use(async (ctx, next) => {
	// 	try {
	// 		//否则先看看参数中的filename，都没有去ctx.path
	// 		const filepath = (ctx.params?.filename ?? ctx.path)
	// 		if (!await send(ctx, filepath, {
	// 			root: Config.server.staticdir,
	// 			setHeaders: () => {
	// 				return {
	// 					AA: 'ddd'
	// 				}
	// 			}
	// 		})) throw new Error('随便抛个错误，无所谓')
	// 	} catch (err: any) {
	// 		await next()
	// 	}
	// })
	app.use(require('koa-range'))
	app.use(require('koa-static')(Config.server.staticdir))
	//处理body
	if (!fs.existsSync(Config.server.cachedir)) fs.mkdirSync(Config.server.cachedir, { recursive: true })
	router.use(koaBody({
		multipart: true,
		json: false,
		formidable: {
			uploadDir: Config.server.cachedir,
			maxFieldsSize: 200 * 1024 * 1024,
			hash: 'md5',
		},
	}))
	//json5处理
	router.use(async (ctx, next) => {
		//json5
		if (/^(application|text)\/(json5?)/.test(ctx.headers['content-type'] ?? '')) {
			ctx.request.body = await new Promise((resolve, reject) => {
				let body: Array<Buffer> = []
				ctx.req.on('data', data => body.push(data))
				ctx.req.once('error', err => reject(err))
				ctx.req.once('end', () => {
					let res: any
					try {
						const bodyStr = Buffer.concat(body) + ''
						res = bodyStr ? JSON5.parse(bodyStr) : undefined
					} catch (err) {
						return reject(err)
					}
					resolve(res)
				})
			})
		}
		//继续
		await next()
	})
	//加载路由
	await import('../apis')
	installRoutes(router)
	//完成
	app.use(router.routes())
	return app
}

//创建服务器
function createServer(app: Koa) {
	return new Promise<{ http: http.Server, ws: ws.Server }>((resolve, reject) => {
		const httpServer = http.createServer(app.callback())
		let exit = false
		httpServer.on('clientError', err => logger.derr('tmmd', err))
		httpServer.on('error', err => {
			if (!exit) {
				exit = true
				reject(err)
			}
			else logger.derr('tmmd', err)
		})
		httpServer.listen(Config.server.listen, Config.server.bind, () => {
			exit = true
			const wsServer = new ws.Server({ server: httpServer })
			wsServer.on('error', err => {
				if (!exit) {
					exit = true
					reject(err)
				}
				else logger.derr('tmmd', err)
			})
			resolve({ http: httpServer, ws: wsServer })
		})
	})
}

//创建udp网络发现服务器
function createDiscoverServer() {
	return new Promise<dgram.Socket>((resolve, reject) => {
		const socket = dgram.createSocket('udp4')
		socket.on('error', err => {
			logger.derr('tmmd', err)
			if ((global as any).devmode) console.error(err)
			reject(err)
		})
		socket.on('message', (msg, rinfo) => {
			try {
				const body: { type: string, data: any } = JSON.parse(msg + '')
				if (body.type == 'getaddress') {
					//获取网络地址
					const dict = os.networkInterfaces()
					const ips = Object.keys(dict).filter(key => key != 'lo').map(key => {
						return dict[key]?.filter(i => /^\d+\.\d+\.\d+\.\d+$/.test(i.address))?.[0]?.address ?? null
					}).filter(ip => !!ip)
					//返回结果
					const resp = { type: 'address', data: { ips, bind: Config.server.bind, listen: Config.server.listen } }
					socket.send(JSON.stringify(resp), rinfo.port, rinfo.address, (err) => {
						if (err) logger.derr('tmmd', err)
					})
				}
			} catch (err) { }
		})
		socket.bind(Config.discover.listen, Config.discover.bind, () => resolve(socket))
	})
}

//启动
export async function tmmd_start(option: ITMMDStartOption) {
	try {
		//检测是否正在运行
		if (fs.existsSync(consts.PID_FILE)) {
			const pid = parseInt(fs.readFileSync(consts.PID_FILE) + '')
			//正在运行，退出
			if (!isNaN(pid) && utils.checkRunning(pid)) {
				logger.error('tmmd', 'process already running')
				return
			}
		}
		//保存pid
		fs.writeFileSync(consts.PID_FILE, process.pid + '')

		//配置
		Config.init(option.config)
		//初始化mongodb
		logger.tip('tmmd', 'Initializing MongoDB')
		await mongo.init()
		logger.success('tmmd', 'MongoDB initialized')
		//KOA
		logger.tip('tmmd', 'Initializing koa routes')
		const app = await koaInit()
		logger.success('tmmd', 'koa routes initialized')
		//创建服务器
		logger.tip('tmmd', 'starting server')
		await createServer(app)
		logger.success('tmmd', `server created and listen on ${Config.server.bind}:${Config.server.listen}`)
		//发现服务器
		logger.tip('tmmd', 'creating discover server')
		await createDiscoverServer()
		logger.success('tmmd', `discover server listen on ${Config.discover.bind}:${Config.discover.listen}`)
		//自动歌词处理
		await import('../libs/lyric')
	}
	catch (err: any) {
		logger.derr('tmmd', err)
	}
}