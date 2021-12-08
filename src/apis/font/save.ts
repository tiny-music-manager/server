import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"
import { utils } from "../../libs/utils"

route('/api/font/save')
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
			typeerr: ['font name error', 10011],
			rules: [
				{ required: true, message: ['font name is null', 10012] },
				{ min: 1, max: 250, message: ['font name length error', 10013] }
			]
		}),
	})
	.resolve(async (ctx) => {
		//检测文件
		const font = ctx.file('font')
		let file = ''
		if (font) {
			file = `font/${font.hash}${font.extname}`
			font.moveTo(file)
		}

		//修改
		if (ctx.params.id) {
			const font = await ctx.db.font.findOne({ id: ctx.params.id })
			if (!font) throw new Error('font not exists')
			await ctx.db.font.updateOne({ id: font.id }, { $set: { name: ctx.params.name || font.name, file: file || font.file } })
			return font.id
		}
		//插入
		else {
			if (!font) throw new Error('file is empty')
			const { insertedId } = await ctx.db.font.insertOne({ ...utils.mkid(), name: ctx.params.name, file })
			return insertedId.toString()
		}
	})
