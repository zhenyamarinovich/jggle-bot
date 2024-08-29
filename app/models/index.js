const ArtistPak = require("./ArtistPak");
const ArtistPoll = require("./ArtistPoll");
const ArtistSended = require("./ArtistPoll");
const FavoriteGeneration = require("./FavoriteGeneration");
const GenerationHistory = require("./GenerationHistory");
const PakSendedToReview = require("./PakSendedToReview");
const ReviewVote = require("./ReviewVote");
const ServiceSetting = require("./ServiceSettings");
const User = require("./User");

module.exports = {
	ServiceSetting,
	GenerationHistory,
	FavoriteGeneration,
	User,
	ArtistPak,
	ArtistSended,
	ReviewVote,
	PakSendedToReview,
	ArtistPoll
};
