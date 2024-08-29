const { DataTypes, Model } = require("sequelize");
const sequelize_connection = require("../config");
const User = require("./User");

/**
 * @typedef {Object} GenerationChatsType
 * @property {number} chat_id
 * 
 * @property {number} thread_id
 * @property {import("../../enumerators.js").AIServiceType} thread_type
 *
 * @property {Date?} created_timestamp
 * @property {Date?} updated_timestamp
 */

/**
 * @extends {Model<GenerationChatsType, GenerationChatsType>}
 */
class GenerationChats extends Model {}

GenerationChats.init(
	{
		chat_id: {
			type: DataTypes.BIGINT,
			primaryKey: true,
		},
        thread_type: {
            type: DataTypes.STRING,
			primaryKey: true,
        },
		thread_id: {
			type: DataTypes.BIGINT,
		},
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

module.exports = GenerationChats;
