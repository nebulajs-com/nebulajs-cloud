import {
    Cache,
    AuditModelProps,
    Constants,
    DataStatus,
} from '../../config/constants'
import { Op } from 'sequelize'
import { UserService } from './UserService'
import { RoleService } from './RoleService'
import { ClPage } from '../../models/ClPage'
import { AppMenu } from '../../models/AppMenu'
import { TreeUtils } from 'nebulajs-core/lib/utils'
import { NebulaBizError, TreeNode } from 'nebulajs-core'
import { UserErrors } from '../../config/errors'

export class MenuService {
    /**
     * 获取系统菜单
     * @param appId
     * @param login
     * @param group
     * @param defaultPage
     * @returns
     */
    static async getMenuNav(
        appId: string,
        login: string,
        group: boolean = true,
        defaultPage: boolean = true
    ) {
        const userModel = await UserService.getUserByLoginAndAppId(appId, login)
        if (userModel && userModel.status !== DataStatus.ENABLED) {
            throw new NebulaBizError(UserErrors.InvalidUser)
        }

        // 没匹配到用户，但是有token，则以客人身份获取菜单
        // 只能获取到未绑定菜单的页面
        const userRoleCodes = userModel
            ? userModel.roles.map((r) => r.code)
            : []
        const menuIds = await this.getMenuIdsByRoleCodes(appId, userRoleCodes)

        // 1.查询本应用所有页面列表
        let pageList = (
            await ClPage.findAll({
                where: {
                    [Op.or]: [{ appId }, { isSystem: true }],
                },
                attributes: [
                    'id',
                    'menuId',
                    'name',
                    'url',
                    'schemaFile',
                    'isSystem',
                ],
            })
        )
            .filter((item) => !item.menuId || menuIds.has(item.menuId))
            .map((item) => {
                const schemaApi = item.isSystem
                    ? `cloud/app/app-page/schema/${item.id}`
                    : `schema/${item.schemaFile}`
                return {
                    id: item.id,
                    menuId: item.menuId,
                    isPage: true,
                    label: item.name,
                    url: item.url,
                    schemaFile: item.schemaFile,
                    schemaApi,
                    visible: false, // 页面级都属于隐藏菜单
                }
            })

        // 2.查询本应用所有菜单列表
        const menuList = (
            await AppMenu.findAll({
                where: {
                    [Op.or]: [{ appId }, { isSystem: true }],
                },
                attributes: {
                    exclude: [...AuditModelProps, 'appId'],
                },
                order: [['seq', 'asc']],
            })
        )
            .filter(
                (item) =>
                    userRoleCodes.includes(Constants.ROLE_ADMIN) ||
                    menuIds.has(item.id)
            )
            .map((item) => item.dataValues)

        // 3.菜单成树并将菜单和页面进行匹配
        let treeList = TreeUtils.getTreeList<TreeNode & { group?: string }>(
            menuList,
            (menu: any) => {
                // 查找与菜单URL匹配的页面
                const pageIndex = pageList.findIndex((p) => p.url === menu.url)
                if (pageIndex >= 0) {
                    const page = pageList[pageIndex]
                    menu.schemaFile = page.schemaFile
                    menu.schemaApi = page.schemaApi
                    menu.className = 'has-multi-pages'
                    // 删除URL已匹配的页面，转换为菜单
                    pageList.splice(pageIndex, 1)
                }
            }
        ).concat(pageList as any[])

        // 4.菜单分组
        if (group) {
            treeList = this.groupMenuNav(treeList)
        }

        // 5.添加默认页
        if (defaultPage) {
            ;(treeList[0].children as Array<any>).push({
                id: '1',
                isPage: true,
                isDefaultPage: true,
                label: '默认页',
                url: '/',
                schemaApi: `schema/index.json`,
                visible: false,
            })
        }

        return treeList
    }

    static async getMenuIdsByRoleCodes(appId, roleCodes: string[]) {
        // 管理员
        if (roleCodes.includes(Constants.ROLE_ADMIN)) {
            const models = await AppMenu.findAll({
                where: {
                    [Op.or]: [{ appId: appId }, { isSystem: true }],
                },
                attributes: ['id'],
            })
            return new Set(models.map((m) => m.id))
        }

        const roleList = await RoleService.findRolesByCodesWithMenus(
            appId,
            roleCodes
        )
        let menuIds = []
        roleList.forEach((item) => {
            menuIds = menuIds.concat(item.menus.map((m) => m.id))
        })
        return new Set(menuIds)
    }

    static groupMenuNav<T extends TreeNode>(
        treeList: Array<T & { group?: string }>
    ) {
        //添加分组
        const defaultGroup = {
            label: '默认分组',
            children: [],
            id: null,
            pid: null,
        }
        const groups = [defaultGroup]
        for (let menu of treeList) {
            if (menu.group) {
                let group = groups.find((g) => g.label === menu.group)
                if (!group) {
                    groups.push({
                        label: menu.group,
                        children: [menu],
                        id: null,
                        pid: null,
                    })
                } else {
                    group.children.push(menu)
                }
            } else {
                defaultGroup.children.push(menu)
            }
        }
        return groups
    }

    static async clearMenuNavCache(appId) {
        const delKeys = await nebula.redis.keys(Cache.getAppMenuNavKey(appId))
        if (delKeys.length > 0) {
            await nebula.redis.del(delKeys)
        }
    }

    static async getMenuTree(appId) {
        const list = (
            await AppMenu.findAll({
                where: {
                    [Op.or]: [{ appId }, { isSystem: true }],
                },
                order: [['seq', 'asc']],
                attributes: {
                    exclude: AuditModelProps,
                },
            })
        ).map((item) => item.dataValues as any)
        return TreeUtils.getTreeList(list, (item: any) => {
            item.value = item.id
        })
    }
}
