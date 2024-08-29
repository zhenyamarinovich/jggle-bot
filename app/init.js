const { User, ServiceSetting, GenerationHistory, FavoriteGeneration, ArtistPak, ArtistPoll, PakSendedToReview, ReviewVote } = require("./models");
const ChatGptMessages = require("./models/ChatGptMessages");
const GenerationChats = require("./models/GenerationChats.js");
const GenerationLogs = require("./models/GenerationLogs");

module.exports.dbInit = async function () {
	await User.sync({ alter: true });
	await ServiceSetting.sync({ alter: true });
	await GenerationHistory.sync({ alter: true });
	await GenerationLogs.sync({ alter: true });
	await FavoriteGeneration.sync({ alter: true });
	await ChatGptMessages.sync({ alter: true });
	await ArtistPak.sync({ alter: true });
	await PakSendedToReview.sync({ alter: true });
	await ArtistPoll.sync({ alter: true });
	await ReviewVote.sync({ alter: true });
	await GenerationChats.sync({ alter: true });
};
