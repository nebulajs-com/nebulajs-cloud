import fs from 'fs'
import path from 'path'

export = {
    database: {
        dialect: 'mysql',
        host: '10.100.227.8',
        port: '3306',
        username: 'root',
        database: 'nebula_cloud',
        password: 'nebula@2021',
    },

    logger: {
        level: 'info',
        savePath: './logs',
        fileSize: '10M',
    },

    redis: {
        port: 6379, // Redis port
        host: '10.100.227.5', // Redis host
        family: 4, // 4 (IPv4) or 6 (IPv6)
        db: 3,
        password: 'nebula123',
    },

    mongodb: {
        uri: 'mongodb://admin:nebula123@10.100.227.5:27017',
        options: {
            dbName: 'nebula_cloud',
        },
    },

    // eureka: {
    //     server: {
    //         host: '10.100.227.3',
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
        apiUri: 'http://10.100.227.5:8060/engine-rest',
        headers: {
            Authorization: 'Basic ZGVtbzpkZW1v', //demo:demo
        },
    },

    minio: {
        endPoint: '10.100.227.7',
        port: 9001,
        useSSL: false,
        accessKey: 'minio',
        secretKey: 'dWZV9Le9N6saU2WW',
    },

    app: {
        serviceURL: 'http://10.100.227.3:3000',
        wsServiceURL: 'ws://10.100.227.3:3001',
        dataPath: process.env.NEBULA_DATA_PATH || '/opt/nebulajs-data',
        servers: {
            default: {
                name: '本地默认',
                socketPath: '/var/run/docker.sock',
                protocol: 'http',
                host: '10.100.227.3', //host字段需要用到，获取服务器IP
                port: 2375,
            },
        },
    },
}
