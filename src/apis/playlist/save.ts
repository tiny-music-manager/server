import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"
import { utils } from "../../libs/utils"

route('/api/playlist/save')
	.method('post')
	.login()
	.db()
	.dbinit()
	.param({
		//音乐
		music: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 24, max: 24, message: ['', 0] },
			]
		}),
		//动作
		action: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ values: ['add', 'del'], message: ['', 0] },
			],
		}),
		//列表名称
		list: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 1, max: 255, message: ['', 0] },
			]
		}),
	})
	.resolve(async ctx => {
		//查询播放列表
		let list = await ctx.db.playlist.findOne({ name: ctx.params.list, user: ctx.user.id })

		//取得音乐列表，并更新
		let musics = list?.musics ?? []
		if (ctx.params.action == 'add') musics.includes(ctx.params.music) || musics.push(ctx.params.music)
		else musics = musics.filter(m => m != ctx.params.music)

		//没有则创建
		if (!list) await ctx.db.playlist.insertOne({ ...utils.mkid(), name: ctx.params.list, user: ctx.user.id, musics })
		//有则更新
		else await ctx.db.playlist.updateOne({ id: list.id }, { $set: { musics } })

		//OK
		return true
	})