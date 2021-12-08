import { route } from "../../libs/route"

route('/api/sys/ping')
	.method('get')
	.resolve(async ctx => {
		return 'pong'
	})