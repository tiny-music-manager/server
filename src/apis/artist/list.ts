import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

route('/api/artist/list')
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
				rules: [{ min: 1, max: 30, message: ['album name length error', 10003] }],
			}),
		}),
	})
	.resolve(async ctx => {
		//歌手查询
		const artists = await ctx.db.artist.aggregate([
			{
				$match: {
					...ctx.params.ids ? { id: { $in: ctx.params.ids } } : {},
					...ctx.params.names ? { name: { $in: ctx.params.names } } : {},
				}
			},
			{ $lookup: { localField: 'id', from: 'music', foreignField: 'artists', as: 'musics' } },
			{ $lookup: { localField: 'id', from: 'album', foreignField: 'artists', as: 'albums' } },
			{
				$project: {
					_id: 0, id: 1, name: 1, fname: 1, birthday: 1, desc: 1, avatar: 1,
					//数量统计
					counts: {
						musics: { $size: '$musics' },		//歌曲数量
						albums: { $size: '$albums' },		//专辑数量
					},
				},
			},
		]).toArray()

		//歌曲和专辑查询
		if (artists.length && ctx.params.ids?.length == 1) {
			const artist = artists[0]

			//歌曲查询
			artist.musics = artist.counts.musics ? await ctx.db.music.aggregate([
				{ $match: { artists: ctx.params.ids[0] } },
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

			//专辑查询
			artist.albums = artist.counts.albums ? await ctx.db.album.find({ artists: artist.id }, { projection: { _id: 0, id: 1, name: 1, pic: 1 }, limit: 20 }).toArray() : []
		}

		return artists
	})