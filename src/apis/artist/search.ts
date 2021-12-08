import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

route('/api/artist/search')
	.method('get')
	.db()
	.dbinit()
	.param({
		keyword: jsonv2.string({
			typeerr: ['album name error', 10001],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 1, max: 30, message: ['album name length error', 10003] }
			],
		}),
	})
	.resolve(async ctx => {
		const keywords = ctx.params.keyword.split(/\s+/g)

		const artists = ctx.db.artist.aggregate([
			{ $lookup: { localField: 'id', from: 'music', foreignField: 'artists', as: 'musics' } },
			{ $lookup: { localField: 'id', from: 'album', foreignField: 'artists', as: 'albums' } },
			{
				$match: {
					$or: [
						{ 'name': { $regex: keywords.join('|'), $options: 'i' } },
						{ 'desc': { $regex: keywords.join('|'), $options: 'i' } },
						{ 'musics.name': { $regex: keywords.join('|'), $options: 'i' } },
						{ 'albums.name': { $regex: keywords.join('|'), $options: 'i' } },
					]
				}
			},
			{ $limit: 20 },
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

		return artists
	})