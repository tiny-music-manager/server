import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

route('/api/kind/remove')
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
	})
	.resolve(async (ctx) => {
		//删除分类
		await ctx.db.kind.deleteOne({ id: ctx.params.id })
		//从歌曲中删除
		await ctx.db.music.updateMany({}, { $pull: { types: ctx.params.id } })
		//删除歌词
		await ctx.db.lyric.deleteMany({ music: ctx.params.id })
		//完成
		return true
	})
