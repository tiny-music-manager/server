import fs from 'fs'
import path from 'path'
import { jsonv2 } from 'jsonval'
import JSON5 from 'json5'
import { ParameterizedContext } from 'koa'
import KoaRouter from 'koa-router'
import { consts } from './consts'
import { utils } from './utils'
import { Config } from './config'
import { IMongoCollectionMap } from '../collections'
import { Collection, Db, MongoClient } from 'mongodb'
import { mongo, TDB } from './mongo'
import crypto from 'crypto'

type TMethod = 'get' | 'post' | 'put' | 'delete'


interface IRouteInfo {
	pathname: string | RegExp
	method: TMethod
	db: boolean
	dbInit: boolean
	login: boolean
	admin: boolean
	paramValidator?: jsonv2.VReturn<any>
	resolver: (ctx: RouteContext<any, any, any>) => any
	pretreator?: (data: any) => any
}

type IRoute<Param, Ignored extends string, DB extends boolean, Login extends boolean> = Omit<{
	/**
	 * 定义请求方式
	 * @param method 请求方式
	 */
	method(method: TMethod): IRoute<Param, Ignored | 'method', DB, Login>
	/**
	 * 需要登录才能访问
	 * @param admin 是否要求管理员有效，默认false
	 */
	login(admin?: boolean): IRoute<Param, Ignored | 'login', DB, true>
	/**
	 * 定义数据库操作
	 */
	db(): IRoute<Param, Ignored | 'db', true, Login>
	/**
	 * 定义参数
	 * @param paramValidator 参数校验器
	 */
	param<P>(params: P): IRoute<{ [K in keyof P]: jsonv2.TReturnType<P[K]> }, Ignored | 'param', DB, Login>
	/**
	 * 参数预处理(校验前)
	 * @param pretreator 预处理器(如果预处理器返回了新的数据，则会替换之前的数据)
	 */
	pretreat(pretreator: (data: any) => any): IRoute<Param, Ignored | 'pretreat', DB, Login>
	/** 
	 * 要求数据库要被初始化
	 */
	dbinit(): IRoute<Param, Ignored | 'dbinit', DB, Login>
	/**
	 * 定义路由处理程序
	 * @param resolver 处理程序
	 */
	resolve(resolver: (ctx: RouteContext<Param, DB, Login>) => any): void
}, Ignored>

const routes: Array<IRouteInfo> = []

export class UploadFile {
	#formName: string
	#file: any
	#path: string

	constructor(file: any, formName: string) {
		this.#file = file
		this.#formName = formName
		this.#path = file.path
	}

	/** 表单名称 */
	public get formName(): string {
		return this.#formName
	}

	/** 文件大小 */
	public get size(): number {
		return this.#file.size
	}

	/** 文件当前路径 */
	public get path(): string {
		return this.#path
	}

	/** 文件原始名 */
	public get name(): string {
		return this.#file.name
	}

	/** 文件mime类型 */
	public get type(): string {
		return this.#file.type
	}

	/** 文件hash */
	public get hash(): string {
		return this.#file.hash
	}

	/** 扩展名 */
	public get extname() {
		return path.extname(this.name)
	}

	/**
	 * 移动到给定位置
	 * @param dst 目标位置
	 */
	public moveTo(dst: string) {
		//路径
		dst = path.resolve(Config.server.staticdir, dst)
		if (dst == this.path) return
		const dir = path.dirname(dst)
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
		//移动
		try {
			fs.renameSync(this.path, dst)
		} catch (err) {
			fs.copyFileSync(this.path, dst)
		} finally {
			if (fs.existsSync(this.path)) fs.unlinkSync(this.path)		//删除本地的
		}
		//设置新路径
		this.#path = dst
	}

	/**
	 * 移动到给定目录
	 * @param dstDir 目标目录
	 * @param filename 文件名称，默认原名称
	 */
	public moveToDir(dstDir: string, filename?: string) {
		return this.moveTo(path.join(dstDir, filename ?? this.name))
	}
}

export interface IRouteContextUser {
	id: string
	number: string
	admin: boolean
}

/**
 * 路由上下文
 */
export class RouteContext<Param, DB extends boolean, U extends boolean> {
	#ctx: ParameterizedContext<any, KoaRouter.IRouterParamContext<any, {}>, any>
	#params: Param
	#files: Array<UploadFile>
	#db: DB extends true ? TDB : never
	#user: U extends true ? IRouteContextUser : never

	constructor(opt: {
		ctx: ParameterizedContext<any, KoaRouter.IRouterParamContext<any, {}>, any>
		params: any
		files: Array<UploadFile>
		db: Db | null | undefined
		user: IRouteContextUser | null | undefined
	}) {
		this.#ctx = opt.ctx
		this.#params = opt.params
		this.#files = opt.files
		this.#db = opt.db ? mongo.createQuery(opt.db) : null as any
		this.#user = opt.user as any
	}

	public get db() {
		return this.#db
	}

	/** koa上下文 */
	public get ctx() {
		return this.#ctx
	}

	/** 参数信息 */
	public get params() {
		return this.#params
	}

	/** 用户信息 */
	public get user() {
		return this.#user
	}

