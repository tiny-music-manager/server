import zlib from 'zlib'
import { MongoClient } from "mongodb"
import { IAlbum, IAritst, ILyric, IMusic } from "../collections"
import { Config } from "./config"
import { mongo, TDB } from "./mongo"
import { request } from "./request"
import { logger } from './log'
import { utils } from './utils'

/** 每隔多少时间检测一下数据库中的歌曲 */
const DATABASE_CHECK_TIME = 1000 * 60 * 30

export namespace lyricDownloader {
	//'@Gaw^2tGQ61-ÎÒni'
	const KRC_ENCODE_KEY = Buffer.from(new Uint8Array([64, 71, 97, 119, 94, 50, 116, 71, 81, 54, 49, 45, 206, 210, 110, 105]))

	interface IKugouSearchLyricInfo {
		id: string
		accesskey: string
		singer: string
		song: string
		othername: string
		albumname: string
		duration: number
	}

	const musicList: Array<string> = []

	//mongodb查询
	async function mongoQuery<R>(query: (db: TDB) => R): Promise<R> {
		let result: any
		let err: any
		let client: MongoClient | undefined = undefined
		try {
			client = new MongoClient(Config.database.url)
			await client.connect()
			const db = client.db(Config.database.database)
			const tdb = mongo.createQuery(db)
			result = await query(tdb)
		} catch (e) {
			err = e
		}
		finally {
			if (client) client.close()
		}
		if (err) throw err

		return result
	}

	//从数据库查询音乐信息
	function getMusic(db: TDB, music: string): Promise<(Omit<IMusic, 'artists' | 'albums'> & { artists: Array<IAritst>, albums: Array<IAlbum> }) | null> {
		return db.music.aggregate([
			{ $match: { id: music } },
			{ $lookup: { localField: 'albums', from: 'album', foreignField: 'id', as: 'albums' } },
			{ $lookup: { localField: 'artists', from: 'artist', foreignField: 'id', as: 'artists' } },
			{ $limit: 1 },
			{
				$project: {
					_id: 0, id: 1, name: 1, types: 1, hash: 1, duration: 1, bitrate: 1, image: 1, time: 1, file: 1,
					artists: { id: 1, name: 1, fname: 1, birthday: 1, avatar: 1 },
					albums: { id: 1, name: 1, issue: 1, pic: 1 },
				},
			},
		]).toArray().then(res => res[0] as any ?? null)
	}

	//检测音乐是否有歌词
	async function hasLyrics(db: TDB, music: string) {
		return await db.lyric.count({ music: music })
	}

	//保存歌词到数据库
	async function saveLyric(db: TDB, music: string, lyric: { oid: string, duration: number, default: boolean, ar: string, al: string, ti: string, body: ILyric['body'] }) {
		await db.lyric.insertOne({
			...utils.mkid(),
			music: music,
			name: lyric.ti,
			artist: lyric.ar,
			album: lyric.al,
			text: lyric.body.map(line => {
				if (typeof line[1] == 'string') return line[1]
				return line[1].map(word => word[1]).join('')
			}).join('\n'),
			type: 'karaoke',
			duration: lyric.duration,
			default: lyric.default,
			body: lyric.body,
			oid: lyric.oid,
		})
	}

	//解密酷狗歌词
	function decodeKRC(b64: string) {
		const buffer = Buffer.from(b64, 'base64')
		//解密
		const docoded = Buffer.alloc(buffer.length - 4)
		for (let i = 4; i < buffer.length; i++) {
			docoded[i - 4] = buffer[i] ^ KRC_ENCODE_KEY[(i - 4) % 16]
		}
		//解压
		const str = zlib.unzipSync(docoded) + ''
		//解析
		const lines = str.split(/\r?\n/g).map(s => s.trim()).filter(s => !!s)
		const lyric = { ar: '', ti: '', body: [] as ILyric['body'] }
		lines.map(line => {
			if (!line) return null
			let match = line.match(/^\[\s*(\d+)\s*,\s*(\d+)\s*\]\s*([\s\S]+)\s*$/)
			if (!match || !match[1] || !match[3]) {
				match = line.match(/^\[\s*(ar|ti)\s*:\s*([\s\S]+?)\s*\]$/)
				if (!match || !match[1] || !match[2]) return null
				lyric[match[1] as 'ar' | 'ti'] = match[2]
				return null
			}
			const start = parseInt(match[1])
			const words = match[3].match(/<\s*\d+\s*,\s*\d+\s*,\s*\d+\s*>\s*[^<>]+\s*/g)?.map(ch => {
				const mt = ch.match(/^<\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*>\s*([^<>]+)\s*$/)
				if (!mt) return null
				return {
					time: parseInt(mt[2]),
					word: mt[4],
				}
			})?.filter(w => !!w)
			if (!words) return null
			return { start, words }
		}).filter(line => !!line).forEach((line) => {
			if (!line) return
			//歌词逐字处理
			const words: Array<[number, string]> = []
			line.words.forEach(({ time, word }: any) => {
				const last = words[words.length - 1]
				//时间为0？？？，合并吧
				if (time <= 0) {
					//有的话直接拼接
					if (last) last[1] += word
					//否则追加
					else words.push([0, word])
				}
				//正常情况
				else {
					//之前有没有时间为0的，有的话拼接上去
					if (last && last[0] <= 0) {
						last[0] = time
						last[1] += word
					}
					//正常处理
					words.push([time, word])
				}
			})
			//把当前处理好的行信息加入到body
			lyric.body.push([line.start, words])
		})
		//完成
		return lyric
	}

