import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

route('/api/love/list')
	.method('get')
	.login()
	.db()
	.dbinit()
	.param({
		type: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ values: ['music', 'album', 'artist'], message: ['', 0] },
			]
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
		const key = `${ctx.params.type}s` as 'albums' | 'artists' | 'musics'
		//查询喜欢信息
		const love = await ctx.db.love.findOne({ user: ctx.user.id })
		//取得ID
		const ids = love?.[key]
		//分页信息
		const limit = [
			{ $skip: (ctx.params.page - 1) * ctx.params.limit },
			{ $limit: ctx.params.limit },
		]

		//查询数据
		const queries = {
			music: () => ctx.db.music.aggregate([
				{ $match: { id: { $in: ids } } },
				{ $sort: { name: 1 } },
				{ $lookup: { localField: 'albums', from: 'album', foreignField: 'id', as: 'albums' } },
				{ $lookup: { localField: 'artists', from: 'artist', foreignField: 'id', as: 'artists' } },
				...limit,
				{
					$project: {
						_id: 0, id: 1, name: 1, types: 1, hash: 1, duration: 1, bitrate: 1, image: 1, time: 1, file: 1,
						artists: { id: 1, name: 1, fname: 1, birthday: 1, avatar: 1 },
						albums: { id: 1, name: 1, issue: 1, pic: 1 },
					},
				},
			]).toArray(),
			album: () => ctx.db.album.aggregate([
				{ $match: { id: { $in: ids } } },
				{ $sort: { name: 1 } },
				{ $lookup: { localField: 'artists', from: 'artist', foreignField: 'id', as: 'artists' } },
				...limit,
				{
					$project: {
						_id: 0, id: 1, name: 1, issue: 1, sect: 1, language: 1, desc: 1, pic: 1,
						artists: { id: 1, name: 1, avatar: 1, }
					},
				},
			]).toArray(),
			artist: () => ctx.db.artist.aggregate([
				{ $match: { id: { $in: ids } } },
				{ $sort: { name: 1 } },
				{ $lookup: { localField: 'id', from: 'music', foreignField: 'artists', as: 'musics' } },
				{ $lookup: { localField: 'id', from: 'album', foreignField: 'artists', as: 'albums' } },
				...limit,
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
			]).toArray(),
		}
		const data = ids?.length ? await queries[ctx.params.type]() : []

		return {
			count: ids?.length ?? 0,
			limit: ctx.params.limit,
			[key]: data,
		}
	})