import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

route('/api/kind/list')
	.method('get')
	.db()
	.dbinit()
	.param({
		id: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ min: 24, max: 24, message: ['', 0] },
			]
		}),
		musicPage: jsonv2.number({
			typeerr: ['page error', 0],
			type: 'int',
			rules: [{ min: 1, message: ['', 0] }],
			default: 1,
		}),
		musicLimit: jsonv2.number({
			typeerr: ['limit error', 0],
			type: 'int',
			rules: [{ min: 1, message: ['', 0] }],
			default: 100,
		}),
	})
	.resolve(async (ctx) => {
		//查询分类
		const kinds = await ctx.db.kind.find({
			...ctx.params.id ? { id: ctx.params.id } : {}
		}, { projection: { _id: 0 } }).toArray()

		//歌曲查询
		if (kinds.length && ctx.params.id) {
			const kind = kinds[0] as any

			//数量
			const count = await ctx.db.music.count({ types: kind.id })

			//歌曲
			const musics = count ? await ctx.db.music.aggregate([
				{ $match: { types: kind.id } },
				{ $skip: (ctx.params.musicPage - 1) * ctx.params.musicLimit },
				{ $limit: ctx.params.musicLimit },
				{ $lookup: { localField: 'albums', from: 'album', foreignField: 'id', as: 'albums' } },
				{ $lookup: { localField: 'artists', from: 'artist', foreignField: 'id', as: 'artists' } },
				{
					$project: {
						_id: 0, id: 1, name: 1, types: 1, hash: 1, duration: 1, bitrate: 1, image: 1, time: 1, file: 1,
						artists: { id: 1, name: 1, fname: 1, birthday: 1, avatar: 1 },
						albums: { id: 1, name: 1, issue: 1, pic: 1 },
					},
				},
			]).toArray() : []

			//结果保存
			kind.musicResult = { count, limit: ctx.params.musicLimit, musics }
		}

		return kinds
	})