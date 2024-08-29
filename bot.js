const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(SETTINGS.TELEGRAM_BOT_TOKEN, {
	polling: {
		params: {
			allowed_updates: ["message", "callback_query", "chat_join_request", "chat_member"],
		},
	},
});

module.exports = bot;
