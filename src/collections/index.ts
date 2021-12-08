
export interface ISysconf {
	adminInit: boolean
	adminNumber: string
}

export interface IAritst {
	/** id */
	id: string
	/** 名字 */
	name: string
	/** 外文名 */
	fname: string
	/** 生日 */
	birthday: string
	/** 说明 */
	desc: string
	/** 头像 */
	avatar: string
	/** 拼音首字母，考虑到多音字，使用数组 */
	pych: Array<string>
}

export interface IAlbum {
	/** id */
	id: string
	/** 名字 */
	name: string
	/** 发行时间 */
	issue: string
	/** 歌手列表 */
	artists: Array<string>
	/** 简介 */
	desc: string
	/** 汉语拼音首字母 */
	pych: Array<string>
	/** 图片 */
	pic: string
}

export interface IMusic {
	/** 音乐ID */
	id: string
	/** 音乐名称 */
	name: string
	/** 歌手列表 */
	artists: Array<string>
	/** 专辑列表 */
	albums: Array<string>
	/** 分类列表 */
	types: Array<string>
	/** hash */
	hash: string
	/** 时长 */
	duration: number
	/** 比特率 */
	bitrate: { rate: number, unit: string } | null
	/** 发行时间 */
	time: string
	/** 图像 */
	image: string
	/** 歌曲文件 */
	file: string
	/** 添加时间 */
	ctime: string
}

export interface IUser {
	/** 用户ID */
	id: string
	/** 用户账号 */
	number: string
	/** 用户密码 */
	password: string
	/** 邮箱 */
	email: string
	/** 名字 */
	name: string
	/** 头像 */
	avatar: string
}

export interface IKind {
	/** 分类ID */
	id: string
	/** 分类名称 */
	name: string
	/** 分组名称 */
	type: string
	/** 说明 */
	desc: string
}

export interface ILyric {
	/** 歌词ID */
	id: string
	/** 歌曲ID */
	music: string
	/** 歌词歌曲名称 */
	name: string
	/** 歌手名称 */
	artist: string
	/** 专辑名称 */
	album: string
	/** 纯文本歌词 */
	text: string
	/** 歌词类型 */
	type: 'lyric' | 'karaoke'
	/** 时长 */
	duration: number
	/** 是否默认 */
	default: boolean
	/** 歌词体 */
	body: Array<[number, string | Array<[number, string]>]>
	/** 外部ID（<kugou|kuwo|qq...>_\<ID>） */
	oid: string
}

export interface ILove {
	/** ID */
	id: string
	/** 用户ID */
	user: string
	/** 专辑列表 */
	albums: Array<string>
	/** 歌手列表 */
	artists: Array<string>
	/** 歌曲列表 */
	musics: Array<string>
}

export interface IPlaylist {
	/** 歌单ID */
	id: string
	/** 用户ID */
	user: string
	/** 歌单名称 */
	name: string
	/** 歌曲列表 */
	musics: Array<string>
}

/** 用户配置 */
export interface IUConfig {
	/** 配置ID */
	id: string
	/** 用户ID */
	user: string
	/** 歌词配置 */
	lyric: {
		/** 对齐方式 */
		align: 'center' | 'left-right' | 'single-line'
		/** 歌词颜色 */
		color: { [K in 'play' | 'wait']: [string, string] }
		/** 歌词字体 */
		font: { id: string, size: number, bold: boolean }
	} | null,
}

export interface IFont {
	/** 字体ID */
	id: string
	/** 字体名称 */
	name: string
	/** 字体文件 */
	file: string
}

export interface IMongoCollectionMap {
	artist: IAritst
	album: IAlbum
	music: IMusic
	sysconf: ISysconf
	kind: IKind
	lyric: ILyric
	user: IUser
	love: ILove
	playlist: IPlaylist
	uconfig: IUConfig
	font: IFont
}