import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

route('/api/album/list')
	.method('get')
	.db()
	.dbinit()
	.param({
		ids: jsonv2.array({
			typeerr: ['album id list error', 20021],
			rules: [{ min: 1, message: ['album id list length error', 20023] }],
			items: jsonv2.string({
				typeerr: ['album id error', 10021],
				rules: [{ min: 24, max: 24, message: ['album id length error', 10023] }],
			}),
		}),
		names: jsonv2.array({
			typeerr: ['album name list error', 20001],
			rules: [{ min: 1, message: ['album name list length error', 20003] }],
			items: jsonv2.string({
				typeerr: ['album name error', 10001],
				rules: [{ min: 1, max: 255, message: ['album name length error', 10003] }],
			}),
		}),
	})
	.resolve(async ctx => {

		const albums = await ctx.db.album.aggregate([
			{
				$match: {
					...ctx.params.ids ? { id: { $in: ctx.params.ids } } : {},
					...ctx.params.names ? { name: { $in: ctx.params.names } } : {},
				}
			},
			{ $lookup: { localField: 'artists', from: 'artist', foreignField: 'id', as: 'artists' } },
			{
				$project: {
					_id: 0, id: 1, name: 1, issue: 1, sect: 1, language: 1, desc: 1, pic: 1,
					artists: { id: 1, name: 1, avatar: 1, },
				},
			},
		]).toArray()

		//如果传递了ID而且只有一个ID则查询更多信息
		if (albums.length && ctx.params.ids?.length == 1) {
			//歌曲查询
			albums[0].musics = await ctx.db.music.aggregate([
				{ $match: { albums: ctx.params.ids[0] } },
				{ $lookup: { localField: 'albums', from: 'album', foreignField: 'id', as: 'albums' } },
				{ $lookup: { localField: 'artists', from: 'artist', foreignField: 'id', as: 'artists' } },
				{
					$project: {
						_id: 0, id: 1, name: 1, types: 1, hash: 1, duration: 1, bitrate: 1, image: 1, time: 1, file: 1,
						artists: { id: 1, name: 1, fname: 1, birthday: 1, avatar: 1 },
						albums: { id: 1, name: 1, issue: 1, pic: 1 },
					},
				},
			]).toArray()
			//其他专辑
			const artistIds = albums[0].artists.map((a: any) => a.id)
			albums[0].others = await ctx.db.album.find({ artists: { $in: artistIds }, id: { $ne: albums[0].id } }, { projection: { _id: 0, id: 1, name: 1, pic: 1 }, limit: 20 }).toArray()
		}


		return albums
	})