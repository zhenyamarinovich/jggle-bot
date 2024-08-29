const { DataTypes, Model } = require("sequelize");
const sequelize_connection = require("../config");

/**
 * @typedef {Object} PollVoteAttribute
 * @property {number} user_id
 * @property {string} poll_id
 * @property {number} vote_option
 *
 * @property {Date?} created_timestamp
 * @property {Date?} updated_timestamp
 */

/**
 * @extends {Model<PollVoteAttribute, PollVoteAttribute>}
 */
class PollVote extends Model {}

PollVote.init(
	{
		user_id: {
			primaryKey: true,
			type: DataTypes.BIGINT,
		},
		poll_id: {
			primaryKey: true,
			type: DataTypes.STRING,
		},
		vote_option: {
			primaryKey: true,
			type: DataTypes.SMALLINT.UNSIGNED,
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

module.exports = PollVote;
