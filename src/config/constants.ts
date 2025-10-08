export const Constants = {
    NEBULA_APP_CODE: 'nebula',
    NEBULA_APP_ID: 'nebula',
    COMMON_FORM_MODEL: '',
    ROLE_ADMIN: 'ROLE_ADMIN',
    ROLE_GUEST: 'ROLE_GUEST',
    DEFAULT_ADMIN_USER: 'admin',
    DEFAULT_ADMIN_PASSWORD: 'admin',
}
export const MiddlewareTypes = {
    MySQL: 'mysql',
    SQLite: 'sqlite',
    Redis: 'redis',
    MongoDB: 'mongodb',
}

export const ImageTypes = {
    Debug: 'debug',
    Release: 'release',
}

export const AuthTypes = {
    CAS: 'cas',
    None: 'none',
}

export const OAuthGrantTypes = [
    'password',
    'client_credentials',
    // 'authorization_code',
    'refresh_token',
]

export const CamundaSysVarPrefix = '__CAMUNDA__'
export const CamundaSysVars = {
    /**
     * 审批信息
     * 用户提交任务时，会存储意见、附件、用户姓名等信息
     */
    SubmitInfo: `${CamundaSysVarPrefix}submitInfo`,
    /** @deprecated 兼容旧版本 */
    Task: `${CamundaSysVarPrefix}task`,

    /**
     * 流程附加信息
     */
    ExtraInfo: `${CamundaSysVarPrefix}extraInfo`,

    /**
     * 流程发起人
     * 查询我发起的流程时用，camunda的流程发起人只能通过用户登录来设置，暂不考虑这种方式实现
     */
    StartUser: `${CamundaSysVarPrefix}startUser`,

    /**
     * 用户指定审批人
     * 用户提交任务时，可以指定一个人审批
     */
    Assignee: `${CamundaSysVarPrefix}assignee`,

    /**
     * 多审批人（会签）
     * 用户提交任务时，如果下一节点是多审批人，可以指定一个集合
     */
    AssigneeList: `${CamundaSysVarPrefix}assigneeList`,
}
export const CamundaTaskSysVars = {
    /**
     * 流程任务Listener事件标识（未完成任务）
     */
    NewTaskEvent: `${CamundaSysVarPrefix}newTaskEvent`,
    /**
     * 流程任务Listener事件标识（已完成任务）
     */
    HisTaskEvent: `${CamundaSysVarPrefix}hisTaskEvent`,
}

export const CamundaTaskEvents = {
    Create: 'create',
    Complete: 'complete',
    Delete: 'delete',
    // Timeout: 'timeout',
}

export const Environments = ['dev', 'uat', 'prod']

export const EnvPortPrefix = {
    dev: '1',
    uat: '2',
    prod: '',
}

export const Cache = {
    defaultEx: 3600, //秒
    getAppConfigKey: (env, appId) => `app-config:${env}:${appId}`,
    getAppMenuNavKey: (appId) => `app-menu:${appId}:*`,
    getAppUserMenuNavKey: (appId, login) => `app-menu:${appId}:${login}`,
    getAppResourceKey: (appId) => `user-resource:${appId}:*`,
    getAppUserResourceKey: (appId, login) => `user-resource:${appId}:${login}`,
    getAppUserMessageCountKey: (appId, login) =>
        `user-message-count:${appId}:${login}`,
    getAuthCodeKey: (code) => `auth-code:${code}`,
}

export const Websocket = {
    getAppSocketKey: (appId, env) => `${appId}:${env}`,
}

export const Cookies = {
    CURRENT_APP_ID: 'nb_current_app',
    ACCESS_TOKEN: 'nb_access_token',
    REFRESH_TOKEN: 'nb_refresh_token',
}

export const InstanceStatus = {
    STOPPED: '0',
    STARTING: '1',
    STARTED: '2',
}

export const BuildStatus = {
    BUILDING: '0',
    SUCCESS: '1',
    FAILED: '2',
}

export const DataStatus = {
    DISABLED: '0',
    ENABLED: '1',
}

export const JobStatus = {
    CREATED: '0',
    RUNNING: '1',
    FINISHED: '2',
}

export const AuditModelProps = [
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
]

export const ForbiddenUpdateAppModelProps = ['appId']

export const UserMessageTypes = {
    COMMON_MESSAGE: 'COMMON_MESSAGE', // 一般消息
    PROCESS_TASK_TODO: 'PROCESS_TASK_TODO', // 待办
    PROCESS_TASK_DONE: 'PROCESS_TASK_DONE', // 待办完成
}
