import path from 'path'
import crypto from 'crypto'
import randomstring from 'randomstring'
import fs from 'fs'
import ejs from 'ejs'
import archiver from 'archiver'
import swaggerJSDoc from 'swagger-jsdoc'
import { FileUtil } from '../utils/file-util'
import { Op, Model } from 'sequelize'
import decamelize from 'decamelize'
import { DockerService } from './common/DockerService'
import {
    Cache,
    Environments,
    EnvPortPrefix,
    BuildStatus,
    ImageTypes,
    InstanceStatus,
    MiddlewareTypes,
} from '../config/constants'
import {
    BaseModel,
    NebulaBizError,
    NebulaKoaContext,
    NebulaRouter,
} from 'nebulajs-core'
import { ApplicationErrors } from '../config/errors'
import YAML from 'yaml'
import moment from 'moment'
import { Transaction } from 'sequelize'
import { AmisService } from './common/AmisService'
import { GitService } from './common/GitService'
import { FileService } from './app/FileService'
import { CamundaService } from './common/CamundaService'
import { UserService } from './app/UserService'
import { MenuService } from './app/MenuService'
import { ClApplication } from '../models/ClApplication'
import { ClAppProfile } from '../models/ClAppProfile'
import { ClModel } from '../models/ClModel'
import { ClModelProp } from '../models/ClModelProp'
import { ClModelRef } from '../models/ClModelRef'
import { ClPage } from '../models/ClPage'
import { ClApi } from '../models/ClApi'
import { ClImage } from '../models/ClImage'
import { ClInstance } from '../models/ClInstance'
import { AppMenu } from '../models/AppMenu'
import { ClAppInfo } from '../models/ClAppInfo'
import { PageService } from './PageService'
import { ModelService } from './ModelService'
import camelcase from 'camelcase'
import { app as appConfig } from '../config/env'
import { AppUtil } from '../utils/app-util'

const { serviceURL, wsServiceURL, dataPath } = appConfig
export class ApplicationService {
    /**
     * 获取当前应用
     * @param ctx
     * @returns {Promise<BaseModel>}
     */
    static async getCurrentApplication(ctx) {
        const model = await ClApplication.getByPk(ctx.appId)
        nebula.logger.debug(`获取到当前应用：${model?.dataValues?.code}`)
        return model
    }

    /**
     * 创建应用
     *   1. 并生成应用骨架
     *   2. 创建应用环境（DEV、UAT）
     *   3. 创建Minio空间
     *   4. 创建流程Camunda租户
     *   5. 创建管理员账号
     * @param body {any}
     * @param currentLogin
     * @returns {Promise<Model>}
     */
    static async createApplication(body, currentLogin) {
        const { code, name, logo, gitUrl, workflow, storageService, serverId } =
            body
        let model = await ClApplication.getByUniqueKey('code', code)
        if (model) {
            throw new NebulaBizError(ApplicationErrors.ApplicationExist)
        }

        // 属性
        const appValues = {
            code,
            name,
            gitUrl,
            logo,
            workflow,
            storageService,
            serverId,
        }
        const basePort = await AppUtil.getApplicationBasePort()
        const transaction = await nebula.sequelize.transaction()
        try {
            // 流程Camunda租户（租户ID不能包含中划线和下划线）
            const camundaTenantId = `nebula${code
                .replace(/[\-_]/g, '')
                .toLowerCase()}`
            model = ClApplication.build({
                ...appValues,
                camundaTenantId,
                basePort,
            })
            model = await model.save({ transaction })
            nebula.logger.info(`创建应用：${JSON.stringify(model.dataValues)}`)

            // 创建详情表
            await ClAppInfo.create(
                {
                    appId: model.id,
                },
                { transaction }
            )
            // 创建各环境配置文件
            for (let env of Environments) {
                const profile = await ClAppProfile.create(
                    {
                        env,
                        appId: model.id,
                        logLevel: 'info',
                        authConfigText: JSON.stringify({
                            authType: 'nebula',
                        }),
                    },
                    { transaction }
                )
                await this.loadAppConfig(profile)
            }
            // 并生成应用骨架
            await this.generateAppSkeleton(model, currentLogin)

            // 创建Minio空间（default, temp, public）
            if (storageService === 'minio') {
                const fileService = new FileService(code)
                await fileService.createAppBuckets()
            }

            // 创建Camunda租户
            if (workflow === 'camunda') {
                await CamundaService.createTenant({
                    id: model.camundaTenantId,
                    name: model.name,
                })
            }

            // 创建管理员账号
            await UserService.createDefaultAdminAndRole(
                model.dataValues.id,
                transaction
            )

            await transaction.commit()
        } catch (e) {
            await transaction.rollback()
            throw e
        }
        return model
    }

