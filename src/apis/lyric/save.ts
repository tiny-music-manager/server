import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"
import { utils } from "../../libs/utils"

route('/api/lyric/save')
	.method('post')
	.login(true)
	.db()
	.dbinit()
	.param({
		//歌词ID
		id: jsonv2.string({
			typeerr: ['', 0],
			rules: [{ min: 24, max: 24, message: ['', 0] }],
		}),
		//歌曲ID
		music: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 24, max: 24, message: ['', 0] },
			],
		}),
		//名称
		name: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 1, max: 255, message: ['', 0] }
			],
		}),
		//歌手
		artist: jsonv2.string({
			typeerr: ['', 0],
			rules: [{ max: 255, message: ['', 0] }],
		}),
		//专辑
		album: jsonv2.string({
			typeerr: ['', 0],
			rules: [{ max: 255, message: ['', 0] }],
		}),
		//时长
		duration: jsonv2.number({
			typeerr: ['', 0],
			type: 'int',
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 1, message: ['', 0] },
			],
		}),
		//歌词体
		body: jsonv2.array({
			typeerr: ['', 0],
			rules: [{ required: true, message: ['', 0] }],
			items: jsonv2.tuple({
				typeerr: ['', 0],
				rules: [{ required: true, message: ['', 0] }],
				items: [
					//时间
					jsonv2.number({
						typeerr: ['', 0],
						type: 'int',
						rules: [
							{ required: true, message: ['', 0] },
							{ min: 0, message: ['', 0] },
						],
					}),
					//歌词
					jsonv2.or({
						typeerr: ['', 0],
						rules: [{ required: true, message: ['', 0] }],
						items: [
							//lrc歌词
							jsonv2.string({
								typeerr: ['', 0],
								rules: [{ required: true, message: ['', 0] }],
							}),
							//卡拉OK歌词
							jsonv2.array({
								typeerr: ['', 0],
								rules: [{ required: true, message: ['', 0] }],
								items: jsonv2.tuple({
									typeerr: ['', 0],
									rules: [{ required: true, message: ['', 0] }],
									items: [
										//时间
										jsonv2.number({
											typeerr: ['', 0],
											type: 'int',
											rules: [
												{ required: true, message: ['', 0] },
												{ min: 1, message: ['', 0] },
											]
										}),
										//歌词
										jsonv2.string({
											typeerr: ['', 0],
											rules: [
												{ required: true, message: ['', 0] }
											]
										})
									]
								})
							})
						]
					})
				]
			})
		}),
		//外部ID
		oid: jsonv2.string({
			typeerr: ['', 0],
			rules: [{ max: 255, message: ['', 0] }],
		})
	})
	.resolve(async ctx => {
		//检测是不是卡拉OK
		const isKaraOke = ctx.params.body.some(line => line[1] instanceof Array)
		//纯文本歌词
		const text = ctx.params.body.map(line => {
			if (typeof line[1] == 'string') return line[1]
			return line[1].map(word => word[1]).join('')
		}).join('\n')

		let id: string
		//修改
		if (ctx.params.id) {
			//查找
			const lyric = await ctx.db.lyric.findOne({ id: ctx.params.id })
			if (!lyric) throw new Error('lyric not exists')
			//修改
			await ctx.db.lyric.updateOne({ id: ctx.params.id }, {
				$set: {
					name: ctx.params.name ?? lyric.name,
					artist: ctx.params.artist ?? lyric.artist,
					album: ctx.params.album ?? lyric.album,
					text,
					type: isKaraOke ? 'karaoke' : 'lyric',
					duration: ctx.params.duration ?? lyric.duration,
					body: ctx.params.body ?? lyric.body,
					oid: ctx.params.oid ?? lyric.oid,
				}
			})
			//完成
			id = lyric.id
		}
		//添加
		else {
			//初次添加的设为默认
			let isDefault = false
			if (!await ctx.db.lyric.count({ music: ctx.params.music })) isDefault = true
			//添加
			const { insertedId } = await ctx.db.lyric.insertOne({
				...utils.mkid(),
				music: ctx.params.music,
				name: ctx.params.name,
				artist: ctx.params.artist ?? '',
				album: ctx.params.album ?? '',
				text,
				type: isKaraOke ? 'karaoke' : 'lyric',
				duration: ctx.params.duration,
				default: isDefault,
				body: ctx.params.body,
				oid: ctx.params.oid ?? '',
			})
			id = insertedId.toString()
		}

		//完成
		return { id }
	})