const { DataTypes, Model } = require("sequelize");
const sequelize_connection = require("../config");
const User = require("./User");
const GenerationHistory = require("./GenerationHistory");

/**
 * @typedef {Object} ChatGptMessagesType
 * @property {string} id
 * @property {number} chat_id
 *
 * @property {'system' | 'user' | 'assistant'} role
 * @property {string} content
 *
 * @property {Date?} created_timestamp
 * @property {Date?} updated_timestamp
 */

/**
 * @extends {Model<ChatGptMessagesType, ChatGptMessagesType>}
 */
class ChatGptMessages extends Model {}

ChatGptMessages.init(
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
		role: DataTypes.STRING,
		content: DataTypes.TEXT("long"),
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

ChatGptMessages.belongsTo(User, {
	foreignKey: {
		name: "chat_id",
		allowNull: false,
	},
});

ChatGptMessages.addScope(
	"defaultScope",
	{
		order: [["created_timestamp", "ASC"]],
	},
	{ override: true }
);

module.exports = ChatGptMessages;
