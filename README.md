# 个人音乐管理器服务端

这是个人音乐管理器的服务器端，你可以阅读下面的文档来进行此软件。

## 构建

当然，如果你下载了构建好的程序，则不用看这段了。

另外，在执行下列操作之前，请确保你的电脑上成功安装了nodejs和git

1. 克隆项目
	```
	git clone https://github.com/tiny-music-manager/server.git
	```
1. 安装依赖
	```
	cd server
	npm install
	```
1. 构建项目
	```
	npm run build
	npm run release
	```

如果没有问题的话，会看到一个名为`release`的文件夹，里面就是可用的程序了。

## 部署

1. 软件运行需要以`MongoDB`作为数据库，如果你的电脑上没有安装`MongoDB`，那么，请先安装它再进行后续操作。

1. 编辑配置文件`tmmd.conf`（此文件可以从config目录中拷贝，如果你用的时已经构建号的文件，则压缩包中就有这个文件了），配置文件各项说明如下，请根据实际情况进行更改：
	* `server` 服务器配置
		* `listen`		服务器监听的端口
		* `bind`		服务器绑定的网卡地址
		* `staticdir`	静态资源目录，此目录下存放歌曲及歌曲相关的文件
		* `cachedir`	缓存目录
	* `discover` 局域网发现服务器
		* `listen`		发现服务器端口，最好不要改动，否则客户端不能正常发现服务器
		* `bind`		发现服务器绑定的网卡地址
	* `database` MongoDB数据库配置
		* `host`			数据库地址
		* `port`			数据库端口
		* `database`		数据库名称
		* `username`		用户名
		* `password`		数据库密码
		* `maxPoolSize`		连接池最大连接数
		* `backupdir`		数据库备份文件存放目录
	* `music` 音乐相关配置
		* `allowed`			允许上传的音乐类型
		* `tomp3`			需要转换成mp3的音乐类型
		* `toflac`			需要转换成flac的音乐类型
1. 数据库初始化
	```
	tmmd update
	```
	如果是第一次安装，使用此命令可以对数据库进行初始化，如果是版本升级，使用此命令可以将数据库升级到最新的版本。
1. 启动服务器
	```
	tmmd start -c <配置文件路径>
	```
	出现`server created and listen on 0.0.0.0:3801`之类的文字，说明服务器启动成功。
1. OK，可以打开客户端了。

## 其他说明
1. 数据库备份

	使用如下命令可以备份数据库到tmm.conf文件中制定的位置
	```
	tmmd backup -c <配置文件路径>
	```

1. 数据库恢复
	使用如下命令可以对数据库进行恢复
	```
	tmmd restore -c <配置文件路径> -f <备份文件位置>
	```
	也可以使用下面的命令来恢复最近一次备份
	```
	tmmd restore -c <配置文件路径>
	```
1. 停止服务器
	```
	tmmd stop -c <配置文件路径>
	```
