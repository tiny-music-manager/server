import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"
import { utils } from "../../libs/utils"

route('/api/love/save')
	.method('post')
	.login()
	.db()
	.dbinit()
	.param({
		type: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ values: ['music', 'album', 'artist'], message: ['', 0] },
			]
		}),
		action: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ values: ['add', 'del'], message: ['', 0] },
			]
		}),
		id: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 24, max: 24, message: ['', 0] },
			]
		}),
	})
	.resolve(async ctx => {
		const key = `${ctx.params.type}s` as 'albums' | 'artists' | 'musics'
		//查询数据
		const love = await ctx.db.love.findOne({ user: ctx.user.id })

		//取得ID，并根据情况添加或修改
		let ids = love?.[key] ?? []
		if (ctx.params.action == 'add') ids.includes(ctx.params.id) || ids.push(ctx.params.id)
		else if (ctx.params.action == 'del') ids = ids.filter(id => id != ctx.params.id)

		//检测有没有love，没有则添加
		if (!love) await ctx.db.love.insertOne({
			...utils.mkid(),
			user: ctx.user.id,
			//初始数据
			albums: [],
			artists: [],
			musics: [],
			//刚添加的
			[key]: ids,
		})
		//否则修改
		else await ctx.db.love.updateOne({ id: love.id }, { $set: { [key]: ids } })

		//完成
		return true
	})