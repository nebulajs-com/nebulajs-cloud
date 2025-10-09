import {
    Sequelize,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    ForeignKey,
    NonAttribute,
} from 'sequelize'
import decamelize from 'decamelize'
import { BaseModel } from 'nebulajs-core'
import { ClApplication } from './ClApplication'
import { InstanceStatus } from '../config/constants'

export class ClInstance extends BaseModel<
    InferAttributes<ClInstance>,
    InferCreationAttributes<ClInstance>
> {
    declare id: string
    declare name: string
    declare type: string
    declare version: string
    declare image: string
    declare dockerFile: string
    declare containerId: string
    declare serverId: string
    declare host: string
    declare extHost: string
    declare ports: string
    declare subPorts: string
    declare volumeMapping: string
    declare env: string
    declare status: string
    declare createdBy: string
    declare updatedBy: string
    declare remark: string
    declare appId: ForeignKey<string>
    declare app: NonAttribute<ClApplication>
    declare middlewareId: ForeignKey<string>

    static initAttributes = (sequelize) =>
        this.init(
            {
                id: {
                    type: DataTypes.UUID,
                    comment: 'ID',
                    primaryKey: true,
                    defaultValue: DataTypes.UUIDV4,
                },
                name: {
                    type: DataTypes.STRING,
                    comment: '实例名称',
                },
                type: {
                    type: DataTypes.STRING,
                    comment: '实例类型（app,database,redis,vscode等）',
                    allowNull: false,
                },
                version: {
                    type: DataTypes.STRING,
                    comment: '版本',
                },
                image: {
                    type: DataTypes.STRING,
                    comment: '镜像',
                },
                dockerFile: {
                    type: DataTypes.STRING,
                    comment: 'DockerCompose文件名称',
                },
                containerId: {
                    type: DataTypes.STRING,
                    comment: '容器ID',
                },
                serverId: {
                    type: DataTypes.STRING,
                    comment: '服务器ID',
                },
                host: {
                    type: DataTypes.STRING,
                    comment: '主机/IP',
                },
                extHost: {
                    type: DataTypes.STRING,
                    comment: '主机/IP（外网）',
                },
                ports: {
                    type: DataTypes.STRING,
                    comment: '端口（逗号分割）',
                },
                subPorts: {
                    type: DataTypes.STRING,
                    comment: '子端口（逗号分割）',
                },
                env: {
                    type: DataTypes.STRING,
                    comment: '环境',
                },
                volumeMapping: {
                    type: DataTypes.TEXT,
                    comment: '目录映射（映射目录列表，逗号分割）',
                },
                status: {
                    type: DataTypes.STRING(1),
                    comment: '状态（0:停止，1:启动中，2:运行中）',
                    defaultValue: InstanceStatus.STOPPED,
                    allowNull: false,
                },
                createdBy: {
                    type: DataTypes.STRING,
                    comment: '创建人',
                },
                updatedBy: {
                    type: DataTypes.STRING,
                    comment: '更新人',
                },
                remark: {
                    type: DataTypes.STRING,
                    comment: '备注',
                },
            },
            {
                tableName: decamelize(ClInstance.prototype.constructor.name),
                underscored: true,
                comment: '应用实例',
                sequelize,
            }
        )
    static initAssociations() {
        ClInstance.belongsTo(ClApplication, {
            as: 'app',
        })
    }
}
