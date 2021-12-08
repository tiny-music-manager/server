import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

//删除歌手
route('/api/artist/remove')
	.method('post')
	.login(true)
	.db()
	.dbinit()
	.param({
		//歌手ID
		id: jsonv2.string({
			typeerr: ['', 0],
			rules: [{ min: 24, max: 24, message: ['', 0] }]
		}),
	})
	.resolve(async ctx => {
		//删除歌手
		await ctx.db.artist.deleteOne({ id: ctx.params.id })
		//删除歌曲中的歌手信息
		await ctx.db.music.updateMany({}, { $pull: { artists: ctx.params.id } })
		//从专辑中删除
		await ctx.db.album.updateMany({}, { $pull: { artists: ctx.params.id } })
		//从用户收藏中删除
		await ctx.db.love.updateMany({}, { $pull: { artists: ctx.params.id } })
		//ok
		return true
	})