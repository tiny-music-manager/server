import { Collection, Db, MongoClient } from 'mongodb'
import { IMongoCollectionMap } from '../collections'
import { Config } from './config'

export type TDB = { [P in keyof IMongoCollectionMap]: Collection<IMongoCollectionMap[P]> }

export namespace mongo {
	let querys!: Array<{ collectionName: string, creator: (db: Db) => Collection<any> }>

	/** 初始化mongodb */
	export async function init() {
		const client = new MongoClient(Config.database.url)
		await client.connect()
		const db = client.db(Config.database.database)
		const collections = await db.collections()
		querys = collections.map(collection => {
			return {
				collectionName: collection.collectionName,
				creator: (db: Db) => db.collection(collection.collectionName)
			}
		})
		await client.close()
	}

	/**
	 * 创建数据库查询器
	 * @param db mongodb DB对象
	 */
	export function createQuery(db: Db) {
		const result: { [P in keyof IMongoCollectionMap]: Collection<IMongoCollectionMap[P]> } = {} as any
		querys.forEach(q => {
			result[q.collectionName as keyof IMongoCollectionMap] = q.creator(db)
		})
		return result
	}
}