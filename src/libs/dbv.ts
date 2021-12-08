import path from 'path'
import fs from 'fs'
import moment from 'moment'
import { exec } from 'child_process'
import { Db, MongoClient } from "mongodb"
import { Config } from './config'
import { ObjectID } from 'bson'


/** 数据库版本控制 */
export namespace dbv {
	/** 版本集合名称 */
	const VERSION_COLLECTION = '__VERSION__'

	//版本列表，加载完成后会对其排序
	let versions: Array<{ version: number, resolver: (db: Db) => any }> = []

	/**
	 * 定义版本
	 * @param version 版本号
	 * @param resolver 版本升级程序
	 */
	export function version(version: number, resolver: (db: Db) => any) {
		versions.push({ version, resolver })
	}

	/**
	 * 生成_id和id字段
	 */
	export function mkid() {
		const _id = new ObjectID()
		return { _id, id: _id.toString() }
	}

	/**
	 * 数据库备份
	 */
	export async function backup() {
		let client!: MongoClient
		let code = 0
		try {
			log.tip('backup', 'get database version')
			client = new MongoClient(Config.database.url)
			const db = await client.connect().then(cli => cli.db(Config.database.database))
			const ver = await getCurrentVersion(db)
			if (ver > 0) {
				log.success('backup', `current database version is ${ver}`)
				const backupfile = path.join(Config.database.backupdir, `${moment().format('YYYYMMDDHHmmss')}_${(ver + '').padStart(5, '0')}.gz`)
				log.tip('backup', `database is backing up ...`)
				await new Promise<void>((resolve, reject) => {
					//命令
					const cmd = [
						'mongodump',
						`--host=${Config.database.host}`,
						`--port=${Config.database.port}`,
						Config.database.username ? `--username=${Config.database.username}` : '',
						(Config.database.username && Config.database.password) ? `--password=${Config.database.password}` : '',
						`--archive=${backupfile}`
					].filter(s => !!s).join(' ')
					//创建目录
					if (!fs.existsSync(Config.database.backupdir)) fs.mkdirSync(Config.database.backupdir, { recursive: true })
					//开始备份
					const cp = exec(cmd, { cwd: process.cwd() })
					let errmsg = ''
					cp.stderr?.on('data', d => errmsg += d)
					cp.once('close', (code) => {
						if (code == 127) return reject(new Error(errmsg))
						else if (code == 1) return reject(new Error('cannot connect to mongodb server'))
						else if (code != 0) return reject(new Error('backup failed'))
						resolve()
					})
				})
				log.success('backup', `database backup to ${backupfile}`)
			}
			else {
				log.success('backup', `nothing done`)
			}
		} catch (err: any) {
			log.error('backup', err.message)
			code = 1
		}
		finally {
			await client?.close()
			process.exit(code)
		}
	}

	/**
	 * 数据库恢复
	 * @param filepath 备份文件路径
	 */
	export async function restore(filepath?: string) {
		let client!: MongoClient
		let code = 0
		try {
			//没有传递参数则默认取倒数第一个备份文件
			if (!filepath) [filepath] = fs.readdirSync(Config.database.backupdir).reverse()
			if (!filepath) throw new Error(`backup directory is empty`)
			//处理备份文件
			const checkFile = [
				path.resolve(process.cwd(), filepath),
				path.resolve(process.cwd(), filepath + '.gz'),
				path.resolve(Config.database.backupdir, filepath),
				path.resolve(Config.database.backupdir, filepath + '.gz'),
			]
			let backupfile: string | undefined = undefined
			for (let i = 0; i < checkFile.length; i++) {
				if (!fs.existsSync(checkFile[i])) continue
				backupfile = checkFile[i]
				break
			}
			if (!backupfile) throw new Error(`backup file not exists`)
			//恢复
			log.tip('restore', `database is restoring ...`)
			await new Promise<void>((resolve, reject) => {
				//命令
				const cmd = [
					'mongorestore',
					`--host=${Config.database.host}`,
					`--port=${Config.database.port}`,
					Config.database.username ? `--username=${Config.database.username}` : '',
					(Config.database.username && Config.database.password) ? `--password=${Config.database.password}` : '',
					'--drop',
					`--archive=${backupfile}`
				].filter(s => !!s).join(' ')
				//开始恢复
				const cp = exec(cmd, { cwd: process.cwd() })
				let errmsg = ''
				cp.stderr?.on('data', d => errmsg += d)
				cp.once('close', (code) => {
					if (code == 127) return reject(new Error(errmsg))
					else if (code == 1) return reject(new Error('cannot connect to mongodb server'))
					else if (code != 0) return reject(new Error('restore failed'))
					resolve()
				})
			})
			log.success('restore', `database restored`)
			//读取版本号
			log.tip('restore', 'get current version ...')
			client = new MongoClient(Config.database.url)
			const db = await client.connect().then(cli => cli.db(Config.database.database))
			const ver = await getCurrentVersion(db)
			if (ver) log.success('restore', `current database version is ${ver}`)
			else log.warn('restore', 'cannot get current database version')
		}
		catch (err: any) {
			code = 1
			log.error('restore', err.message)
		}
		finally {
			process.exit(code)
		}
	}

