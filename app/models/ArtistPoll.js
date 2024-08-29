const { DataTypes, Model } = require("sequelize");
const sequelize_connection = require("../config");
const ArtistPak = require("./ArtistPak");
const PollVote = require("./ReviewVote");

/**
 * @typedef {Object} ArtistPollAttribute
 * @property {number} review_id
 * @property {number} pak_id
 * @property {string} poll_id
 * @property {number} chat_id
 *
 * @property {Date?} created_timestamp
 * @property {Date?} updated_timestamp
 */

/**
 * @extends {Model<ArtistPollAttribute, ArtistPollAttribute>}
 */
class ArtistPoll extends Model {}

ArtistPoll.init(
	{
		review_id: {
			type: DataTypes.INTEGER.UNSIGNED,
			primaryKey: true,
		},
		pak_id: {
			references: {
				key: "id",
				model: ArtistPak,
			},
			type: DataTypes.INTEGER.UNSIGNED,
			primaryKey: true,
		},
		poll_id: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
		chat_id: {
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

ArtistPoll.hasMany(PollVote, {
	foreignKey: {
		field: "poll_id",
		name: "poll_id",
		allowNull: false,
	},
});

ArtistPoll.belongsTo(ArtistPak, {
	foreignKey: {
		name: "pak_id",
		allowNull: false,
	},
});

module.exports = ArtistPoll;
