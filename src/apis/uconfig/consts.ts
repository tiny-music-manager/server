import { IUConfig } from "../../collections"

export const defaultLyricConfig: Exclude<IUConfig['lyric'], null> = {
	align: 'left-right',
	color: { play: ['#e91e63', '#ff5722'], wait: ['#cddc39', '#afb42b'] },
	font: { id: '', size: 30, bold: false },
}