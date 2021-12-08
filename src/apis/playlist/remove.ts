import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

route('/api/playlist/remove')
	.method('post')
	.login()
	.db()
	.dbinit()
	.param({
		//列表ID
		list: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 24, max: 24, message: ['', 0] },
			]
		}),
	})
	.resolve(async ctx => {
		await ctx.db.playlist.deleteOne({ id: ctx.params.list, user: ctx.user.id })
		return true
	})