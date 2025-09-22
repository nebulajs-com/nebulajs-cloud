import { NebulaErrors, NebulaKoaContext, QueryParser } from 'nebulajs-core'
import { ClImage } from '../../models/ClImage'
import { ApplicationService } from '../../services/ApplicationService'
import path from 'path'
import { CommonUtil } from '../../utils/common-util'

export = {
    'get /cl-image': async function (ctx, next) {
        const appId = ctx.appId
        const {
            where,
            order,
            page = 1,
            size = 20,
        } = QueryParser.parseFilter(ctx.request.query)
        const offset = (page - 1) * size
        const { count, rows } = await ClImage.findAndCountAll({
            where: {
                ...where,
                appId,
            },
            order,
            offset: offset < 0 ? 0 : offset,
            limit: size,
        })
        ctx.ok(rows)
        ctx.set('X-Total-Count', count)
    },

    // 'get /cl-image/versions': async function (ctx, next) {
    //     const appId = ctx.appId
    //     const versions = (
    //         await ClImage.findAll({
    //             // attributes: ['version', 'remark'],
    //             where: {
    //                 appId,
    //                 version: {
    //                     [Op.not]: null,
    //                 },
    //             },
    //             order: [['createdAt', 'desc']],
    //         })
    //     ).map((v) => v.dataValues)
    //     ctx.ok(versions)
    // },

    /**
     * 应用打包
     * 生成Docker镜像
     * @param ctx
     * @param next
     * @returns {Promise<any>}
     */
    'post /cl-image/build': async function (ctx, next) {
        const { version, type, remark } = ctx.request.body
        const model = await ApplicationService.getCurrentApplication(ctx)
        if (!model) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }

        await ApplicationService.buildAppImage(model, version, type, remark)
        ctx.ok()
    },

    'delete /cl-image/:id': async function (ctx, next) {
        const id = ctx.getParam('id')
        const image = await ClImage.getByPk(id)
        if (!image) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        const app = await ApplicationService.getCurrentApplication(ctx)
        await ApplicationService.deleteAppImage(app, image)
        ctx.ok()
    },

    'get /cl-image/:id/log': async (ctx: NebulaKoaContext, next) => {
        const id = ctx.getParam('id')
        const instance = await ClImage.getByPk(id)
        if (!instance) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        ctx.res.writeHead(200, {
            'Content-Type': 'text/plain',
            // 'Content-Type': 'application/vnd.docker.raw-stream',
            // Connection: 'upgrade',
            // Upgrade: 'tcp',
        })

        const logFile = path.join(process.cwd(), instance.logfile)
        // const logText = fs.readFileSync(logFile).toString()
        // ctx.res.write(logText)
        await CommonUtil.tailFile(logFile, ctx.res)
    },
}