    /**
     * 删除时间过期的应用（）
     * 真正的删除应用（由Job程序调用）
     * @return {Promise<void>}
     */
    static async deleteApplication() {
        //TODO
    }

    /**
     * 生成项目骨架目录
     * @param app
     * @param userLogin
     * @returns {Promise<void>}
     */
    static async generateAppSkeleton(app: ClApplication, userLogin: string) {
        const { code } = app.dataValues
        const appFolder = ApplicationService.getAppDataPath(code)
        const srcFolder = path.join(appFolder, 'src')
        const tplFolder = ApplicationService.getAppTemplatePath('app')
        nebula.logger.info('生成应用骨架：%s', appFolder)
        if (!fs.existsSync(appFolder)) {
            fs.mkdirSync(appFolder, { recursive: true })
        }
        FileUtil.copyDir(tplFolder, appFolder, (src, dest) => {
            nebula.logger.info('复制文件：%s --> %s', src, dest)
            const tplFilename = FileUtil.getFilename(dest)
            const tplExtension = FileUtil.getFileExtension(tplFilename)
            if (tplFilename && tplExtension === 'ejs') {
                const destFile = dest.substr(0, dest.length - 4)
                const destExtension = FileUtil.getFileExtension(destFile)
                const tpl = fs.readFileSync(dest).toString()

                nebula.logger.debug('生成项目文件：' + destFile)
                if (destExtension && destExtension === 'ejs') {
                    // *.ejs.ejs 这种文件为ejs页面，重命名不做处理
                    fs.writeFileSync(destFile, tpl)
                    fs.unlinkSync(dest)
                } else {
                    const text = ejs.render(tpl, {
                        ...app.dataValues,
                        serviceURL,
                        wsServiceURL,
                    })
                    fs.writeFileSync(destFile, text)
                    fs.unlinkSync(dest)
                }
            } else {
                nebula.logger.debug('生成项目文件：' + dest)
            }
        })
        FileUtil.copyDir(
            path.join(__dirname, '../../static/process-editor'),
            path.join(srcFolder, './static/process-editor'),
            (src, dest) => {
                nebula.logger.debug('生成项目文件：' + dest)
            }
        )
        FileUtil.copyDir(
            path.join(__dirname, '../../static/bpmn-diagram'),
            path.join(srcFolder, './static/bpmn-diagram'),
            (src, dest) => {
                nebula.logger.debug('生成项目文件：' + dest)
            }
        )
        FileUtil.copyDir(
            path.join(__dirname, '../../static/amis-editor'),
            path.join(srcFolder, './static/amis-editor'),
            (src, dest) => {
                nebula.logger.debug('生成项目文件：' + dest)
            }
        )
        const gitService = new GitService(srcFolder)
        const branches = await gitService.listBranches()
        if (branches.length === 0) {
            nebula.logger.debug('git初始化目录：%s', srcFolder)
            const gitService = new GitService(srcFolder)
            await gitService.init()
            await gitService.commitDir(
                'nebula app generated.',
                GitService.getDefaultAuthor(userLogin)
            )
        }
    }

