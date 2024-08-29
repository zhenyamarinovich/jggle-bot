require("./config.js");

const { dbInit } = require("./app/init.js");
const bot = require("./bot.js");
const { UserActions, ServiceType, MidjourneyCommands, MidjourneySelection, ChatGptPrefixType, MessageType, UserStatus } = require("./enumerators.js");
const { ErrorLog } = require("./utils/error-logger.js");
const UserData = require("./utils/user-data.js");
const generationController = require("./service/generation-controller.js");
const ServiceSetting = require("./app/models/ServiceSettings.js");
const language = require("./language/language.js");
const { IsDefaultSettings, DefaultNeuronSettings, TrimText, GetImageDescription, CompleteMarkdown, GenerateId, sleep } = require("./utils/index.js");
const TelegramBot = require("node-telegram-bot-api");
const FavoriteGeneration = require("./app/models/FavoriteGeneration.js");
const GenerationHistory = require("./app/models/GenerationHistory.js");
const suno_generation = require("./service/suno-generation.js");
const ChatGptMessages = require("./app/models/ChatGptMessages.js");
const OpenAiClient = require("./utils/text/openai.js/openai_client.js");
const markdownToHtml = require("./utils/markdown-to-html/index.js");
const ArtistPak = require("./app/models/ArtistPak.js");
const { convertHtmlChars } = require("./utils/markdown-to-html/converters.js");
const TaskRunner = require("./utils/task-runner.js");
const PakSendedToReview = require("./app/models/PakSendedToReview.js");
const { ArtistPoll, ReviewVote, User } = require("./app/models/index.js");
const { Op } = require("sequelize");
const fs = require("fs");
const thea_ai_generation = require("./service/thea-ai-generation.js");
const ru = require("./language/ru.js");
const GenerationChats = require("./app/models/GenerationChats.js");

require("./app/backend/index.js");

dbInit();

bot.getMe().then((me) => {
	this.botInfo = me;
});

const MAX_ARTIST_PACS = 3;

const botInfo = {
	id: Number(SETTINGS.TELEGRAM_BOT_TOKEN.split(":")[0]),
	first_name: "",
	last_name: "",
	username: "",
	language_code: "",
};

const abortList = new Map();
const START_VIDEO = "BAACAgIAAxkBAAIORmZ9QTlk5BNcaJSDkLPg30ef-ptvAAJ_SQACzYLpS88ke3ioI14UNQQ";
const TEST_IMG =
	"https://cdn.discordapp.com/attachments/1174054512185593876/1240125607090720878/Slide_16_9_-_2.png?ex=66456c79&is=66441af9&hm=0794b7c57ba3818e4d663755f6b4ff60fae1c035ef8e1afc4f1271dffb11ca1a&";

let TESTING_LAW = false;

process.on("uncaughtException", (err, origin) => {
	return console.error(err);
	// return bot.sendMessage(errorChatId, `${err.name}\n\n ${err.stack}`);
});

bot.setMyCommands([{ command: "start", description: "вернуться в меню" }]);

bot.addListener("new_chat_members", (mess) => {
	bot.deleteMessage(mess.chat.id, mess.message_id).catch((err) => {});
});

bot.addListener("photo", async (msg) => {
	text_listener(msg).catch((err) => ErrorLog(msg, err));
});

bot.addListener("video", async (msg) => {
	const chatId = msg.chat.id;
	if (chatId === ADMIN_ID) {
		bot.sendMessage(ADMIN_ID, msg.video?.file_id);
	}
});

bot.addListener("document", async (msg) => {
	const chatId = msg.chat.id;
	if (chatId === ADMIN_ID) {
		bot.sendMessage(ADMIN_ID, msg.document?.file_id);
	}
});

bot.addListener("voice", async (msg) => {
	text_listener(msg).catch((err) => ErrorLog(msg, err));
});

bot.addListener("audio", async (msg) => {
	text_listener(msg).catch((err) => ErrorLog(msg, err));
});

bot.addListener("text", async (msg) => {
	text_listener(msg).catch((err) => ErrorLog(msg, err));
});

bot.addListener("callback_query", (query) => {
	Callback_query(query).catch((err) => ErrorLog(query, err));
});

let stop = false;

/**
 * @param {TelegramBot.Message} ctx
 */
async function text_listener(ctx) {
	const userData = new UserData(ctx);
	const chatId = ctx.chat.id;
	const text = ctx.caption ?? ctx.text ?? "";

	if (userData.status < 1) {
		const list = fs.readFileSync("pass_list.txt", "utf8").split("\n");

		if (!list.find((v) => v === chatId.toString())) return;

		await userData.SetStatus(1);
	}
    
	if (await TestingLawCheck(userData)) return;

	if (chatId < 0) {
		if (!userData.thread_id) return;

		const topic_chat = await GenerationChats.findOne({
			where: {
				chat_id: chatId,
				thread_id: userData.thread_id,
			},
		});

		if (!topic_chat) return;

		let prompt = "";

		if (!text.startsWith("/start")) {
			prompt = text.replace(`@${botInfo.username} `, "").replace(/[🖌🖌️ ]*[Pp]rompt:[ ]*/, "");
		}

		switch (topic_chat.dataValues.thread_type) {
			case "chat_gpt":
				return SendChatGpt(userData, prompt);
			case "midjourney":
				return SendMidjourney(userData, prompt);
			case "suno":
				return SendSuno(userData, prompt);
			case "thea_ai":
				return SendTheaAi(userData, prompt);
		}
		// bot.sendMessage(chatId, "test", {
		// 	message_thread_id: ctx.message_thread_id,
		// 	reply_markup: {
		// 		keyboard: [
		// 			[
		// 				{
		// 					text: "test",
		// 				},
		// 			],
		// 		],
		// 	},
		// });
		// if (ctx.text && (ctx.text.startsWith("/start@") || ctx.text.startsWith("/imagine@"))) {
		// 	bot.deleteMessage(chatId, ctx.message_id);
		// 	return console.log(chatId + " " + ctx.message_thread_id);
		// }
		return;
	}

	// if (new Date() > new Date(2024, 4, 26, 21)) {
	// 	return bot.sendMessage(chatId, 'Первый сезон <b>“JIGGL MARKET”</b> закрыт.\nСледите за новостями в <a href="https://t.me/+JY1s-1xmKcUzMWNi">канале</a> 🤙', {
	// 		parse_mode: "HTML",
	// 	});
	// }

	const textSp = text.split(" ");
	const hasRefCode = textSp[0] === "/start" && textSp.length > 1;

	if (!(await userData.InitData())) {
		await userData.CreateUser(textSp[1] ?? null);
	}


	if (abortList.get(chatId)) {
		abortList.get(chatId).abort();
		abortList.set(chatId, undefined);
	}

	// if (userData.banned_status !== BannedType.NOT_BANNED) return SendBannedMessage(userData);
	// if (userData.IsBeforeRegistration() && hasRefCode) await ApproveReferralLink(userData, textSp);
	// if (userData.username === "") return SendNoUsernameMessage(userData);

	// await database.UpdateUserName(userData);

	// switch (userData.status) {
	// 	case UserStatus.SELECT_LANGUAGE:
	// 		return SendLanguage(userData, userData.language_code);
	// 	case UserStatus.REGISTRATION:
	// 		return SendRegistration(userData);
	// }

	// if (!userData.user_agreement_accepted) return SendAgreement(userData);

	// if (userData.status === UserStatus.APPROVING_REFERRAL_LINK) return SendApproveReferral(userData, textSp);

	// if (!(await userData.CheckUserInChat())) return SendSubscribeToChannel(userData);

	// await UpdateProfilePhoto(userData);

	const BUTTONS = userData.CurrText.BUTTONS;

	// if (userData.chat_id === ADMIN_ID && AdminMessageParse(msg, userData)) return;

	// if (userData.is_moderator && text.match(/^[Нн]айти[: @]*/g)) return FindUser(userData, text);

	if (userData.chat_id === ADMIN_ID) {
		switch (textSp[0]) {
			case "/welcome_message":
				return SendWelcomeMessage();
			case "/stop":
				sleep(1000).then(async () => {
					await bot.sendMessage(ADMIN_ID, "Polling STOP");
					await bot.stopPolling();
				});
				return;
			case "/error":
				throw new Error("test");
			case "/stats":
				return SendStats(userData);
			case "/fast":
				await generationController.SetMidjourneyMode("fast");
				return userData.SendText("Success", []);
			case "/send":
				return StartListenMessage(userData, textSp[1]);
			case "/set":
				return SetMaxTask(userData, textSp[1], Number(textSp[2]));
			case "/toggle":
				TESTING_LAW = !TESTING_LAW;

				return userData.SendText(`Testing LAW ${TESTING_LAW}`, []);
			case "/relax":
				await generationController.SetMidjourneyMode("relax");
				return userData.SendText("Success", []);
		}
	}
	// text: BUTTONS.INSTRUCTION }], [{ text: BUTTONS.NEURON }], [{ text: BUTTONS.SEND_JOB }], [{ text: BUTTONS.SUPPORT

	if (text.startsWith(`@${botInfo.username}`) && text.match("ID трека:")) {
		return ExtendedSunoGeneration(userData, text, undefined, true);
	}

	switch (text) {
		// case BUTTONS.INSTRUCTION:
		// 	return SendInstruction(userData);
		case BUTTONS.CHATS:
			return SendChats(userData);
		case BUTTONS.NEURON:
			return SendSelectAI(userData);
		case BUTTONS.SETTINGS_GENERATION_CHAT:
			return SendRequestPrivateChatRequest(userData);
		case "Восстановить недостающие темы":
			await InitTopic(userData);
			return SendMenu(userData, "Чат успешно настроен");
		case "Отключить бота от чата":
			await UnLinkChat(userData);
			return SendRequestPrivateChatRequest(userData);
		// case "🗂 Мои работы":
		// 	return GetFavorites(userData);
		// case BUTTONS.SEND_JOB:
		// 	return SendPakSelector(userData);
		case "Вернуться в меню":
		case "Нейросети":
		case "Мои работы":
		case "/start":
			break;
		// case "/hard_reset":
		// 	return ResetArtistPak(userData);
		// case "/reset":
		// 	return ResetSendedArtistPak(userData);
		default:
			if (userData.action === UserActions.LISTEN_MESSAGE_ARTIST_PAK) return WaitForArtistData(userData);
			if (userData.action === UserActions.LISTEN_MESSAGE_ADMIN) return SendMessageToSelectedUsers(userData);

			if (text.startsWith("/start")) break;
			if (text.startsWith("/imagine")) return SendMidjourney(userData, text.replace(/\/imagine[ ]*/, ""));
			if (text.startsWith("/gpt")) return SendChatGpt(userData, text.replace(/\/gpt[ ]*/, ""));
			if (text.startsWith("/suno")) return SendSuno(userData, text.replace(/\/suno[ ]*/, ""));

			const prompt = text.replace(`@${botInfo.username} `, "").replace(/[🖌🖌️ ]*[Pp]rompt:[ ]*/, "");

			if (userData.action === UserActions.LISTEN_MESSAGE_MIDJOURNEY) return SendMidjourney(userData, prompt);

			if (userData.action === UserActions.LISTEN_MESSAGE_CHAT_GPT) return SendChatGpt(userData, prompt);

			if (userData.action === UserActions.LISTEN_MESSAGE_THEA_AI) return SendTheaAi(userData, text);

			if (userData.action === UserActions.LISTEN_MESSAGE_SUNO) return SendSuno(userData, text);
			if (userData.action === UserActions.LISTEN_MESSAGE_SUNO_EDIT) return EditSunoSettings(userData, "UPDATE-LYRICS");

			break;
	}

	return SendMenu(userData);
}

