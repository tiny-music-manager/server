import { dbv } from "../libs/dbv"
import { utils } from "../libs/utils"

dbv.version(1.01, async (db) => {
	//系统配置
	dbv.log.tip('update', 'creating collection sysconf...')
	await db.createCollection('sysconf')
	await db.collection('sysconf').insertOne({
		adminInit: false,			//管理员是否初始化
		adminNumber: 'root',		//管理员账号
	})
	dbv.log.success('update', 'collection sysconf created')

	//用户
	dbv.log.tip('update', 'creating collection user...')
	await db.createCollection('user')
	await db.collection('user').createIndex(['id', { id: 1 }], { unique: true })
	await db.collection('user').createIndex(['number', { number: 1 }], { unique: true })
	await db.collection('user').createIndex(['password', { password: 1 }])
	await db.collection('user').createIndex(['email', { email: 1 }], { unique: true })
	await db.collection('user').createIndex(['name', { name: 1 }])
	//管理员用户
	await db.collection('user').insertOne({ ...dbv.mkid(), number: 'root', password: '', email: '', name: 'Administrator' })
	dbv.log.success('update', 'collection user created')
	//歌曲分类
	dbv.log.tip('update', 'creating collection kind ...')
	await db.createCollection('kind')
	await db.collection('kind').createIndex(['id', { id: 1 }], { unique: true })
	await db.collection('kind').createIndex(['name', { name: 1 }])
	await db.collection('kind').createIndex(['type', { type: 1 }])
	dbv.log.success('update', 'collection kind created')
	//初始化分类
	dbv.log.tip('update', 'initializing collection kind ...')

	await db.collection('kind').insertMany([
		//年代
		{ ...dbv.mkid(), name: '00年代', type: 'years', desc: '' },
		{ ...dbv.mkid(), name: '90年代', type: 'years', desc: '' },
		{ ...dbv.mkid(), name: '80年代', type: 'years', desc: '' },
		{ ...dbv.mkid(), name: '70年代', type: 'years', desc: '' },
		//心情
		{ ...dbv.mkid(), name: '伤感', type: 'mood', desc: '' },
		{ ...dbv.mkid(), name: '快乐', type: 'mood', desc: '' },
		{ ...dbv.mkid(), name: '安静', type: 'mood', desc: '' },
		{ ...dbv.mkid(), name: '励志', type: 'mood', desc: '' },
		{ ...dbv.mkid(), name: '治愈', type: 'mood', desc: '' },
		{ ...dbv.mkid(), name: '思念', type: 'mood', desc: '' },
		{ ...dbv.mkid(), name: '甜蜜', type: 'mood', desc: '' },
		{ ...dbv.mkid(), name: '寂寞', type: 'mood', desc: '' },
		{ ...dbv.mkid(), name: '宣泄', type: 'mood', desc: '' },
		//场景
		{ ...dbv.mkid(), name: 'KTV', type: 'scene', desc: '' },
		{ ...dbv.mkid(), name: '夜店', type: 'scene', desc: '' },
		{ ...dbv.mkid(), name: '学习工作', type: 'scene', desc: '' },
		{ ...dbv.mkid(), name: '咖啡馆', type: 'scene', desc: '' },
		{ ...dbv.mkid(), name: '运动', type: 'scene', desc: '' },
		{ ...dbv.mkid(), name: '睡前', type: 'scene', desc: '' },
		{ ...dbv.mkid(), name: '旅行', type: 'scene', desc: '' },
		{ ...dbv.mkid(), name: '跳舞', type: 'scene', desc: '' },
		{ ...dbv.mkid(), name: '排队', type: 'scene', desc: '' },
		{ ...dbv.mkid(), name: '婚礼', type: 'scene', desc: '' },
		{ ...dbv.mkid(), name: '约会', type: 'scene', desc: '' },
		{ ...dbv.mkid(), name: '校园', type: 'scene', desc: '' },
		//流派
		{ ...dbv.mkid(), name: '流行', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '电子', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '轻音乐', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '民谣', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '说唱', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '摇滚', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '爵士', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: 'R&B', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '布鲁斯', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '古典', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '后摇', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '古风', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '中国风', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '乡村', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '金属', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '新世纪', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '世界音乐', type: 'sect', desc: '' },
		{ ...dbv.mkid(), name: '中国传统', type: 'sect', desc: '' },
		//语种
		{ ...dbv.mkid(), name: '国语', type: 'language', desc: '' },
		{ ...dbv.mkid(), name: '粤语', type: 'language', desc: '' },
		{ ...dbv.mkid(), name: '闽南语', type: 'language', desc: '' },
		{ ...dbv.mkid(), name: '英语', type: 'language', desc: '' },
		{ ...dbv.mkid(), name: '韩语', type: 'language', desc: '' },
		{ ...dbv.mkid(), name: '日语', type: 'language', desc: '' },
		{ ...dbv.mkid(), name: '小语种', type: 'language', desc: '' },
		{ ...dbv.mkid(), name: '法语', type: 'language', desc: '' },
		{ ...dbv.mkid(), name: '拉丁语', type: 'language', desc: '' },
		//主题
		{ ...dbv.mkid(), name: 'KTV金曲', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: '网络歌曲', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: '现场音乐', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: '经典老歌', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: '情歌', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: '儿歌', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: 'ACG', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: '影视', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: '综艺', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: '游戏', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: '乐器', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: '城市', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: '戏曲', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: 'DJ神曲', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: 'MC喊麦', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: '佛教音乐', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: '厂牌专区', type: 'theme', desc: '' },
		{ ...dbv.mkid(), name: 'MOO音乐', type: 'theme', desc: '' },
	])
	dbv.log.success('update', 'collection kind initialized')
	//歌手
	dbv.log.tip('update', 'creating collection artist ...')
	await db.createCollection('artist')
	await db.collection('artist').createIndex(['id', { id: 1 }], { unique: true })
	await db.collection('artist').createIndex(['name', { name: 1 }])
	await db.collection('artist').createIndex(['fname', { fname: 1 }])
	await db.collection('artist').createIndex(['birthday', { fname: 1 }])
	await db.collection('artist').createIndex(['avatar', { fname: 1 }])
	dbv.log.success('update', 'collection artist created')
	//专辑
	dbv.log.tip('update', 'creating collection album ...')
	await db.createCollection('album')
	await db.collection('album').createIndex(['id', { id: 1 }], { unique: true })
	await db.collection('album').createIndex(['name', { name: 1 }])
	await db.collection('album').createIndex(['issue', { artists: 1 }])
	await db.collection('album').createIndex(['artists', { artists: 1 }])
	await db.collection('album').createIndex(['pic', { artists: 1 }])
	dbv.log.success('update', 'collection album created')
	//音乐
	dbv.log.tip('update', 'creating collection music ...')
	await db.createCollection('music')
	await db.collection('music').createIndex(['id', { id: 1 }], { unique: true })
	await db.collection('music').createIndex(['name', { name: 1 }])
	await db.collection('music').createIndex(['albums', { albums: 1 }])
	await db.collection('music').createIndex(['artists', { artists: 1 }])
	await db.collection('music').createIndex(['types', { types: 1 }])
	await db.collection('music').createIndex(['time', { time: 1 }])
	await db.collection('music').createIndex(['hash', { hash: 1 }])
	await db.collection('music').createIndex(['duration', { duration: 1 }])
	await db.collection('music').createIndex(['file', { file: 1 }])
	await db.collection('music').createIndex(['image', { file: 1 }])
	dbv.log.success('update', 'collection music created')
})

