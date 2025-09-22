import Docker, { Container, Image } from 'dockerode'
import DockerCompose from 'dockerode-compose'
import path from 'path'
import { Piscina } from 'piscina'
import { NebulaBizError } from 'nebulajs-core'
import { ApplicationErrors } from '../../config/errors'
import { ClApplication } from '../../models/ClApplication'
import { app as appConfig } from '../../config/env'
import { CPromise } from 'c-promise2'
import moment from 'moment'

export class DockerService {
    /**
     *
     * @type {Docker}
     */
    docker

    image

    private static _instance: DockerService = null

    private static _buildPool: Piscina = null

    constructor(serverId) {
        // socketPath优先
        const { socketPath, protocol, host, port } =
            appConfig.servers[serverId] || {}
        if (socketPath) {
            this.docker = new Docker({ socketPath })
        } else {
            this.docker = new Docker({ protocol, host, port })
        }
        this.image = new Image(this.docker.modem)
    }

    async deleteImage(name: string, version) {
        nebula.logger.info('删除应用Docker镜像：%s', `${name}:${version}`)
        try {
            const image = this.docker.getImage(`${name}:${version}`)
            await image.remove()
        } catch (e) {
            if (!e.message.match(/No such image/)) {
                throw e
            }
        }
    }

    async buildImage(appModel: ClApplication, version = 'latest') {
        nebula.logger.info('打包应用镜像：%s', `${appModel.code}:${version}`)
        if (!DockerService._buildPool) {
            DockerService._buildPool = new Piscina({
                // maxThreads: 5,
                filename: path.resolve(
                    __dirname,
                    '../../workers/build-docker-image.js'
                ),
            })
        }
        return await DockerService._buildPool.run(
            {
                app: appModel.dataValues,
                version,
            },
            {}
        )
    }

    async startContainer(file, name, timeout: number = 5000) {
        nebula.logger.info('启动应用实例：%s ', file)
        const compose = new DockerCompose(this.docker, file, name)
        try {
            await compose.down({})

            nebula.logger.info(`正在启动Docker实例：%s`, file)
            const promise = new CPromise((resolve, reject, { onCancel }) => {
                compose
                    .up({})
                    .then((res) => {
                        resolve(res)
                    })
                    .catch((e) => {
                        reject(e)
                    })
                onCancel(() =>
                    reject(new Error(`compose up timeout in ${timeout} ms`))
                )
            })
            setTimeout(() => promise.cancel(), timeout)

            const res = await promise
            if (res.services.length > 0) {
                nebula.logger.info(`已启动Docker实例：%s`, res.services[0])
                return res.services[0]
            }
        } catch (e) {
            if (e.message.match(/No such image/)) {
                throw new NebulaBizError(
                    ApplicationErrors.ImageNotExist,
                    e.message
                )
            } else {
                throw e
            }
        }
        return null
    }

    // async stopContainer(file, name) {
    //     nebula.logger.info('停止应用实例：%s', file)
    //     const compose = new DockerCompose(this.docker, file, name)
    //     await compose.down({})
    // }

    async stopContainerById(containerId) {
        nebula.logger.info('停止应用实例，ID：%s', containerId)
        const container = this.docker.getContainer(containerId)
        try {
            const res = await container.stop({})
            nebula.logger.info(`已停止Docker实例：%s`, containerId)
        } catch (e) {
            if (
                !e.message.match(/container already stopped/) &&
                !e.message.match(/no such container/)
            ) {
                throw e
            }
        }
    }

    getContainerById(containerId) {
        nebula.logger.info('获取应用实例，ID：%s', containerId)
        return this.docker.getContainer(containerId)
    }

    getContainerLogById(containerId, callback: (err, stream) => void) {
        nebula.logger.info('获取应用实例日志，ID：%s', containerId)
        const container = this.docker.getContainer(containerId)
        try {
            // container.attach(
            //     {
            //         logs: true,
            //         stream: true,
            //         stdout: true,
            //         stderr: true,
            //     },
            //     callback
            // )
            container.logs(
                {
                    follow: true,
                    stdout: true,
                    stderr: true,
                    stdin: false,
                    // since: moment().subtract(4, 'hours').format('x'),
                    // until: 0,
                    // timestamps: false,
                    tail: 500,
                },
                callback
            )
        } catch (e) {
            if (!e.message.match(/no such container/)) {
                throw e
            }
        }
    }

    async deleteContainerById(containerId) {
        nebula.logger.info('删除应用实例，ID：%s', containerId)
        const container = this.docker.getContainer(containerId)
        try {
            await container.remove({ force: true })
            nebula.logger.info(`已删除Docker实例：%s`, containerId)
        } catch (e) {
            if (!e.message.match(/no such container/)) {
                throw e
            }
        }
    }

    static getInstance(options) {
        if (!this._instance) {
            this._instance = new DockerService(options)
        }
        return this._instance
    }
}
