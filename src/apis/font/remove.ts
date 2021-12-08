import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

route('/api/font/remove')
	.method('post')
	.login(true)
	.db()
	.dbinit()
	.param({
		//ID，有则修改
		id: jsonv2.string({
			typeerr: ['', 0],
			rules: [{ min: 24, max: 24, message: ['', 1] }]
		}),
	})
	.resolve(async (ctx) => {
		await ctx.db.font.deleteOne({ id: ctx.params.id })
		return true
	})