dbv.version(1.02, async db => {
	//歌词
	dbv.log.tip('update', 'creating collection lyric ...')
	await db.createCollection('lyric')
	await db.collection('lyric').createIndex(['id', { id: 1 }], { unique: true })		//id
	await db.collection('lyric').createIndex(['music', { music: 1 }])					//歌曲ID
	await db.collection('lyric').createIndex(['name', { name: 1 }])						//歌名
	await db.collection('lyric').createIndex(['artist', { artist: 1 }])					//歌手
	await db.collection('lyric').createIndex(['album', { album: 1 }])					//专辑
	await db.collection('lyric').createIndex(['duration', { duration: 1 }])				//时长
	await db.collection('lyric').createIndex(['default', { default: 1 }])				//默认
	dbv.log.success('update', 'collection lyric created')
})

dbv.version(1.03, async db => {
	//此函数用于为集合collection同步pych
	const syncPinyin = async (collection: string, nameCol: string) => {
		await db.collection(collection).createIndex(['pych', { pych: 1 }])			//拼音首字母
		//同步数据
		let skip = 0
		const limit = 100
		while (true) {
			const datas = await db.collection(collection).find({}, { skip, limit }).toArray()
			for (let i = 0; i < datas.length; ++i) {
				const a = datas[i]
				const pych = utils.pinyinCH(a[nameCol])
				dbv.log.tip('update', `sync ${collection} Chinese Pinyin: "${a[nameCol]}"->"${pych}" ...`)
				await db.collection(collection).updateOne({ id: a.id }, { $set: { pych } })
			}
			if (datas.length < limit) break
		}
		dbv.log.success('update', `sync ${collection} Chinese Pinyin success`)
	}

	//开始同步
	await syncPinyin('artist', 'name')
	await syncPinyin('album', 'name')
})

dbv.version(1.04, async db => {
	dbv.log.tip('update', 'creating collection love ...')
	await db.createCollection('love')
	await db.collection('love').createIndex(['id', { id: 1 }], { unique: true })		//id
	await db.collection('love').createIndex(['user', { user: 1 }], { unique: true })	//用户ID
	await db.collection('love').createIndex(['albums', { albums: 1 }])					//专辑ID列表
	await db.collection('love').createIndex(['artists', { artists: 1 }])				//歌手ID列表
	await db.collection('love').createIndex(['musics', { musics: 1 }])					//歌曲ID列表
	dbv.log.success('update', 'collection love created')
})

dbv.version(1.05, async db => {
	//歌单
	dbv.log.tip('update', 'creating collection playlist ...')
	await db.createCollection('playlist')
	await db.collection('playlist').createIndex(['id', { id: 1 }], { unique: true })		//id
	await db.collection('playlist').createIndex(['user', { user: 1 }])						//用户ID
	await db.collection('playlist').createIndex(['name', { name: 1 }])						//歌单名称
	await db.collection('playlist').createIndex(['musics', { musics: 1 }])					//歌曲ID列表
	dbv.log.success('update', 'collection playlist created')
})

dbv.version(1.06, async db => {
	//用户配置
	dbv.log.tip('update', 'creating collection uconfig ...')
	await db.createCollection('uconfig')
	await db.collection('uconfig').createIndex(['id', { id: 1 }], { unique: true })		//id
	await db.collection('uconfig').createIndex(['user', { user: 1 }])					//用户ID
	dbv.log.success('update', 'collection uconfig created')
	//字体
	dbv.log.tip('update', 'creating collection font ...')
	await db.createCollection('font')
	await db.collection('font').createIndex(['id', { id: 1 }], { unique: true })		//id
	await db.collection('font').createIndex(['name', { name: 1 }])						//字体名称
	await db.collection('font').createIndex(['file', { file: 1 }])						//字体文件
	dbv.log.success('update', 'collection font created')
})