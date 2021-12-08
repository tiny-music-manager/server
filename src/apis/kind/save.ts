import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"
import { utils } from "../../libs/utils"

route('/api/kind/save')
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
		//名称
		name: jsonv2.string({
			typeerr: ['kind name error', 10011],
			rules: [
				{ required: true, message: ['kind name is null', 10012] },
				{ min: 1, max: 250, message: ['kind name length error', 10013] }
			]
		}),
		//分类
		type: jsonv2.string({
			typeerr: ['kind type error', 10011],
			rules: [
				{ required: true, message: ['kind type is null', 10012] },
				{ min: 1, max: 250, message: ['kind type length error', 10013] }
			]
		}),
		//说明
		desc: jsonv2.string({
			typeerr: ['', 0]
		}),
	})
	.resolve(async (ctx) => {
		//修改
		if (ctx.params.id) {
			const kind = await ctx.db.kind.findOne({ id: ctx.params.id })
			if (!kind) throw new Error('kind not exists')
			await ctx.db.kind.updateOne({ id: kind.id }, { $set: { name: ctx.params.name || kind.name, desc: ctx.params.desc || kind.desc } })
			return kind.id
		}
		//插入
		else {
			const { insertedId } = await ctx.db.kind.insertOne({
				...utils.mkid(),
				name: ctx.params.name,
				type: ctx.params.type,
				desc: ctx.params.desc ?? '',
			})
			return insertedId.toString()
		}
	})
