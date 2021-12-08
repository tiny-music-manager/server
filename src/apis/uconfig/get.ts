import { IUConfig } from "../../collections"
import { route } from "../../libs/route"
import { defaultLyricConfig } from "./consts"

route('/api/uconfig/get')
	.method('get')
	.login()
	.db()
	.dbinit()
	.resolve(async ctx => {
		let conf = await ctx.db.uconfig.findOne({ user: ctx.user.id })

		return {
			lyric: conf?.lyric || defaultLyricConfig
		}
	})