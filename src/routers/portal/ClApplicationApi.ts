import { NebulaKoaContext, NebulaErrors, QueryParser } from 'nebulajs-core'
import {
    Cache,
    Constants,
    Cookies,
    DataStatus,
    Environments,
} from '../../config/constants'
import { ApplicationService } from '../../services/ApplicationService'
import { InstanceService } from '../../services/InstanceService'
import { FileService } from '../../services/app/FileService'
import { ClApplication } from '../../models/ClApplication'
import { ClInstance } from '../../models/ClInstance'
import { CommonUtils } from 'nebulajs-core/lib/utils'
import { GitService } from '../../services/common/GitService'
import { ClAppInfo } from '../../models/ClAppInfo'
import { UserService } from '../../services/app/UserService'
import { app as appConfig } from '../../config/env'

export = {
    /**
     * 切换应用
     * @param ctx
     * @param next
     * @returns {Promise<*>}
     */
    'get /cl-application/switch/:id': async function (ctx, next) {
        const id = ctx.getParam('id')
        const model = await ClApplication.getByPk(id)
        if (!model || model.status === DataStatus.DISABLED) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        ctx.cookies.set(Cookies.CURRENT_APP_ID, id)
        ctx.ok(model)
    },

    'delete /cl-application': async (ctx, next) => {
        const model = await ApplicationService.getCurrentApplication(ctx)
        if (!model) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        model.set({ status: DataStatus.DISABLED })
        await model.save()
        ctx.ok()
    },

    /**
     * 生成app代码（包括model, view, rest接口）
     * @param ctx
     * @param next
     * @returns {Promise<any>}
     */
    'post /cl-application/generate': async function (ctx, next) {
        ctx.checkRequired('names')
        const { names, apis, views, crud, menu, commit } = ctx.request.body
        const { login } = ctx.state.user
        const model = await ApplicationService.getCurrentApplication(ctx)
        if (!model) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }

        await ApplicationService.generateAppSource(
            model,
            names,
            crud,
            CommonUtils.parseBoolean(apis),
            CommonUtils.parseBoolean(views),
            CommonUtils.parseBoolean(menu)
        )
        // if (CommonUtils.parseBoolean(commit)) {
        //     await ApplicationService.commitAppCode(
        //         model,
        //         login,
        //         `feat: 生成模型代码[${names.join(',')}]`
        //     )
        // }
        ctx.ok()
    },

    /**
     * 运行应用（创建实例）
     * @param ctx
     * @param next
     * @returns {Promise<any>}
     */
    'post /cl-application/run': async function (ctx, next) {
        ctx.checkRequired(['env', 'imageType'])
        const { env, version, imageType, volumeMapping } = ctx.request.body
        const model = await ApplicationService.getCurrentApplication(ctx)
        if (!model) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        const instance = (
            await ApplicationService.createAppInstance(
                model,
                env,
                'app',
                imageType,
                version,
                volumeMapping
            )
        ).dataValues
        ctx.ok(instance)
    },

    /**
     * 创建应用
     * @param ctx
     * @param next
     * @returns {Promise<void>}
     */
    'post /cl-application': async function (ctx, next) {
        ctx.checkRequired(['code', 'name'])
        const { login } = ctx.state.user
        const model = await ApplicationService.createApplication(
            ctx.request.body,
            login
        )
        ctx.ok(model)
    },

    'put /cl-application': async function (ctx, next) {
        const { id, name, workflow, storageService, logo, remark } =
            ctx.request.body
        let model = await ClApplication.getByPk(id)
        let logoURL = null
        if (!model) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        if (logo) {
            const fileService = new FileService(Constants.NEBULA_APP_CODE)
            const keys = await fileService.archiveFilesToPublic([logo])
            logoURL = fileService.getPublicURL(keys[0])
            nebula.logger.info('应用LOGO地址：%s', logoURL)
        }
        model.set({
            name,
            workflow,
            storageService,
            logo: logoURL || '',
            remark,
        })
        model = await model.save()
        ctx.ok(model)
    },

    /**
     * 重构应用，重新从项目模板生成项目
     * @param ctx
     * @param next
     * @returns {Promise<void>}
     */
    'post /cl-application/recreate': async function (ctx, next) {
        const model = await ClApplication.getByPk(ctx.getParam('appId'))
        if (!model) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        const { login } = ctx.state.user
        await ApplicationService.generateAppSkeleton(model, login)
        ctx.ok()
    },

    /**
     * 查询应用列表
     * @param ctx
     * @param next
     * @returns {Promise<void>}
     */
    'get /cl-application': async function (ctx, next) {
        const {
            where,
            include,
            order,
            page = 1,
            size = 20,
        } = QueryParser.parseFilter(ctx.request.query)
        const offset = (page - 1) * size
        const { login } = ctx.state.user
        const userModel = await UserService.getUserByLoginAndAppId(
            Constants.NEBULA_APP_ID,
            login
        )
        if (!userModel.hasRole(Constants.ROLE_ADMIN)) {
            ;(where as any).createdBy = login
        }
        const { count, rows } = await ClApplication.findAndCountAll({
            where: {
                ...where,
                status: DataStatus.ENABLED,
            },
            order,
            offset: offset < 0 ? 0 : offset,
            limit: size,
            include: include,
        })
        const list = rows.map((app) => {
            app.dataValues.serverName =
                appConfig.servers[app.dataValues.serverId]?.name
            return app.dataValues
        })
        ctx.ok(list)
        ctx.set('X-Total-Count', count)
    },

    'post /cl-application/develop/vscode/start': async (ctx, next) => {
        let instance = await ClInstance.findOne({
            where: {
                appId: ctx.appId,
                type: 'vscode',
                env: 'dev',
            },
        })
        if (!instance) {
            const model = await ApplicationService.getCurrentApplication(ctx)
            instance = await ApplicationService.createAppInstance(
                model,
                'dev',
                'vscode'
            )
        }
        await InstanceService.startInstance(instance)
        ctx.ok()
    },

    'post /cl-application/develop/vscode/stop': async (ctx, next) => {
        const instance = await ClInstance.findOne({
            where: {
                appId: ctx.appId,
                type: 'vscode',
                env: 'dev',
            },
        })
        if (!instance) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        await InstanceService.stopInstance(instance)
        ctx.ok()
    },

    /**
     * 应用开发信息，开发页面接口
     * @param ctx
     * @param next
     * @returns {Promise<void>}
     */
    'get /cl-application/develop': async (ctx, next) => {
        const model = await ApplicationService.getCurrentApplication(ctx)
        if (!model) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        const gitService = new GitService(
            ApplicationService.getAppDataSrcPath(model.code)
        )

        const appInfo = await ClAppInfo.getByUniqueKey('appId', ctx.appId)
        const vsCodeInstance = await ClInstance.findOne({
            where: {
                appId: ctx.appId,
                type: 'vscode',
                env: 'dev',
            },
        })

        let appURL = '',
            docURL = '',
            devURL = ''
        if (vsCodeInstance && vsCodeInstance.status === '2') {
            const { host, extHost, ports, status } = vsCodeInstance
            appURL = `http://${extHost}:${ports.split(',')[0]}`
            devURL = `http://${extHost}:${
                ports.split(',')[1]
            }/?folder=/root/src`
            docURL = `${appURL}/swagger/index.html`
        }
        let commitList = []
        try {
            commitList = await gitService.listLatestCommits()
        } catch (e) {
            nebula.logger.warn('获取最近提交信息：' + e.message)
        }
        ctx.ok({
            appURL,
            devURL,
            docURL,
            instance: vsCodeInstance?.dataValues || {},
            appInfo: appInfo?.dataValues,
            commitList,
        })
    },

    'post /cl-application/code/pull': async function (ctx, next) {
        const model = await ApplicationService.getCurrentApplication(ctx)
        if (!model) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        const { login } = ctx.state.user
        await ApplicationService.pullAppCode(model, login)
        ctx.ok()
    },

    'post /cl-application/code/push': async function (ctx, next) {
        const model = await ApplicationService.getCurrentApplication(ctx)
        if (!model) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        await ApplicationService.pushAppCode(model)
        ctx.ok()
    },

    'get /cl-application/code/download': async function (ctx, next) {
        const model = await ApplicationService.getCurrentApplication(ctx)
        if (!model) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        await ApplicationService.downloadAppCode(model, ctx)
        // ctx.ok()
    },

    'post /cl-application/info': async (ctx, next) => {
        const updateGit = ctx.getParam('git')
        const model = await ApplicationService.getCurrentApplication(ctx)
        if (!model) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        const body: ClAppInfo = ctx.request.body
        const appInfo = await ClAppInfo.getByUniqueKey('appId', ctx.appId)
        appInfo.set({ ...body, appId: ctx.appId })

        if (updateGit) {
            const gitService = new GitService(
                ApplicationService.getAppDataSrcPath(model.code)
            )
            const remote = 'origin'
            const remotes = await gitService.listRemotes()
            if (remotes.find((r) => r.remote === remote)) {
                await gitService.deleteRemote(remote)
            }
            await gitService.addRemote(appInfo.gitUrl, remote)
        }

        await appInfo.save()
        ctx.ok(appInfo.dataValues)
    },

    /**
     * 查询单个应用
     * @param ctx
     * @param next
     * @returns {Promise<*>}
     */
    'get /cl-application/current': async function (ctx, next) {
        const model = await ApplicationService.getCurrentApplication(ctx)
        if (!model) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        ctx.ok(model)
    },

    'get /cl-application/servers': async function (ctx, next) {
        const list: any[] = []
        for (const key in appConfig.servers) {
            list.push({
                code: key,
                name: appConfig.servers[key].name,
            })
        }
        ctx.ok(list)
    },
}
