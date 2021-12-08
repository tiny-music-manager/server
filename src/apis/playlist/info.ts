import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

route('/api/playlist/info')
	.method('get')
	.login()
	.db()
	.dbinit()
	.param({
		list: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 24, max: 24, message: ['', 0] },
			]
		}),
	})
	.resolve(async ctx => {
		//查询播放列表
		let list = await ctx.db.playlist.findOne({ user: ctx.user.id, id: ctx.params.list })
		if (!list) return null

		//查询歌曲
		const musics = list.musics?.length ? await ctx.db.music.aggregate([
			{ $match: { id: { $in: list.musics } } },
			{ $sort: { name: 1 } },
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

		//OK
		return { id: list.id, name: list.name, musics }
	})