/**
 * @param {TelegramBot.CallbackQuery} query
 */
async function Callback_query(query) {
	if (query.data === "-1") return bot.answerCallbackQuery(query.id);

	const chatId = query.message.chat.id;

	if (abortList.get(chatId)) {
		abortList.get(chatId).abort();
		abortList.set(chatId, undefined);
	}

	const msg = query.message;
	const data = query.data.split("_");

	if (data[0] === "close") {
		if (data.length > 0 && data[1] !== "skip") {
			const first = Number(data[1]);

			for (let i = first; i < msg.message_id; i++) {
				bot.deleteMessage(chatId, i).catch((err) => {});
			}
		}
		return bot.deleteMessage(chatId, msg.message_id).catch((err) => {});
	}

	// if (new Date() > new Date(2024, 4, 26, 21)) {
	// 	return bot.sendMessage(chatId, 'Первый сезон “JIGGL MARKET” закрыт. Следите за новостями в <a href="https://t.me/+JY1s-1xmKcUzMWNi">канале</a> 🤙', {
	// 		parse_mode: "HTML",
	// 	});
	// }

	const userData = new UserData(query);
	await userData.InitData();

	if (userData.status < 1) {
		const list = fs.readFileSync("pass_list.txt", "utf8").split("\n");

		if (!list.find((v) => v === chatId.toString())) return;

		await userData.SetStatus(1);
	}

	if (await TestingLawCheck(userData)) return;

	if (data[0] === "SendSelectAI") return SendSelectAI(userData);

	if (data[0] === "SendMidjourney") return SendMidjourney(userData);

	if (data[1] === "saveMjKey") {
		const data = await generationController.GetMidjourneyHash(userData.target_chat_id, msg.message_id);
		data.inline_key = msg.reply_markup.inline_keyboard;
		await generationController.SetMidjourneyHash(userData.target_chat_id, msg.message_id, data);
	}

	if (data[0] === "SendMidjourneySettings") return SendMidjourneySettings(userData, data[1], data[2]);

	if (data[0] === "RestoreMidjourneyKey") return RestoreMidjourneyKey(userData);

	if (data[0] === "ResetServiceSettings") return ResetServiceSettings(userData, Number(data[1]));

	if (data[0] === "SendChatGpt") return SendChatGpt(userData, data[1]);

	if (data[0] === "MakeFavorite") return MakeFavorite(userData, msg.reply_markup.inline_keyboard, data[1], data[2]);

	if (data[0] === "GetFavorites") return GetFavorites(userData, Number(data[1]));

	if (data[0] === "SendPakSelector") return SendPakSelector(userData);

	if (data[0] === "SendToReiveArtist") return SendToReiveArtist(userData, data[1]);

	if (data[0] === "ConfirmSendToReive") return ConfirmSendToReive(userData);

	if (data[0] === "SendExamplePak") return SendExamplePak(userData, Number(data[1]) ?? null);

	if (data[0] === "DeleteArtistPakData") return DeleteArtistPakData(userData, Number(data[1]), data[2]);

	if (data[0] === "SendArtistPakMedia") return SendArtistPakMedia(userData, Number(data[1]) ?? null);

	if (data[0] === "RemoveFavorite") return RemoveFavorite(userData, data[1], data[2]);

	if (data[0] === "OpenFavorite") return OpenFavorite(userData, data[1], data[2]);

	if (data[0] === "SendSuno") return SendSuno(userData);

	if (data[0] === "SendTheaAi") return SendTheaAi(userData, data[1]);

	if (data[0] === "EditSunoSettings") return EditSunoSettings(userData, data[1]);

	if (data[0] === "SendSunoGenerate") return SendSunoGenerate(userData, msg?.text ?? msg?.caption);

	if (await generationController.GetMidjourneyHash(userData.target_chat_id, msg.message_id)) return SendMidjourneyAnswer(userData, query.data, query.message.date);
}

/**
 * @param {UserData} userData
 */
async function TestingLawCheck(userData) {
	if (!TESTING_LAW || userData.chat_id === ADMIN_ID) return false;

	if (userData.target_chat_id < 0) {
		const topic_chat = await GenerationChats.findOne({
			where: {
				chat_id: userData.target_chat_id,
				thread_id: userData.thread_id,
			},
		});

		if (!topic_chat) return;
	}

	userData.is_callback = false;
	userData.SendText("Идет обновление бота", [
		[
			{
				text: userData.CurrText.BUTTONS.CLOSE,
				callback_data: "close",
			},
		],
	]);

	return true;
}

/**
 * @param {UserData} userData
 */
async function SendStats(userData) {
	const suno_stats = await suno_generation.GetStats();
	const mj_stats = await generationController.GetMidjourneyInfo();

	let text_out = "";

	text_out += "MIDJOURNEY accounts\n";
	text_out += '<pre language="javascript">';
	text_out += mj_stats
		.map((v, i) => {
			if (!v) return;
			const name = SETTINGS.DISCORD_AUTH[i].name;

			return `${name}: ${v.fastTimeRemaining} ${v.subscription}`;
		})
		.join("\n");
	text_out += "</pre>";

	text_out += "SUNO accounts\n";
	text_out += '<pre language="javascript">';
	text_out += suno_stats.map((v) => `<b>${v.name}</b>: ${v.token}`).join("\n");
	text_out += "</pre>";

	text_out = text_out.replace(/<t:(\d*)(:R)?>/g, (match) => {
		const timestamp = match.replace(/<t:(\d*)(:R)?>/g, "$1");
		const date = new Date(Number(timestamp) * 1000);
		return date.toLocaleDateString("ru-RU", { hour12: false, hour: "numeric", minute: "numeric" });
	});

	userData.SendText(text_out, []);
}

/**
 * @param {UserData} userData
 * @param {string} serviceType
 * @param {number} amount
 */
async function SetMaxTask(userData, serviceType, amount) {
	switch (serviceType) {
		case "mj":
			generationController.SetMaxTask(amount);
			break;
		case "thea":
			thea_ai_generation.SetMaxTask(amount);
			break;
		case "suno":
			suno_generation.SetMaxTask(amount);
			break;
		default:
			return userData.SendText("Не найден сервис");
	}

	return userData.SendText("Успешно изменено");
}

/**
 * @param {UserData} userData
 */
async function SendMenu(userData, temp_text) {
	await userData.SetAction();
	const keys = [];
	const BUTTONS = userData.CurrText.BUTTONS;

	keys.push([{ text: BUTTONS.NEURON }], [{ text: BUTTONS.SETTINGS_GENERATION_CHAT }], [{ text: BUTTONS.CHATS }]);

	userData.TryDeletePrevious();

	return bot.sendMessage(userData.chat_id, temp_text ?? userData.CurrText.MenuStatus.WELCOME_TO_MENU, {
		parse_mode: "HTML",
		reply_markup: {
			one_time_keyboard: false,
			resize_keyboard: true,
			keyboard: keys,
		},
	});
}

/**
 * @param {UserData} userData
 */
