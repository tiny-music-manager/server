import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

//歌手过滤查询
route('/api/artist/filter')
	.method('get')
	.db()
	.dbinit()
	.param({
		pych: jsonv2.string({
			typeerr: ['first ch error', 10021],
			rules: [{ min: 1, max: 1, message: ['first ch error', 10023] }],
		}),
		page: jsonv2.number({
			typeerr: ['page error', 0],
			type: 'int',
			rules: [{ min: 1, message: ['', 0] }],
			default: 1,
		}),
		limit: jsonv2.number({
			typeerr: ['limit error', 0],
			type: 'int',
			rules: [{ min: 1, message: ['', 0] }],
			default: 100,
		}),
	})
	.resolve(async ctx => {
		//查询数量
		const count = await ctx.db.artist.count({
			...ctx.params.pych ? { pych: ctx.params.pych.toUpperCase() } : {},
		})

		const artists = count ? await ctx.db.artist.aggregate([
			{
				$match: {
					...ctx.params.pych ? { pych: ctx.params.pych.toUpperCase() } : {},
				}
			},
			{ $sort: { name: 1 } },
			{ $lookup: { localField: 'id', from: 'music', foreignField: 'artists', as: 'musics' } },
			{ $lookup: { localField: 'id', from: 'album', foreignField: 'artists', as: 'albums' } },
			{ $skip: (ctx.params.page - 1) * ctx.params.limit },
			{ $limit: ctx.params.limit },
			{
				$project: {
					_id: 0, id: 1, name: 1, fname: 1, birthday: 1, avatar: 1,
					//数量统计
					counts: {
						musics: { $size: '$musics' },		//歌曲数量
						albums: { $size: '$albums' },		//专辑数量
					},
				},
			},
		]).toArray() : []

		//返回结果
		return {
			count,
			limit: ctx.params.limit,
			artists,
		}
	})