import { AppResource } from '../../models/AppResource'
import { Op } from 'sequelize'
import crypto from 'crypto'
import { ResourceService } from '../../services/app/ResourceService'
import { Cache } from '../../config/constants'
import { UserService } from '../../services/app/UserService'

export = {
    'get /resource/user/:login': async (ctx, next) => {
        let resources = null
        const login = ctx.getParam('login')
        const cacheKey = Cache.getAppUserResourceKey(ctx.clientAppId, login)
        const resCache = await nebula.redis.get(cacheKey)
        if (resCache) {
            resources = JSON.parse(resCache)
        } else {
            const user = await UserService.getUserByLoginAndAppId(
                ctx.clientAppId,
                login
            )
            resources = await ResourceService.findResourcesByRoleCodes(
                ctx.clientAppId,
                user.roles.map((r) => r.code)
            )
            await nebula.redis.setex(
                cacheKey,
                3600 * 4,
                JSON.stringify(resources)
            )
        }

        ctx.ok(resources)
    },

    /**
     * 客户端向云端同步资源
     * @param ctx
     * @param next
     */
    'post /resource/sync': async (ctx, next) => {
        let { resources = [] } = ctx.request.body
        // 查询所有资源
        const existResIds = await AppResource.findAll({
            where: {
                appId: ctx.clientAppId,
            },
            attributes: ['id'],
        })
        const existResIdsSet = new Set<string>(existResIds.map((r) => r.id))
        const transaction = await nebula.sequelize.transaction()
        try {
            for (const r of resources) {
                const res: AppResource = r
                if (res.url.startsWith('/app/')) {
                    res.isSystem = true
                }
                const [model, ret] = await AppResource.upsert(
                    {
                        ...res,
                        appId: ctx.clientAppId,
                    },
                    {
                        transaction,
                        logging: false,
                    }
                )

                // 删除已处理的资源Key
                existResIdsSet.delete(res.id)
            }

            // 删除未更新的剩余资源
            existResIdsSet.size > 0 &&
                (await AppResource.destroy({
                    where: {
                        appId: ctx.clientAppId,
                        id: {
                            [Op.in]: Array.from(existResIdsSet),
                        },
                    },
                    transaction,
                }))

            nebula.logger.info(
                '同步应用资源成功，应用：%s，同步资源：%s，删除资源：%s',
                ctx.clientApp.code,
                resources.length,
                existResIdsSet.size
            )
            await transaction.commit()
        } catch (e) {
            await transaction.rollback()
            throw e
        }
        ctx.ok()
    },
}
