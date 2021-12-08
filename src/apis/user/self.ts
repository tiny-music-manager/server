import { route } from "../../libs/route"

route('/api/user/self')
	.method('get')
	.login()
	.db()
	.dbinit()
	.resolve(async ctx => {
		const user = await ctx.db.user.findOne({ id: ctx.user.id })
		if (!user) return null
		//返回结果
		return {
			id: user.id,
			number: user.number,
			name: user.name,
			email: user.email,
			avatar: user.avatar,
			admin: ctx.user.admin,
		}
	})