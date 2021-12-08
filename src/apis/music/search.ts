import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

route('/api/music/search')
	.method('get')
	.db()
	.dbinit()
	.param({
		keyword: jsonv2.string({
			typeerr: ['keyword error', 10001],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 1, max: 30, message: ['keyword length error', 10003] }
			],
		}),
	})
	.resolve(async ctx => {
		const keywords = ctx.params.keyword.split(/\s+/g)

		const musics = ctx.db.music.aggregate([
			{ $lookup: { localField: 'albums', from: 'album', foreignField: 'id', as: 'albums' } },
			{ $lookup: { localField: 'artists', from: 'artist', foreignField: 'id', as: 'artists' } },
			{
				$match: {
					$or: [
						{ 'name': { $regex: keywords.join('|'), $options: 'i' } },
						{ 'desc': { $regex: keywords.join('|'), $options: 'i' } },
						{ 'albums.name': { $regex: keywords.join('|'), $options: 'i' } },
						{ 'artists.name': { $regex: keywords.join('|'), $options: 'i' } },
					]
				}
			},
			{ $limit: 50 },
			{
				$project: {
					_id: 0, id: 1, name: 1, types: 1, hash: 1, duration: 1, bitrate: 1, image: 1, time: 1, file: 1,
					artists: { id: 1, name: 1, fname: 1, birthday: 1, avatar: 1 },
					albums: { id: 1, name: 1, issue: 1, pic: 1 },
				},
			},
		]).toArray()

		return musics
	})