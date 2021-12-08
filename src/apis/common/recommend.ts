import moment from "moment"
import { route } from "../../libs/route"

//获取每日推荐
route('/api/common/recommend')
	.method('get')
	.db()
	.dbinit()
	.resolve(async ctx => {
		//基础值
		const basev = parseInt(moment('2021-11-25').unix() / 60 / 60 / 24 as any) % 31

		//ID转数字
		const idnum = (id: string) => {
			let res = 0
			for (let i = 0; i < id.length; ++i) res += id.charCodeAt(i)
			return res % 31
		}

		//排序ID
		const sortIds = (ids: Array<string>) => {
			return ids
				//取ID和对于的数字
				.map(id => ({ id: id, num: idnum(id) }))
				//排序（id数字和基准数字之间的差值排序）
				.sort((a, b) => Math.abs(a.num - basev) - Math.abs(b.num - basev))
				//得到ID
				.map(item => item.id)
		}

		//数量
		const counts = { album: 20, artist: 20, musics: 80 }

		//专辑查询器
		const getAlbums = async () => {
			//取得ID列表
			const ids = await ctx.db.album.find({}, { projection: { id: 1, _id: 0 } }).toArray().then(ids => sortIds(ids.map(res => res.id)).slice(0, counts.album))
			//查询专辑数据
			const albums = ctx.db.album.aggregate([
				{ $match: { id: { $in: ids } } },
				{ $lookup: { localField: 'artists', from: 'artist', foreignField: 'id', as: 'artists' } },
				{
					$project: {
						_id: 0, id: 1, name: 1, issue: 1, sect: 1, language: 1, pic: 1,
						artists: { id: 1, name: 1, avatar: 1, }
					},
				},
			]).toArray()
			//OK
			return albums
		}

		//歌手查询器
		const getArtists = async () => {
			//取得ID列表
			const ids = await ctx.db.artist.find({}, { projection: { id: 1, _id: 0 } }).toArray().then(ids => sortIds(ids.map(res => res.id)).slice(0, counts.artist))
			//查询专辑数据
			const artists = ctx.db.artist.aggregate([
				{ $match: { id: { $in: ids } } },
				{
					$project: {
						_id: 0, id: 1, name: 1, fname: 1, birthday: 1, avatar: 1,
					},
				},
			]).toArray()
			//OK
			return artists
		}

		//查询歌曲列表
		const getMusics = async () => {
			//取得ID列表
			const ids = await ctx.db.music.find({}, { projection: { id: 1, _id: 0 } }).toArray().then(ids => sortIds(ids.map(res => res.id)).slice(0, counts.musics))
			//查询
			const musics = await ctx.db.music.aggregate([
				{ $match: { id: { $in: ids } } },
				{ $lookup: { localField: 'albums', from: 'album', foreignField: 'id', as: 'albums' } },
				{ $lookup: { localField: 'artists', from: 'artist', foreignField: 'id', as: 'artists' } },
				{
					$project: {
						_id: 0, id: 1, name: 1, types: 1, hash: 1, duration: 1, bitrate: 1, image: 1, time: 1, file: 1,
						artists: { id: 1, name: 1, fname: 1, birthday: 1, avatar: 1 },
						albums: { id: 1, name: 1, issue: 1, pic: 1 },
					},
				},
			]).toArray()
			//ok
			return musics
		}

		return {
			albums: await getAlbums(),
			artists: await getArtists(),
			musics: await getMusics(),
		}

	})