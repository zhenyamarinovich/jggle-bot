const { DataTypes, Model } = require("sequelize");
const sequelize_connection = require("../config");
const User = require("./User");
const ArtistPoll = require("./ArtistPoll");

/**
 * @typedef {Object} ReviewVoteAttribute
 * @property {number?} id
 * @property {number} chat_id
 * @property {number?} audio_message_id
 * @property {number?} photo_message_id
 *
 * @property {Date?} created_timestamp
 * @property {Date?} updated_timestamp
 */

/**
 * @extends {Model<ReviewVoteAttribute, ReviewVoteAttribute>}
 */
class PakSendedToReview extends Model {}

PakSendedToReview.init(
	{
		id: {
			type: DataTypes.INTEGER.UNSIGNED,
			primaryKey: true,
			autoIncrement: true,
		},
		chat_id: {
			references: {
				model: User,
				key: "chat_id",
			},
			primaryKey: true,
			type: DataTypes.BIGINT,
		},
        photo_message_id: DataTypes.BIGINT,
        audio_message_id: DataTypes.BIGINT,
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

PakSendedToReview.hasMany(ArtistPoll, {
	foreignKey: {
		field: "id",
		name: "review_id",
		allowNull: false,
	},
});

PakSendedToReview.belongsTo(User, {
	foreignKey: {
		name: "chat_id",
		allowNull: false,
	},
});

module.exports = PakSendedToReview;
