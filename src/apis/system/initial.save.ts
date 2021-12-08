import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

route('/api/sys/initial/save')
	.method('post')
	.db()
	.param({
		name: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 1, max: 20, message: ['', 0] },
			],
		}),
		number: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 4, max: 20, message: ['', 0] },
			],
		}),
		password: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 6, max: 20, message: ['', 0] },
			],
		}),
	})
	.resolve(async ctx => {
		//检测是否初始化
		const conf = await ctx.db.sysconf.findOne()
		if (!conf || conf?.adminInit) return false

		//初始化管理员信息
		const user = await ctx.db.user.findOne({ number: conf.adminNumber })
		if (!user) throw new Error('admin user not exists')

		await ctx.db.user.updateOne({ id: user.id }, { $set: { number: ctx.params.number, name: ctx.params.name, password: ctx.params.password } })

		//完成初始化
		await ctx.db.sysconf.updateOne({}, { $set: { adminInit: true, adminNumber: ctx.params.number } })

		return true
	})
