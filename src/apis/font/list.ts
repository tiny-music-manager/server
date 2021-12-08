import { route } from "../../libs/route"

route('/api/font/list')
	.method('get')
	.db()
	.dbinit()
	.resolve(async (ctx) => {
		return ctx.db.font.find({}, { projection: { _id: 0 } }).toArray()
	})
