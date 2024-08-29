const { DataTypes, Model } = require("sequelize");
const sequelize_connection = require("../config");
const User = require("./User");
const GenerationHistory = require("./GenerationHistory");

/**
 * @typedef {Object} FavoriteGenerationType
 * @property {number} chat_id
 *
 * @property {string} generation_id
 *
 * @property {Date?} created_timestamp
 * @property {Date?} updated_timestamp
 */

/**
 * @extends {Model<FavoriteGenerationType, FavoriteGenerationType>}
 */
class FavoriteGeneration extends Model {}

FavoriteGeneration.init(
	{
		chat_id: {
			references: {
				model: User,
				key: "chat_id",
			},
			type: DataTypes.BIGINT,
			primaryKey: true,
		},
		generation_id: {
			references: {
				model: GenerationHistory,
				key: "id",
			},
			type: DataTypes.STRING,
			primaryKey: true,
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

FavoriteGeneration.belongsTo(GenerationHistory, {
	foreignKey: {
		name: "generation_id",
		allowNull: false,
	},
});

FavoriteGeneration.belongsTo(User, {
	foreignKey: {
		name: "chat_id",
		allowNull: false,
	},
});

FavoriteGeneration.addScope(
	"defaultScope",
	{
		order: [["created_timestamp", "DESC"]],
	},
	{ override: true }
);


module.exports = FavoriteGeneration;
