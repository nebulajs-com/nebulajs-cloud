# 配置

## 完整配置文件

---

```javascript
import fs from 'fs'
import path from 'path'

export = {
    database: {
        // dialect: 'mysql',
        // host: '10.126.32.28',
        // port: '3306',
        // username: 'nebula',
        // database: 'nebula_cloud',
        // password: 'nebula123',

        dialect: 'sqlite',
        storage: './db/nebulajs_db.sqlite',
        timezone: '+00:00',
    },

    logger: {
        level: 'debug',
        savePath: './logs',
        fileSize: '10M',
    },

    redis: {
        port: 6379, // Redis port
        host: '127.0.0.1', // Redis host
        family: 4, // 4 (IPv4) or 6 (IPv6)
        db: 6,
        password: 'nebula123',
    },

    // mongodb: {
    //     uri: 'mongodb://admin:nebula123@10.126.32.28:27017',
    //     options: {
    //         dbName: 'nebula_cloud',
    //     },
    // },

    // eureka: {
    //     server: {
    //         host: '10.126.32.28',
    //         port: 8761,
    //         servicePath: '/eureka/apps/',
    //         registryFetchInterval: 30000,
    //         // preferIpAddress: true,
    //     },
    //     auth: {
    //         username: 'admin',
    //         password: 'admin',
    //     },
    //     client: {},
    // },

    // 单点登录
    auth: {
        authType: 'nebula',
        nebulaConfig: {
            authorizationCodeLifetime: 60 * 5, // 5 min
            accessTokenLifetime: 60 * 60, // 1 hour.
            refreshTokenLifetime: 60 * 60 * 24 * 14, // 2 weeks.
            publicKey: fs
                .readFileSync(
                    path.join(__dirname, '../../../res/cert/oauth/pub.key')
                )
                .toString(),
            privateKey: fs
                .readFileSync(
                    path.join(__dirname, '../../../res/cert/oauth/pri.key')
                )
                .toString(),
        },
        // casConfig: {
        //     endpoint: 'http://10.126.32.28:8000',
        //     clientId: '7278c91484c7ef9e8b3a',
        //     clientSecret: '74d7bb4c6508fff5542b151999d398450e4edd0c',
        //     certificate: fs
        //         .readFileSync(
        //             path.join(__dirname, '../../../res/cert/cas/pub.key')
        //         )
        //         .toString(),
        //     orgName: 'organization_nebula',
        // },
    },

    camunda: {
        apiUri: 'http://10.126.32.219:8070/engine-rest',
        headers: {
            Authorization: 'Basic ZGVtbzpkZW1v', //demo:demo
        },
    },

    minio: {
        endPoint: '10.126.32.28',
        port: 7100,
        useSSL: false,
        accessKey: 'ROqHDRiX41kSRrLB',
        secretKey: 'NJdHEdYTUpXGX8dJYVDECSuQIGf9dr8A',
    },

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
    },
}

```
