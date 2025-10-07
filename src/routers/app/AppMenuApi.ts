import {
    NebulaKoaContext,
    NebulaErrors,
    QueryParser,
    NebulaBizError,
} from 'nebulajs-core'
import {
    Cache,
    AuditModelProps,
    ForbiddenUpdateAppModelProps,
} from '../../config/constants'
import { MenuService } from '../../services/app/MenuService'
import { Op } from 'sequelize'
import { AppMenu } from '../../models/AppMenu'
import { ClPage } from '../../models/ClPage'
import { TreeUtils } from 'nebulajs-core/lib/utils'
import { SystemManageErrors } from '../../config/errors'

export = {
    /**
     * @swagger
     *
     * /app-menu/nav:
     *   post:
     *     summary: 获取应用菜单
     *     tags:
     *       - 菜单
     *     produces:
     *       - application/json
     *     parameters:
     *     responses:
     *       200:
     *         description: ok
     */
    'get /app-menu/nav': async function (ctx, next) {
        const { login } = ctx.state.user
        const key = Cache.getAppUserMenuNavKey(ctx.clientAppId, login)
        let navCache: any = await nebula.redis.get(key)
        if (!navCache) {
            const groups = await MenuService.getMenuNav(ctx.clientAppId, login)
            if (groups.length > 0) {
                navCache = {
                    pages: groups,
                }
                await nebula.redis.setex(
                    key,
                    3600 * 4,
                    JSON.stringify(navCache)
                )
            }
        } else {
            navCache = JSON.parse(navCache)
        }
        ctx.ok(navCache)
    },

    'get /app-menu/tree': async function (ctx, next) {
        const treeList = await MenuService.getMenuTree(ctx.clientAppId)
        ctx.ok({
            pages: treeList,
        })
    },

    'post /app-menu': async function (ctx, next) {
        let model: AppMenu = null
        const body = ctx.request.body
        if (body.id) {
            // 更新
            model = await AppMenu.getByPk(body.id)
            if (!model) {
                throw new NebulaBizError(
                    NebulaErrors.BadRequestErrors.DataNotFound
                )
            }
            if (model.isSystem) {
                return ctx.bizError(SystemManageErrors.InnerMenuCannotBeUpdated)
            }
            // 验证Client权限
            ctx.checkClientAuth(model)
            // 去掉不可更新字段
            ForbiddenUpdateAppModelProps.forEach((p) => delete body[p])
            model.set(body)
            model = await model.save()
        } else {
            model = await AppMenu.create({ ...body, appId: ctx.clientAppId })
        }

        await MenuService.clearMenuNavCache(ctx.clientAppId)
        ctx.ok(model.dataValues)
    },

    'post /app-menu/bind': async function (ctx, next) {
        ctx.checkRequired(['menuId', 'pageId'])
        const id = ctx.getParam('menuId')
        const pageId = ctx.getParam('pageId')
        const model = await AppMenu.getByPk(id)
        const page = await ClPage.getByPk(pageId)
        if (!model || !page) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        if (model.isSystem) {
            return ctx.bizError(SystemManageErrors.InnerMenuCannotBeUpdated)
        }
        ctx.checkClientAuth(model)

        model.set({ url: page.url })
        const updated = await model.save()

        await MenuService.clearMenuNavCache(ctx.clientAppId)
        ctx.ok(updated.dataValues)
    },

    'post /app-menu/unbind': async function (ctx, next) {
        ctx.checkRequired(['menuId'])
        const id = ctx.getParam('menuId')
        const model = await AppMenu.getByPk(id)
        if (!model) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        if (model.isSystem) {
            return ctx.bizError(SystemManageErrors.InnerMenuCannotBeUpdated)
        }
        ctx.checkClientAuth(model)

        model.set({ url: null })
        const updated = await model.save()

        await MenuService.clearMenuNavCache(ctx.clientAppId)
        ctx.ok(updated.dataValues)
    },

    /**
     * 删除本菜单，并删除子菜单
     * @param ctx
     * @param next
     * @returns {Promise<void>}
     */
    'delete /app-menu/:id': async function (ctx, next) {
        ctx.checkRequired('id')
        const id = ctx.getParam('id')
        const model = await AppMenu.getByPk(ctx.params.id)
        if (!model) {
            return ctx.bizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        if (model.isSystem) {
            return ctx.bizError(SystemManageErrors.InnerMenuCannotBeUpdated)
        }
        ctx.checkClientAuth(model)

        const list = (
            await AppMenu.findAll({
                where: {
                    appId: ctx.clientAppId,
                },
                attributes: {
                    exclude: AuditModelProps,
                },
            })
        ).map((item) => item.dataValues as any)
        const tree = TreeUtils.getTreeObject(id, list)
        const treeIds = TreeUtils.getTreeChildrenIds(tree)
        treeIds.push(tree.id)

        await AppMenu.destroy({
            where: {
                id: treeIds,
            },
            individualHooks: true,
        })

        await MenuService.clearMenuNavCache(ctx.clientAppId)

        ctx.ok()
    },

    'get /app-menu': async function (ctx, next) {
        const {
            where,
            order,
            page = 1,
            size = 20,
        } = QueryParser.parseFilter(ctx.request.query)
        const offset = (page - 1) * size
        const { count, rows } = await AppMenu.findAndCountAll({
            where: {
                ...where,
                [Op.or]: [{ appId: ctx.clientAppId }, { isSystem: true }],
            },
            order,
            offset: offset < 0 ? 0 : offset,
            limit: size,
        })
        ctx.ok(rows)
        ctx.set('X-Total-Count', count)
    },
}
