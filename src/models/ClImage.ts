import { BaseModel } from 'nebulajs-core'
import {
    DataTypes,
    ForeignKey,
    InferAttributes,
    InferCreationAttributes,
} from 'sequelize'
import { ClApplication } from './ClApplication'
import decamelize from 'decamelize'
import { BuildStatus, ImageTypes } from '../config/constants'

export class ClImage extends BaseModel<
    InferAttributes<ClImage>,
    InferCreationAttributes<ClImage>
> {
    declare id: string
    declare name: string
    declare type: string
    declare version: string
    declare buildStatus: string
    declare createdBy: string
    declare updatedBy: string
    declare remark: string
    declare logfile: string
    declare appId: ForeignKey<string>

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
                    comment: '镜像名称',
                },
                type: {
                    type: DataTypes.STRING,
                    comment: '类型（debug,release）',
                    defaultValue: ImageTypes.Debug,
                },
                version: {
                    type: DataTypes.STRING,
                    comment: '版本',
                },
                buildStatus: {
                    type: DataTypes.STRING(1),
                    comment: '构建状态',
                    defaultValue: BuildStatus.BUILDING,
                },
                logfile: {
                    type: DataTypes.STRING(500),
                    comment: '日志文件',
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
                tableName: decamelize(ClImage.prototype.constructor.name),
                underscored: true,
                comment: '应用',
                sequelize,
            }
        )
    static initAssociations() {
        ClImage.belongsTo(ClApplication, {
            as: 'app',
        })
    }
}
