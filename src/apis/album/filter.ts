import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

//专辑过滤查询
route('/api/album/filter')
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
		const count = await ctx.db.album.count({
			...ctx.params.pych ? { pych: ctx.params.pych.toUpperCase() } : {},
		})

		const albums = count ? await ctx.db.album.aggregate([
			{
				$match: {
					...ctx.params.pych ? { pych: ctx.params.pych.toUpperCase() } : {},
				}
			},
			{ $sort: { name: 1 } },
			{ $lookup: { localField: 'artists', from: 'artist', foreignField: 'id', as: 'artists' } },
			{ $skip: (ctx.params.page - 1) * ctx.params.limit },
			{ $limit: ctx.params.limit },
			{
				$project: {
					_id: 0, id: 1, name: 1, issue: 1, sect: 1, language: 1, desc: 1, pic: 1,
					artists: { id: 1, name: 1, avatar: 1, }
				},
			},
		]).toArray() : []

		//返回结果
		return {
			count,
			limit: ctx.params.limit,
			albums,
		}
	})