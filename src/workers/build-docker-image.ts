import { DockerWorker } from './module/DockerWorker'
import { ApplicationService } from '../services/ApplicationService'
import { ClApplication } from '../models/ClApplication'
import { GitService } from '../services/common/GitService'
import { app as appConfig } from '../config/env'
import { NebulaLogger } from 'nebulajs-core'

export = async ({ app, version }: { app: ClApplication; version: string }) => {
    const appSrcFolder = ApplicationService.getAppDataSrcPath(app.code)
    const server = appConfig.servers[app.serverId]
    // console.log('server', server)
    // 打包
    const logger = new NebulaLogger({
        savePath: `./logs/build/${app.code}`,
    }).getLogger(`${app.code}-${version}`)
    const dockerWorker = new DockerWorker(server, logger)
    await dockerWorker.buildImage({
        appSrcFolder,
        name: app.code,
        version,
    })

    // git 打标签
    if (version !== 'latest') {
        const gitService = new GitService(appSrcFolder)
        await gitService.tag(version)
    }
}