    /**
     * 生成应用代码
     * @param app {BaseModel}
     * @param names {Array<String>} 模型名称数组
     * @param crud {String} 生成范围（C：新增，R：详情，U：更新，Q：列表，D：删除，E：导出，I：导入）。例:CRQ
     * @param apis {Boolean} 是否生成API
     * @param views {Boolean} 是否生成页面
     * @param menu {Boolean} 是否生成菜单
     * @param modelPath {String}
     * @param restPath {String}
     * @returns {Promise<void>}
     */
    static async generateAppSource(
        app: ClApplication,
        names = [],
        crud = 'CRUDQ',
        apis = true,
        views = true,
        menu = true,
        modelPath = './models',
        restPath = './routers/rest'
    ) {
        const { code, id } = app.dataValues
        const appSrcPath = this.getAppDataSrcPath(code)
        const modelFolder = path.join(appSrcPath, modelPath)
        const restFolder = path.join(appSrcPath, restPath)
        const where: any = { appId: id }
        if (names.length > 0) {
            where.name = {
                [Op.in]: names,
            }
        }
        const models = await ClModel.findAll({
            where,
            include: [
                {
                    model: ClModelProp,
                    as: 'props',
                    order: [['name', 'asc']],
                },
                {
                    model: ClModelRef,
                    as: 'refs',
                    order: [['ref', 'asc']],
                },
            ],
            order: [['props', 'name', 'asc']],
        })

        const transaction = await nebula.sequelize.transaction()
        try {
            this.generateAppModels(models, modelFolder)
            if (apis) {
                await this.generateAppRestAPI(
                    models,
                    transaction,
                    restFolder,
                    crud,
                    app
                )
            }
            if (views) {
                await this.generateAppPages(app, models, transaction, crud)
            }
            if (menu) {
                await this.generateAppMenu(models, transaction)
                await MenuService.clearMenuNavCache(app.id)
            }
            await transaction.commit()
        } catch (e) {
            await transaction.rollback()
            throw e
        }
    }

    /**
     * 生成应用Model
     * @param models
     * @param modelFolder
     */
    static generateAppModels(models, modelFolder) {
        const tplFolder = this.getAppTemplatePath('base')
        const tpl = fs.readFileSync(path.join(tplFolder, 'model.ejs'))
        for (const model of models) {
            const { name } = model.dataValues
            const text = ejs.render(
                tpl.toString(),
                {
                    fn_decamelize: (str) => decamelize(str, { separator: '-' }),
                    fn_camelize: (str, firstUppercase) =>
                        camelcase(str, { pascalCase: firstUppercase }),
                    ...model.dataValues,
                },
                {}
            )
            const modelFile = path.join(modelFolder, `${name}.ts`)
            fs.writeFileSync(modelFile, text)
            nebula.logger.debug('生成应用模型：' + modelFile)
        }
    }

    /**
     * 生成CRUD页面
     * @param app
     * @param models {Array<BaseModel>}
     * @param transaction {Transaction}
     * @param crud
     */
    static async generateAppPages(
        app: ClApplication,
        models: ClModel[],
        transaction,
        crud
    ) {
        const tplFolder = this.getAppTemplatePath('base')
        const tpl = fs.readFileSync(path.join(tplFolder, 'page.ejs'))
        for (const model of models) {
            const {
                name,
                comment,
                appId,
                createdAtField,
                updatedAtField,
                deletedAtField,
                createdByField,
                updatedByField,
                processStatusField,
            } = model.dataValues
            const sortedProps = model.props.sort(ModelService.modelPropsSortFn)
            const url = `/${decamelize(name, { separator: '-' })}`
            const schema = ejs.render(tpl.toString(), {
                fn_decamelize: (str) => decamelize(str, { separator: '-' }),
                fn_camelize: (str, firstUppercase) =>
                    camelcase(str, { pascalCase: firstUppercase }),
                fn_getAmisFormItemProps: (prop, refs, readOnly) =>
                    AmisService.getAmisFormItemProps(prop, refs, readOnly),
                fn_getAmisListColumnProps: (prop) =>
                    AmisService.getAmisListColumnProps(prop),
                fn_getAmisSearchFormItemProps: (prop) =>
                    AmisService.getAmisSearchFormItemProps(prop),
                SystemProps: [
                    'id',
                    createdAtField,
                    updatedAtField,
                    deletedAtField,
                    createdByField,
                    updatedByField,
                    processStatusField,
                ],
                ...model.dataValues,
                props: sortedProps,
                crud,
            })
            const [pageModel] = await ClPage.findOrBuild({
                where: {
                    appId,
                    url,
                },
                defaults: {
                    appId,
                    url,
                    isInternal: false,
                    isSystem: false,
                },
            })

            pageModel.set({
                name: comment,
                schemaFile: `${decamelize(model.name, {
                    separator: '-',
                })}.json`,
            })
            await pageModel.save({ transaction })
            // 生成页面文件
            const schemaFilePath = PageService.getSchemaPath(pageModel, app)
            nebula.logger.info(`保存页面定义到文件：${schemaFilePath}`)
            fs.writeFileSync(
                schemaFilePath,
                JSON.stringify(JSON.parse(schema), null, 4)
            )
        }
    }

