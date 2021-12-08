import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"
import { utils } from "../../libs/utils"
import { defaultLyricConfig } from "./consts"

const colorValidator = jsonv2.string({
	typeerr: ['', 0],
	rules: [
		{ required: true, message: ['', 0] },
		{ pattern: /^#[\da-f]{6}$/, message: ['', 0] },
	]
})

route('/api/uconfig/set')
	.method('post')
	.login()
	.db()
	.dbinit()
	.param({
		//歌词配置
		lyric: jsonv2.object({
			typeerr: ['', 0],
			props: {
				//对齐方式
				align: jsonv2.string({
					typeerr: ['', 0],
					rules: [
						{ required: true, message: ['', 0] },
						{ values: ['center', 'left-right', 'single-line'], message: ['', 0] },
					]
				}),
				//颜色
				color: jsonv2.object({
					typeerr: ['', 0],
					rules: [{ required: true, message: ['', 0] }],
					props: {
						play: jsonv2.tuple({
							typeerr: ['', 0],
							rules: [{ required: true, message: ['', 0] }],
							items: [colorValidator, colorValidator],
						}),
						wait: jsonv2.tuple({
							typeerr: ['', 0],
							rules: [{ required: true, message: ['', 0] }],
							items: [colorValidator, colorValidator],
						}),
					},
				}),
				//字体
				font: jsonv2.object({
					typeerr: ['', 0],
					rules: [{ required: true, message: ['', 0] }],
					props: {
						id: jsonv2.string({
							typeerr: ['', 0],
							rules: [
								{ required: true, message: ['', 0] },
								{ max: 24, message: ['', 0] },
							],
						}),
						size: jsonv2.number({
							typeerr: ['', 0],
							rules: [
								{ required: true, message: ['', 0] },
								{ min: 20, max: 40, message: ['', 0] },
							],
						}),
						bold: jsonv2.boolean({
							typeerr: ['', 0],
							rules: [{ required: true, message: ['', 0] }],
						}),
					},
				}),
			}
		})
	})
	.resolve(async ctx => {
		let conf = await ctx.db.uconfig.findOne({ user: ctx.user.id })

		//无则添加
		if (!conf) await ctx.db.uconfig.insertOne({
			...utils.mkid(),
			user: ctx.user.id,
			lyric: ctx.params.lyric || defaultLyricConfig,
		})

		//有则修改
		else await ctx.db.uconfig.updateOne({ id: conf.id }, {
			$set: {
				lyric: ctx.params.lyric || conf.lyric || defaultLyricConfig,
			}
		})

		return true
	})