async function SendRequestPrivateChatRequest(userData) {
	await userData.SetAction();
	const key = [];

	const full_rights = {
		can_manage_chat: true,
		can_delete_messages: true,
		can_manage_video_chats: true,
		can_restrict_members: true,
		can_promote_members: true,
		can_change_info: true,
		can_invite_users: true,
		can_post_messages: true,
		can_edit_messages: true,
		can_pin_messages: true,
		can_post_stories: true,
		can_edit_stories: true,
		can_delete_stories: true,
		can_manage_topics: true,
	};
	const request_chat = {
		chat_is_channel: false,
		chat_is_forum: true,
		user_administrator_rights: full_rights,
		bot_administrator_rights: full_rights,
		chat_is_created: false,
		request_id: 1,
	};

	if (userData.connected_chat_id) {
		key.push([
			{
				text: "Восстановить недостающие темы",
			},
		]);
		key.push([
			{
				text: "Отключить бота от чата",
			},
		]);
	} else {
		key.push([
			{
				text: "Привязать чат для генераций",
				request_chat,
			},
		]);
	}

	key.push([
		{
			text: "Вернуться в меню",
		},
	]);

	return bot.sendPhoto(
		userData.chat_id,
		"https://cdn.discordapp.com/attachments/1174054512185593876/1272177614492274751/image.png?ex=66ba073b&is=66b8b5bb&hm=9dabf7684068d13abad30c532591532149d79e15cd2752aca6783c7eff1386f0&",
		{
			caption: "Нажмите на кнопку ниже вам нужно будет создать новый чат\nК этому чату привяжется бот и у вас будут вкладки для быстрого выбора нейросети для генерации",
			parse_mode: "HTML",
			reply_markup: {
				one_time_keyboard: false,
				resize_keyboard: true,
				keyboard: key,
			},
		}
	);
}

// bot.getForumTopicIconStickers().then((v) => fs.writeFileSync("test.json", JSON.stringify(v, undefined, "\t")));
// 7322096 (#6FB9F0) blue,
// 16766590 (#FFD67E) yellow,
// 13338331 (#CB86DB) magenta,
// 9367192 (#8EEE98) light green,
// 16749490 (#FF93B2) pink,
// 16478047 (#FB6F5F) orange

bot.on("message", async (ctx) => {
	if (!ctx.chat_shared) return;

	const shared_chat_id = ctx.chat_shared.chat_id;
	const userData = new UserData(ctx);

	if (!(await userData.InitData())) {
		await userData.CreateUser(textSp[1] ?? null);
	}

	if (userData.connected_chat_id) return;

	await userData.SetConnectedChatId(shared_chat_id);

	const message = await bot.sendMessage(userData.chat_id, "Идет настройка чата...\nПожалуйста подождите", {
		reply_markup: {
			remove_keyboard: true,
		},
	});

	await InitTopic(userData);

	userData.is_callback = false;
	userData.thread_id = undefined;

	const chat_link = await bot.createChatInviteLink(shared_chat_id, { name: "быстрый доступ", member_limit: 1 });

	bot.deleteMessage(userData.chat_id, message.message_id).catch((err) => {});

	return SendMenu(userData, `Чат успешно подключен\nМожете перейти в чат и свободно пользоваться нейросетями от туда\n${chat_link.invite_link}`);
	// const topic = await bot.createForumTopic(ctx.chat_shared.chat_id, "Suno", {
	// 	icon_color: 9367192,
	// });
	// bot.sendMessage(ctx.chat_shared.chat_id, "Suno chat", {
	// 	message_thread_id: topic.message_thread_id,
	// 	reply_markup: {
	// 		keyboard: [
	// 			[
	// 				{
	// 					text: "Test",
	// 				},
	// 			],
	// 		],
	// 	},
	// });
	// console.log(topic);
	// bot.createForumTopic(msg.chat_shared.chat_id, "Thea AI", {
	//     icon_color: 13338331,
	// });
	// bot.createForumTopic(msg.chat_shared.chat_id, "Midjourney", {
	//     icon_color: 16766590,
	// });
	// bot.createForumTopic(msg.chat_shared.chat_id, "Chat GPT", {
	//     icon_color: 7322096,
	// });
});

/**
 * @param {UserData} userData
 */
async function InitTopic(userData) {
	const previous = userData.target_chat_id;

	userData.target_chat_id = userData.connected_chat_id;

	userData.is_callback = false;
	userData.thread_id = await CreateForumTopic(userData.connected_chat_id, "chat_gpt");
	await SendChatGpt(userData);

	userData.is_callback = false;
	userData.thread_id = await CreateForumTopic(userData.connected_chat_id, "suno");
	await SendSuno(userData);

	userData.is_callback = false;
	userData.thread_id = await CreateForumTopic(userData.connected_chat_id, "midjourney");
	await SendMidjourney(userData);

	userData.is_callback = false;
	userData.thread_id = await CreateForumTopic(userData.connected_chat_id, "thea_ai");
	await SendTheaAi(userData);

	userData.target_chat_id = previous;
}

// 7322096 (#6FB9F0) blue,
// 16766590 (#FFD67E) yellow,
// 13338331 (#CB86DB) magenta,
// 9367192 (#8EEE98) light green,
// 16749490 (#FF93B2) pink,
// 16478047 (#FB6F5F) orange

/**
 * "suno" | "midjourney" | "chat_gpt" | "thea_ai"
 * @type {{[key: string]: {color: number; name: string}}}
 */
const TOPIC_SETTINGS = {
	chat_gpt: {
		color: 7322096,
		name: ru.BUTTONS.CHATGPT,
	},
	midjourney: {
		color: 16766590,
		name: ru.BUTTONS.MIDJOURNEY,
	},
	suno: {
		color: 13338331,
		name: ru.BUTTONS.SUNO,
	},
	thea_ai: {
		color: 16749490,
		name: ru.BUTTONS.THEA_AI,
	},
};

/**
 * @param {UserData} userData
 */
async function UnLinkChat(userData) {
	const connections = await User.count({
		where: {
			connected_chat_id: userData.connected_chat_id,
		},
	});

	if (connections === 1) {
		// await GenerationChats.destroy({
		// 	where: {
		// 		chat_id: userData.connected_chat_id,
		// 	},
		// });
	}

	await userData.SetConnectedChatId(null);
}

/**
 * @param {number} chat_id
 * @param {import("./enumerators.js").AIServiceType} type
 * @param {string} name
 */
async function CreateForumTopic(chat_id, type) {
	const db_topic = await GenerationChats.findOne({
		where: {
			chat_id: chat_id,
			thread_type: type,
		},
	});

	if (db_topic) {
		try {
			const test_message = await bot.sendMessage(chat_id, "...", {
				message_thread_id: db_topic.dataValues.thread_id,
			});

			bot.deleteMessage(chat_id, test_message.message_id).catch((err) => {});

			return db_topic.dataValues.thread_id;
		} catch (error) {}
	}

	const settings = TOPIC_SETTINGS[type];

	const topic = await bot.createForumTopic(chat_id, settings.name, {
		icon_color: settings.color,
	});

	if (db_topic) {
		await GenerationChats.update(
			{
				thread_id: topic.message_thread_id,
			},
			{
				where: {
					chat_id: chat_id,
					thread_type: type,
				},
			}
		);
	} else {
		await GenerationChats.create({
			chat_id: chat_id,
			thread_type: type,
			thread_id: topic.message_thread_id,
		});
	}

	return topic.message_thread_id;
}

bot.on("group_chat_created", (msg) => {
	console.log(msg);
});

/**
 * @param {UserData} userData
 */
async function MakeFavorite(userData, keyboard, id, type = "") {
	await userData.SetAction();

	if (type === "GPT") {
		const message = await ChatGptMessages.findOne({
			where: {
				chat_id: userData.chat_id,
				id: id,
			},
		});

		await GenerationHistory.findOrCreate({
			where: {
				chat_id: userData.chat_id,
				id: id,
			},
			defaults: {
				chat_id: userData.chat_id,
				id: id,
				meta: JSON.stringify(message?.dataValues.content),
				service_type: ServiceType.CHAT_GPT,
			},
		});
	}

	await FavoriteGeneration.findOrCreate({
		where: {
			generation_id: id,
			chat_id: userData.chat_id,
		},
		defaults: {
			chat_id: userData.chat_id,
			generation_id: id,
		},
	});

	// bot.editMessageReplyMarkup()
	userData.AnswerCallbackQuery("Добавлено в ваши работы");
}

/**
 * @param {UserData} userData
 */
async function SendInstruction(userData) {
	await userData.SetAction();
	return userData.SendVideo("BAACAgIAAxkBAAOkZn5zp9nsrmtR25bP7R-xO7qM-P0AAsBQAAICJvhLqhrrlHyo1z01BA", "", []);
}

/**
 * @param {UserData} userData
 */
async function SendChats(userData) {
	await userData.SetAction();
	return userData.SendText(userData.CurrText.BUTTONS.CHATS, [
		[
			{
				text: "Тех. поддержка и общение",
				url: "https://t.me/+WzJVQDeCVxM4MjI6",
			},
		],
		// [
		// 	{
		// 		text: "",
		// 		url: "",
		// 	},
		// ],
	]);
}

/**
 * @param {UserData} userData
 */
