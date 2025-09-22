import Docker from 'dockerode'
import { NebulaLogger } from 'nebulajs-core'
import { Logger } from 'winston'

export class DockerWorker {
    docker
    logger: Logger

    constructor(server: { socketPath; protocol; host; port }, logger: Logger) {
        const { socketPath, protocol, host, port } = server || {}
        if (socketPath) {
            this.docker = new Docker({ socketPath })
        } else {
            this.docker = new Docker({ protocol, host, port })
        }
        this.logger = logger
    }

    followDockerProgress(stream) {
        return new Promise((resolve, reject) => {
            this.docker.modem.followProgress(
                stream,
                (err, res) => (err ? reject(err) : resolve(res)),
                (data) => {
                    //onProgress
                    if (data.stream && data.stream.toString().trim()) {
                        this.logger.info(
                            data.stream.toString().replace(/\n+$/, '')
                        )
                    } else if (data.error) {
                        this.logger.error(data.error)
                        reject(new Error(data.error))
                    }
                }
            )
        })
    }

    async buildImage({ appSrcFolder, name, version }) {
        this.logger.info(`构建镜像开始: ${name}:${version}`)
        const stream = await this.docker.buildImage(
            {
                context: appSrcFolder,
                src: ['Dockerfile', '.'],
            },
            {
                t: `${name}:${version}`,
                // t: `${name}`,
            }
        )
        await this.followDockerProgress(stream)
        this.logger.info(`构建镜像结束: ${name}:${version}`)
    }
}