    /**
     * 生成菜单
     * @param models {Array<BaseModel>}
     * @param transaction {Transaction}
     */
    static async generateAppMenu(models, transaction) {
        for (const model of models) {
            const { name, comment, appId } = model.dataValues
            const url = `/${decamelize(name, { separator: '-' })}`
            const [menuModel] = await AppMenu.findOrBuild({
                where: {
                    appId,
                    url,
                },
                defaults: {
                    appId,
                    url,
                    isSystem: false,
                    visible: true,
                    remark: `系统生成CRUD`,
                },
            })
            menuModel.set({
                label: comment,
            })
            await menuModel.save({ transaction })
        }
    }

    /**
     * 生成应用REST接口
     * @param models
     * @param transaction {Transaction}
     * @param restFolder
     * @param crud
     * @param app { BaseModel }
     */
    static async generateAppRestAPI(
        models: ClModel[],
        transaction,
        restFolder,
        crud,
        app
    ) {
        const tplFolder = this.getAppTemplatePath('base')
        const tpl = fs.readFileSync(path.join(tplFolder, 'rest.ejs'))
        for (const model of models) {
            const {
                name,
                createdAtField,
                updatedAtField,
                deletedAtField,
                createdByField,
                updatedByField,
                processStatusField,
            } = model.dataValues
            const text = ejs.render(
                tpl.toString(),
                {
                    fn_getSwaggerType: this.getSwaggerType,
                    fn_decamelize: (str) => decamelize(str, { separator: '-' }),
                    SystemProps: [
                        createdAtField,
                        updatedAtField,
                        deletedAtField,
                        createdByField,
                        updatedByField,
                        processStatusField,
                    ],
                    ...model.dataValues,
                    crud,
                },
                {}
            )
            const restApiFile = path.join(restFolder, `${name}Rest.ts`)
            fs.writeFileSync(restApiFile, text)

            // 生成swagger
            const swaggerObj = nebula.router.addSwaggerPrefix(
                swaggerJSDoc({
                    definition: {},
                    apis: [restApiFile],
                }),
                '/api'
            )
            await this.generateAppRestAPIBySwagger(
                app,
                model,
                swaggerObj,
                transaction
            )
        }
        nebula.logger.info('生成应用CRUD接口：' + restFolder)
    }

    /**
     * @param app { BaseModel}
     * @param model { BaseModel}
     * @param swaggerObj
     * @param transaction {Transaction}
     */
    static async generateAppRestAPIBySwagger(
        app,
        model,
        swaggerObj,
        transaction
    ) {
        const { id: appId } = app.dataValues
        const { name: modelName } = model
        for (const path in swaggerObj.paths) {
            for (const method of ['get', 'post', 'put', 'delete']) {
                if (swaggerObj.paths[path][method]) {
                    const {
                        summary,
                        description,
                        tags,
                        parameters,
                        responses,
                    } = swaggerObj.paths[path][method]
                    const id = crypto
                        .createHash('md5')
                        .update(`${appId}:${method}:${path}`)
                        .digest('hex')
                    await ClApi.upsert(
                        {
                            id,
                            name: summary,
                            description,
                            appId,
                            method,
                            path,
                            model: modelName,
                            tag: tags.join(','),
                            parameters: JSON.stringify(parameters),
                            responses: JSON.stringify(responses),
                            isCustom: false,
                        },
                        { transaction }
                    )
                }
            }
        }
    }

    /**
     * 生成Docker Compose文件
     * @param data
     * @param appFolder
     * @returns {string}
     */
    // static generateDockerComposeFile(data, appFolder) {
    //     const tplFolder = this.getAppTemplatePath('base')
    //     const tpl = fs.readFileSync(
    //         path.join(tplFolder, './docker/app-compose.ejs')
    //     )
    //     const text = ejs.render(tpl.toString(), data, {})
    //     const dockerFile = path.join(appFolder, './docker/app-compose.yml')
    //     fs.writeFileSync(dockerFile, text)
    //     nebula.logger.info('生成应用app-compose文件：' + dockerFile)
    //     return dockerFile
    // }

    static async deleteAppImage(app: ClApplication, image: ClImage) {
        const dockerService = new DockerService(app.serverId)
        await dockerService.deleteImage(image.name, image.version)
        await image.destroy()
        nebula.logger.info(`删除应用镜像成功`)
    }

