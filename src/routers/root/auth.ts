import { NebulaBizError, NebulaErrors, NebulaKoaContext } from 'nebulajs-core'
import { ApplicationErrors, UserErrors } from '../../config/errors'
import { UserService } from '../../services/app/UserService'
import { AuthUtils } from 'nebulajs-core/lib/utils'
import { Constants, Cookies } from '../../config/constants'
import bcrypt from 'bcryptjs'
import randomstring from 'randomstring'
import { GiteeClient } from '../../services/client/GiteeClient'
import { AppUser } from '../../models/AppUser'

const pkg = require('../../../package.json')
const OAuthModel = require('../../oauth/oauth-model')

module.exports = {
    /**
     * @swagger
     *
     * /auth/login:
     *   post:
     *     summary: 登录
     *     tags:
     *       - 登录
     *     parameters:
     *       - name: username
     *         in: body
     *         required: true
     *         description: 用户名
     *       - name: password
     *         in: body
     *         required: true
     *         description: 密码
     *       - name: redirect
     *         in: body
     *         required: false
     *         description: 重定向链接
     *     responses:
     *       200:
     *         description: ok
     *       401:
     *         description: 登录失败
     */
    'post /auth/login': async (ctx, next) => {
        ctx.checkRequired(['username', 'password'])
        const { username, password, rememberMe, redirect } = ctx.request.body
        let loginRes = null
        try {
            loginRes = await nebula.sdk.auth.sendPasswordGrant(
                username,
                password
            )
        } catch (e) {
            if (e.status === 403) {
                throw new NebulaBizError(
                    NebulaErrors.AuthenticateErrors.AccessForbidden,
                    e.message
                )
            }
            throw new NebulaBizError(
                NebulaErrors.AuthenticateErrors.InvalidUsernameOrPassword,
                e.message
            )
        }
        nebula.logger.info('登录结果：%o', loginRes)

        // 登陆完成
        const { access_token, refresh_token } = loginRes
        ctx.cookies.set(Cookies.ACCESS_TOKEN, access_token, {
            path: '/',
            httpOnly: false,
        })
        ctx.cookies.set(Cookies.REFRESH_TOKEN, refresh_token, {
            path: '/',
            httpOnly: false,
        })
        ctx.ok({ ...loginRes, redirect })
    },

    /**
     * @swagger
     *
     * /auth/logout:
     *   get:
     *     summary: 直接调用平台端登出
     *     tags:
     *       - 登录
     *     parameters:
     *     responses:
     *       200:
     *         description: ok
     */
    'get /auth/logout': async function (ctx, next) {
        ctx.cookies.set(Cookies.ACCESS_TOKEN, null)
        ctx.cookies.set(Cookies.REFRESH_TOKEN, null)
        ctx.ok({ loginURL: '/login' })
    },

    /**
     * @swagger
     *
     * /auth/account:
     *   get:
     *     summary: 获取SSO登录当前用户
     *     tags:
     *       - 登录
     *     parameters:
     *     responses:
     *       200:
     *         description: ok
     */
    'get /auth/account': async function (ctx, next) {
        const { login } = ctx.state.user
        // const { ClUser } = nebula.sequelize.models
        // const account = await ClUser.getByUniqueKey('login', login)

        const user = await nebula.cas.getUser(login)
        ctx.ok(user)

        // ctx.ok(account.dataValues)
    },

    'get /oauth/authorize/gitee': async (ctx, next) => {
        const { gitee } = nebula.config.socialSSO
        const { clientId, redirectURI } = gitee
        const redirect =
            'https://gitee.com/oauth/authorize' +
            `?client_id=${clientId}` +
            `&redirect_uri=${encodeURI(redirectURI)}&response_type=code`
        ctx.redirect(redirect)
    },

    'get /oauth/callback/gitee': async (ctx, next) => {
        const { code } = ctx.request.query
        const { gitee } = nebula.config.socialSSO
        const { baseURL, redirectURI, clientId, clientSecret } = gitee
        const utils = new GiteeClient({
            baseURL,
            redirectURI: encodeURI(redirectURI),
            clientId,
            clientSecret,
        })
        const { access_token } = await utils.getAccessToken({
            code,
        })
        const { id, login, name, avatar_url } = await utils.getUserInfo(
            access_token
        )
        const nebulaLogin = 'gitee_' + login
        let user = await UserService.getUserByLoginAndAppId(
            Constants.NEBULA_APP_ID,
            nebulaLogin
        )
        if (!user) {
            const defaultPwd = randomstring.generate(8)
            const salt = await bcrypt.genSaltSync(10)
            const hash = await bcrypt.hashSync(defaultPwd, salt)
            user = await AppUser.create(
                {
                    appId: Constants.NEBULA_APP_ID,
                    password: hash,
                    login: nebulaLogin,
                    name,
                    avatar: avatar_url,
                },
                {}
            )
            // 分配客人角色
            await UserService.allocateRoles(
                Constants.NEBULA_APP_ID,
                [user.id],
                [Constants.ROLE_GUEST]
            )
        }
        // 生成token
        const nebulaToken = await OAuthModel.generateAccessToken(
            {
                id: pkg.nebula.clientId,
                code: Constants.NEBULA_APP_CODE,
                appId: Constants.NEBULA_APP_ID,
                grants: ['password', 'refresh_token'],
            },
            {
                login: user.login,
                name: user.name,
                roles: user.roles.map((r) => r.code),
            },
            'web-app'
        )
        ctx.cookies.set(Cookies.ACCESS_TOKEN, nebulaToken, {
            path: '/',
            httpOnly: false,
        })
        ctx.redirect('/')
    },

    'get /oauth/callback/cas': async (ctx, next) => {
        // state为SDK初始化时设置的appName，此处为appId
        const { code, state, redirect = '' } = ctx.request.query
        ctx.type = 'text/html; charset=utf-8'
        try {
            // state验证
            if (!state || state !== nebula.name) {
                throw new Error('application id is not matched.')
            }
            const { access_token, refresh_token } =
                await nebula.cas.getAuthToken(code)

            // 验证用户应用权限
            const { user } = AuthUtils.parseCasJwtToken(access_token)
            const userModel = await nebula.sdk.user.getUserByLogin(user.login)
            if (!userModel) {
                throw new NebulaBizError(UserErrors.ApplicationLoginForbidden)
            }

            ctx.cookies.set(Cookies.ACCESS_TOKEN, access_token, {
                path: '/',
                httpOnly: false,
            })
            ctx.cookies.set(Cookies.REFRESH_TOKEN, refresh_token, {
                path: '/',
                httpOnly: false,
            })
            ctx.redirect(redirect || '/')
        } catch (e) {
            nebula.logger.warn('Cas callback error. %o', e)
            throw new NebulaBizError(
                NebulaErrors.AuthenticateErrors.AccessForbidden,
                e.message
            )
        }
    },

    // 'post /auth/account': async function (ctx, next) {
    //     ctx.checkRequired(['login', 'password'])
    //     const { login, password } = ctx.request.body
    //     const { ClUser } = nebula.sequelize.models
    //
    //     const existUser = await ClUser.getByUniqueKey('login', login)
    //     if (existUser) {
    //         throw new NebulaBizError(UserErrors.UserLoginExist)
    //     }
    //
    //     const salt = await bcrypt.genSaltSync(10)
    //     const hash = await bcrypt.hashSync(password, salt)
    //     const { dataValues } = await ClUser.create(
    //         {
    //             login,
    //             password: hash,
    //             status: DataStatus.DISABLED, // 默认无效
    //         },
    //         { returning: true }
    //     )
    //     ctx.ok(dataValues)
    // },
}
