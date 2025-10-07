import { NebulaErrors } from 'nebulajs-core'

/**
 * 模块编码：20 Application
 */
export class ApplicationErrors extends NebulaErrors.BadRequestErrors {
    static NoApplication = { code: 20001, msg: '未选择应用' }
    static CreateFailed = { code: 20002, msg: '创建应用失败' }
    static InvalidClientRequest = {
        code: 20003,
        msg: '无效的客户端请求',
        status: 403,
    }
    static InstanceExist = { code: 20004, msg: '该环境对应类型的实例已存在' }
    static ImageNotExist = { code: 20005, msg: '未找到相关实例镜像' }
    static ImageExist = { code: 20006, msg: '该版本对应的镜像包已存在' }
    static MiddlewareInstanceExist = { code: 20007, msg: '存在已经启动的实例' }
    static InvalidMiddlewareType = { code: 20008, msg: '无效的中间件类型' }
    static MiddlewareConnectFailed = { code: 20009, msg: '中间件连接失败' }
    static ApplicationExist = { code: 20010, msg: '应用已存在' }
    static ApplicationNotConnected = { code: 20011, msg: '应用未连接到云端' }
    static InvalidClientEnv = { code: 20012, msg: '无效的应用环境' }
    static NoAvailablePortFound = { code: 20013, msg: '无法找到可用端口' }
    static PageUrlExist = { code: 20014, msg: '页面路径已存在' }
    static PageCannotBeModified = { code: 20015, msg: '页面无法被修改' }
    static PageLocked = { code: 20016, msg: '页面已被锁定，无法修改' }
    static PageSchemaNotFound = { code: 20017, msg: '未找到页面定义文件' }
    static GitNoUrl = { code: 20018, msg: '未设置远程Git仓库' }
    static GitUnauthorized = {
        code: 20019,
        msg: '远程Git代码仓库用户名或密码错误',
    }
    static GitNoSuchBranch = {
        code: 20020,
        msg: '远程Git代码仓库没有此分支',
    }
    static GitPullFailed = {
        code: 20021,
        msg: '远程Git仓库拉取失败',
    }
    static PageFormNotFound = {
        code: 20022,
        msg: '无法从页面中找到表单',
    }
    static MessageTypeNotSupported = {
        code: 20023,
        msg: '未知的消息类型',
    }
    static VersionIsSameAsInstance = {
        code: 20024,
        msg: '镜像版本与应用版本一致',
    }
    static JobClientIsNotOnline = {
        code: 20025,
        msg: '应用不在线，任务取消',
    }
    static StorageBucketAlreadyExist = {
        code: 20026,
        msg: '创建存储桶失败，已存在相同名称的存储桶',
    }
    static ApiPathExist = {
        code: 20027,
        msg: '接口路径及请求方式已存在',
    }
}
/**
 * 模块编码：21 User模块
 */
export class UserErrors extends NebulaErrors.BadRequestErrors {
    static UserLoginExist = {
        code: 21001,
        msg: '用户名已存在',
    }
    static InvalidPassword = {
        code: 21002,
        msg: '密码不正确',
    }
    static InvalidUser = {
        code: 21003,
        msg: '用户不存在或已被禁用',
    }
    static RoleCodeExist = {
        code: 21004,
        msg: '角色编码已存在',
    }
    static OrgUsersExist = {
        code: 21005,
        msg: '该组织下存在关联用户',
    }
    static ApplicationLoginForbidden = {
        code: 21006,
        msg: '没有权限登陆此应用',
        status: 403,
    }
    static CannotDeleteAdmin = {
        code: 21007,
        msg: '无法删除管理员',
    }
    static CannotAllocateRoleForAdmin = {
        code: 21008,
        msg: '无法为管理员分配角色',
    }
}

/**
 * 模块编码：22 System模块
 */
export class SystemManageErrors extends NebulaErrors.BadRequestErrors {
    static InnerMenuCannotBeUpdated = {
        code: 22001,
        msg: '无法修改系统内置菜单',
    }
}

/**
 * 模块编码：23 Process模块
 */
export class ProcessErrors extends NebulaErrors.BadRequestErrors {
    static ProcessFormNotFound = {
        code: 23001,
        msg: '无法从流程页面中找到表单',
    }
    static ProcessModelPageNotFound = {
        code: 23002,
        msg: '无法找到流程模型页面',
    }
    static ProcessTaskNotFound = {
        code: 23003,
        msg: '流程任务不存在',
    }
    static ProcessModelNotBound = {
        code: 23004,
        msg: '没有流程绑定到此模型',
    }
    static ProcessModelPageFormNotFound = {
        code: 23005,
        msg: '流程模型的页面中不存在新增表单',
    }
    static ProcessInstanceNotFound = {
        code: 23006,
        msg: '无法找到流程实例',
    }
    static ProcessDeployFailed = {
        code: 23007,
        msg: '流程发布失败',
    }
    static ProcessModelNotFound = {
        code: 23008,
        msg: '无法找到流程模型',
    }
    static ProcessModelHasBeenBound = {
        code: 23009,
        msg: '流程模型已被其他流程绑定',
    }
    static ProcessDefCannotDelete = {
        code: 23010,
        msg: '无法删除该流程，存在未完成的流程实例',
    }
    static ProcessDefNotFound = {
        code: 23011,
        msg: '无法找到流程定义',
    }
    static ProcessAssigneesCannotBeNull = {
        code: 23012,
        msg: '指派人不能为空',
    }
    static ProcessDefGroupCannotDelete = {
        code: 23010,
        msg: '无法删除该流程分组，存在对应的流程定义',
    }
}