    /**
     * 构建Docker镜像
     * @param app {BaseModel}
     * @param version
     * @param type
     * @param remark
     * @returns {Promise<void>}
     */
    static async buildAppImage(
        app: ClApplication,
        version,
        type = ImageTypes.Debug,
        remark
    ) {
        const { id, code, serverId } = app.dataValues
        const count = await ClImage.count({
            where: {
                version,
                type,
                appId: id,
            },
        })
        if (count > 0) {
            throw new NebulaBizError(ApplicationErrors.ImageExist)
        }
        const date = moment().format('YYYY-MM-DD')
        const logfile = `logs/build/${app.code}/${app.code}-${version}.${date}.log`
        // 镜像记录
        const image = await ClImage.create({
            name: `${code}`,
            remark,
            buildStatus: BuildStatus.BUILDING,
            logfile,
            version,
            type,
            appId: id,
        })

        // 打docker镜像
        const dockerService = new DockerService(serverId)
        dockerService
            .buildImage(app, version)
            .then((ret) => {
                nebula.logger.info('打包应用镜像成功：%s', `${code}:${version}`)
                image.set({ buildStatus: BuildStatus.SUCCESS })
                image.save().catch((e) => nebula.logger.error('%o', e))
            })
            .catch((e) => {
                nebula.logger.error(
                    '打包应用镜像失败：%s，%o',
                    `${code}:${version}`,
                    e
                )
                image.set({ buildStatus: BuildStatus.FAILED })
                image.save().catch((e) => nebula.logger.error('%o', e))
                // image.destroy()
            })
    }

    /**
     * 创建应用容器
     * @param app
     * @param env 环境
     * @param insType
     * @param imageType 镜像类型（debug,release）
     * @param version 版本
     * @param volumeMapping
     * @returns {Promise<BaseModel>}
     */
    static async createAppInstance(
        app: ClApplication,
        env,
        insType: 'app' | 'vscode',
        imageType?,
        version?,
        volumeMapping?
    ): Promise<ClInstance> {
        const { id, code, basePort, serverId } = app
        // 获取所有实例，用于获取端口
        const instances = await ClInstance.findAll({
            where: {
                appId: id,
            },
            attributes: ['id', 'type', 'env', 'subPorts'],
        })
        const existInstances = instances.filter((ins) => {
            return (
                (ins.type === 'app' || ins.type === 'vscode') && ins.env === env
            )
        })
        if (existInstances.length > 0) {
            // 一个环境下只能有一个实例
            throw new NebulaBizError(ApplicationErrors.InstanceExist)
        }

        // 不是开发编辑器则需要镜像包
        let imageName = ''
        let insName = ''
        if (insType === 'app') {
            const image = await ClImage.findOne({
                where: {
                    appId: id,
                    type: imageType,
                    version,
                },
            })
            if (!image) {
                throw new NebulaBizError(ApplicationErrors.ImageNotExist)
            }
            imageName = image.name
            insName = `${imageName}-${env}`
        } else {
            imageName = 'vscode'
            insName = code + '-vscode'
        }

        const existSubPorts = instances
            .map((i) => i.dataValues.subPorts)
            .join(',')
            .split(',')
            .filter((p) => p)
            .map((p) => parseInt(p))
        const subPorts = AppUtil.getSubPorts(existSubPorts, 2)
        const ports = subPorts.map(
            (sp) => `${EnvPortPrefix[env]}${basePort}${sp}`
        )
        nebula.logger.info(`计算可用端口：${ports}`)
        const transaction = await nebula.sequelize.transaction()
        try {
            const dockerFile = `${insType}-compose-${env}.yml`
            const instance = await ClInstance.create(
                {
                    name: insName,
                    image: imageName,
                    type: insType,
                    dockerFile,
                    status: InstanceStatus.STOPPED,
                    host: appConfig.servers[serverId]?.host,
                    extHost: appConfig.servers[serverId]?.extHost || '',
                    ports: ports.join(','),
                    subPorts: subPorts.join(','),
                    env: env,
                    appId: id,
                    version,
                    volumeMapping,
                    serverId,
                },
                { transaction }
            )

            // 生成docker-compose文件
            const vsCodePassword = randomstring.generate(16)
            await ClAppInfo.update(
                { vsCodePassword },
                { where: { appId: app.id }, transaction }
            )
            const composeFilePath = ApplicationService.getComposeFilePath(
                code,
                insType,
                instance.dockerFile
            )
            this.generateComposeFile(instance, composeFilePath, {
                vsCodePassword,
                serviceURL,
                wsServiceURL,
            })

            nebula.logger.info(
                `创建应用实例：${JSON.stringify(instance.dataValues)}`
            )
            await transaction.commit()
            return instance
        } catch (e) {
            await transaction.rollback()
            throw e
        }
    }

