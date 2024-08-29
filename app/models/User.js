const { DataTypes, Model, NOW } = require("sequelize");
const sequelize_connection = require("../config");

/**
 * @typedef {Object} UserType
 * @property {number} chat_id
 *
 * @property {string} language_code
 * @property {string?} last_username
 * @property {string?} last_full_name
 *
 * @property {string} ref_code
 *
 * @property {number} status
 * @property {number} last_message_id
 * @property {number} current_artist
 *
 * @property {number?} connected_chat_id
 * 
 * @property {number} artist_pak_send
 *
 * @property {number} actual_user_action
 *
 * @property {Date?} notify_send_timestamp
 * @property {Date?} registration_timestamp
 * @property {Date?} created_timestamp
 * @property {Date?} updated_timestamp
 */

/**
 * @typedef {Object} UserCreationType
 * @property {number} chat_id
 *
 * @property {string?} language_code
 * @property {string?} last_username
 * @property {string?} last_full_name
 *
 * @property {string?} ref_code
 *
 * @property {number} status
 * @property {number?} last_message_id
 * @property {number?} current_artist
 *
 * @property {number?} connected_chat_id
 *
 * @property {number?} artist_pak_send
 *
 * @property {number?} actual_user_action
 *
 * @property {Date?} notify_send_timestamp
 * @property {Date?} registration_timestamp
 * @property {Date?} created_timestamp
 * @property {Date?} updated_timestamp
 */

/**
 * @extends {Model<UserType, UserCreationType>}
 */
class User extends Model {}

User.init(
	{
		chat_id: {
			type: DataTypes.BIGINT,
			primaryKey: true,
		},
		language_code: {
			type: DataTypes.STRING,
			defaultValue: "ru",
		},
		last_username: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		last_full_name: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		ref_code: {
			allowNull: true,
			type: DataTypes.STRING,
		},
		last_message_id: {
			type: DataTypes.BIGINT,
			defaultValue: 0,
		},
		status: DataTypes.TINYINT.UNSIGNED,
		current_artist: {
			type: DataTypes.DOUBLE,
			defaultValue: 0,
		},
		connected_chat_id: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		artist_pak_send: {
			type: DataTypes.SMALLINT.UNSIGNED,
			defaultValue: 0,
		},
		actual_user_action: DataTypes.SMALLINT.UNSIGNED,
		notify_send_timestamp: {
			type: DataTypes.DATE,
			defaultValue: NOW,
			allowNull: false,
		},
		registration_timestamp: {
			type: DataTypes.DATE,
			allowNull: true,
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

module.exports = User;
