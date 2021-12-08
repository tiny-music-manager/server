import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

//删除专辑
route('/api/album/remove')
	.method('post')
	.login(true)
	.db()
	.dbinit()
	.param({
		//专辑ID
		id: jsonv2.string({
			typeerr: ['', 0],
			rules: [{ min: 24, max: 24, message: ['', 0] }]
		}),
	})
	.resolve(async ctx => {
		//删除专辑
		await ctx.db.album.deleteOne({ id: ctx.params.id })
		//删除歌曲中的专辑信息
		await ctx.db.music.updateMany({}, { $pull: { albums: ctx.params.id } })
		//从用户收藏中删除
		await ctx.db.love.updateMany({}, { $pull: { albums: ctx.params.id } })
		//ok
		return true
	})