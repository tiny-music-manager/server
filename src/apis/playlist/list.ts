import { route } from "../../libs/route"

route('/api/playlist/list')
	.method('get')
	.login()
	.db()
	.dbinit()
	.resolve(async ctx => {
		//查询播放列表
		let lists = await ctx.db.playlist.find({ user: ctx.user.id }, { projection: { _id: 0, id: 1, name: 1 } }).toArray()

		//OK
		return lists
	})