async function GetFavorites(userData, page = 0) {
	await userData.SetAction();

	const res = await FavoriteGeneration.findAndCountAll({
		where: {
			chat_id: userData.chat_id,
		},
		include: [{ model: GenerationHistory }],
		limit: 10,
	});

	const generations = res.rows;
	const key = [];

	for (let i = 0; i < generations.length; i++) {
		const generation = generations[i];
		/**
		 * @type {GenerationHistory.GenerationHistoryAttribute}
		 */
		const data = generation.GenerationHistory.dataValues;
		const json = JSON.parse(data.meta);
		let icon = "";
		let text = "";

		switch (data.service_type) {
			case ServiceType.STABLE_DIFFUSION:
				icon = "🌄";
				text = json.prompt;
				break;
			case ServiceType.SUNO:
				icon = "🎧";
				text = json.title ?? json.description ?? "Suno generation";
				break;
			case ServiceType.CHAT_GPT:
				text = json;
				icon = "✍🏻";
				break;
			case ServiceType.MIDJOURNEY:
				icon = "🏞️";
				text = json.prompt;
				break;
			case ServiceType.DALLE:
				icon = "🌠";
				text = json.prompt;
				break;

			default:
				break;
		}

		key.push([
			{
				text: icon + " " + TrimText(text, 40),
				callback_data: `OpenFavorite_${page}_${data.id}`,
			},
		]);
	}

	GetPageButtons(key, Number(page), res.count, "SendSelectorPlatform");

	return userData.SendPhoto(TEST_IMG, "Ваши работы", key);
}

/**
 * @param {UserData} userData
 */
async function OpenFavorite(userData, page, id) {
	const key = [];

	const res = await GenerationHistory.findOne({
		where: {
			id: id,
			chat_id: userData.chat_id,
		},
	});

	if (!res) return;

	const data = JSON.parse(res.dataValues.meta);

	key.push([
		{
			text: "🗑 Удалить",
			callback_data: `RemoveFavorite_${page}_${id}`,
		},
	]);
	key.push([
		{
			text: userData.CurrText.BUTTONS.BACK,
			callback_data: `GetFavorites_${page}`,
		},
	]);
	if (res?.dataValues.service_type === ServiceType.CHAT_GPT) {
		return userData.SendText(data, key);
	} else if (res?.dataValues.service_type === ServiceType.SUNO) {
		return userData.SendAudio(data.audio_url, `Название:${data.title}\nОписание:${data.description}`, key);
	} else {
		return userData.SendPhoto(data.photo_id, GetImageDescription(data.prompt), key);
	}
}

/**
 * @param {UserData} userData
 */
async function DownloadFavorite(userData, id) {
	const res = await GenerationHistory.findOne({
		where: {
			id: id,
			chat_id: userData.chat_id,
		},
	});

	const data = JSON.parse(res?.dataValues.meta);

	bot.sendDocument(userData.chat_id, data.photo_id);
}

/**
 * @param {UserData} userData
 */
async function RemoveFavorite(userData, page, id) {
	await FavoriteGeneration.destroy({
		where: {
			generation_id: id,
			chat_id: userData.chat_id,
		},
	});

	return GetFavorites(userData, page);
}

/**
 * @param {UserData} userData
 */
async function SendSelectAI(userData) {
	await userData.SetAction();

	const BUTTONS = userData.CurrText.BUTTONS;
	const key = [];

	let text = "";

	text = userData.CurrText.MenuStatus.SELECT_TOOL;

	key.push([
		{
			text: BUTTONS.CHATGPT,
			callback_data: "SendChatGpt",
		},
	]);
	key.push([
		{
			text: "🎧 Suno",
			callback_data: "SendSuno",
		},
	]);
	key.push([
		{
			text: BUTTONS.MIDJOURNEY,
			callback_data: "SendMidjourney",
		},
	]);

	key.push([
		{
			text: "🌄 Thea Ai",
			callback_data: "SendTheaAi",
		},
	]);

	return userData.SendPhoto(userData.PHOTO.NEURON_NET, text, key);
}

/**
 * @param {UserData} userData
 * @param {string} msgText
 */
async function SendTheaAi(userData, msgText = "") {
	if (await IsGenerating(userData, ServiceType.THEA_AI)) return;

	const [service_data] = await ServiceSetting.findOrCreate({
		where: {
			chat_id: userData.chat_id,
			type: ServiceType.THEA_AI,
		},
		defaults: {
			chat_id: userData.chat_id,
			type: ServiceType.THEA_AI,
			meta: "",
		},
	});

	const key = [];
	let settings = service_data.dataValues.meta;
	const modes = {
		story: "story",
		avatar: "avatar",
		post: "post",
	};

	if (msgText === "" || (msgText === "" && userData.is_callback) || (modes[msgText] === undefined && settings === "")) {
		await userData.SetAction();
		await ServiceSetting.update(
			{
				meta: "",
			},
			{
				where: {
					chat_id: userData.chat_id,
					type: ServiceType.THEA_AI,
				},
			}
		);

		key.push([
			{
				text: "Avatar IMG + TEXT",
				callback_data: `SendTheaAi_avatar`,
			},
		]);
		key.push([
			{
				text: "Story TEXT или IMG + TEXT",
				callback_data: `SendTheaAi_story`,
			},
		]);
		key.push([
			{
				text: "Post TEXT или IMG + TEXT",
				callback_data: `SendTheaAi_post`,
			},
		]);

		if (!userData.thread_id) {
			key.push([
				{
					text: userData.CurrText.BUTTONS.BACK,
					callback_data: "SendSelectAI",
				},
			]);
		}

		return userData.SendText(userData.CurrText.MenuStatus.TO_START_THEA_AI_SELECT, key);
	}

	if (modes[msgText]) {
		await userData.SetAction(UserActions.LISTEN_MESSAGE_THEA_AI);
		await ServiceSetting.update(
			{
				meta: msgText,
			},
			{
				where: {
					chat_id: userData.chat_id,
					type: ServiceType.THEA_AI,
				},
			}
		);

		settings = msgText;
	}

	if (modes[msgText] || (settings === modes.avatar && !userData.message_photo) || userData.message_text === "") {
		key.push([
			{
				text: userData.CurrText.BUTTONS.BACK,
				callback_data: "SendTheaAi",
			},
		]);

		if (settings === modes.avatar) {
			return userData.SendText(`Выбранная модель: <b>${settings}</b>\n${userData.CurrText.MenuStatus.TO_START_THEA_AI_IMAGE}`, key);
		} else {
			return userData.SendText(`Выбранная модель: <b>${settings}</b>\n${userData.CurrText.MenuStatus.TO_START_THEA_AI}`, key);
		}
	}

	const result = thea_ai_generation.AddGeneration({
		chat_id: userData.chat_id,
		response_chat_id: userData.target_chat_id,
		thread_id: userData.thread_id,

		message_id: userData.message_id,
		model: settings,
		prompt: msgText,
		photo_id: userData.message_photo && userData.file_id,
	});

	const message = await SendWaitQueue(userData, result, ServiceType.THEA_AI);
	return thea_ai_generation.AddMessageToDelete(userData.chat_id, ServiceType.THEA_AI, message.message_id);
}

/**
 * @param {UserData} userData
 * @param {string} msgText
 */
async function SendMidjourney(userData, msgText = "") {
	// return userData.SendPhoto(userData.PHOTO.MIDJOURNEY, "Midjourney Временно не доступен", [
	// 	[
	// 		{
	// 			text: userData.CurrText.BUTTONS.BACK,
	// 			callback_data: "SendSelectAI",
	// 		},
	// 	],
	// ]);

	if (await IsGenerating(userData, ServiceType.MIDJOURNEY)) return;

	const [service_data] = await ServiceSetting.findOrCreate({
		where: {
			chat_id: userData.chat_id,
			type: ServiceType.MIDJOURNEY,
		},
		defaults: {
			chat_id: userData.chat_id,
			type: ServiceType.MIDJOURNEY,
			meta: JSON.stringify(DefaultNeuronSettings[ServiceType.MIDJOURNEY]),
		},
	});

	const settings = JSON.parse(service_data.dataValues.meta);
	const key = [];

	if (msgText === "") {
		const commands = CombineMidjourneyCommands(settings);
		await userData.SetAction(UserActions.LISTEN_MESSAGE_MIDJOURNEY);

		if (!IsDefaultSettings(settings, ServiceType.MIDJOURNEY) || userData.thread_id) {
			key.push([
				{
					text: userData.CurrText.BUTTONS.RESET_SETTINGS,
					callback_data: `ResetServiceSettings_${ServiceType.MIDJOURNEY}`,
				},
			]);
		}

		key.push([
			{
				text: userData.CurrText.BUTTONS.SETTINGS,
				callback_data: "SendMidjourneySettings",
			},
		]);

		if (!userData.thread_id) {
			key.push([
				{
					text: userData.CurrText.BUTTONS.BACK,
					callback_data: "SendSelectAI",
				},
			]);
		}

		return userData.SendPhoto(userData.PHOTO.MIDJOURNEY, `${userData.CurrText.MenuStatus.TO_START_MIDJOURNEY}\n\n<code>${commands.prefix} ${commands.suffix}</code>`, key);
	}

	// const censor_result = await client_openai.censorPrompt(msgText);

	// if (censor_result !== false) {
	// 	return bot.sendMessage(userData.chat_id, markdownToHtml(userData.CurrText.Notification.ERROR_MESSAGE_GENERATION.replace(/{reason}/g, censor_result)), {
	// 		parse_mode: "HTML",
	// 		reply_to_message_id: userData.message_id,
	// 		reply_markup: {
	// 			inline_keyboard: key,
	// 		},
	// 	});
	// }

	const result = generationController.AddParallelTask({
		chat_id: userData.chat_id,
		response_chat_id: userData.target_chat_id,
		thread_id: userData.thread_id,

		message_id: userData.message_id,
		prompt: msgText,
		command: CombineMidjourneyCommands(settings, msgText),
		photo_id: userData.message_photo && userData.file_id,
	});

	if (!result) {
		return userData.SendText("Произошла ошибка при добавлении запроса в очередь\nЭту картинку невозможно улучшить просим прощения за неудобства.");
	}

	const message = await SendWaitQueue(userData, result, ServiceType.MIDJOURNEY);
	return generationController.AddMessageToDelete(userData.chat_id, message.message_id);
}

