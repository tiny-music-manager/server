import commander from 'commander'

const cmd = new commander.Command('tmmd')

//数据库升级
cmd.command('update')
	.description('update database')
	.option('-c,--config <path>', 'set config file')
	.option('-v,--version [version]', 'version you want to update to, default is newest')
	.action((opt) => import('./program/update').then(res => res.tmmd_update(opt)))

//数据库备份
cmd.command('backup')
	.description('backup database')
	.option('-c,--config <path>', 'set config file')
	.action((opt) => import('./program/backup').then(res => res.tmmd_backup(opt)))

//数据库恢复
cmd.command('restore')
	.description('restore database')
	.option('-c,--config <path>', 'set config file')
	.option('-f,--file <file>', 'set backup file')
	.action((opt) => import('./program/restore').then(res => res.tmmd_restore(opt)))

//启动
cmd.command('start', { isDefault: true })
	.description('start tiny music manager server')
	.option('-c,--config <config file>', 'set config file')
	.action((opt) => import('./program/start').then(res => res.tmmd_start(opt)))

//停止服务器
cmd.command('stop', { isDefault: true })
	.description('stop tiny music manager server')
	// .option('-c,--config <config file>', 'set config file')
	.action((opt) => import('./program/exit').then(res => res.tmmd_exit(opt)))

cmd.parseAsync(process.argv).catch(err => console.error(err))