const TelegramBot = require("node-telegram-bot-api");
const UserData = require("./user-data");
const bot = require("../bot");
const fs = require("fs");
const { convertHtmlChars } = require("./markdown-to-html/converters");
const GenerationLogs = require("../app/models/GenerationLogs");

/** @type {{[key: string]: { stream: fs.WriteStream; thread: number; }}} */
const loggers = {
	midjourney: {
		thread: 448,
	},
	"thea-ai": {
		thread: 423,
	},
	suno: {
		thread: 26823,
	},
};

/**
 * @param {TelegramBot.Message | TelegramBot.CallbackQuery | undefined} ctx
 * @param {Error} err
 */
module.exports.ErrorLog = async function (ctx, err) {
	if (!ctx) {
		return bot.sendMessage(SETTINGS.TELEGRAM_ERROR_CHAT, `${err.stack}`);
	}

	const msg = ctx.message ?? ctx;
	const chat = msg.chat;
	const from = msg.from;
	const userData = new UserData(ctx);

	if (!(await userData.InitData(ctx.from.id))) {
		return bot.sendMessage(SETTINGS.TELEGRAM_ERROR_CHAT, `${chat.id}\n@${chat.username}\n ${err.stack}`);
	}

	const key = [];

	userData.SendText("Произошла ошибка", []);

	return bot.sendMessage(SETTINGS.TELEGRAM_ERROR_CHAT, `${userData.chat_id}\n@${userData.username}\n ${err.stack}`);
};

/**
 * @param {Object} param0
 * @param {Object} param0.request_start
 * @param {Object} param0.request
 * @param {string} param0.response
 * @param {Date} param0.request_timestamp
 * @param { 'success' | 'error' } param0.status
 * @param { 'midjourney' | 'thea-ai' | 'suno' } param0.type
 * @returns
 */
module.exports.LogGeneration = async function ({ request_start, request, response = null, status, request_timestamp, type = "thea-ai" }) {
	const settings = { hour12: false, hour: "numeric", minute: "2-digit", second: "2-digit" };
	const now_timestamp = new Date();
	const diff = Math.floor((now_timestamp - request_timestamp) / 1000);

	const seconds = `0${diff % 60}`.slice(-2);
	const minutes = Math.floor(diff / 60);

	if (request?.thea_payload?.image) {
		request.thea_payload.image = true;
	}

	let message = "";
	message += `- Generation time ${minutes}:${seconds}\n`;
	message += "\n- request ";
	message += request_timestamp.toLocaleDateString("ru-RU", settings);
	message += `\n<pre>${convertHtmlChars(JSON.stringify(request, undefined, " "))}</pre>\n`;
	message += `\n- status ${status}`;
	message += "\n- response ";
	message += now_timestamp.toLocaleDateString("ru-RU", settings);

	if (response) {
		message += `\n<pre>${convertHtmlChars(response)}</pre>`;
	}

	await GenerationLogs.create({
		service_type: type,
		status: status,
		request: typeof request === "string" ? request : JSON.stringify(request),
		response: typeof response === "string" ? response : JSON.stringify(response),
        request_start_timestamp: OffsetTime(request_start),
		request_timestamp: OffsetTime(request_timestamp),
		response_timestamp: OffsetTime(now_timestamp),
	});

	return bot
		.sendMessage(SETTINGS.TELEGRAM_ERROR_CHAT, message, {
			message_thread_id: loggers[type].thread,
			parse_mode: "HTML",
		})
		.catch((err) => {});
};

/**
 * @param {Date} date
 */
function OffsetTime(date) {
	return date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
}
