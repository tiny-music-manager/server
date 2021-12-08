import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

route('/api/album/search')
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

		const artists = ctx.db.album.aggregate([
			{ $lookup: { localField: 'id', from: 'music', foreignField: 'albums', as: 'musics' } },
			{ $lookup: { localField: 'artists', from: 'artist', foreignField: 'id', as: 'artists' } },
			{
				$match: {
					$or: [
						{ 'name': { $regex: keywords.join('|'), $options: 'i' } },
						{ 'desc': { $regex: keywords.join('|'), $options: 'i' } },
						{ 'musics.name': { $regex: keywords.join('|'), $options: 'i' } },
						{ 'artists.name': { $regex: keywords.join('|'), $options: 'i' } },
					]
				}
			},
			{ $limit: 20 },
			{
				$project: {
					_id: 0, id: 1, name: 1, issue: 1, desc: 1, pic: 1,
					artists: { id: 1, name: 1, avatar: 1 },
					//数量统计
					counts: {
						musics: { $size: '$musics' },		//歌曲数量
					},
				},
			},
		]).toArray()

		return artists
	})