    static generateComposeFile(
        instance: ClInstance,
        composeFilePath,
        extraData: { vsCodePassword?; middleware?; serviceURL?; wsServiceURL? }
    ) {
        const { type: insType, ports, dataValues } = instance
        const tplFolder = this.getAppTemplatePath('docker')
        const composeTplFile = this.getComposeTemplateFile(insType)
        const tpl = fs.readFileSync(path.join(tplFolder, composeTplFile))
        const text = ejs.render(tpl.toString(), {
            ...dataValues,
            ports: ports.split(','),
            extra: extraData || {},
            envVars: process.env,
            volumes: instance.volumeMapping?.split(',') || [],
        })
        fs.writeFileSync(composeFilePath, text)
        nebula.logger.info('生成docker compose文件：' + composeFilePath)
    }

    /**
     * 装载应用配置
     * @returns {Promise<any>}
     */
    static async loadAppConfig(model: ClAppProfile) {
        const { env, content, bizContent, appId } = model.dataValues
        nebula.logger.info(`加载应用配置：APPID:${appId}, ENV:${env}`)
        let sysConfig = {},
            bizConfig = {}
        if (content) {
            sysConfig = YAML.parse(content)
        } else {
            // 默认应用配置
            sysConfig = {
                redis: {
                    useMock: true,
                },
                logger: {
                    level: 'info',
                },
                auth: {
                    authType: 'nebula',
                },
            }
        }
        if (bizContent) {
            bizConfig = YAML.parse(bizContent)
        }
        const appConfig = Object.assign(sysConfig, bizConfig)
        await nebula.redis.set(
            Cache.getAppConfigKey(env, model.appId),
            JSON.stringify(appConfig)
        )
    }

    /**
     * 获取应用基础目录
     * @param code 应用编码
     * @returns {string}
     */
    static getAppDataPath(code) {
        return path.join(dataPath, code)
    }

    /**
     * 获取应用代码目录
     * @param code 应用编码
     * @returns {string}
     */
    static getAppDataSrcPath(code) {
        return path.join(this.getAppDataPath(code), 'src')
    }

    /**
     * 获取模板目录
     * @param folder
     * @returns {string}
     */
    static getAppTemplatePath(folder) {
        return path.join(__dirname, '../../templates', folder)
    }

    static getComposeTemplateFile(type) {
        return `${type}-compose.ejs`
    }

    /**
     * 获取DockerCompose文件路径
     * @param appCode 应用编码
     * @param type 类型
     * @param dockerFile docker文件名
     * @returns {string}
     */
    static getComposeFilePath(
        appCode: string,
        type: string,
        dockerFile: string
    ) {
        const appFolder = ApplicationService.getAppDataPath(appCode)
        if (type === 'vscode') {
            // vscode文件放在APP根目录
            return path.join(appFolder, dockerFile)
        } else {
            // 其他放在docker目录
            const dockerFolder = path.join(appFolder, './docker')
            return path.join(dockerFolder, dockerFile)
        }
    }

    static async commitAppCode(
        appModel: ClApplication,
        userLogin: string,
        commitMessage: string
    ) {
        const appFolder = ApplicationService.getAppDataPath(appModel.code)
        const srcFolder = path.join(appFolder, 'src')
        const gitService = new GitService(srcFolder)
        const author = GitService.getDefaultAuthor(userLogin)
        await gitService.commitDir(commitMessage, author)
    }

