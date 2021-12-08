import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

//保存歌曲信息
route('/api/music/validate')
	.method('get')
	.login(true)
	.db()
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
			items: jsonv2.string({
				typeerr: ['music name error', 10011],
				rules: [
					{ required: true, message: ['artist name is null', 10012] },
					{ min: 1, max: 250, message: ['artist name length error', 10013] }
				]
			}),
		}),
		//专辑信息
		duration: jsonv2.number({
			typeerr: ['', 20041],
			type: 'int',
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 0, message: ['', 0] },
			],
		}),
	})
	.resolve(async ctx => {
		//查询歌曲信息
		const result = await ctx.db.music.aggregate([
			{ $lookup: { localField: 'artists', from: 'artist', foreignField: 'id', as: 'artists' } },
			{ $lookup: { localField: 'albums', from: 'album', foreignField: 'id', as: 'albums' } },
			{
				$match: {
					name: ctx.params.name,
					'artists.name': { $in: ctx.params.artists },
					duration: { $gte: ctx.params.duration - 2, $lte: ctx.params.duration + 2 },			//时间误差±2秒
				},
			},
			{
				$project: {
					_id: 0, id: 1, name: 1, duration: 1, hash: 1, bitrate: 1,
					albums: { id: 1, name: 1, issue: 1 },
					artists: { id: 1, name: 1, birthday: 1 },
				}
			}
		]).toArray()
		return result
	})