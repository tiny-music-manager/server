import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

route('/api/lyric/remove')
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
		await ctx.db.lyric.deleteOne({ id: ctx.params.id })
		return true
	})