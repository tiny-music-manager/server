import { route } from "../../libs/route"

route('/api/sys/initial')
	.method('get')
	.db()
	.resolve(async ctx => {
		const conf = await ctx.db.sysconf.findOne({}, { projection: { _id: 0 } })
		return conf?.adminInit ?? false
	})