/**
 * @param {UserData} userData
 */
async function IsGenerating(userData, serviceType) {
	let generationStatus;

	switch (serviceType) {
		case ServiceType.SUNO:
			generationStatus = suno_generation.CheckGeneration(userData.chat_id);
			break;
		case ServiceType.MIDJOURNEY:
			generationStatus = generationController.CheckGeneration(userData.chat_id);
			break;
		case ServiceType.THEA_AI:
			generationStatus = thea_ai_generation.CheckGeneration(userData.chat_id, serviceType);
			break;

		default:
			throw new Error(`generation type not found ${serviceType}`);
	}

	if (generationStatus.place >= 0) return SendWaitQueue(userData, generationStatus, serviceType);

	return false;
}

/**
 * @param {string} prompt
 */
function CombineMidjourneyCommands(commands = {}, prompt = "") {
	prompt = prompt.replace(/—/g, "--");

	const suffix = [];
	const prefix = [];

	for (const key in commands) {
		const selected = commands[key];
		/** @type {MidjourneyCommands["STYLE"]} */
		const style = MidjourneyCommands[key] ?? {};
		const isSingle = style.type === "single" || style.type === "optional_single";

		if (key === "VERSION") {
			if (prompt.match(/ --(v|niji) /)) continue;
		} else {
			if (style.prefix !== "" && isSingle && prompt.match(` ${style.prefix}`)) continue;
		}

		for (let i = 0; i < selected.length; i++) {
			const command = `${style.prefix}${selected[i]}${style.suffix || ""}`;

			if (prompt && prompt.match(` ${command}`)) continue;

			if (command.includes("--")) suffix.push(command);
			else prefix.push(command);
		}
	}

	return {
		prefix: prefix.join(" "),
		suffix: suffix.join(" "),
	};
}

async function RestoreMidjourneyKey(userData = new UserData()) {
	const data = await generationController.GetMidjourneyHash(userData.target_chat_id, userData.message_id);

	return bot
		.editMessageReplyMarkup(
			{ inline_keyboard: data.inline_key },
			{
				chat_id: userData.target_chat_id,
				message_id: userData.message_id,
			}
		)
		.catch((err) => {});
}

async function ResetServiceSettings(userData = new UserData(), serviceType) {
	await ServiceSetting.update(
		{
			meta: JSON.stringify(DefaultNeuronSettings[serviceType]),
		},
		{
			where: {
				chat_id: userData.chat_id,
				type: serviceType,
			},
		}
	);

	if (userData.thread_id) {
		return userData.AnswerCallbackQuery("Настройки сброшены", true);
	}

	return SendMidjourney(userData);
}

/**
 * @param {UserData} userData
 * @param {*} type
 * @param {*} commandI
 * @returns
 */
async function SendMidjourneySettings(userData = new UserData(), type, commandI) {
	/** @type {import("./enumerators.js").MidjourneyCommandType} */
	const selected_type = MidjourneyCommands[type];
	const BUTTONS = userData.CurrText.BUTTONS;
	const CommandsText = userData.CurrText.CommandsText;
	const key = [];

	const [service_data] = await ServiceSetting.findOrCreate({
		where: {
			chat_id: userData.chat_id,
			type: ServiceType.MIDJOURNEY,
		},
		defaults: {
			chat_id: userData.chat_id,
			type: ServiceType.MIDJOURNEY,
			meta: JSON.stringify(DefaultNeuronSettings[ServiceType.MIDJOURNEY]),
		},
	});

	/** @type {MidjourneyCommands} */
	let settings = await JSON.parse(service_data.dataValues.meta);

	const data = await generationController.GetMidjourneyHash(userData.target_chat_id, userData.message_id);

	if (!selected_type) {
		key.push(
			[
				{
					text: CommandsText.ASPECT,
					callback_data: `SendMidjourneySettings_ASPECT`,
				},
				{
					text: CommandsText.STYLE,
					callback_data: `SendMidjourneySettings_STYLE`,
				},
			],
			[
				{
					text: CommandsText.VERSION,
					callback_data: `SendMidjourneySettings_VERSION`,
				},
				{
					text: CommandsText.LIGHT,
					callback_data: `SendMidjourneySettings_LIGHT`,
				},
			],
			[
				{
					text: CommandsText.OTHER,
					callback_data: `SendMidjourneySettings_OTHER`,
				},
			],
			[
				{
					text: BUTTONS.BACK,
					callback_data: data ? "RestoreMidjourneyKey" : "SendMidjourney",
				},
			]
		);

		if (!data) return userData.SendPhoto(userData.PHOTO.MIDJOURNEY, "", key);

		return bot
			.editMessageReplyMarkup(
				{ inline_keyboard: key },
				{
					chat_id: userData.target_chat_id,
					message_id: userData.message_id,
				}
			)
			.catch((err) => {});
	}

	let selected_settings = settings[type] || [];
	const commands = selected_type.commands;

	if (commandI !== undefined) {
		commandI = Number(commandI);
		const command = commands[commandI];

		if (selected_type.type === "single") {
			selected_settings = [command];
		} else if (selected_type.type === "optional_single") {
			if (settings[type] && settings[type][0] === command) {
				selected_settings = [];
			} else {
				selected_settings = [command];
			}
		} else {
			const index = selected_settings.indexOf(command);

			if (index !== -1) selected_settings.splice(index, 1);
			else selected_settings.push(command);
		}

		settings[type] = selected_settings;

		await ServiceSetting.update(
			{
				meta: JSON.stringify(settings),
			},
			{
				where: {
					type: ServiceType.MIDJOURNEY,
					chat_id: userData.chat_id,
				},
			}
		);
	}

	const parseCommand = function (i) {
		const command = commands[i];
		let out = commands[i];

		if (CommandsText[out]) out = CommandsText[out];

		if (selected_settings.find((val) => val === command)) out = `✅ ${out}`;

		return {
			text: out,
			callback_data: `SendMidjourneySettings_${type}_${i}`,
		};
	};

	for (let i = 0; i < commands.length; i += 2) {
		if (i === 0 && commands.length % 2 !== 0) {
			key.push([parseCommand(i)]);
			i--;
			continue;
		}

		key.push([parseCommand(i), parseCommand(i + 1)]);
	}

	key.push([
		{
			text: BUTTONS.BACK,
			callback_data: "SendMidjourneySettings",
		},
	]);

	if (!data) return userData.SendPhoto(userData.PHOTO.MIDJOURNEY, "", key);

	return bot
		.editMessageReplyMarkup(
			{ inline_keyboard: key },
			{
				chat_id: userData.target_chat_id,
				message_id: userData.message_id,
			}
		)
		.catch((err) => {});
}

/**
 * @param {UserData} userData
 * @param {*} hashId
 * @param {*} date
 * @returns
 */
async function SendMidjourneyAnswer(userData, hashId, date) {
	userData.is_callback = false;

	if (await IsGenerating(userData, ServiceType.MIDJOURNEY)) return;

	userData.ClearMediaMessage();

	const data = await generationController.GetMidjourneyHash(userData.target_chat_id, userData.message_id);

	let type = "";

	if (typeof data.hash_data !== "object") {
		type = hashId.split("::")[0];
	} else {
		type = data.hash_data[hashId].split("::")[2];
	}

	const [service_data] = await ServiceSetting.findOrCreate({
		where: {
			chat_id: userData.chat_id,
			type: ServiceType.MIDJOURNEY,
		},
		defaults: {
			chat_id: userData.chat_id,
			type: ServiceType.MIDJOURNEY,
			meta: JSON.stringify(DefaultNeuronSettings[ServiceType.MIDJOURNEY]),
		},
	});

	/** @type {MidjourneyCommands} */
	const settings = await JSON.parse(service_data.dataValues.meta);
	const result = generationController.AddParallelTask(
		{
			chat_id: userData.chat_id,
			response_chat_id: userData.target_chat_id,
			thread_id: userData.thread_id,

			message_id: userData.message_id,
			hashId: type !== "reroll" ? hashId : undefined,
			translate: false,
			prompt: data.prompt,
			command: CombineMidjourneyCommands(settings, data.prompt),
		},
		type !== "reroll" ? data.index : undefined,
		type === "upsample" ? 100 : 0
	);

	if (!result) {
		return userData.SendText("Произошла ошибка при добавлении запроса в очередь\nЭту картинку невозможно улучшить просим прощения за неудобства.");
	}

	const message = await SendWaitQueue(userData, result, ServiceType.MIDJOURNEY);
	return generationController.AddMessageToDelete(userData.chat_id, message.message_id);
}

/**
 * @param {UserData} userData
 * @param {{ contains: boolean; place: number;  length: number; }} taskPlace
 * @param {number} serviceType
 */