    static async pullAppCode(appModel: ClApplication, userLogin: string) {
        const appInfo = await ClAppInfo.getByUniqueKey('appId', appModel.id)
        if (!appInfo.gitUrl) {
            throw new NebulaBizError(ApplicationErrors.GitNoUrl)
        }

        const appFolder = ApplicationService.getAppDataPath(appModel.code)
        const srcFolder = path.join(appFolder, 'src')
        const gitService = new GitService(srcFolder)
        const author = GitService.getDefaultAuthor(userLogin)
        const gitAuth = {
            username: appInfo.gitUsername,
            password: appInfo.gitPassword,
        }
        try {
            const serverRefs = await gitService.listServerRefs(
                gitAuth,
                appInfo.gitUrl
            )
            if (
                !serverRefs.find(
                    (r) => r.ref === `refs/heads/${appInfo.gitBranch}`
                )
            ) {
                throw new NebulaBizError(ApplicationErrors.GitNoSuchBranch)
            }
            const branches = await gitService.listBranches()
            if (branches.length === 0) {
                nebula.logger.info(
                    `正在从Git仓库克隆，分支：%s，地址：%s`,
                    appInfo.gitBranch,
                    appInfo.gitUrl
                )
                await gitService.clone(gitAuth, appInfo.gitUrl)
            } else {
                nebula.logger.info(
                    `正在从Git仓库拉取，分支：%s，地址：%s`,
                    appInfo.gitBranch,
                    appInfo.gitUrl
                )
                await gitService.pull(gitAuth, author)
            }
            const currBranch = await gitService.currentBranch()
            if (currBranch !== appInfo.gitBranch) {
                nebula.logger.info(`正在切换到分支：%s`, appInfo.gitBranch)
                await gitService.checkout(appInfo.gitBranch)
            }
        } catch (e) {
            if (e.code === 'HttpError' && e.data?.statusCode === 401) {
                throw new NebulaBizError(ApplicationErrors.GitUnauthorized)
            }
            // else if(e.code=== "NotFoundError"){
            //     throw new NebulaBizError()
            // }
            throw new NebulaBizError(ApplicationErrors.GitPullFailed, e.message)
        }
    }

    static async pushAppCode(appModel: ClApplication) {
        const appInfo = await ClAppInfo.getByUniqueKey('appId', appModel.id)
        if (!appInfo.gitUrl) {
            throw new NebulaBizError(ApplicationErrors.GitNoUrl)
        }

        const appFolder = ApplicationService.getAppDataPath(appModel.code)
        const srcFolder = path.join(appFolder, 'src')
        const gitService = new GitService(srcFolder)
        const gitAuth = {
            username: appInfo.gitUsername,
            password: appInfo.gitPassword,
        }

        nebula.logger.info(
            `正在推送到Git仓库，分支：%s，地址：%s`,
            appInfo.gitBranch,
            appInfo.gitUrl
        )
        await gitService.push(gitAuth)
    }

    static async downloadAppCode(
        appModel: ClApplication,
        ctx: NebulaKoaContext
    ) {
        const appFolder = ApplicationService.getAppDataPath(appModel.code)
        const srcFolder = path.join(appFolder, 'src')
        const archive = archiver('zip', {
            zlib: { level: 9 }, // Sets the compression level.
        })
        const excludeSrcFolders = [
            '.idea',
            '.vscode',
            '.git',
            'node_modules',
            'db',
            'logs',
        ]
        const isExcludePath = (srcPath: string, realPath: string) => {
            const fileObj = fs.statSync(realPath)
            for (const ex of excludeSrcFolders) {
                if (
                    fileObj.isDirectory() &&
                    realPath === path.join(srcPath, ex)
                ) {
                    return true
                }
            }
            return false
        }

        // 设置响应头，告诉浏览器下载文件
        ctx.attachment(`${appModel.code}_SRC.zip`)
        ctx.res.writeHead(200, {
            'Content-Type': 'application/zip, application/octet-stream',
            'Content-Disposition': `attachment; filename=${appModel.code}_SRC.zip`,
        })
        ctx.set('Access-Control-Expose-Headers', 'Content-Disposition')

        // 监听归档过程中的错误事件
        archive.on('error', (err) => {
            throw err
        })

        // archive.pipe(zipFile)
        archive.pipe(ctx.res)

        const dir = fs.readdirSync(srcFolder)
        for (const item of dir) {
            const filePath = path.join(srcFolder, item)
            const fileObj = fs.statSync(filePath)
            if (!isExcludePath(srcFolder, filePath)) {
                if (fileObj.isFile()) {
                    archive.file(filePath, { name: item })
                } else if (fileObj.isDirectory()) {
                    archive.directory(filePath, item)
                }
            }
        }

        // 完成归档文件的创建
        await archive.finalize()
    }

    static getSwaggerType(type) {
        if (type === 'INTEGER' || type === 'BIGINT') {
            return 'integer'
        }
        if (type === 'DOUBLE' || type === 'FLOAT') {
            return 'number'
        } else if (type === 'DATE') {
            return 'string'
        } else if (type === 'BOOLEAN') {
            return 'boolean'
        }
        return 'string'
    }
}
