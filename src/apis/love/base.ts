import { route } from "../../libs/route"

route('/api/love/base')
	.method('get')
	.login()
	.db()
	.dbinit()
	.resolve(async ctx => {
		const love = await ctx.db.love.findOne({ user: ctx.user.id })
		return {
			musics: love?.musics ?? [],
			albums: love?.albums ?? [],
			artists: love?.artists ?? [],
		}
	})