async function SendWaitQueue(userData, taskPlace, serviceType) {
	const key = [];
	let update_callback = "";
	let photo = "";
	let service_name = "";

	if (serviceType === ServiceType.MIDJOURNEY) {
		(service_name = userData.CurrText.BUTTONS.MIDJOURNEY), (update_callback = "SendMidjourney");
		photo = userData.PHOTO.MIDJOURNEY;
	} else if (serviceType === ServiceType.SUNO) {
		(service_name = userData.CurrText.BUTTONS.SUNO), (update_callback = "SendSuno");
		photo = userData.PHOTO.SUNO;
	} else if (serviceType === ServiceType.THEA_AI) {
		(service_name = userData.CurrText.BUTTONS.THEA_AI), (update_callback = "SendTheaAi");
		photo = undefined;
	}

	if (taskPlace.place > 0) {
		key.push([
			{
				text: userData.CurrText.BUTTONS.UPDATE_INFORMATION,
				callback_data: update_callback,
			},
		]);
	}

	if (!userData.thread_id) {
		key.push([
			{
				text: userData.CurrText.BUTTONS.BACK,
				callback_data: `SendSelectAI_${Math.floor(Math.random() * 100000)}`,
			},
		]);
	} else {
		key.push([
			{
				text: userData.CurrText.BUTTONS.CLOSE,
				callback_data: `close_skip_${Math.floor(Math.random() * 100000)}`,
			},
		]);
	}

	let text = "";

	if (taskPlace.place > 0) {
		text = language.ReplaceTokens(userData.CurrText.MenuStatus.YOU_IN_QUEUE, {
			amount: taskPlace.place,
			total: taskPlace.length,
			service_type: service_name,
		});
	} else {
		text = language.ReplaceTokens(userData.CurrText.MenuStatus.REQUEST_GENERATING, {
			amount: taskPlace.place,
			total: taskPlace.length,
			service_type: service_name,
		});
	}

	if (photo) {
		return userData.SendPhoto(photo, text, key);
	} else {
		return userData.SendText(text, key);
	}
}

// fetch("https://clerk.suno.com/v1/client/sessions/sess_2gWsLwJJXIOXVJ7s53VjgMgJLEu/tokens", {
// 	headers: { "Content-Type": "application/json" },
// 	body: JSON.stringify({ _clerk_js_version: "4.72.0-snapshot.vc141245" }),
// }).then(async (res) => {
// 	console.log(await res.json());
// });

// fetch("https://clerk.suno.com/v1/environment?__clerk_framework_hint=nextjs&__clerk_framework_version=14.2.0&_clerk_js_version=4.72.4", {
// 	headers: {
// 		accept: "*/*",
// 		"accept-language": "ru",
// 		"sec-ch-ua": '"Opera GX";v="109", "Not:A-Brand";v="8", "Chromium";v="123"',
// 		"sec-ch-ua-mobile": "?0",
// 		"sec-ch-ua-platform": '"Windows"',
// 		"sec-fetch-dest": "empty",
// 		"sec-fetch-mode": "cors",
// 		"sec-fetch-site": "same-site",
// 	},
// 	referrer: "https://suno.com/",
// 	referrerPolicy: "strict-origin-when-cross-origin",
// 	body: null,
// 	method: "GET",
// 	mode: "cors",
// 	credentials: "include",
// }).then(async (res) => {
// 	console.log(await res.json());
// });

// const man = new SunoCookieManager(
// 	"_cfuvid=GQ4XV0TgS31L1ihvtaw7LMlaToixb3mZbBOmmNTI7eM-1715794598586-0.0.1.1-604800000; __client=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNsaWVudF8yZ1dzSjlscGxaeFdET1A0aTZPWTU4cnlMbkgiLCJyb3RhdGluZ190b2tlbiI6InlldXdtZGd0ODdlbXU0MWpudDE5bXJrbTF5M2N3OWo0dnZnOTdhdjcifQ.e3VrXYHmVEtSl0RHYLMJuedWlM6j2U5eSG75qYa--hFCT4XVTnaZZkAenDDVxM3DwXFpLTdkGl2bc2M85oPOznBbG29rznF9tEM2cMrfe1azmhpZLuira9XxctgPpDsAtjit0c0eelipSa96n4bTtuHZOtM02jUICDpsYUwH4mlIrBO2K7X5ZkKW4QbbwxoNlrGD5FoDbNM_lJc_HNrPLMQlf-HmmIit5xcLTJPEwn5S-sqqF5SZChW_92vkmolODehIsZllVqmX6niwJMvHeDLU474H8hlG5zAN9YRn72BnSm7af1uNarkCNDXbKfylZo9sJb8uECLLRpj2LU4NjA; __client_uat=1715824615; mp_26ced217328f4737497bd6ba6641ca1c_mixpanel=%7B%22distinct_id%22%3A%20%22b71c8ec8-7391-4b48-abb8-97fdfa95472a%22%2C%22%24device_id%22%3A%20%2218f7f1ba3f835b-027ff151c8a4e2-46534458-1fa400-18f7f1ba3f835b%22%2C%22%24initial_referrer%22%3A%20%22https%3A%2F%2Fsuno.com%2Faccount%22%2C%22%24initial_referring_domain%22%3A%20%22suno.com%22%2C%22%24user_id%22%3A%20%22b71c8ec8-7391-4b48-abb8-97fdfa95472a%22%7D; __cf_bm=U4OqWDqapzz7H.JsoTZG5x6XpQwkhXxVEFq7W1R6CBM-1715826503-1.0.1.1-UxK7Bu64ugxcynBEq.LbczYPcPzb1AKi2QXyatvEtgAZI6DZ77fGd37hqDE2Ra15Unl71e8nCtz7XTkWm.WJCA",
// 	"sess_2gWsLwJJXIOXVJ7s53VjgMgJLEu"
// );
// man.token().then(async (res) => {
// 	console.log(res);
// });
// const accounts = [
// 	{
// 		cookie:
// 			"__client=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNsaWVudF8yZ1hZYkw3NVRlRmJncWxrV3M0TXc1d3lhbm0iLCJyb3RhdGluZ190b2tlbiI6InJrYXNrdThheWY4bTMzajZnc3Zubmg0OXFlamQ3ZzFkaGg3aXJsYnkifQ.w_G-s9F4M3a5mf-1qCjKSoYg86ONX2ixD1C92Bj84WElEqOKHP9wi7Tmtf4aLnxxA96r1s2kIaRCzPqsrG5PpDOPCzt_VE62BdE3csn5Y1W2A4cTbiJsJlGdmNMojJ0L6-2VSYOaUZwh6h-Y6ts8F14vftf6dDBf69LmkFKeihcR7_n8vu-DR0e6zMxQEzlFY5acvlVXObV5rBHPzrQGYQsiu3gQrw7GtjfbuIcafPbNE6OVoxKe93WaBYjuYitXkSHD7-dcSEMeIuRWkekFAO9h9HATBo7H_7ykH8td22LpH142DiZNfB7JsQ6z4cmLw4SU2spowjEj9dCLaRI7Mw; __client_uat=1715845477; mp_26ced217328f4737497bd6ba6641ca1c_mixpanel=%7B%22distinct_id%22%3A%20%22df843e1d-02a5-4a7c-8758-cac3d43de306%22%2C%22%24device_id%22%3A%20%2218f7faecbea2a6-049170af0dd53d-46534458-1fa400-18f7faecbea2a6%22%2C%22%24initial_referrer%22%3A%20%22https%3A%2F%2Fsuno.com%2F%22%2C%22%24initial_referring_domain%22%3A%20%22suno.com%22%2C%22%24user_id%22%3A%20%22df843e1d-02a5-4a7c-8758-cac3d43de306%22%7D",
// 		session: "sess_2gXYdaampx2F2TP0Tz2gwvOHyZv",
// 	},
// ];
// const acc = accounts[0];
// const client = new SunoClient(acc.session, acc.cookie);
// client.total_credits_left().then((res) => {
// 	console.log(res);
// });
// client.simple("phonk", "phonk", false).then((res) => {
// 	console.log(res);
// });

const client_openai = new OpenAiClient();

/**
 * @param {UserData} userData
 * @param {string} msgText
 */
