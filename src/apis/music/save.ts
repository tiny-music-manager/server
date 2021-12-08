import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

//保存歌曲信息
route('/api/music/save')
	.method('post')
	.login(true)
	.db()
	.dbinit()
	.param({
		//ID，有则修改
		id: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 24, max: 24, message: ['', 1] },
			]
		}),
		//名称
		name: jsonv2.string({
			typeerr: ['music name error', 10011],
			rules: [
				{ required: true, message: ['music name is null', 10012] },
				{ min: 1, max: 250, message: ['music name length error', 10013] }
			]
		}),
		//歌手
		artists: jsonv2.array({
			typeerr: ['', 0],
			rules: [{ required: true, message: ['', 0] }],
			items: jsonv2.string({
				typeerr: ['', 0],
				rules: [
					{ required: true, message: ['', 0] },
					{ min: 24, max: 24, message: ['', 0] },
				]
			})
		}),
		//专辑
		albums: jsonv2.array({
			typeerr: ['', 0],
			rules: [{ required: true, message: ['', 0] }],
			items: jsonv2.string({
				typeerr: ['', 0],
				rules: [
					{ required: true, message: ['', 0] },
					{ min: 24, max: 24, message: ['', 0] },
				]
			})
		}),
		//分类
		types: jsonv2.array({
			typeerr: ['', 0],
			rules: [{ required: true, message: ['', 0] }],
			items: jsonv2.string({
				typeerr: ['', 0],
				rules: [
					{ required: true, message: ['', 0] },
					{ min: 24, max: 24, message: ['', 0] },
				]
			})
		}),
	})
	.resolve(async (ctx) => {
		//取文件
		const file = ctx.file('image')
		let image = file ? `pic/music/${ctx.params.name[0]}/${file.hash}${file.extname}` : null
		if (file) file.moveTo(image!)

		//保存
		const music = await ctx.db.music.findOne({ id: ctx.params.id })
		if (!music) throw new Error('music not exists')
		await ctx.db.music.updateOne({ id: music.id }, {
			$set: {
				name: ctx.params.name || music.name,
				artists: ctx.params.artists,
				albums: ctx.params.albums,
				types: ctx.params.types,
				image: image || music.image,
			}
		})

		//ok
		return { id: music.id, image }
	})
