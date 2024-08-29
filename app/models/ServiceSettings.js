const { DataTypes, Model } = require("sequelize");
const sequelize_connection = require("../config");
const User = require("./User");

/**
 * @typedef {Object} ServiceSettingsType
 * @property {number} chat_id
 *
 * @property {number} type
 * @property {string} meta
 *
 * @property {Date?} created_timestamp
 * @property {Date?} updated_timestamp
 */

/**
 * @extends {Model<ServiceSettingsType, ServiceSettingsType>}
 */
class ServiceSetting extends Model {}

ServiceSetting.init(
	{
		chat_id: {
			references: {
				model: User,
				key: "chat_id",
			},
			type: DataTypes.BIGINT,
			primaryKey: true,
		},
		type: {
			type: DataTypes.SMALLINT.UNSIGNED,
			primaryKey: true,
		},
		meta: DataTypes.TEXT,
		created_timestamp: DataTypes.DATE,
		updated_timestamp: DataTypes.DATE,
	},
	{
		sequelize: sequelize_connection,
		timestamps: true,
		createdAt: "created_timestamp",
		updatedAt: "updated_timestamp",
	}
);

ServiceSetting.belongsTo(User, {
	foreignKey: {
		name: "chat_id",
		allowNull: false,
	},
});

module.exports = ServiceSetting;
