import { ApplicationService } from './ApplicationService'
import fs from 'fs'
import ejs from 'ejs'
import path from 'path'
import { ClApplication } from '../models/ClApplication'
import { MessageService } from './app/MessageService'
import { ClJobExecution } from '../models/ClJobExecution'
import { Job } from '@hokify/agenda'
import { NebulaBizError } from 'nebulajs-core'
import { ApplicationErrors, UserErrors } from '../config/errors'
import { JobStatus } from '../config/constants'
import { extensions } from 'sequelize/types/utils/validator-extras'
import moment from 'moment'
import { v4 as uuidv4 } from 'uuid'

export class JobService {
    public static JOBS_PATH = './jobs'

    static async deleteJobScript(appId, job: Job<{ scriptPath }>) {
        const appModel = await ClApplication.getByPk(appId)
        const { code } = appModel.dataValues
        const scriptPath = job.attrs.data.scriptPath
        const scriptName = scriptPath
            .replace(/\.ts$/, '')
            .replace(/\.js$/, '')
            .replace(/\.js\.map$/, '')
        const appSrcPath = ApplicationService.getAppDataSrcPath(code)
        const extensions = ['.ts', '.js', '.js.map']
        extensions.forEach((ext) => {
            const jobTsFile =
                path.join(appSrcPath, this.JOBS_PATH, scriptName) + ext
            fs.existsSync(jobTsFile) && fs.unlinkSync(jobTsFile)
        })
    }

    static async createJobScript(appId, job: Job<{ scriptPath }>) {
        const scriptPath = job.attrs.data.scriptPath
        const tplFolder = ApplicationService.getAppTemplatePath('base')
        const tpl = scriptPath.endsWith('.ts')
            ? fs.readFileSync(path.join(tplFolder, 'job.ts.ejs'))
            : fs.readFileSync(path.join(tplFolder, 'job.js.ejs'))
        const appModel = await ClApplication.getByPk(appId)
        const appSrcFolder = ApplicationService.getAppDataSrcPath(appModel.code)
        const appJobFolder = path.join(appSrcFolder, this.JOBS_PATH)
        !fs.existsSync(appJobFolder) && fs.mkdirSync(appJobFolder)
        const jobFile = path.join(appJobFolder, scriptPath)
        if (!fs.existsSync(jobFile)) {
            // throw new NebulaBizError(ApplicationErrors.JobScriptExist)
            const text = ejs.render(tpl.toString(), job.attrs, {})
            fs.writeFileSync(jobFile, text)
        }
    }

    static defineRemoteJob(jobName) {
        // runClientJobAllEnv不能用this
        nebula.scheduler.define(jobName, JobService.runClientJob, {
            concurrency: 5, //并发数
        })
    }

    static async runClientJob(job: Job<{ env; appId; appCode }>) {
        nebula.logger.info(
            `[${job.attrs?.data?.appCode}] 运行应用任务，job: %s, env: %s`,
            job.attrs?.name,
            job.attrs?.data?.env
        )

        const envList = (job.attrs.data.env || '').split(',').filter((e) => e)
        const appId = job.attrs.data.appId
        const jobId = job.attrs._id.toHexString()
        const jobExecutions = await ClJobExecution.findAll({
            where: {
                jobId,
                appId,
                status: JobStatus.RUNNING,
            },
        })

        // 分环境处理
        for (const env of envList) {
            await JobService.runClientJobByEnv(job, {
                appCode: job.attrs.data.appCode,
                env,
                jobExecutions,
            })
        }
    }

    static async runClientJobByEnv(job, { appCode, env, jobExecutions }) {
        nebula.logger.info(
            `[${job.attrs?.data?.appCode}] 分环境运行客户端任务，env: ${env}，job: %o`,
            job.attrs
        )
        const name = job.attrs.name
        const appId = job.attrs.data.appId
        const jobId = job.attrs._id.toHexString()
        const timestamp = moment().format('YYYYMMDDHHmmss')
        const logTimestamp = moment().format('YYYY-MM-DD HH:mm:ss')
        const logPath = `logs/jobs/${appCode}`
        const logDir = path.join(process.cwd(), logPath)
        const logfileName = `${name}-${env.toUpperCase()}-${timestamp}.log`
        const logfile = path.join(logDir, logfileName)

        !fs.existsSync(logDir) && fs.mkdirSync(logDir, { recursive: true })

        // 判断应用是否在线
        if (!MessageService.isClientOnline(appId, env)) {
            throw new NebulaBizError(ApplicationErrors.JobClientIsNotOnline)
        }

        // 判断上次是否在运行
        if (jobExecutions.find((ex) => ex.env === env)) {
            await ClJobExecution.create({
                appId,
                jobId,
                name: `${job.attrs.data.name}`,
                env,
                status: JobStatus.FINISHED,
                startTime: moment().toDate(),
                remark: job.attrs.data.remark,
                result: false,
                logfile: path.join(logPath, logfileName),
            })
            fs.writeFileSync(
                logfile,
                `[${logTimestamp}] 上一次运行未结束，取消运行。 名称：${name}，环境：${env}`
            )
            return
        }

        // 执行
        const execModel = await ClJobExecution.create({
            appId,
            jobId,
            name: `${job.attrs.data.name}`,
            env,
            status: JobStatus.RUNNING, // 运行中
            startTime: moment().toDate(),
            remark: job.attrs.data.remark,
            logfile: path.join(logPath, logfileName),
        })
        fs.writeFileSync(logfile, '')

        MessageService.sendClientMessage('RunJob', appId, env, {
            ...job.attrs,
            executionId: execModel.id,
        })
    }

    static async createdJob({
        name,
        cron,
        remark,
        scriptPath,
        env,
        appId,
    }): Promise<Job<{ name; appId; appCode; env; scriptPath; remark }>> {
        // const jobs = await nebula.scheduler.jobs({
        //     'data.name': name,
        //     'data.appId': appId,
        // })
        // if(jobs.length > 0){
        //     throw new NebulaBizError(ApplicationErrors)
        // }

        const appModel = await ClApplication.getByPk(appId)
        const jobName =
            appModel.code +
            '-' +
            scriptPath
                .replace(/[\/]/g, '-')
                .replace(/\.ts$/, '')
                .replace(/\.js$/, '')

        // 定义
        JobService.defineRemoteJob(jobName)

        // 创建Job
        const job = await nebula.scheduler.every(
            cron,
            jobName,
            {
                name,
                appId,
                appCode: appModel.code,
                env,
                scriptPath,
                remark,
            },
            {
                skipImmediate: true,
            }
        )
        job.disable()
        await job.save()

        return job
    }
}
