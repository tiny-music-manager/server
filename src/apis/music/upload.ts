import fs from "fs"
import path from "path"
import crypto from 'crypto'
import moment from 'moment'
import mm from 'music-metadata'
import { jsonv2 } from "jsonval"
import { exec } from 'child_process'
import { route } from "../../libs/route"
import { Config } from "../../libs/config"
import { consts } from "../../libs/consts"
import { utils } from "../../libs/utils"
import { lyricDownloader } from "../../libs/lyric"

//保存歌曲信息
route('/api/music/upload')
	.method('post')
	.login(true)
	.db()
	.dbinit()
	.param({
		//歌曲名称
		name: jsonv2.string({
			typeerr: ['music name error', 10011],
			rules: [
				{ required: true, message: ['artist name is null', 10012] },
				{ min: 1, max: 250, message: ['artist name length error', 10013] }
			]
		}),
		//歌手列表
		artists: jsonv2.array({
			typeerr: ['artist list error', 20021],
			rules: [{ required: true, message: ['artist list is null', 20022] }],
			items: jsonv2.object({
				typeerr: ['', 0],
				rules: [{ required: true, message: ['', 0] }],
				props: {
					id: jsonv2.string({
						typeerr: ['', 0],
						rules: [{ min: 24, max: 24, message: ['', 0] }],
					}),
					name: jsonv2.string({
						typeerr: ['', 0],
						rules: [
							{ required: true, message: ['', 0] },
							{ min: 1, max: 255, message: ['', 0] },
						]
					}),
					fname: jsonv2.string({
						typeerr: ['', 0],
						rules: [{ min: 1, max: 255, message: ['', 0] }]
					}),
					birthday: jsonv2.string({
						typeerr: ['', 0],
						rules: [
							{ type: 'date', message: ['', 0] },
						]
					}),
					desc: jsonv2.string({ typeerr: ['', 0] }),
					avatar: jsonv2.string({ typeerr: ['', 0] }),
				}
			}),
		}),
		//专辑信息
		album: jsonv2.object({
			typeerr: ['', 20041],
			props: {
				id: jsonv2.string({
					typeerr: ['', 0],
					rules: [{ min: 24, max: 24, message: ['', 0] }],
				}),
				name: jsonv2.string({
					typeerr: ['', 0],
					rules: [
						{ required: true, message: ['', 0] },
						{ min: 1, max: 100, message: ['', 0] },
					]
				}),
				issue: jsonv2.string({
					typeerr: ['', 0],
					rules: [
						// { type: 'date', message: ['', 0] }
					]
				}),
				desc: jsonv2.string({
					typeerr: ['', 0],
				}),
				pic: jsonv2.string({
					typeerr: ['', 0],
				}),
				artists: jsonv2.array({
					typeerr: ['artist list error', 20021],
					rules: [{ required: true, message: ['artist list is null', 20022] }],
					items: jsonv2.object({
						typeerr: ['', 0],
						rules: [{ required: true, message: ['', 0] }],
						props: {
							id: jsonv2.string({
								typeerr: ['', 0],
								rules: [{ min: 24, max: 24, message: ['', 0] }],
							}),
							name: jsonv2.string({
								typeerr: ['', 0],
								rules: [
									{ required: true, message: ['', 0] },
									{ min: 1, max: 255, message: ['', 0] },
								]
							}),
							fname: jsonv2.string({
								typeerr: ['', 0],
								rules: [{ min: 1, max: 255, message: ['', 0] }]
							}),
							birthday: jsonv2.string({
								typeerr: ['', 0],
								rules: [
									{ type: 'date', message: ['', 0] },
								]
							}),
							desc: jsonv2.string({ typeerr: ['', 0] }),
							avatar: jsonv2.string({ typeerr: ['', 0] }),
						}
					}),
				}),
			},
		}),
		//分类信息
		types: jsonv2.array({
			typeerr: ['types list error', 20061],
			rules: [{ required: true, message: ['type list is null', 20062] }],
			items: jsonv2.string({
				typeerr: ['type id error', 10071],
				rules: [
					{ required: true, message: ['type id is null', 10072] },
					{ min: 24, max: 24, message: ['type id length error', 10073] },
				],
			}),
		}),
		//发行时间
		time: jsonv2.string({
			typeerr: ['issue time error', 10081],
			rules: [{ type: 'date', message: ['issue time error', 10084] }],
		}),
		//图片
		pic: jsonv2.string({
			typeerr: ['', 0]
		}),
	})
	.resolve(async (ctx) => {
		const file = ctx.file('music')
		if (!file) throw new Error('music file is empty')
		let saveto: string
		let hash: string
		//读取歌曲信息
		let { type, duration, bitrate } = await new Promise<{ type: string, duration: number, bitrate: { rate: number, unit: string } | null }>((resolve, reject) => {
			let buffer: Array<string> = []
			const cp = exec(`ffmpeg -i "${file.path}"`)
			cp.stdout?.on('data', data => buffer.push(data))
			cp.stderr?.on('data', data => buffer.push(data))
			cp.once('close', async (code) => {
				try {
					if (code == 127) return reject('ffmpeg not found')
					const str = buffer.join()
					//音乐类型
					let type: string = ''
					const typeMatch = str.match(/Input #\d+,\s*(\w+),/)
					if (typeMatch?.[1]) type = typeMatch[1].trim()
					//时长
					let duration: number = 0
					const durationMatch = str.match(/Duration:\s*(\d+:\d{2}:\d{2})/i)
					if (durationMatch?.[1]) {
						const d = durationMatch[1].split(/:/).map(s => parseInt(s))
						let seconds = [3600, 60, 1]
						d.forEach((di, i) => duration += di * seconds[i])
					}
					if (!duration) {
						let c = 0
						//读取3次
						while (c < 3 && !duration) {
							try {
								duration = await mm.parseFile(file.path).then(res => res.format.duration ?? 0)
							} catch (err) {
								duration = 0
							}
							if (!duration) await new Promise((resolve) => setTimeout(resolve, 1000))
						}
						if (!duration) throw new Error('read duration failed')
					}
					//比特率
					let bitrate: { rate: number, unit: string } | null = null
					const bitrateMatch = str.match(/bitrate:\s+(\d+ [kmg]b\/s)/i)
					if (bitrateMatch?.[1]) {
						const b = bitrateMatch[1].match(/^(\d+)\s*([kmg]b)\/s$/)
						if (b?.[1] && b?.[2]) bitrate = { rate: parseInt(b[1]), unit: b[2] }
					}
					resolve({ type, duration, bitrate })
				} catch (err) {
					reject(err)
				}
			})
		})
		if (!duration) throw new Error('cannot get duration')
		//类型不允许
		if (!Config.music.allowed.includes(type)) throw new Error('music type error')
		//转换检测
		let convert: string | undefined = undefined
		if (Config.music.toflac.includes(type)) convert = path.join(Config.server.cachedir, file.hash + '.flac')
		else if (Config.music.tomp3.includes(type)) convert = path.join(Config.server.cachedir, file.hash + '.mp3')
		//转换
		if (convert) {
			// const cmd = `ffmpeg -i "xxx.ape" -y -metadata artist="周杰伦" -metadata title="反向时钟" xxx.flac`
			//转码
			await new Promise<void>((resolve, reject) => {
				const cp = exec(`ffmpeg -i "${file.path}" -y ${convert}`)
				cp.once('close', (code) => {
					if (code == 0) resolve()
					else reject(new Error('convert music file error'))
				})
			})
			//计算hash
			hash = crypto.createHash('md5').update(fs.readFileSync(convert)).digest('hex')
			//得到目标位置，并删除中间文件
			saveto = path.join('music', hash.substr(0, 2), hash + path.extname(convert))
			const dst = path.join(Config.server.staticdir, saveto)
			if (!fs.existsSync(path.dirname(dst))) fs.mkdirSync(path.dirname(dst), { recursive: true })
			try {
				fs.renameSync(convert, dst)
			} catch (err) {
				fs.copyFileSync(convert, dst)
			} finally {
				if (fs.existsSync(convert)) fs.unlinkSync(convert)
				if (fs.existsSync(file.path)) fs.unlinkSync(file.path)
			}
		}
		//不用转换
		else {
			hash = crypto.createHash('md5').update(fs.readFileSync(file.path)).digest('hex')
			saveto = path.join('music', hash.substr(0, 2), hash + consts.MUSIC_TYPE_EXT[type] ?? file.extname)
			file.moveTo(saveto)
		}

		//检测是否重复
		const music = await ctx.db.music.findOne({ hash })
		if (music) return music.id

		const imageDownload = async (url: string, savetype: string, name: string) => {
			const download = async (url: string) => {
				try {
					let saveto!: string
					await utils.download(url, opt => {
						return saveto = `pic/${savetype}/${name.substr(0, 1)}/${opt.md5}${opt.ext ?? '.jpg'}`
					})
					return saveto
				} catch (err) {
					console.log(err)
					return null
				}
			}

			//酷我音乐特别处理（优先下载高分辨率）
			if (/\w+\.kuwo\.cn/.test(url)) {
				// console.log(url)
				let oldUrl = url
				let sizes = [1024, 800, 512, 500, 480, 400, 300, 256]
				for (let i = 0; i < sizes.length; ++i) {
					url = oldUrl.replace(/(starheads|albumcover)\/(\d+)/, `$1/${sizes[i]}`)
					const ret = await download(url)
					console.log(ret, url)
					if (ret) return ret
				}
				url = oldUrl
			}
			//正常下载
			return await download(url)
		}

		//下载歌曲图片
		const musicImage = await (async () => {
			if (!ctx.params.pic) return null
			return imageDownload(ctx.params.pic, 'music', ctx.params.name)
		})()

		//下载歌手图片
		const artistImages = await Promise.all(ctx.params.artists.map(async artist => {
			if (artist.id) return null
			if (!artist.avatar) return null
			return imageDownload(artist.avatar, 'artist', artist.name)
		}))

		//下载专辑图片
		const albums = [ctx.params.album!].filter(a => !!a)
		const albumImages = await Promise.all(albums.map(async album => {
			if (album.id) return null
			if (!album.pic) return null
			return imageDownload(album.pic, 'album', album.name)
		}))

		//下载专辑歌手图片
		const albumArtitImages = await Promise.all(albums.map(album => Promise.all(album.artists.map(async artist => {
			//已经有的不管
			if (artist.id) return null
			//没有头像的不管
			if (!artist.avatar) return null
			//已经在歌手列表中的不管
			for (let i = 0; i < ctx.params.artists.length; ++i) {
				if (ctx.params.artists[i].name == artist.name) return null
			}
			//下载
			return imageDownload(artist.avatar, 'artist', artist.name)
		}))))

		//保存歌手
		const artistIds = await Promise.all(ctx.params.artists.map(async (artist, i) => {
			//如果有就不管了
			if (artist.id) return artist.id
			//保存歌手
			const { insertedId } = await ctx.db.artist.insertOne({
				...utils.mkid(),
				name: artist.name,
				fname: artist.fname || '',
				birthday: artist.birthday || '',
				desc: artist.desc || '',
				pych: utils.pinyinCH(artist.name),
				avatar: artistImages[i] ?? '',
			})
			return insertedId.toString()
		}))

		//保存专辑
		let albumIds = await Promise.all(albums.map(async (album, i) => {
			if (album.id) return album.id
			const { insertedId } = await ctx.db.album.insertOne({
				...utils.mkid(),
				name: album.name,
				issue: (album.issue && (/^\d{4}-\d{2}-\d{2}$/.test(album.issue))) ? album.issue : '',
				artists: await Promise.all(album.artists.map((a, j) => {
					//已经有的不管
					if (a.id) return a.id
					//已经在歌手列表中的不管
					for (let i = 0; i < ctx.params.artists.length; ++i) {
						if (ctx.params.artists[i].name == a.name) return artistIds[i]
					}
					//添加
					return ctx.db.artist.insertOne({
						...utils.mkid(),
						name: a.name,
						fname: a.fname || '',
						birthday: a.birthday || '',
						desc: a.desc || '',
						pych: utils.pinyinCH(a.name),
						avatar: albumArtitImages[i][j] ?? '',
					}).then(res => res.insertedId.toString())
				})),
				desc: album.desc ?? '',
				pych: utils.pinyinCH(album.name),
				pic: albumImages[i] ?? '',
			})
			return insertedId.toString()
		}))

		// 添加音乐
		const { insertedId } = await ctx.db.music.insertOne({
			...utils.mkid(),
			name: ctx.params.name,
			artists: artistIds,
			albums: albumIds,
			types: ctx.params.types,
			hash: hash,
			duration,
			bitrate,
			time: ctx.params.time ?? '',
			image: musicImage ?? '',
			file: saveto,
			ctime: moment().format('YYYY-MM-DD HH:mm:ss'),
		})
		const id = insertedId.toString()

		//添加到歌词下载队列
		lyricDownloader.push(id)

		//完成
		return { id }
	})