	//从酷狗音乐获取歌词
	async function kugou(db: TDB, musicID: string) {
		try {
			//查询歌曲
			const music = await getMusic(db, musicID)
			if (!music) return null

			//搜索歌曲
			const res = await request.get(`http://mobilecdn.kugou.com/api/v3/search/song`, { params: { keyword: music.name, page: 1, pageSize: 50 }, type: 'json' })
			const songs: Array<any> = (res.body?.data?.info ?? [])
				.filter((s: any) => Math.abs(music.duration - s.duration) < 10)			//时间范围不能太大
				.filter((s: any) => music.artists.some(a => (a.name.indexOf(s.singername) >= 0) || (s.singername.indexOf(a.name) >= 0)))		//包含歌手

			const searchResult: Array<IKugouSearchLyricInfo> = []
			for (let i = 0; i < songs.length; ++i) {
				const hash = songs[i].hash
				const res = await request.get(`http://krcs.kugou.com/search`, { params: { ver: 1, man: 'yes', duration: music.duration * 1000, hash, pageSize: 50 }, type: 'json' })
				res.body?.candidates?.forEach?.((di: any) => {
					if (Math.abs(di.duration / 1000 - music.duration) > 10) return
					searchResult.push({
						id: di.id,
						accesskey: di.accesskey,
						singer: di.singer, song: di.song,
						duration: di.duration,
						othername: songs[i].othername_original ?? '',
						albumname: songs[i].album_name ?? '',
					})
				})
			}

			//过滤重复的
			let lyrics: Array<IKugouSearchLyricInfo> = []
			searchResult.forEach(item => {
				if (!lyrics.some(ri => ri.id == item.id)) lyrics.push(item)
			})

			//排序一下
			const duration = music.duration * 1000
			lyrics = lyrics.sort((a, b) => Math.abs(a.duration - duration) - Math.abs(b.duration - duration))

			//开始下载歌词
			const currentLyrics = await db.lyric.find({ music: musicID }).toArray()
			for (let i = 0; i < lyrics.length; ++i) {
				try {
					//已经存在
					if (currentLyrics.some(l => l.oid == `kugou_${lyrics[i].id}`)) continue
					//下载歌词
					const res = await request.get(`http://lyrics.kugou.com/download`, {
						type: 'json', params: {
							ver: 1, client: 'pc',
							id: lyrics[i].id, accesskey: lyrics[i].accesskey,
							fmt: 'krc', charset: 'utf8',
						}
					})
					if (!res.body?.content) continue
					//解密
					const lyric = decodeKRC(res.body.content)
					//保存到数据库
					await saveLyric(db, music.id, {
						ar: lyric.ar || music.artists.map(ar => ar.name).join('、'),
						al: music.albums.map(al => al.name).join('、'),
						ti: lyric.ti || music.name,
						body: lyric.body,
						oid: `kugou_${lyrics[i].id}`,
						duration: lyrics[i].duration,
						default: i == 0,
					})
				} catch (err: any) {
					logger.derr('tmmd', err)
				}
			}
		} catch (err: any) {
			logger.derr('tmmd', err)
		}
	}

	//定时任务
	function main() {
		let parsing = false
		//定时检测音乐列表中的数据，如果存在歌曲则更新歌词
		setInterval(async () => {
			if (!musicList.length || parsing) return
			parsing = true

			try {
				const [musicId] = musicList.splice(0, 1)
				await mongoQuery(async db => {
					if (await hasLyrics(db, musicId)) return		//已有歌词，忽略
					logger.tip('tmmd', `downloading lyric for music ${musicId}`)
					await kugou(db, musicId)
					logger.clearLine()
				})
			} catch (err: any) {
				logger.derr('tmmd', err)
			}

			parsing = false
		}, 1000)
		//定是检测数据库中没有歌词的歌曲
		const checkDatabaseMusicList = async () => {
			try {
				logger.tip('tmmd', 'check music lyric from database')
				const len = await mongoQuery(async db => {
					//获取歌词数量为0的歌曲ID列表
					const res = await db.music.aggregate<{ id: string }>([
						//连接到lyric表
						{ $lookup: { localField: 'id', from: 'lyric', foreignField: 'music', as: 'lyrics' } },
						//取歌曲ID和歌词数量
						{ $project: { _id: 0, id: 1, count: { $size: '$lyrics' } } },
						//要求数量为0
						{ $match: { count: 0 } },
						//取歌曲ID
						{ $project: { id: 1 } },
					]).toArray()
					//加入到歌曲列表
					res.forEach(m => push(m.id))
					return res.length
				})
				logger.info('tmmd', `${len} musics have not lyric, to be download`)
			} catch (err: any) {
				logger.derr('tmmd', err)
			}
		}
		checkDatabaseMusicList()
		setInterval(checkDatabaseMusicList, DATABASE_CHECK_TIME)
	}

	/**
	 * 加入歌曲到处理队列
	 * @param musics 音乐ID列表
	 */
	export function push(...musics: Array<string>) {
		musics.forEach(music => {
			if (musicList.includes(music)) return
			musicList.push(music)
		})
	}

	main()
}