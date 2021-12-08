import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

//专辑过滤查询
route('/api/music/filter')
	.method('get')
	.db()
	.dbinit()
	.param({
		// 歌手
		artist: jsonv2.string({
			typeerr: ['first ch error', 10021],
			rules: [{ min: 1, max: 255, message: ['', 0] }],
		}),
		// 专辑
		album: jsonv2.string({
			typeerr: ['first ch error', 10021],
			rules: [{ min: 1, max: 255, message: ['', 0] }],
		}),
		// 分类
		type: jsonv2.string({
			typeerr: ['first ch error', 10021],
			rules: [{ min: 1, max: 255, message: ['', 0] }],
		}),
		//页码
		page: jsonv2.number({
			typeerr: ['page error', 0],
			type: 'int',
			rules: [{ min: 1, message: ['', 0] }],
			default: 1,
		}),
		//每页数量
		limit: jsonv2.number({
			typeerr: ['limit error', 0],
			type: 'int',
			rules: [{ min: 1, message: ['', 0] }],
			default: 100,
		}),
	})
	.resolve(async ctx => {
		//条件
		const cond = {
			...ctx.params.artist ? { artists: ctx.params.artist } : {},
			...ctx.params.album ? { albums: ctx.params.album } : {},
			...ctx.params.type ? { types: ctx.params.type } : {},
		}

		//查询数量
		const count = await ctx.db.music.count(cond)
		console.log(count)
		//查询音乐
		const musics = await ctx.db.music.aggregate([
			{ $match: cond },
			{ $lookup: { localField: 'albums', from: 'album', foreignField: 'id', as: 'albums' } },
			{ $lookup: { localField: 'artists', from: 'artist', foreignField: 'id', as: 'artists' } },
			{ $skip: (ctx.params.page - 1) * ctx.params.limit },
			{ $limit: ctx.params.limit },
			{
				$project: {
					_id: 0, id: 1, name: 1, types: 1, hash: 1, duration: 1, bitrate: 1, image: 1, time: 1, file: 1,
					artists: { id: 1, name: 1, fname: 1, birthday: 1, avatar: 1 },
					albums: { id: 1, name: 1, issue: 1, pic: 1 },
				},
			},
		]).toArray()

		//返回结果
		return {
			count,
			limit: ctx.params.limit,
			musics,
		}
	})