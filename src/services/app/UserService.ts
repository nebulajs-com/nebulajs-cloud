import { NebulaBizError, NebulaErrors, NebulaKoaContext } from 'nebulajs-core'
import bcrypt from 'bcryptjs'
import { Sequelize, Op } from 'sequelize'
import {
    Constants,
    DataStatus,
    ForbiddenUpdateAppModelProps,
} from '../../config/constants'
import { AppUser } from '../../models/AppUser'
import { AppUserOrganization } from '../../models/AppUser'
import { AppRole } from '../../models/AppRole'
import { AppOrganization } from '../../models/AppOrganization'
import { UserErrors } from '../../config/errors'

export class UserService {
    static async saveOrgByCodeAndAppId(appId, body) {
        const {
            id,
            code,
            name,
            shortName,
            parentId,
            status,
            seq,
            type,
            isComp,
        } = body
        const [org] = await AppOrganization.findOrBuild({
            where: {
                appId,
                code,
            },
            defaults: {
                appId,
                code,
            },
        })
        org.set({ id, name, shortName, parentId, status, seq, type, isComp })
        org.dataValues.id = id // set方法id属性不生效，手动赋值
        return await org.save()
    }

    static async saveUserByLoginAndAppId(appId, body) {
        const {
            id,
            login,
            name,
            email,
            mobile,
            avatar,
            deptId,
            position,
            status,
        } = body
        const [user] = await AppUser.findOrBuild({
            where: {
                appId,
                login,
            },
            defaults: {
                appId,
                login,
            },
        })
        user.set({ id, name, email, mobile, avatar, deptId, position, status })
        user.dataValues.id = id // set方法id属性不生效，手动赋值
        return await user.save()
    }

    /**
     * 根据ID创建或更新用户
     * @param ctx
     * @param body
     */
    static async createOrUpdateUser(
        ctx: NebulaKoaContext,
        body
    ): Promise<AppUser> {
        const appId = ctx.clientAppId
        const { id, login, name, email, avatar, deptId, position } = body
        const user = await UserService.getUserByLoginAndAppId(appId, login)
        let model: AppUser = null

        if (id) {
            // 更新
            model = await AppUser.getByPk(id)
            if (!model) {
                throw new NebulaBizError(
                    NebulaErrors.BadRequestErrors.DataNotFound
                )
            }
            if (user && user.dataValues.login !== model.dataValues.login) {
                throw new NebulaBizError(UserErrors.UserLoginExist)
            }
            // 验证Client权限
            ctx.checkClientAuth(model)
            // 去掉不可更新字段
            ForbiddenUpdateAppModelProps.forEach((p) => delete body[p])
            model.set({ name, login, email, avatar, deptId, position })
            model = await model.save()
        } else {
            // 新增
            if (user) {
                throw new NebulaBizError(UserErrors.UserLoginExist)
            }

            const defaultPwd = '12345678'
            const salt = await bcrypt.genSaltSync(10)
            const hash = await bcrypt.hashSync(defaultPwd, salt)
            model = await AppUser.create(
                {
                    appId,
                    password: hash,
                    login,
                    name,
                    email,
                    avatar,
                    deptId,
                    position,
                },
                {}
            )
        }
        return model
    }

    /**
     * 查询应用用户 //TODO 后续做缓存
     * @param appId
     * @param login
     */
    static async getUserByLoginAndAppId(appId, login): Promise<AppUser | null> {
        const model = await AppUser.findOne({
            where: {
                appId,
                login,
            },
            include: [
                {
                    model: AppRole,
                    as: 'roles',
                    attributes: ['id', 'code'],
                },
            ],
        })
        return model
    }

    /**
     * 移出组织
     * @param appId
     * @param userIds
     * @param orgIds
     */
    static async allocateRemoveOrgs(appId, userIds, orgIds) {
        const models = await AppUser.findAll({
            where: {
                id: { [Op.in]: userIds },
                appId,
            },
            include: {
                model: AppOrganization,
                as: 'orgs',
            },
        })
        const orgModels = await AppOrganization.findAll({
            where: {
                id: { [Op.in]: orgIds },
                appId,
            },
        })
        for (const um of models) {
            const modelOrgIds = um.orgs.map((r) => r.id)
            for (const om of orgModels) {
                if (modelOrgIds.includes(om.dataValues.id)) {
                    await um.removeOrg(om)
                }
            }
        }
    }

    /**
     * 增加组织
     * @param appId
     * @param userIds
     * @param orgIds
     */
    static async allocateAddOrgs(appId, userIds, orgIds) {
        const models = await AppUser.findAll({
            where: {
                id: { [Op.in]: userIds },
                appId,
            },
            include: {
                model: AppOrganization,
                as: 'orgs',
            },
        })
        const orgModels = await AppOrganization.findAll({
            where: {
                id: { [Op.in]: orgIds },
                appId,
            },
        })
        for (const m of models) {
            const modelOrgIds = m.orgs.map((r) => r.id)
            for (const om of orgModels) {
                if (!modelOrgIds.includes(om.dataValues.id)) {
                    await m.addOrg(om)
                }
            }
        }
    }

    /**
     * 增加或删除组织（删除并覆盖现有组织）
     * @param appId
     * @param userIds
     * @param orgCodes
     */
    static async allocateOrgs(appId, userIds, orgCodes) {
        const userModels = await AppUser.findAll({
            where: {
                id: { [Op.in]: userIds },
                appId,
            },
            include: {
                model: AppOrganization,
                as: 'orgs',
            },
        })
        const orgModels = await AppOrganization.findAll({
            where: {
                code: { [Op.in]: orgCodes },
                appId,
            },
        })
        for (const um of userModels) {
            await um.setOrgs(orgModels)
        }
        return userModels
    }

    /**
     * 增加或删除角色（删除并覆盖现有角色）
     * @param appId
     * @param userIds
     * @param roleCodes
     */
    static async allocateRoles(appId, userIds, roleCodes) {
        const userModels = await AppUser.findAll({
            where: {
                id: { [Op.in]: userIds },
                appId,
            },
            include: {
                model: AppRole,
                as: 'roles',
            },
        })
        if (userModels.find((u) => u.login === Constants.DEFAULT_ADMIN_USER)) {
            throw new NebulaBizError(UserErrors.CannotAllocateRoleForAdmin)
        }
        const roleModels = await AppRole.findAll({
            where: {
                code: { [Op.in]: roleCodes },
                appId,
            },
        })
        for (const um of userModels) {
            await um.setRoles(roleModels)
        }
        return userModels
    }

    /**
     * 创建管理员和角色
     * @param appId
     * @param transaction
     */
    static async createDefaultAdminAndRole(appId, transaction) {
        const salt = await bcrypt.genSaltSync(10)
        const passwordHash = await bcrypt.hashSync(
            Constants.DEFAULT_ADMIN_PASSWORD,
            salt
        )
        const [userModel] = await AppUser.findOrCreate({
            where: {
                login: Constants.DEFAULT_ADMIN_USER,
                password: passwordHash,
                appId,
            },
            transaction,
        })
        const [roleModel] = await AppRole.findOrCreate({
            where: {
                code: Constants.ROLE_ADMIN,
                name: '管理角色',
                appId,
            },
            transaction,
        })

        await userModel.addRole(roleModel, { transaction })
        // await userModel.save({transaction})
    }
}
