const { DataTypes, Model } = require("sequelize");
const sequelize_connection = require("../config");

/**
 * @typedef {Object} GenerationLogsAttribute
 * @property {number} id
 * @property { 'midjourney' | 'thea-ai' | 'suno' } service_type
 * @property { 'success' | 'error' } status
 * @property {string} request
 * @property {string} response
 *
 * @property {Date?} request_start_timestamp
 * @property {Date?} request_timestamp
 * @property {Date?} response_timestamp
 */

/**
 * @extends {Model<GenerationLogsAttribute, GenerationLogsAttribute>}
 */
class GenerationLogs extends Model {}

GenerationLogs.init(
	{
		id: {
			type: DataTypes.INTEGER.UNSIGNED,
			primaryKey: true,
			autoIncrement: true,
		},
		service_type: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
		status: {
			type: DataTypes.STRING,
			defaultValue: "success",
		},
		request: {
			type: DataTypes.TEXT,
		},
		response: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		request_start_timestamp: {
			type: DataTypes.DATE,
			allowNull: true,
		},
		request_timestamp: DataTypes.DATE,
		response_timestamp: DataTypes.DATE,
	},
	{
		sequelize: sequelize_connection,
		timestamps: false,
	}
);

module.exports = GenerationLogs;
