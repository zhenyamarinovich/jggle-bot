const { DataTypes, Model } = require("sequelize");
const sequelize_connection = require("../config");
const User = require("./User");

/**
 * @typedef {Object} GenerationHistoryAttribute
 * @property {string} id
 * @property {number} chat_id
 * @property {number} service_type
 *
 * @property {string} meta
 *
 * @property {Date?} created_timestamp
 * @property {Date?} updated_timestamp
 */

/**
 * @extends {Model<GenerationHistoryAttribute, GenerationHistoryAttribute>}
 */
class GenerationHistory extends Model {}

GenerationHistory.init(
	{
		id: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
		chat_id: {
			references: {
				model: User,
				key: "chat_id",
			},
			type: DataTypes.BIGINT,
			primaryKey: true,
		},
		service_type: {
			type: DataTypes.SMALLINT.UNSIGNED,
			primaryKey: true,
		},
		meta: DataTypes.TEXT('long'),
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

GenerationHistory.belongsTo(User, {
	foreignKey: {
		name: "chat_id",
		allowNull: false,
	},
});

module.exports = GenerationHistory;
