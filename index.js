const path = require('path')
const fs = require('fs')

const srcdir = path.join(__dirname, 'src')
//ts
if (fs.existsSync(srcdir) && fs.statSync(srcdir).isDirectory()) {
	globalThis.devmode = true
	require('ts-node').register({
		files: true,
		project: path.join(__dirname, 'tsconfig.json'),
	})
	require('./src/index.ts')
}
//js
else {
	require('./dist/index.js')
}