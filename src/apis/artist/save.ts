import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"
import { utils } from "../../libs/utils"

//保存歌手信息
route('/api/artist/save')
	.method('post')
	.login(true)
	.db()
	.dbinit()
	.param({
		//歌手ID，如果没有传递则添加歌手
		id: jsonv2.string({
			typeerr: ['', 0],
			rules: [{ min: 24, max: 24, message: ['', 0] }]
		}),
		//歌手名称
		name: jsonv2.string({
			typeerr: ['', 0],
			rules: [
				{ required: true, message: ['', 0] },
				{ min: 1, max: 255, message: ['', 0] },
			]
		}),
		//外文名
		fname: jsonv2.string({
			typeerr: ['', 0],
			rules: [{ min: 1, max: 255, message: ['', 0] }],
		}),
		//生日
		birthday: jsonv2.string({
			typeerr: ['', 0],
			rules: [{ type: 'date', message: ['', 0] }],
		}),
		//说明
		desc: jsonv2.string({
			typeerr: ['', 0]
		})
	})
	.resolve(async ctx => {
		//取文件
		const file = ctx.file('avatar')
		let avatar = file ? `pic/artist/${ctx.params.name[0]}/${file.hash}${file.extname}` : null
		if (file) file.moveTo(avatar!)
		let id: string
		//修改
		if (ctx.params.id) {
			const artist = await ctx.db.artist.findOne({ id: ctx.params.id })
			if (!artist) throw new Error('artist not exists')
			await ctx.db.artist.updateOne({ id: ctx.params.id }, {
				$set: {
					name: ctx.params.name || artist.name,
					fname: ctx.params.fname || artist.fname,
					birthday: ctx.params.birthday || artist.birthday,
					desc: ctx.params.desc || artist.desc,
					pych: utils.pinyinCH(ctx.params.name || artist.name),
					...avatar ? { avatar } : {}
				}
			})
			id = ctx.params.id
		}
		//添加
		else {
			const { insertedId } = await ctx.db.artist.insertOne({
				...utils.mkid(),
				name: ctx.params.name,
				fname: ctx.params.fname ?? '',
				birthday: ctx.params.birthday ?? '',
				desc: ctx.params.desc ?? '',
				pych: utils.pinyinCH(ctx.params.name),
				avatar: avatar ?? '',
			})
			id = insertedId.toString()
		}

		return { id, avatar }
	})