async function SendChatGpt(userData, msgText = "") {
	const key = [];

	if (msgText === "" || ChatGptPrefixType[msgText] || msgText === "Clear") {
		if (msgText === "Clear") {
			await ChatGptMessages.destroy({
				where: {
					chat_id: userData.chat_id,
				},
			});

			if (userData.thread_id) {
				return userData.AnswerCallbackQuery("История диалога очищена", true);
			}
		}

		await userData.SetAction(UserActions.LISTEN_MESSAGE_CHAT_GPT);

		// const conversation = await dataBase.GetChatGptContext(userData.chat_id);
		// const text = conversation && conversation.prefix ? character[conversation.prefix].Start : userData.CurrText.MenuStatus.TO_START_CHATGPT;
		const count = await ChatGptMessages.count({
			where: {
				chat_id: userData.chat_id,
			},
		});

		if (count > 0 || userData.thread_id) {
			key.push([
				{
					text: userData.CurrText.BUTTONS.DELETE_HISTORY,
					callback_data: "SendChatGpt_Clear",
				},
			]);
		}
		// key.push([
		// 	{
		// 		text: userData.CurrText.BUTTONS.SELECT_ROLE,
		// 		callback_data: "SendChatGpt_Select",
		// 	},
		// ]);
		if (!userData.thread_id) {
			key.push([
				{
					text: userData.CurrText.BUTTONS.BACK,
					callback_data: "SendSelectAI",
				},
			]);
		}

		return userData.SendPhoto(userData.PHOTO.CHATGPT, userData.CurrText.MenuStatus.TO_START_CHATGPT, key);
	}

	// if (msgText === "Select") {
	// 	const conversation = await dataBase.GetChatGptContext(userData.chat_id);
	// 	const selected = (conversation && conversation.prefix) || ChatGptPrefixType.Default;

	// 	const ParseButtonChatGPT = function (prefix) {
	// 		return {
	// 			text: (prefix === selected ? "✅" : "") + character[prefix].NAME,
	// 			callback_data: `SendChatGpt_${prefix}`,
	// 		};
	// 	};

	// 	return userData.SendPhoto(userData.PHOTO.CHATGPT, "", [
	// 		[ParseButtonChatGPT(ChatGptPrefixType.Default)],
	// 		[ParseButtonChatGPT(ChatGptPrefixType.TonyRobbins), ParseButtonChatGPT(ChatGptPrefixType.Millionaire)],
	// 		[ParseButtonChatGPT(ChatGptPrefixType.TimeManager), ParseButtonChatGPT(ChatGptPrefixType.Copywriter)],
	// 		[ParseButtonChatGPT(ChatGptPrefixType.AIDoctor), ParseButtonChatGPT(ChatGptPrefixType.Cook)],
	// 		[
	// 			{
	// 				text: userData.CurrText.BUTTONS.BACK,
	// 				callback_data: "SendChatGpt",
	// 			},
	// 		],
	// 	]);
	// }

	const reply_to_message_id = userData.message_id;
	await userData.RemoveInlineButtons();

	// if (msgText === "Continue") msgText = userData.CurrText.BUTTONS.CONTINUE_TYPE;

	// userData.message_id = (await bot.sendMessage(userData.chat_id, userData.CurrText.MenuStatus.REQUEST_GENERATING, { reply_to_message_id })).message_id;

	userData.is_callback = false;
	let last_time = Date.now();
	let unlock = true;
	let response;
	const abort = new AbortController();
	abortList.set(userData.chat_id, abort);
	let file_base64 = "";

	// const chat_action = userData.SetChatAction("typing");

	// if (userData.file_id) {
	// 	const file_path = await bot.downloadFile(userData.file_id, "./tmp");
	// 	file_base64 = fs.readFileSync(file_path, "base64");
	// 	fs.unlinkSync(file_path);
	// }

	try {
		response = await client_openai.sendMessage({
			conversation_id: userData.chat_id,
			abortController: abort,
			complete: msgText === "Continue",
			prompt: msgText,
			InstructionType: "",
			file_base64: file_base64,
			onProgress: async (token) => {
				if (unlock && Date.now() - last_time > 4000) {
					last_time = Date.now();
					unlock = false;
					await userData.SendText(markdownToHtml(token), [], "HTML", reply_to_message_id);
					unlock = true;
				}
			},
		});
	} catch (err) {
		abortList.set(userData.chat_id, undefined);
		console.log(err);
		return userData.SendNotification(userData.CurrText.Notification.ERROR_MESSAGE_GENERATION.replace(/{reason}/g, err.message));
	} finally {
		// clearInterval(chat_action);
	}

	abortList.set(userData.chat_id, undefined);

	if (response.last_resp?.choices && response.last_resp.choices[0].finish_reason === "length") {
		key.push([
			{
				text: userData.CurrText.BUTTONS.CONTINUE_TYPE,
				callback_data: "SendChatGpt_Continue",
			},
		]);
	}

	output = response.result;
	unlock = true;

	// key.push([
	// 	{
	// 		text: "❤️",
	// 		callback_data: `MakeFavorite_${response.response_id}_GPT`,
	// 	},
	// ]);

	const first_message = response.result.slice(0, 4000);

	await userData.SendText(markdownToHtml(first_message), key, "HTML", reply_to_message_id);

	// await userData.SendText(output, key, "HTML", reply_to_message_id);
}

/**
 * @param {UserData} userData
 * @param {string} msgText
 */
