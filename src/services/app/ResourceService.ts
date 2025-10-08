import { AppResource } from '../../models/AppResource'
import { AuditModelProps, Cache, DataStatus } from '../../config/constants'
import { TreeUtils } from 'nebulajs-core/lib/utils'
import { TreeNode } from 'nebulajs-core'
import { AppRole } from '../../models/AppRole'
import { Op } from 'sequelize'
import { MenuService } from './MenuService'

export class ResourceService {
    static async getResourceTree(appId, login) {
        const resList = await AppResource.findAll({
            where: {
                [Op.or]: [{ appId }, { isSystem: true }],
            },
            order: [
                ['group', 'asc'],
                ['method', 'asc'],
                ['url', 'asc'],
            ],
            attributes: {
                exclude: AuditModelProps,
            },
        })
        const groupedResIds = new Set()
        const menuTree = await MenuService.getMenuNav(
            appId,
            login,
            false,
            false
        )
        // 递归菜单
        this.recursionFind<
            TreeNode & { schemaFile?: string; visible?: boolean }
        >(menuTree, (node) => {
            if (node.schemaFile) {
                if (!node.children) {
                    node.children = []
                }
                resList
                    .filter((r) => node.schemaFile === r.group)
                    .forEach((res, index) => {
                        node.children.push({
                            //...res,
                            id: res.id,
                            pid: node.id,
                            seq: index,
                            children: [],
                            label: res.name + ':' + res.method + ' ' + res.url,
                        })
                        groupedResIds.add(res.id)
                    })
                if (node.children.length > 0) {
                    //如果查找到资源，显示出这个菜单
                    //visible=false，input-tree不显示
                    node.visible = true
                }
            }
        })

        const ungroupedList = resList
            .filter((res) => !groupedResIds.has(res.id))
            .map((res, index) => {
                return {
                    id: res.id,
                    pid: '0',
                    seq: index,
                    children: [],
                    label: (res.name || '') + ':' + res.method + ' ' + res.url,
                }
            })
        const sysMenu = {
            id: '0',
            label: '基础系统资源',
            pid: null,
            seq: -1,
            children: ungroupedList,
        }
        menuTree.unshift(sysMenu)
        return menuTree
    }

    static recursionFind<T extends TreeNode>(
        menuTree: Array<T> = [],
        iterateFn: (node: T) => void = () => {}
    ) {
        for (const item of menuTree) {
            iterateFn(item)
            this.recursionFind(item.children, iterateFn)
        }
    }
    static async findResourcesByRoleCodes(
        appId,
        roleCodes: string[]
    ): Promise<string[]> {
        const resModels = await AppResource.findAll({
            where: {
                [Op.or]: [{ appId }, { isSystem: true }],
                regexp: {
                    [Op.not]: null,
                },
            },
            include: {
                model: AppRole,
                as: 'roles',
                where: {
                    code: { [Op.in]: roleCodes },
                    appId,
                },
            },
        })
        return resModels.map((r) => {
            return r.method + ' ' + r.regexp.substring(1, r.regexp.length - 2)
        })
    }

    static async clearAppResourceCache(appId) {
        const delKeys = await nebula.redis.keys(Cache.getAppResourceKey(appId))
        if (delKeys.length > 0) {
            await nebula.redis.del(delKeys)
        }
    }
}
