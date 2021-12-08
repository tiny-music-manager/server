import { jsonv2 } from "jsonval"
import { route } from "../../libs/route"

//删除专辑
route('/api/music/remove')
	.method('post')
	.login(true)
	.db()
	.dbinit()
	.param({
		//音乐ID
		id: jsonv2.string({
			typeerr: ['', 0],
			rules: [{ min: 24, max: 24, message: ['', 0] }]
		}),
	})
	.resolve(async ctx => {
		//删除
		await ctx.db.music.deleteOne({ id: ctx.params.id })
		//从用户收藏中删除
		await ctx.db.love.updateMany({}, { $pull: { musics: ctx.params.id } })
		//删除歌词
		await ctx.db.lyric.deleteMany({ music: ctx.params.id })
		//ok
		return true
	})