	/**
	 * 升级数据库到给定版本
	 * @param ver 目标版本
	 */
	export async function update(ver?: number) {
		let client!: MongoClient
		let code = 0
		try {
			ver = ver ?? versions[versions.length - 1].version
			client = new MongoClient(Config.database.url)
			const db = await client.connect().then(cli => cli.db(Config.database.database))
			const min = await getCurrentVersion(db)
			let updated = false
			for (let i = 0; i < versions.length; ++i) {
				if (versions[i].version <= min) continue
				await versions[i].resolver(db)
				await setCurrentVersion(db, versions[i].version)
				updated = true
			}
			if (updated) log.success('update', `update to version ${ver}`)
			else log.success('update', 'nothing done')
		}
		catch (err: any) {
			log.error('update', err.message)
			code = 1
		}
		finally {
			await client?.close()
			process.exit(code)
		}
	}

	/**
	 * 加载所有版本程序
	 */
	export async function loadAll() {
		await import('../dbv')
		versions = versions.sort((v1, v2) => v1.version - v2.version)
	}

	//获取当前版本号
	async function getCurrentVersion(db: Db) {
		const [doc = null] = await db.collection<{ ver: number, time: Date }>(VERSION_COLLECTION).find().sort({ ver: -1 }).toArray()
		return doc?.ver ?? 0
	}

	//设置当前版本
	async function setCurrentVersion(db: Db, ver: number) {
		await db.collection(VERSION_COLLECTION).insertOne({ ver, time: new Date() })
	}

	/** 日志打印 */
	export const log = {
		/**
		 * 打印信息
		 * @param tag 标记
		 * @param msg 消息
		 */
		info(tag: string, msg: string) {
			process.stdout.write(`\x1b[0G\x1b[0K`)
			console.log(`\x1b[40m\x1b[38;2;255;255;255m\x1b[1m ${tag} \x1b[0m\x1b[30m ${msg}\x1b[0m`)
		},
		/**
		 * 打印成功信息
		 * @param tag 标记
		 * @param msg 消息
		 */
		success(tag: string, msg: string) {
			process.stdout.write(`\x1b[0G\x1b[0K`)
			console.log(`\x1b[42m\x1b[38;2;255;255;255m\x1b[1m ${tag} \x1b[0m\x1b[32m ${msg}\x1b[0m`)
		},
		/**
		 * 打印警告信息
		 * @param tag 标记
		 * @param msg 消息
		 */
		warn(tag: string, msg: string) {
			process.stdout.write(`\x1b[0G\x1b[0K`)
			console.log(`\x1b[43m\x1b[38;2;255;255;255m\x1b[1m ${tag} \x1b[0m\x1b[33m ${msg}\x1b[0m`)
		},
		/**
		 * 打印错误信息
		 * @param tag 标记
		 * @param msg 消息
		 */
		error(tag: string, msg: string) {
			process.stdout.write(`\x1b[0G\x1b[0K`)
			console.log(`\x1b[41m\x1b[38;2;255;255;255m\x1b[1m ${tag} \x1b[0m\x1b[31m ${msg}\x1b[0m`)
		},
		/**
		 * 打印提示信息
		 * @param tag 标记
		 * @param msg 消息
		 */
		tip(tag: string, msg: string) {
			process.stdout.write(`\x1b[0G\x1b[0K`)
			process.stdout.write(`\x1b[45m\x1b[38;2;255;255;255m\x1b[1m ${tag} \x1b[0m\x1b[35m ${msg}\x1b[0m`)
		},
		/**
		 * 打印百分比信息
		 * @param tag 标记
		 * @param msg 消息
		 * @param task 任务，支持promise
		 */
		persent<T>(tag: string, msg: string, task: (onProgress: (current: number, total: number) => any) => T): Promise<T> {
			return task((current, total) => {
				let persent = (total) ? (current / total) : 0
				if (persent < 0) persent = 0
				if (persent > 100) persent = 100
				this.tip(tag, `[${parseInt(current / total * 100 as any)}%] ${msg}`)
			}) as any
		},
	}

}
