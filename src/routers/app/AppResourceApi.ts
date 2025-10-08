import { ResourceService } from '../../services/app/ResourceService'

export = {
    'get /app-resource/tree': async function (ctx, next) {
        const { login } = ctx.state.user
        const treeList = await ResourceService.getResourceTree(
            ctx.clientAppId,
            login
        )
        ctx.ok(treeList)
    },
}
