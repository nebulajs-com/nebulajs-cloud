import {
    NebulaBizError,
    NebulaErrors,
    NebulaKoaContext,
    QueryParser,
} from 'nebulajs-core'
import { JobService } from '../../services/JobService'
import { ClApplication } from '../../models/ClApplication'
import { ObjectId } from 'mongodb'
import { Job } from '@hokify/agenda'
import { ClJobExecution } from '../../models/ClJobExecution'
import path from 'path'
import { CommonUtil } from '../../utils/common-util'

export = {
    'get /cl-job': async (ctx, next) => {
        const {
            order,
            page = 1,
            size = 20,
        } = QueryParser.parseFilter(ctx.request.query)
        const offset = (page - 1) * size
        const list =
            (await nebula.scheduler?.jobs(
                { 'data.appId': ctx.appId },
                {},
                size,
                offset < 0 ? 0 : offset
            )) || []
        const jobList = list.map(
            (job: Job<{ appCode; appId; env; remark; scriptPath; name }>) => {
                const { env = '', remark, scriptPath } = job.attrs.data
                return {
                    id: job.attrs._id,
                    disabled:
                        job.attrs.disabled !== undefined
                            ? job.attrs.disabled
                            : false,
                    // envs,
                    ...job.attrs,
                    name: job.attrs.data?.name || job.attrs.name,
                    env: env,
                    cron: job.attrs.repeatInterval,
                    remark,
                    scriptPath,
                }
            }
        )
        ctx.ok(jobList)
        ctx.set('X-Total-Count', jobList.length)
    },

    'post /cl-job': async (ctx, next) => {
        ctx.checkRequired(['name', 'cron', 'scriptPath'])
        const body = ctx.request.body
        const { name, cron, remark, env = [] } = body
        let { scriptPath } = body
        if (!scriptPath.endsWith('.ts') && !scriptPath.endsWith('.js')) {
            scriptPath += '.ts'
        }

        const job = await JobService.createdJob({
            name,
            cron,
            remark,
            scriptPath,
            env,
            appId: ctx.appId,
        })

        // 编辑脚本
        await JobService.createJobScript(ctx.appId, job)

        ctx.ok(job.attrs)
    },

    'put /cl-job': async (ctx, next) => {
        ctx.checkRequired(['id', 'name', 'cron', 'scriptPath'])
        const body = ctx.request.body
        const { id, name, cron, remark, env = [] } = body
        let { scriptPath } = body
        if (!scriptPath.endsWith('.ts') && !scriptPath.endsWith('.js')) {
            scriptPath += '.ts'
        }
        const jobs = await nebula.scheduler.jobs({
            _id: new ObjectId(id),
            'data.appId': ctx.appId,
        })
        if (jobs.length === 0) {
            throw new NebulaBizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }

        jobs[0].disable()
        jobs[0].attrs.data.name = name
        jobs[0].attrs.data.scriptPath = scriptPath
        jobs[0].attrs.data.env = env
        jobs[0].attrs.data.remark = remark
        await jobs[0].save()
        ctx.ok()
    },

    'get /cl-job/:id/executions': async (ctx, next) => {
        const jobId = ctx.getParam('id')
        const appId = ctx.appId
        const {
            where,
            order,
            page = 1,
            size = 20,
        } = QueryParser.parseFilter(ctx.request.query)
        const offset = (page - 1) * size
        const { count, rows } = await ClJobExecution.findAndCountAll({
            where: {
                ...where,
                appId,
                jobId,
            },
            order,
            offset: offset < 0 ? 0 : offset,
            limit: size,
        })
        ctx.ok(rows)
        ctx.set('X-Total-Count', count)
    },

    'get /cl-job/start/:id': async (ctx, next) => {
        const id = ctx.getParam('id')
        const jobs = await nebula.scheduler.jobs({
            _id: new ObjectId(id),
            'data.appId': ctx.appId,
        })
        if (jobs.length === 0) {
            throw new NebulaBizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        jobs[0].enable()
        await jobs[0].save()
        ctx.ok()
    },

    'post /cl-job/run/:id': async (ctx, next) => {
        const id = ctx.getParam('id')
        const jobs = await nebula.scheduler.jobs({
            _id: new ObjectId(id),
            'data.appId': ctx.appId,
        })
        if (jobs.length === 0) {
            throw new NebulaBizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        await jobs[0].run()
        ctx.ok()
    },

    'get /cl-job/stop/:id': async (ctx, next) => {
        const id = ctx.getParam('id')
        const jobs = await nebula.scheduler.jobs({
            _id: new ObjectId(id),
            'data.appId': ctx.appId,
        })
        if (jobs.length === 0) {
            throw new NebulaBizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        jobs[0].disable()
        await jobs[0].save()
        ctx.ok()
    },

    'delete /cl-job/:id': async (ctx, next) => {
        const id = ctx.getParam('id')
        const jobs = await nebula.scheduler.jobs({
            _id: new ObjectId(id),
            'data.appId': ctx.appId,
        })
        if (jobs.length === 0) {
            throw new NebulaBizError(NebulaErrors.BadRequestErrors.DataNotFound)
        }
        await jobs[0].remove()
        await jobs[0].save()

        const transaction = await nebula.sequelize.transaction()
        try {
            await ClJobExecution.destroy({
                where: {
                    appId: ctx.appId,
                    jobId: id,
                },
                transaction,
            })
            // 删除脚本
            await JobService.deleteJobScript(
                ctx.appId,
                jobs[0] as Job<{ scriptPath: string }>
            )
            await transaction.commit()
        } catch (e) {
            await transaction.rollback()
            throw e
        }
        ctx.ok()
    },

    'get /cl-job/execution/:id/log': async (ctx: NebulaKoaContext, next) => {
        const id = ctx.getParam('id')
        const instance = await ClJobExecution.getByPk(id)
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