async function SendSuno(userData, msgText = "") {
	if (await IsGenerating(userData, ServiceType.SUNO)) return;

	const BUTTONS = userData.CurrText.BUTTONS;
	const MenuStatus = userData.CurrText.MenuStatus;

	// return userData.SendPhoto(userData.PHOTO.SUNO, `Просим прощения SUNO временно не работает.`, [
	// 	[
	// 		{
	// 			text: BUTTONS.BACK,
	// 			callback_data: "SendSelectAI",
	// 		},
	// 	],
	// ]);

	if (userData.message_audio) {
		return suno_generation.UploadAudio(userData, userData.message_audio.file_name, userData.file_id);
	}

	if (userData.message_voice) {
		const curr_date = new Date().toLocaleDateString("ru", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

		return suno_generation.UploadAudio(userData, `audio ${curr_date}`, userData.file_id);
	}

	const [service_data] = await ServiceSetting.findOrCreate({
		where: {
			chat_id: userData.chat_id,
			type: ServiceType.SUNO,
		},
		defaults: {
			chat_id: userData.chat_id,
			type: ServiceType.SUNO,
			meta: JSON.stringify(DefaultNeuronSettings[ServiceType.SUNO]),
		},
	});

	const data = JSON.parse(service_data.dataValues.meta);
	/** @type {boolean} */
	const extended = data.EXTENDED ?? false;

	await userData.SetAction(UserActions.LISTEN_MESSAGE_SUNO);

	const key = {
		text: `${BooleanSmile(!data.INSTRUMENTAL)} Слова в песне`,
		callback_data: `EditSunoSettings_INSTRUMENTAL`,
	};

	if (extended) {
		return ExtendedSunoGeneration(userData, msgText, key, !data.INSTRUMENTAL);
	} else {
		return SimpleSunoGeneration(userData, msgText, key);
	}
}

/**
 * @param {UserData} userData
 * @param {string} msgText
 * @param {import("telegraf/types").InlineKeyboardButton} instrumental_key
 */
async function SimpleSunoGeneration(userData, msgText, instrumental_key) {
	const BUTTONS = userData.CurrText.BUTTONS;
	const key = [];

	// key.push([instrumental_key]);
	key.push([
		{
			text: "⚙️ Расширенный режим",
			callback_data: "EditSunoSettings_EXTENDED",
		},
	]);

	if (!userData.thread_id) {
		key.push([
			{
				text: BUTTONS.BACK,
				callback_data: `SendSelectAI_${Math.floor(Math.random() * 10000)}`,
			},
		]);
	}

	if (msgText === "") {
		return userData.SendPhoto(
			userData.PHOTO.SUNO,
			`Отправьте оригинальный звук продолжительностью от 6 до 60 секунд для взятия примера голоса.\nОтправьте описание песни которую хотите получить\n🎧 SUNO`,
			key
		);
	}

	let suno_text = await client_openai.generateSuno(msgText);

	if (!suno_text.match(/[*]*Title[*]*/g)) {
		return userData.SendPhoto(userData.PHOTO.SUNO, suno_text, key);
	}

	suno_text = suno_text.replace(/[*]*Title[*]*:[*]*/, "Название:");
	suno_text = suno_text.replace(/[*]*Style[*]*:[*]*/, "Стили:");
	suno_text = suno_text.replace(/[*]*Lyrics[*]*:[*]*/, "Текст:");

	return ExtendedSunoGeneration(userData, suno_text);
}

const SUNO_TITLE_TEXT = `<b>Название:</b> напишите название трека`;
const SUNO_STYLE_TEXT = `<b>Стили:</b> напишите стиль музыки, настроение, темп и голос исполнителя, чтобы задать атмосферу!`;
const SUNO_LYRICS_TEXT = `\n<b>Текст:</b> далее пропишите слова которые будут в песне`;

/**
 * @param {UserData} userData
 * @param {string} msgText
 * @param {import("telegraf/types").InlineKeyboardButton} instrumental_key
 * @param {boolean} has_lyrics
 */
async function ExtendedSunoGeneration(userData, msgText, instrumental_key, has_lyrics) {
	const BUTTONS = userData.CurrText.BUTTONS;
	const key = [];
	const info_text = `<blockquote>${SUNO_TITLE_TEXT}\n${SUNO_STYLE_TEXT}${has_lyrics ? SUNO_LYRICS_TEXT : ""}</blockquote>`;
	const init_prompt = `\nЗаджигли это👇\n\nНазвание:\n\nСтили:${has_lyrics ? `\n\nТекст:` : ""}`;

	if (instrumental_key) {
		key.push([instrumental_key]);
	}
	key.push([
		{
			text: "💡 Упрощенный режим",
			callback_data: "EditSunoSettings_EXTENDED",
		},
	]);

	key.push([
		{
			text: "📖 Получить начальный промпт",
			switch_inline_query_current_chat: init_prompt,
		},
	]);

	if (userData.thread_id) {
		key.push([
			{
				text: "🔧📖 Получить начальный промпт",
				switch_inline_query: init_prompt,
			},
		]);
	}

	if (!userData.thread_id) {
		key.push([
			{
				text: BUTTONS.BACK,
				callback_data: `SendSelectAI_${Math.floor(Math.random() * 10000)}`,
			},
		]);
	}

	if (msgText === "") {
		return userData.SendPhoto(
			userData.PHOTO.SUNO,
			`Отправьте оригинальный звук продолжительностью от 6 до 60 секунд для взятия примера голоса.\nОтправьте сообщение для генерации музыки в\n🎧 SUNO\n<u>Необходимо отправлять запрос по примеру ниже 👇</u>\n` +
				`${info_text}`,
			key
		);
	}

	// const matchTrackId = msgText.match(regTrackId);
	// const matchTrackStart = msgText.match(regTrackStart);
	// const matchStyle = msgText.match(regStyle);
	// const matchLyrics = msgText.match(regLyrics);

	const suno_data = await ParseSunoMessage(userData.chat_id, msgText);

	if (typeof suno_data === "string") {
		return userData.SendPhoto(userData.PHOTO.SUNO, suno_data, key);
	}

	let final_text = "";

	if (suno_data.generation_id) {
		final_text += `ID трека: ${suno_data.generation_id}\n`;
		final_text += `Продлить с: ${suno_data.track_start}\n\n`;
	}

	if (suno_data.track_title) {
		final_text += `Название: ${suno_data.track_title}\n\n`;
	}

	final_text += `Стили: ${suno_data.track_style}\n\n`;

	if (suno_data.track_lyrics) {
		final_text += `Текст:\n\n${suno_data.track_lyrics}`;
	}

	key.length = 0;

	const button_text = `\nЗаджигли это👇\n\n${final_text}`;

	key.push([
		{
			text: "📝 Изменить промпт",
			switch_inline_query_current_chat: button_text,
		},
	]);

	if (userData.thread_id) {
		key.push([
			{
				text: "🔧📝 Изменить промпт",
				switch_inline_query: button_text,
			},
		]);
	}

	key.push([
		{
			text: "❌ Отменить",
			callback_data: `SendSuno`,
		},
		{
			text: "✅ Оправить на генерацию",
			callback_data: `SendSunoGenerate`,
		},
	]);

	const message_text = `Это будет отправлено для генерации песни\n\n${final_text}`;

	if (message_text.length > 1000) {
		return userData.SendText(message_text, key);
	} else {
		return userData.SendPhoto(userData.PHOTO.SUNO, message_text, key);
	}
}

const regTrackId = new RegExp(/\n?[Ii][Dd] трека:? */);
const regTrackStart = new RegExp(/\n?[Пп]родлить с:? */);
const regTrackTitle = new RegExp(/\n?[Нн]азвание:? */);
const regStyle = new RegExp(/\n?[Сс]тил[иь]:? */);
const regLyrics = new RegExp(/\n?[Тт]екст:? */);

const regTimeValidation = new RegExp(/^(?:([0-5]?\d):)([0-5]?\d)$/);

async function ParseSunoMessage(chat_id, text = "") {
	/** @type {{match: RegExpMatchArray; reg: RegExp; name: string; }[]} */
	let dic = [];

	function CheckMatch(reg = /1/, name = "") {
		const match = text.match(reg);

		if (match) {
			dic.push({
				match: match,
				reg: reg,
				name: name,
			});
		}
	}

	CheckMatch(regTrackId, "generation_id");
	CheckMatch(regTrackStart, "track_start");
	CheckMatch(regTrackTitle, "track_title");
	CheckMatch(regStyle, "track_style");
	CheckMatch(regLyrics, "track_lyrics");

	dic = dic.sort((a, b) => a.match.index - b.match.index);

	const data = {
		track_id: undefined,
		generation_id: undefined,
		track_start: undefined,
		track_meta: {
			track_start_number: undefined,
			is_uploaded: false,
			uniq_name: undefined,
		},

		track_title: undefined,

		track_style: "",
		track_lyrics: "",
	};

	for (let i = 0; i < dic.length; i++) {
		const value = dic[i];
		const end_index = i + 1 < dic.length ? dic[i + 1].match.index : undefined;

		data[value.name] = text.slice(value.match.index, end_index).replace(value.reg, "").trim();
	}

	if (data.generation_id) {
		const track = await GenerationHistory.findOne({
			where: {
				id: data.generation_id,
			},
		});

		if (!track) {
			return `Не найден трек с ID ${data.generation_id}\nнажмите на кнопку продлить трек еще раз`;
		}

		if (!data.track_start) {
			return `Отсутствует время с которого нужно продлять песню\nнажмите на кнопку продлить трек еще раз`;
		}

		if (!data.track_start.match(regTimeValidation)) {
			return `Не правильное формат начала времени трека\nнеобходим формат ММ:СС`;
		}

		const track_meta = JSON.parse(track.dataValues.meta);

		const start_text = data.track_start.split(":");
		const start_time = Number(start_text[0]) * 60 + Number(start_text[1]);

		data.track_meta.track_start_number = start_time;

		if (track_meta.duration < start_time) {
			const length = Math.floor(track_meta.duration);

			const second = `0${length % 60}`.slice(-2);
			const minute = Math.floor(length / 60);

			data.track_start = `${minute}:${second}`;
			data.track_meta.track_start_number = track_meta.duration;
		}

		data.track_meta.is_uploaded = track_meta.type === "upload";
		data.track_meta.uniq_name = track_meta.uniq_name;
		data.track_id = track_meta.track_id;
	}

	if (!data.track_style) {
		return "Отсутствует стиль музыки";
	}

	if (data.track_title) {
		data.track_title = data.track_title.slice(0, 70).trim();
	}

	data.track_style = data.track_style.slice(0, 110).trim();

	if (data.track_lyrics) {
		data.track_lyrics = data.track_lyrics.slice(0, 2800).trim();
	}

	return data;
}

/**
 * @param {UserData} userData
 * @param {string} text
 */
async function SendSunoGenerate(userData, text) {
	const suno_data = await ParseSunoMessage(userData.chat_id, text);

	if (typeof suno_data === "string") {
		return userData.SendPhoto(userData.PHOTO.SUNO, suno_data);
	}

	let instrumental = false;

	if (!suno_data.track_id) {
		const [service_data] = await ServiceSetting.findOrCreate({
			where: {
				chat_id: userData.chat_id,
				type: ServiceType.SUNO,
			},
			defaults: {
				chat_id: userData.chat_id,
				type: ServiceType.SUNO,
				meta: JSON.stringify(DefaultNeuronSettings[ServiceType.SUNO]),
			},
		});

		const data = JSON.parse(service_data.dataValues.meta);
		instrumental = data.INSTRUMENTAL ?? false;
	}

	const result = suno_generation.AddGeneration({
		chat_id: userData.chat_id,
		response_chat_id: userData.target_chat_id,
		thread_id: userData.thread_id,

		account_name: suno_data.track_meta.uniq_name,
		continue_at: suno_data.track_meta.track_start_number,
		uploaded_clip: suno_data.track_meta.is_uploaded,

		continue_clip_id: suno_data.track_id,

		prompt: suno_data.track_style,
		title: suno_data.track_title ?? (await client_openai.generateTitle(`Стиль:${suno_data.track_style}\nТекст:${suno_data.track_lyrics}`)),
		lyrics: suno_data.track_lyrics,
		instrumental: instrumental,
	});

	if (!result) {
		return userData.SendText("Произошла ошибка при добавлении запроса в очередь\nЭтот трек не возможно продолжить просим прощения за неудобства.");
	}

	const message = await SendWaitQueue(userData, result, ServiceType.SUNO);
	suno_generation.AddMessageToDelete(userData.chat_id, message.message_id);
}

/**
 * @param {UserData} userData
 */
async function EditSunoSettings(userData, type = "") {
	const BUTTONS = userData.CurrText.BUTTONS;
	const CommandsText = userData.CurrText.CommandsText;
	const key = [];

	const [service_data] = await ServiceSetting.findOrCreate({
		where: {
			chat_id: userData.chat_id,
			type: ServiceType.SUNO,
		},
		defaults: {
			chat_id: userData.chat_id,
			type: ServiceType.SUNO,
			meta: JSON.stringify(DefaultNeuronSettings[ServiceType.SUNO]),
		},
	});

	const data = JSON.parse(service_data.dataValues.meta);

	key.push([
		{
			text: BUTTONS.BACK,
			callback_data: `SendSuno`,
		},
	]);

	switch (type) {
		case "EXTENDED":
			data.EXTENDED = !data.EXTENDED;
			break;
		case "INSTRUMENTAL":
			data.INSTRUMENTAL = !data.INSTRUMENTAL;
			break;
	}

	await ServiceSetting.update(
		{
			meta: JSON.stringify(data),
		},
		{
			where: {
				chat_id: userData.chat_id,
				type: ServiceType.SUNO,
			},
		}
	);

	return SendSuno(userData);
}

function BooleanSmile(val = true) {
	return val ? "✅" : "❌";
}

function GetPageButtons(key, page, count, callback, offset = 5) {
	if (count <= offset) return;

	let pageCount = Math.ceil(count / offset);
	let keys = [];

	const pageOffsets = page * offset;

	if (pageOffsets - offset * 2 >= 0) {
		keys.push({
			text: `«1`,
			callback_data: `${callback}_${0}`,
		});
	} else {
		keys.push({
			text: " ",
			callback_data: "-1",
		});
	}

	if (pageOffsets - offset >= 0) {
		keys.push({
			text: `‹${page}`,
			callback_data: `${callback}_${page - 1}`,
		});
	} else {
		keys.push({
			text: " ",
			callback_data: "-1",
		});
	}

	keys.push({
		text: `·${page + 1}·`,
		callback_data: "-1",
	});

	if (pageOffsets + offset < count) {
		keys.push({
			text: `${page + 2}›`,
			callback_data: `${callback}_${page + 1}`,
		});
	} else {
		keys.push({
			text: " ",
			callback_data: "-1",
		});
	}

	if (pageOffsets + offset * 2 < count) {
		keys.push({
			text: `${pageCount}»`,
			callback_data: `${callback}_${pageCount - 1}`,
		});
	} else {
		keys.push({
			text: " ",
			callback_data: "-1",
		});
	}

	key.push(keys);
}
