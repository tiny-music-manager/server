import { jsonv2 } from "jsonval"
import { IRouteContextUser, route } from "../../libs/route"
import { utils } from "../../libs/utils"

route('/api/user/login')
	.method('post')
	.db()
	.dbinit()
	.param({
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
		//查询用户信息
		const user = await ctx.db.user.findOne({ number: ctx.params.number })
		if (!user) throw new Error('NotExists')
		if (user.password != ctx.params.password) throw new Error('PasswordError')
		//查询管理员账号
		const sysconf = await ctx.db.sysconf.findOne()
		if (!sysconf) throw new Error('系统配置信息缺失')
		//生成token
		return utils.entoken({ id: user.id, number: user.number, admin: sysconf.adminNumber == user.number } as IRouteContextUser)
	})