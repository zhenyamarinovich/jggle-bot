const { DataTypes, Model } = require("sequelize");
const sequelize_connection = require("../config");
const User = require("./User");

/**
 * @typedef {Object} ArtistPakAttribute
 * @property {number?} id
 * @property {number} chat_id
 * 
 * @property {string} description
 * @property {string} meta
 *
 * @property {Date?} created_timestamp
 * @property {Date?} updated_timestamp
 */

/**
 * @extends {Model<ArtistPakAttribute, ArtistPakAttribute>}
 */
class ArtistPak extends Model {}

ArtistPak.init(
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
			type: DataTypes.BIGINT,
		},
		description: DataTypes.TEXT("long"),
		meta: DataTypes.TEXT("long"),
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

ArtistPak.belongsTo(User, {
	foreignKey: {
		name: "chat_id",
		allowNull: false,
	},
});

module.exports = ArtistPak;
