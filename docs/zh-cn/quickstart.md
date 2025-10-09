# 快速开始

## 1. 环境配置
---
#### 1.1 Node.js安装

本项目基于`Nodejs+Koa2`开发，需要先安装`Node.js v16+`开发环境。

> `Node.js`安装及下载，请参考[官方文档](https://nodejs.org/zh-cn/download)。

```shell
node -v
```

```shell
git clone https://gitee.com/nebulajs/nebulajs-cloud.git
cd nebulajs-cloud
npm i
```

#### 1.2 Docker/DockerCompose安装

本顶目使用`Docker/DockerCompose`对应用进行部署和管理。如：应用打包、启动、停止等操作。

> 参考Docker官方文档 [https://docs.docker.com/engine/install/](https://docs.docker.com/engine/install/)

#### 1.3 环境变量配置

* __`NEBULA_NODE_HOME`__

配置Nebula应用在Web版`VSCODE`中运行所需要的`nodejs`环境。
由于Web版本的`VSCODE`采用Linux作为基础镜像，此处需要固定配置Linux版本的nodejs，如下所示。

```shell
export NEBULA_NODE_HOME=/opt/node-v16.13.1-linux-x64
```

* __`NEBULA_DATA_PATH`__ （可选）

配置Nebula应用代码存放的位置。默认位置为`nebulajs-cloud/data`下，用户可以在配置文件中更改。

```shell
export NEBULA_DATA_PATH=/opt/nebulajs-data
```

## 2.中间件配置
---
Nebulajs Cloud启动时会依赖部分第三方中间件，使平台的性能及扩展性更好。如：关系数据库、缓存、KV数据库等。
中间件的配置可以在各环境配置中修改。环境配置文件存放在`src/config/env/`目录下，可以自行修改。如：`dev.ts`、`prod.ts`

#### 2.1 中间件配置

* __数据库配置（必须）__

本平台使用`Sequelize`作为数据库连接层，数据库支持常见的关系型数据库。本项目推荐使用`MySQL5.7`，不同的数据库需要安装相应的驱动模块，如下所示：


```shell
### Postgres
npm install --save pg pg-hstore

### MySQL（推荐）
npm install --save mysql2

### Mariadb
npm install --save mariadb

### SQLite
npm install --save sqlite3

### Microsoft SQL Server
npm install --save tedious

### Oracle Database
npm install --save oracledb
```

详细信息请查看[SequelizeV6官方文档](https://sequelize.org/docs/v6/getting-started/)。以SQLite为例：

```javascript
database: {
    // dialect: 'mysql',
    // host: '10.126.32.28',
    // port: '3306',
    // username: 'nebula',
    // database: 'nebula_cloud',
    // password: 'nebula123',

    dialect: 'sqlite',
    storage: './db/nebulajs_db.sqlite',
    timezone: '+00:00'
}
```

* __Redis配置（必选）__

使用`Redis`本地Mock。<b style="color:red">注意：Mock配置仅限于本地调试，请务将其用于生产。</b>
```javascript
redis: {
    useMock: true
}
```

使用`Redis`服务器作为应用缓存。
```javascript
redis: {
    port: 6379, // Redis port
    host: '127.0.0.1', // Redis host
    family: 4, // 4 (IPv4) or 6 (IPv6)
    db: 6,
    password: 'nebula123'
}
```

* __Mongodb配置（可选）__

如要使用定时任务调度（用户可以在左侧菜单`任务`中进行管理），则需要配置该项。在完整配置可参考[mongoose](https://github.com/Automattic/mongoose)。

```javascript
mongodb: {
    uri: 'mongodb://admin:nebula123@10.126.32.28:27017',
    options: {
        dbName: 'nebula_cloud',
    }
}
```

* __MinIO配置（可选）__

如要使用分布式文件存储，则需要配置该项。完整配置可参考[minio-js](https://github.com/minio/minio-js)。

```javascript
minio: {
    endPoint: '10.126.32.28',
    port: 9000,
    useSSL: false,
    accessKey: 'XXXXXXXX',
    secretKey: 'XXXXXXXX',
}
```


* __Camunda工作流配置（可选）__

本项目使用`Camunda`实现工作流，通过调用其`RESTful`接口通信达到完全解耦的效果，无需再对工作流进行定制开发。如要使用`Camunda`工作流，需要先进行部署。

> Camunda RESTful API若开启权限则需要配置 `headers.Authorization` 选项。
> Camunda7社区版工作流部署请参考 [https://docs.camunda.org/manual/7.23/installation/](https://docs.camunda.org/manual/7.23/installation/)。<br/>


```javascript
camunda: {
    apiUri: 'http://10.126.32.219:8070/engine-rest', // Camunda RESTful URL
    headers: {
        Authorization: 'Basic ZGVtbzpkZW1v', //demo:demo 
    },
}
```

#### 2.2 使用Docker快速启动开发环境

也可以通过`Docker/Docker Compose`快速启动所有中间件。编写`docker-compose.yaml`文件

```yaml
version: '3.0'
services:
  
  minio:
    image: minio/minio:RELEASE.2021-06-17T00-10-46Z
    volumes:
      - ./data:/data
      - ./config:/root/.minio
    container_name: minio
    ports:
      - 9000:9000
    environment:
      MINIO_ACCESS_KEY: admin
      MINIO_SECRET_KEY: admin123 #大于等于8位
    command: server /data
    restart: always
    
  redis:
    container_name: redis
    image: redis:6.2.1
    command:
      - /bin/bash
      - -c
      - redis-server --requirepass "nebula123"
    ports:
      - 6379:6379
  
  mongodb:
    image: mongo:4
    container_name: mongodb
    restart: always
    volumes:
      - ./db:/data/db
      - ./log:/var/log/mongodb
    ports:
      - 27017:27017
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: nebula123
  
  camunda:
    image: camunda/camunda-bpm-platform:latest
    volumes:
      - ./default.yml:/camunda/configuration/default.yml
    container_name: camunda
    ports:
      - 8060:8080
    environment:
      DB_DRIVER: com.mysql.cj.jdbc.Driver
      DB_URL: "jdbc:mysql://x.x.x.x:3306/camunda_db?useUnicode=true&characterEncoding=UTF-8&autoReconnect=true&serverTimezone=Asia/Shanghai"
      DB_USERNAME: xxxx
      DB_PASSWORD: xxxx
    restart: always
```

启动
```shell
docker-compose up
```

## 3.云服务端配置
---

* __app.serviceURL__

 云平台服务端地址，用于各子应用和云端应用API通信。（当应用部署在docker或在docker中启动时，此处不要配置`127.0.0.1`，这会导致应用无法连接云端）

* __app.wsServiceURL__ 

 云平台服务端Websocket地址，用于各子应用和云端应用WS通信。（当应用部署在docker或在docker中启动时，此处不要配置`127.0.0.1`，这会导致应用无法连接云端）

* __app.dataPath__ 创建应用后，代码及文件存放的目录

* __app.servers__ 托管应用的docker服务器，通过socat和docker通信，用于应用的运行调试和发布

 > 此处暂时和Nebula云平台配置为同一服务器，后续会支持分布式部署。<br/>
 > <span style="color:red">注意：Socat端口（2375）不要开放到外网，否则会有安全隐患。</span>


```javascript
app: {
    /**
     * 服务端地址
     */
    serviceURL: 'http://127.0.0.1:3000',

    /**
     * 服务端WS地址
     */
    wsServiceURL: 'ws://127.0.0.1:3001',

    /**
     * 应用存放目录
     */
    dataPath: path.join(__dirname, '../../../data'),

    /**
     * Docker通信配置
     */
    servers: {
        default: {
            name: '本地默认',
            // socketPath: '/var/run/docker.sock',
            protocol: 'http',
            host: '127.0.0.1', //host字段需要用到，暂不使用socketPath配置
            // extHost: '127.0.0.1', //外网IP
            port: 2375,
        },
    },
}
```

## 4.启动应用
---

#### 4.1 DockerSocat启动

Nebulajs Cloud平台使用`Socat`和`Docker`服务器通信。通过`Socat`管理各子应用及中间件的启动状态。

```shell
docker run -d --name socat-local --restart always -p 127.0.0.1:2375:2375 -v /var/run/docker.sock:/var/run/docker.sock alpine/socat tcp-listen:2375,fork,reuseaddr unix-connect:/var/run/docker.sock
```

#### 4.2 TypeScript编译监听

本项目使用`TypeScript`开发，如果要修改代码请先启动`TypeScript`监听。

```shell
npm run tsc
```

#### 4.3 应用启动


* __开发模式启动__

```shell
npm run dev
```

* __生产模式启动__

```shell
pm2 start ecosystem.config.js --env dev
```

> 启动后使用浏览器访问地址 [http://localhost:3000](http://localhost:3000)
> 
> 用户名：`admin`
> 密码：`admin`
