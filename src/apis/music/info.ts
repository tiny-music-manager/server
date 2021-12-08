import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"
import { utils } from "../../libs/utils"

//歌曲信息
route('/api/music/info')
	.method('get')
	.db()
	.param({
		id: jsonv2.string({
			typeerr: ['id error', 10001],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 24, max: 24, message: ['id length error', 10003] }
			],
		}),
	})
	.resolve(async ctx => {
		//查询歌曲和歌词
		const { lyrics, ...music } = await ctx.db.music.aggregate([
			{ $match: { id: ctx.params.id } },
			{ $lookup: { localField: 'albums', from: 'album', foreignField: 'id', as: 'albums' } },
			{ $lookup: { localField: 'artists', from: 'artist', foreignField: 'id', as: 'artists' } },
			{ $lookup: { localField: 'id', from: 'lyric', foreignField: 'music', as: 'lyrics' } },
			{ $limit: 1 },
			{
				$project: {
					_id: 0, id: 1, name: 1, types: 1, hash: 1, duration: 1, bitrate: 1, image: 1, time: 1, file: 1,
					artists: { id: 1, name: 1, fname: 1, birthday: 1, avatar: 1 },
					albums: { id: 1, name: 1, issue: 1, pic: 1 },
					lyrics: { id: 1, name: 1, artist: 1, album: 1, body: 1, default: 1 }
				},
			},
		]).toArray().then(a => a[0] ?? null)
		//取歌词
		let [lyric] = lyrics.filter((lyric: any) => lyric.default)
		if (!lyric) lyric = lyrics[0]
		//返回结果
		return {
			...music,
			lyric: lyric ? utils.lyricEncode(lyric) : undefined,
		}
	})