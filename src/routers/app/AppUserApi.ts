import randomstring from 'randomstring'
import bcrypt from 'bcryptjs'
import { NebulaBizError, NebulaKoaContext, QueryParser } from 'nebulajs-core'
import { UserService } from '../../services/app/UserService'
import { UserErrors } from '../../config/errors'
import { DataStatus, Constants } from '../../config/constants'
import { AppUser } from '../../models/AppUser'
import { AppOrganization } from '../../models/AppOrganization'
import { AppRole } from '../../models/AppRole'
import { IncludeOptions, Op } from 'sequelize'
import { MenuService } from '../../services/app/MenuService'
import { ExcelUtil } from '../../utils/excel-util'
import { ResourceService } from '../../services/app/ResourceService'

export = {
    /**
     * @swagger
     *
     * /app-user/allocate/roles:
     *   post:
     *     summary: 用户分配角色
     *     tags:
     *       - 用户
     *     produces:
     *       - application/json
     *     parameters:
     *     responses:
     *       200:
     *         description: ok
     */
    'post /app-user/allocate/roles': async function (ctx, next) {
        ctx.checkRequired(['userIds', 'roleIds'])
        const { userIds, roleIds } = ctx.request.body
        const roleCodes = await AppRole.findAll({
            attributes: ['code'],
            where: {
                id: { [Op.in]: roleIds },
                appId: ctx.clientAppId,
            },
        })
        await UserService.allocateRoles(
            ctx.clientAppId,
            userIds,
            roleCodes.map((r) => r.code)
        )
        await MenuService.clearMenuNavCache(ctx.clientAppId)
        await ResourceService.clearAppResourceCache(ctx.clientAppId)
        ctx.ok()
    },

    // 'delete /app-user/allocate/roles': async function (ctx, next) {
    //     ctx.checkRequired(['userIds', 'roleIds'])
    //     const { userIds, roleIds } = ctx.request.body
    //     await UserService.allocateRemoveRoles(ctx.clientAppId, userIds, roleIds)
    //     ctx.ok()
    // },

    'post /app-user/allocate/orgs/add': async function (ctx, next) {
        ctx.checkRequired(['userIds', 'orgIds'])
        const { userIds, orgIds } = ctx.request.body
        await UserService.allocateAddOrgs(ctx.clientAppId, userIds, orgIds)
        ctx.ok()
    },

    'post /app-user/allocate/orgs/del': async function (ctx, next) {
        ctx.checkRequired(['userIds', 'orgIds'])
        const { userIds, orgIds } = ctx.request.body
        await UserService.allocateRemoveOrgs(ctx.clientAppId, userIds, orgIds)
        ctx.ok()
    },

    'get /app-user/current': async function (ctx, next) {
        const { login } = ctx.state.user
        const user = await AppUser.findOne({
            where: {
                appId: ctx.clientAppId,
                login,
            },
        })
        ctx.ok(user?.dataValues || null)
    },

    'get /app-user/struct': async function (ctx, next) {
        const ignoreKeys = ['appId', 'createdAt', 'updatedAt']
        const attrs = Object.keys(AppUser.getAttributes())
            .filter((key) => !ignoreKeys.includes(key))
            .map((key) => AppUser.getAttributes()[key])
            .map((attr) => {
                delete attr['_modelAttribute']
                return { ...attr, excelCol: attr['fieldName'] }
            })
        ctx.ok(attrs)
    },

    /**
     * Excel导出
     *  Amis的Bug导致dropdown按钮无法下载，6.1.0已修复
     *  https://github.com/baidu/amis/pull/9554
     * @param ctx
     * @param next
     */
    'get /app-user/exp': async function (ctx: NebulaKoaContext, next) {
        const { where, order, include } = QueryParser.parseFilter(
            ctx.request.query,
            AppUser
        )
        const ignoreAttrs = ['appId', 'password']
        const dataList = await AppUser.findAll({
            where: {
                ...where,
                appId: ctx.clientAppId,
            },
            order,
            include,
        })
        await ExcelUtil.exportExcel(ctx, AppUser, dataList, ignoreAttrs)
    },

    'post /app-user/imp': async function (ctx, next) {
        const { excel, columnMap } = ctx.request.body
        nebula.logger.info('开始导入')
        for (let i = 0; i < excel.length; i++) {
            const data: Partial<AppUser> = {}
            for (const colMap of columnMap) {
                const { fieldName, excelCol } = colMap
                if (excelCol) {
                    data[fieldName] = excel[i][excelCol]
                }
            }
            data.appId = ctx.clientAppId
            await AppUser.upsert(data)
            nebula.logger.info('正在导入 第 %s/%s 行', i + 1, excel.length)
        }
        nebula.logger.info('导入完成')
        ctx.ok()
    },

    'delete /app-user/:id': async function (ctx, next) {
        const id = ctx.getParam('id')
        const user = await AppUser.getByPk(id)
        ctx.checkClientAuth(user)
        if (user.login === Constants.DEFAULT_ADMIN_USER) {
            throw new NebulaBizError(UserErrors.CannotDeleteAdmin)
        }
        await user.destroy()
        ctx.ok()
    },

    'post /app-user/reset-password': async (ctx, next) => {
        ctx.checkRequired(['login'])
        const { login } = ctx.request.body
        const newPassword = randomstring.generate(16)
        const userModel = await UserService.getUserByLoginAndAppId(
            ctx.clientAppId,
            login
        )
        const salt = await bcrypt.genSaltSync(10)
        const newHash = await bcrypt.hashSync(newPassword, salt)
        userModel.set({ password: newHash })
        await userModel.save()
        ctx.ok({ newPassword })
    },

    'post /app-user': async function (ctx, next) {
        ctx.checkRequired(['login'])
        const saved = await UserService.createOrUpdateUser(
            ctx,
            ctx.request.body
        )
        ctx.ok(saved.dataValues)
    },

    'get /app-user': async function (ctx, next) {
        const {
            where,
            order,
            include,
            page = 1,
            size = 20,
        } = QueryParser.parseFilter(ctx.request.query, AppUser)
        const offset = (page - 1) * size
        const { count, rows } = await AppUser.findAndCountAll({
            where: {
                ...where,
                appId: ctx.clientAppId,
            },
            include: [
                {
                    model: AppOrganization,
                    as: 'orgs',
                    attributes: ['id', 'code', 'shortName'],
                    where: (<IncludeOptions>(
                        include.find((inc: IncludeOptions) => inc.as === 'orgs')
                    ))?.where,
                },
                {
                    model: AppRole,
                    as: 'roles',
                    attributes: ['id', 'code', 'name'],
                    where: (<IncludeOptions>(
                        include.find(
                            (inc: IncludeOptions) => inc.as === 'roles'
                        )
                    ))?.where,
                },
            ],
            order: [[{ model: AppRole, as: 'roles' }, 'code', 'asc'], ...order],
            offset: offset < 0 ? 0 : offset,
            limit: size,
        })
        ctx.ok(rows)
        ctx.set('X-Total-Count', count)
    },

    /**
     * @swagger
     *
     * /auth/account/change-password:
     *   post:
     *     summary: 用户更改密码
     *     tags:
     *       - 登录
     *     parameters:
     *       - name: password
     *         in: body
     *         required: true
     *         description: 原密码
     *       - name: newPassword
     *         in: body
     *         required: true
     *         description: 新密码
     *     responses:
     *       200:
     *         description: ok
     */
    'post /app-user/change-password': async function (ctx, next) {
        ctx.checkRequired(['password', 'newPassword'])
        const { login } = ctx.state.user
        const { password, newPassword } = ctx.request.body

        const currUser = await UserService.getUserByLoginAndAppId(
            ctx.clientAppId,
            login
        )

        // 验证旧密码
        const result = await bcrypt.compareSync(password, currUser.password)
        if (!result) {
            throw new NebulaBizError(UserErrors.InvalidPassword)
        }

        const salt = await bcrypt.genSaltSync(10)
        const newHash = await bcrypt.hashSync(newPassword, salt)
        currUser.set({ password: newHash })
        await currUser.save()
        ctx.ok()
    },
}