	/**
	 * 获取上传文件的文件（单个）
	 * @param name 表单名
	 */
	public file(name?: string): UploadFile | null {
		if (!name) return this.#files[0] ?? null
		else return this.#files.filter(file => file.formName == name)[0] ?? null
	}

	/**
	 * 获取上传的文件列表
	 * @param name 表单名
	 */
	public files(name?: string) {
		if (!name) return this.#files
		return this.#files.filter(file => file.formName == name)
	}
}

/**
 * 安装路由
 * @param router koa路由
 */
export function installRoutes(router: KoaRouter) {
	routes.forEach(route => router[route.method](route.pathname, async (ctx, next) => {
		let client: MongoClient | undefined = undefined
		let db: Db | undefined = undefined
		let user: IRouteContextUser | undefined = undefined
		let params: any
		let files: Array<UploadFile> = []
		let error: any
		try {
			//登录校验
			if (route.login) {
				const terr = (str = 'authorize failed') => {
					const err: any = new Error(str)
					err.status = 401
					throw err
				}
				if (!ctx.headers.authorization) return terr()
				//解码用户token
				user = utils.detoken(ctx.headers.authorization)
				if (user === undefined) return terr('token overstayed')
				//管理员验证
				if (route.admin && !user.admin) return terr()
			}
			//处理参数
			try {
				if (ctx.method.toLowerCase() == 'get') {
					params = ctx.request.query?.body
					if (params) params = JSON5.parse(params)
					else params = undefined
				}
				else {
					if (ctx.headers['content-type']?.match(/multipart\/form-data/)) {
						if (ctx.request.files) {
							Object.keys(ctx.request.files).forEach(key => {
								const file = ctx.request.files?.[key]
								if (file instanceof Array) {
									files.push(...file.map(f => new UploadFile(f, key + '')))
								}
								else files.push(new UploadFile(file, key + ''))
							})
						}
						params = (ctx.request.body ?? {}).body
						if (params) params = JSON5.parse(params)
						else params = undefined
					}
					else if (ctx.headers['content-type']?.match(/(application|text)\/(json5?)/)) {
						params = ctx.request.body ?? {}
					}
					else {
						params = (ctx.request.body ?? {}).body
						if (params) params = JSON5.parse(params)
						else params = undefined
					}
				}
			} catch (err) {
				throw new Error('request params error')
			}
			//特别处理url参数
			if (!params) params = {}
			Object.keys(ctx.params).forEach(k => params[k] = ctx.params[k])
			//预处理
			if (route.pretreator) {
				const ret = route.pretreator(params)
				if (ret !== undefined) params = ret
			}
			//校验参数
			params = route.paramValidator ? route.paramValidator(params, { files }, ['$']) : undefined
			if (params) {
				if (params.type == 'success') params = params.result
				else {
					if ((global as any).devmode) params.errors.forEach((err: Error) => console.error(err))
					const err: any = new Error(`param validate failed`)
					err.codes = params.errors.map((err: any) => err.code)
					console.log(params)
					throw err
				}
			}
			//数据库
			if (route.db) {
				client = new MongoClient(Config.database.url)
				await client.connect()
				db = client.db(Config.database.database)
			}
			//创建上下文
			const routeCtx = new RouteContext({ ctx, params, files, db, user })
			//数据库初始化检测
			if (route.dbInit) {
				const conf = await routeCtx.db.sysconf.findOne()
				if (!conf || !conf.adminInit) throw new Error('database not initialized')
			}
			//调用处理方法处理
			const result = await route.resolver(routeCtx as any)
			if (typeof result === 'undefined') throw new Error(`route ${route.pathname} return a undefined value`)
			else if (typeof result == 'function') result()
			else {
				ctx.status = 200
				ctx.type = 'application/json5'
				ctx.body = JSON5.stringify(result)
			}
		}
		//处理错误，释放资源
		catch (err) {
			error = err
		}
		finally {
			if (client) client.close()
		}
		//最终把错误跑出去
		if (error) throw error
	}))
}

/**
 * 定义路由
 * @param pathname 路径
 */
export function route(pathname: string | RegExp) {

	const routeInfo = { pathname, db: false, dbInit: false, login: false, admin: false } as IRouteInfo

	return {
		method(method) {
			routeInfo.method = method
			return this as any
		},
		login(admin) {
			routeInfo.login = true
			routeInfo.admin = admin ?? false
			return this
		},
		db() {
			routeInfo.db = true
			return this
		},
		dbinit() {
			routeInfo.dbInit = true
			return this
		},
		param(params) {
			routeInfo.paramValidator = jsonv2.object({
				typeerr: ['param error', 1001],
				rules: [{ required: true, message: ['param error', 1002] }],
				props: params
			})
			return this as any
		},
		pretreat(pretreator) {
			routeInfo.pretreator = pretreator
			return this as any
		},
		resolve(callback) {
			routeInfo.resolver = callback
			if (!routeInfo.method) routeInfo.method = 'get'
			routes.push(routeInfo)
		}
	} as IRoute<undefined, never, any, any> as IRoute<undefined, never, false, false>

}