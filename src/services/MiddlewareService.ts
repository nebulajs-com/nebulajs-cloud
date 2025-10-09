import { Sequelize, Model, QueryTypes, Op } from 'sequelize'
import {
    DataStatus,
    InstanceStatus,
    MiddlewareTypes,
} from '../config/constants'
import randomstring from 'randomstring'
import { DockerService } from './common/DockerService'
import { ApplicationService } from './ApplicationService'
import { ClMiddleware } from '../models/ClMiddleware'
import { ClApplication } from '../models/ClApplication'
import { ClInstance } from '../models/ClInstance'
import { CommonUtils } from 'nebulajs-core/lib/utils'
import { app as appConfig } from '../config/env'
import { AppUtil } from '../utils/app-util'
import { ApplicationErrors } from '../config/errors'
import { NebulaBizError } from 'nebulajs-core'
import { InstanceService } from './InstanceService'
import path from 'path'
import fs from 'fs'
import { FileUtil } from '../utils/file-util'

export class MiddlewareService {
    static async deleteMiddleware(model: ClMiddleware) {
        const { id, type, isExternal } = model
        const instance = await ClInstance.findOne({
            where: {
                middlewareId: id,
                type,
            },
            include: {
                model: ClApplication,
                as: 'app',
            },
        })
        if (instance && instance.status !== InstanceStatus.STOPPED) {
            // 存在已经启动的实例
            throw new NebulaBizError(ApplicationErrors.MiddlewareInstanceExist)
        }

        const transaction = await nebula.sequelize.transaction()
        try {
            if (!isExternal && instance) {
                const { code } = await ClApplication.getByPk(model.appId)
                const appFolder = ApplicationService.getAppDataPath(code)
                const dockerFolder = path.join(appFolder, './docker')
                const dockerFile = path.join(dockerFolder, instance.dockerFile)
                const dockerDataFolder = path.join(dockerFolder, instance.name)
                fs.existsSync(dockerFile) && fs.unlinkSync(dockerFile)
                fs.existsSync(dockerDataFolder) &&
                    FileUtil.deleteDir(dockerDataFolder)

                await InstanceService.stopInstance(instance, transaction)
                await InstanceService.deleteInstance(instance, transaction)
            }
            await model.destroy({ transaction })
            await transaction.commit()
        } catch (e) {
            await transaction.rollback()
            throw e
        }
    }
    /**
     *
     * @param appId
     * @param body
     */
    static async createMiddleware(appId, body: ClMiddleware & { hostPort }) {
        const { type, isExternal, hostPort } = body
        if (CommonUtils.parseBoolean(isExternal) || type === 'sqlite') {
            // 外部中间件
            return await ClMiddleware.create({
                ...body,
                ...hostPort,
                appId,
            })
        } else {
            // 内部中间件
            const { code, basePort, serverId } = await ClApplication.getByPk(
                appId
            )
            const instances = await ClInstance.findAll({
                where: {
                    appId,
                },
                attributes: ['id', 'type', 'subPorts'],
            })
            const existSubPorts = instances
                .map((i) => i.dataValues.subPorts)
                .join(',')
                .split(',')
                .filter((p) => p)
                .map((p) => parseInt(p))
            const subPorts = AppUtil.getSubPorts(existSubPorts)
            const ports = subPorts.map((sp) => `${basePort}${sp}`)
            const transaction = await nebula.sequelize.transaction()
            try {
                let username = ''
                if (type === MiddlewareTypes.MySQL) {
                    username = 'root'
                } else if (type === MiddlewareTypes.MongoDB) {
                    username = 'root'
                }
                const middleware = await ClMiddleware.create(
                    {
                        ...body,
                        host: appConfig.servers[serverId]?.host,
                        port: ports[0],
                        username,
                        password: randomstring.generate(16),
                        appId,
                    },
                    { transaction }
                )
                // 中间件ID前8位作为后缀
                const suffix = middleware.id.replace(/\-/g, '').substring(0, 8)
                const dockerFile = `${type}-compose-${suffix}.yml`
                // 创建实例
                const instance = await ClInstance.create(
                    {
                        name: `${type}-${suffix}`,
                        type,
                        dockerFile,
                        status: InstanceStatus.STOPPED,
                        host: appConfig.servers[serverId]?.host,
                        extHost: appConfig.servers[serverId]?.extHost || '',
                        ports: ports.join(','),
                        subPorts: subPorts.join(','),
                        middlewareId: middleware.dataValues.id,
                        appId,
                        serverId,
                    },
                    { transaction }
                )

                // 生成docker-compose文件
                const composeFilePath = ApplicationService.getComposeFilePath(
                    code,
                    type,
                    instance.dockerFile
                )
                ApplicationService.generateComposeFile(
                    instance,
                    composeFilePath,
                    {
                        middleware: middleware.dataValues,
                    }
                )
                nebula.logger.info(
                    `创建中间件实例：${JSON.stringify(instance.dataValues)}`
                )
                await transaction.commit()
                return middleware
            } catch (e) {
                await transaction.rollback()
                throw e
            }
        }
    }
}
