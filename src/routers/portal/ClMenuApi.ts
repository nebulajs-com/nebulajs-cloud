import { MenuService } from '../../services/app/MenuService'

export = {
    'get /cl-menu/tree': async (ctx, next) => {
        const treeList = await MenuService.getMenuTree(ctx.appId)
        ctx.ok({
            pages: treeList,
        })
    },
}
