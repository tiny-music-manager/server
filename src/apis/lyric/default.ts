import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

//设为默认歌词
route('/api/lyric/default')
	.method('post')
	.login(true)
	.db()
	.dbinit()
	.param({
		//歌词ID
		id: jsonv2.string({
			typeerr: ['', 0],
			rules: [{ min: 24, max: 24, message: ['', 0] }],
		}),
	})
	.resolve(async ctx => {
		//查询歌词
		const lyric = await ctx.db.lyric.findOne({ id: ctx.params.id })
		if (!lyric) throw new Error('lyric not exists')

		//更改所有歌词的默认值为false
		await ctx.db.lyric.updateMany({ music: lyric.music }, { $set: { default: false } })

		//更改当前歌词默认值为true
		await ctx.db.lyric.updateOne({ id: lyric.id }, { $set: { default: true } })

		//ok
		return true
	})