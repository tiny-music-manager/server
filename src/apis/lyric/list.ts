import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"
import { utils } from "../../libs/utils"

//获取歌曲下的歌词
route('/api/lyric/list')
	.method('get')
	.db()
	.dbinit()
	.param({
		//歌曲ID
		music: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 24, max: 24, message: ['', 0] },
			],
		}),
	})
	.resolve(async (ctx) => {
		//查询
		const lyrics = await ctx.db.lyric.find({ music: ctx.params.music }, { projection: { _id: 0, music: 0 } }).toArray()
		//歌词处理并返回
		return lyrics.map(lyric => ({
			id: lyric.id,
			name: lyric.name,
			artist: lyric.artist,
			album: lyric.album,
			duration: lyric.duration,
			default: lyric.default ?? false,
			type: lyric.type,
			text: lyric.text,
			oid: lyric.oid,
			lyric: utils.lyricEncode(lyric)
		}))
	})