import { NebulaBizError, NebulaErrors, QueryParser } from 'nebulajs-core'
import { AuditModelProps, DataStatus } from '../../config/constants'
import sequelize, { Op } from 'sequelize'
import { AppDict } from '../../models/AppDict'

export = {
    'get /app-dict': async function (ctx, next) {
        const {
            where,
            order,
            page = 1,
            size = 20,
        } = QueryParser.parseFilter(ctx.request.query)
        const offset = (page - 1) * size
        const { count, rows } = await AppDict.findAndCountAll({
            where: {
                ...where,
                appId: ctx.clientAppId,
            },
            order,
            offset: offset < 0 ? 0 : offset,
            limit: size,
        })
        ctx.ok(rows)
        ctx.set('X-Total-Count', count)
    },

    'delete /app-dict/:id': async function (ctx, next) {
        const id = ctx.getParam('id')
        const instance = await AppDict.getByPk(id)
        if (!instance) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        await instance.destroy()
        ctx.ok()
    },

    'get /app-dict/search/codes': async function (ctx, next) {
        // ctx.checkRequired('codes')
        const { where } = QueryParser.parseFilter(ctx.request.query)
        const codes = ctx.getParam('codes')
        const list = await AppDict.findAll({
            where: {
                code: {
                    [Op.in]: codes.split(','),
                },
                appId: ctx.clientAppId,
            },
            attributes: {
                exclude: ['appId', ...AuditModelProps], //remark属性有用
            },
            order: [
                ['code', 'asc'],
                ['seq', 'asc'],
            ],
        })
        const dictMap = {}
        for (const model of list) {
            const code = model.dataValues.code
            if (!dictMap[code]) {
                dictMap[code] = []
            }
            dictMap[code].push(model)
        }
        ctx.ok(dictMap)
    },

    'get /app-dict/search/term': async function (ctx, next) {
        const word = ctx.getParam('word')
        const where: any = {
            appId: ctx.clientAppId,
        }
        if (word) {
            where.code = {
                [Op.like]: `${word}%`,
            }
        }
        const codes = await AppDict.findAll({
            attributes: [
                [sequelize.fn('distinct', sequelize.col('code')), 'code'],
            ],
            where,
        })
        const result = codes.map((v) => v.dataValues.code)
        ctx.ok(result)
    },

    'post /app-dict': async function (ctx, next) {
        ctx.checkRequired(['code'])

        let model: AppDict | null = null
        const body = ctx.request.body
        body.appId = ctx.clientAppId
        if (body.id) {
            // 更新
            model = await AppDict.getByPk(body.id)
            if (!model) {
                throw new NebulaBizError(
                    NebulaErrors.BadRequestErrors.DataNotFound
                )
            }
            model.set(body)
            model = await model.save()
        } else {
            model = await AppDict.create(body)
        }
        ctx.ok(model.dataValues)
    },
}
