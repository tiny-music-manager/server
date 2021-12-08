import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"
import { utils } from "../../libs/utils"

//保存专辑信息
route('/api/album/save')
	.method('post')
	.db()
	.login(true)
	.dbinit()
	.param({
		//专辑ID，如果没有传递则添加
		id: jsonv2.string({
			typeerr: ['', 0],
			rules: [{ min: 24, max: 24, message: ['', 0] }]
		}),
		//专辑名称
		name: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 1, max: 255, message: ['', 0] },
			]
		}),
		//发行日期
		issue: jsonv2.string({
			typeerr: ['', 0],
			rules: [{ type: 'date', message: ['', 0] }],
		}),
		//歌手列表
		artists: jsonv2.array({
			typeerr: ['', 0],
			rules: [{ required: true, message: ['', 0] }],
			items: jsonv2.string({
				typeerr: ['', 0],
				rules: [
					{ required: true, message: ['', 0] },
					{ min: 24, max: 24, message: ['', 0] }
				]
			})
		}),
		//说明
		desc: jsonv2.string({
			typeerr: ['', 0]
		})
	})
	.resolve(async ctx => {
		//取文件
		const file = ctx.file('pic')
		let pic = file ? `pic/album/${ctx.params.name[0]}/${file.hash}${file.extname}` : null
		if (file) file.moveTo(pic!)
		let id: string
		//修改
		if (ctx.params.id) {
			const album = await ctx.db.album.findOne({ id: ctx.params.id })
			if (!album) throw new Error('album not exists')
			await ctx.db.album.updateOne({ id: ctx.params.id }, {
				$set: {
					name: ctx.params.name || album.name,
					issue: ctx.params.issue || album.issue,
					artists: ctx.params.artists,
					desc: ctx.params.desc || album.desc,
					pych: utils.pinyinCH(ctx.params.name || album.name),
					...pic ? { pic } : {}
				}
			})
			id = ctx.params.id
		}
		//添加
		else {
			const { insertedId } = await ctx.db.album.insertOne({
				...utils.mkid(),
				name: ctx.params.name,
				issue: ctx.params.issue ?? '',
				artists: ctx.params.artists ?? [],
				desc: ctx.params.desc ?? '',
				pych: utils.pinyinCH(ctx.params.name),
				pic: pic ?? '',
			})
			id = insertedId.toString()
		}
		return { id, pic }
	})