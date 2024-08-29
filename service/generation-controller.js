const { ServiceType } = require("../enumerators.js");
const midjourney = require("./midjourney-api.js");
const TaskRunner = require("../utils/task-runner.js");
const fs = require("fs");
const bot = require("../bot.js");
const Keyv = require("keyv");
const { uploadFileToDiscord } = require("../utils/upload-image-discrod.js");
const { downloadFileFromUri, sleep } = require("../utils/index.js");
const UserData = require("../utils/user-data.js");
const GenerationHistory = require("../app/models/GenerationHistory.js");
const MidjourneyPromptBuilder = require("../utils/image/midjourney/midjourney-prompt-builder");
const FilePayload = require("../utils/file-payload.js");
const { uploadFileToGoogleDrive } = require("../utils/google-drive/google-drive-upload.js");
const sharp = require("sharp");
const { LogGeneration } = require("../utils/error-logger.js");
const { convertHtmlChars } = require("../utils/markdown-to-html/converters.js");

const mjData = new Keyv({
	namespace: "mdj",
	uri: `mysql://root:${SETTINGS.DB_PASSWORD}@127.0.0.1:3306/${SETTINGS.DB_NAME}`,
});

/**
 * @typedef {Object} MidjourneyTaskData
 * @property {number} chat_id
 * @property {number} response_chat_id
 * @property {number} thread_id
 *
 * @property {number} message_id
 * @property {number} index
 * @property {string} prompt
 * @property {string | undefined} hashId
 * @property {string | undefined} command
 * @property {string | undefined} photo_id
 *
 * @property {Date} request_start
 */

/**
 * @typedef {Object} StableDiffusionTaskData
 * @property {number} chat_id
 * @property {number} message_id
 * @property {string} photo_id
 * @property {string} prompt
 * @property {string} negative_prompt
 * @property {'faceSwap' | 'txt2img' | 'upscale'} type
 * @property {number} upscaling_resize
 */

/**
 * @type {Map<number, AbortController>}
 */
const abortList = new Map();

/** @type {{[key: string]: TaskRunner<TaskData>}} */
const midjourneyRunners = {};

let default_concurrent_task = 3;

for (let i = 0; i < midjourney.length; i++) {
	midjourneyRunners[midjourney[i].name] = new TaskRunner(MidjourneyTaskWarper, GenerationError, default_concurrent_task, 15 * 60_000);
}

const accounts_order = [
	{
		start: 0,
		end: 12,
	},
	{
		start: 12,
		end: 18,
	},
	{
		start: 12,
		end: 24,
	},
	{
		start: 8,
		end: 20,
	},
	{
		start: 8,
		end: 22,
	},
	{
		start: 8,
		end: 22,
	},
	{
		start: 8,
		end: 22,
	},
	{
		start: 8,
		end: 22,
	},
	{
		start: 8,
		end: 22,
	},
];

function getMidjourneyClient(name = "") {
	for (let i = 0; i < midjourney.length; i++) {
		if (midjourney[i].name === name) {
			return midjourney[i];
		}
	}

	throw new Error("Account not found");
}

/** @param {'fast' | 'relax'} mode */
module.exports.SetMidjourneyMode = async function (mode) {
	for (let i = 0; i < midjourney.length; i++) {
		const mj = midjourney[i];
		await mj.init();
		if (mode === "fast") {
			await mj.Fast();
		} else {
			await mj.Relax();
		}
	}
};

module.exports.GetMidjourneyInfo = async function () {
	const promises = [];

	for (let i = 0; i < midjourney.length; i++) {
		const mj = midjourney[i];

		promises.push(mj.Info());
	}

	return Promise.all(promises);
};

module.exports.CheckGeneration = function (chat_id) {
	for (const key in midjourneyRunners) {
		if (!Object.prototype.hasOwnProperty.call(midjourneyRunners, key)) continue;

		const runner = midjourneyRunners[key];
		const pos = runner.getTaskPosition(chat_id);

		if (pos.place === -1) continue;
		return pos;
	}

	return { place: -1, length: -1 };
};

module.exports.AddMessageToDelete = function (chat_id, message_id) {
	for (const key in midjourneyRunners) {
		if (!Object.prototype.hasOwnProperty.call(midjourneyRunners, key)) continue;

		const runner = midjourneyRunners[key];
		const pos = runner.getTaskPosition(chat_id);

		if (pos.place === -1) continue;
		runner.tasks[pos.place].data.message_to_delete = message_id;
		return pos;
	}

	return bot.deleteMessage(chat_id, message_id).catch((err) => {});
};

/**
 * @param {MidjourneyTaskData} task
 */
module.exports.AddParallelTask = function (task, lastIndex, priority = 0) {
	const taskRunners = midjourneyRunners;

	if (typeof lastIndex === "number") {
		lastIndex = midjourney[lastIndex].name;
	}

	const taskIndex = lastIndex === undefined ? GetParallelIndex(taskRunners) : lastIndex;
	const taskRunner = taskRunners[taskIndex];

	if (!taskRunner) return false;

	task.index = taskIndex;

	const pos = taskRunner.getTaskPosition(task.chat_id);

	if (pos.place >= 0) return { contains: true, place: pos.place, length: pos.length };

	// if (priority === 100) {
	//     MidjourneyTaskWarper(task);

	//     return { place: 0, length: 0 };
	// }

	task.request_start = new Date();

	taskRunner.addToQueue({
		id: task.chat_id,
		data: task,
		priority,
	});
	const count = taskRunner.length;

	return { place: count, length: count };
};

function CompareMidjourney(index1, index2) {
	return midjourneyRunners[midjourney[index1].name].total > midjourneyRunners[midjourney[index2].name].total;
}

function shuffle(array) {
	let currentIndex = array.length;

	while (currentIndex != 0) {
		const randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;
		[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
	}
}

function GetParallelIndex() {
	const date = new Date();
	const currHour = date.getHours();
	let accounts_active = [];

	for (let i = 0; i < accounts_order.length; i++) {
		if (i >= midjourney.length) break;

		const order = accounts_order[i];

		if (order.start <= currHour && currHour < order.end) {
			accounts_active.push(i);
		}
	}

	shuffle(accounts_active);

	let leadIndex = accounts_active[0];

	for (let i = 1; i < accounts_active.length; i++) {
		const nextIndex = accounts_active[i];

		if (CompareMidjourney(leadIndex, nextIndex)) {
			leadIndex = nextIndex;
		}
	}

	return midjourney[leadIndex].name;
}

module.exports.GetMidjourneyHash = function (chat_id, message_id) {
	return mjData.get(`${chat_id}_${message_id}`);
};

module.exports.SetMidjourneyHash = function (chat_id, message_id, data) {
	return mjData.set(`${chat_id}_${message_id}`, data);
};

module.exports.SetMaxTask = function (value) {
	for (const key in midjourneyRunners) {
		if (!Object.prototype.hasOwnProperty.call(midjourneyRunners, key)) continue;

		const runner = midjourneyRunners[key];
		runner.setMaxConcurrentTasks(value);
	}

	default_concurrent_task = value;
};

/**
 * @param {MidjourneyTaskData} task
 */
async function MidjourneyTaskWarper(task) {
	const userData = new UserData(task.chat_id);
	await userData.InitData();
	userData.target_chat_id = task.response_chat_id;
	userData.thread_id = task.thread_id;
	userData.is_callback = true;

	// await database.InsertRequestLog(task.chat_id, RequestLogType.MIDJOURNEY, task.hashId);

	console.log(`start task ${task.index} ${task.chat_id} ${task.prompt.slice(0, 10)}`);
	const request_timestamp = new Date();
	const request_start_timestamp = task.request_start;

	delete task.request_start;

	const action_interval = userData.SetChatAction("upload_photo");

	try {
		SoftReload(task.index);

		if (task.hashId) {
			await MidjourneyCallbackTask(userData, task);
		} else {
			await MidjourneyTask(userData, task);
		}

		SoftReload(task.index);

		LogGeneration({
			type: "midjourney",
			status: "success",
			request: task,
			request_timestamp: request_timestamp,
            request_start: request_start_timestamp,
		});
	} catch (err) {
		console.log(err);

		err.message = err.message.replace(/<t:(\d*)(:R)?>/g, (match) => {
			const timestamp = match.replace(/<t:(\d*)(:R)?>/g, "$1");
			const date = new Date(Number(timestamp) * 1000);
			return date.toLocaleDateString("ru-RU", { hour12: false, hour: "numeric", minute: "numeric" });
		});

		LogGeneration({
			type: "midjourney",
			status: "error",
			request: task,
			response: err.message,
			request_timestamp: request_timestamp,
            request_start: request_start_timestamp,
		});

		userData.SendNotification(userData.CurrText.Notification.ERROR_MESSAGE_GENERATION.replace(/{reason}/g, err.message));
	} finally {
		clearInterval(action_interval);
	}

	console.log(`done task ${task.chat_id} ${task.prompt.slice(0, 10)}`);

	if (task.message_to_delete) return bot.deleteMessage(userData.target_chat_id, task.message_to_delete).catch((err) => {});
}

async function SoftReload(account_name) {
	const account = getMidjourneyClient(account_name);

	if (account.connectionTime === -1) return;

	const runner = midjourneyRunners[account_name];

	if (account.connectionTime < Date.now() - 2 * 60 * 60_000 && runner.total === 1) {
		runner.setMaxConcurrentTasks(default_concurrent_task);
		console.log(`---- socket close ${account_name}`);
		return account.Close();
	}

	if (account.connectionTime < Date.now() - 8 * 60 * 60_000) {
		runner.setMaxConcurrentTasks(0);
	}
}

/**
 * @param {MidjourneyTaskData} task
 */
async function GenerationError(task) {
	const userData = new UserData(task.chat_id);
	await userData.InitData();

	userData.target_chat_id = task.response_chat_id;
	userData.thread_id = task.thread_id;
	userData.is_callback = true;

	const Notification = userData.CurrText.Notification;

	return userData.SendNotification(userData.CurrText.Notification.ERROR_MESSAGE_GENERATION.replace(/{reason}/g, Notification.EXPIRE_REASON));
}

/**
 * @param {UserData} userData
 * @param {MidjourneyTaskData} param2
 */
async function MidjourneyTask(userData, { message_id, prompt, index, command, photo_id }) {
	const prompt_builder = new MidjourneyPromptBuilder(prompt, command);
	await prompt_builder.TranslatePrompt();
	const prompt_limited = prompt_builder.GetDescription();

	const ar = prompt_builder.aspect_ratio;
	const account = getMidjourneyClient(index);

	if (photo_id) {
		const photo_path = await bot.downloadFile(photo_id, "./tmp");
		const photo_url = await uploadFileToDiscord(photo_path, account.config.ChannelId, account.config.SalaiToken);
		fs.unlinkSync(photo_path);

		if (prompt_builder.MatchParam(/(v|version) (6|6\.0)/)) {
			prompt_builder.AddParam("cref", photo_url);
		} else {
			prompt_builder.AddLink(photo_url);
		}
	}

	let sending = false;
	userData.log_errors = false;
	const imagine = await account.Imagine(prompt_builder.ToString(), async (url, progress) => {
		if (sending) return;
		sending = true;
		await userData.SendPhoto(CompressUrl(url, ar, 512), `${prompt_limited} ${progress}`, [], message_id);
		sending = false;
	});
	await sleep(2000);
	userData.log_errors = true;

	prompt_builder.UpdateLinks(imagine.content);
	imagine.uri = CompressUrl(imagine.uri, ar);

	/** @type {import("node-telegram-bot-api").InlineKeyboardButton[][]} */
	const key = [];
	const hashData = ParseMidjourneyKey(imagine.options, key);

	key.push([
		{
			text: userData.CurrText.BUTTONS.SETTINGS,
			callback_data: "SendMidjourneySettings_saveMjKey",
		},
	]);

	const message = await userData.SendPhoto(imagine.uri, prompt_builder.GetDescription(true), key, message_id);

	await mjData.set(`${userData.target_chat_id}_${message.message_id}`, {
		image_id: imagine.id,
		image_flags: imagine.flags,
		prompt: prompt_builder.ToString(true),
		index: index,
		hash_data: hashData,
	});
}

// var request = require('request').defaults({ encoding: null });
// request.get('https://cdn.midjourney.com/e08eb374-d503-4c9d-a208-33a36df9e922/0_1.webp', function (error, response, body) {
//     // data = "data:" + response.headers["content-type"] + ";base64," + Buffer.from(body).toString('base64');
//     fs.writeFileSync('tmp/test.webp', body);
// });
// upsample_v5_2x
// upsample_v5_4x

/**
 * @param {UserData} userData
 * @param {MidjourneyTaskData} param2
 */
async function MidjourneyCallbackTask(userData, { message_id, hashId, index, command }) {
	userData.ClearMediaMessage();
	userData.is_callback = false;
	const data = await mjData.get(`${userData.target_chat_id}_${message_id}`);

	const prompt_builder = new MidjourneyPromptBuilder(data.prompt, command);
	const prompt_limited = prompt_builder.GetDescription();
	const ar = prompt_builder.aspect_ratio;

	let customId = "";
	let type = "";

	if (typeof data.hash_data !== "object") {
		const custom = hashId.split("::");
		type = custom[0];
		const variation = custom[1];
		const solo = custom[2] ? `::${custom[2]}` : "";
		customId = `MJ::JOB::${type}::${variation}::${data.hash_data}${solo}`;
	} else {
		customId = data.hash_data[hashId];
		type = customId.split("::")[2];
	}

	let sended = true;
	userData.log_errors = false;
	const account = getMidjourneyClient(index);
	const imagine = await account.Custom({
		customId: customId,
		msgId: data.image_id,
		flags: data.image_flags,
		content: data.prompt,
		loading: async (url, progress) => {
			if (!sended) return;
			sended = false;
			await userData.SendPhoto(CompressUrl(url, ar, 512), `${prompt_limited} ${progress}`, [], message_id);
			sended = true;
		},
	});

	await sleep(2000);
	userData.log_errors = true;

	/** @type {import("node-telegram-bot-api").InlineKeyboardButton[][]} */
	const key = [];

	if (type === "variation" || type == "reroll") {
		const hashData = ParseMidjourneyKey(imagine.options, key, type);

		key.push([
			{
				text: userData.CurrText.BUTTONS.SETTINGS,
				callback_data: "SendMidjourneySettings_saveMjKey",
			},
		]);

		const message = await userData.SendPhoto(CompressUrl(imagine.uri, ar), convertHtmlChars(prompt_builder.GetDescription(true)), key, message_id);

		await mjData.set(`${userData.target_chat_id}_${message.message_id}`, {
			image_id: imagine.id,
			image_flags: imagine.flags,
			prompt: data.prompt,
			index: index,
			hash_data: hashData,
		});

		return;
	}

	if (type === "upsample") {
		// const hashData = ParseMidjourneyKey(imagine.options, key, type);
		const filePathPng = await downloadFileFromUri(imagine.uri);
		const filePath = `${filePathPng.split(".").shift()}.webp`;

		let width = 1080;
		let height = 1080;

		if (1 < ar) width = Math.floor(1080 * ar);
		else height = Math.floor(1080 / ar);

		await sharp(filePathPng).resize(width, height).toFormat("webp").toFile(filePath);
		fs.unlinkSync(filePathPng);

		const id = IDHalf();
		const filePayload = new FilePayload(filePath, "image/webp");
		const driveLinks = await uploadFileToGoogleDrive(filePath.split("/")[1], filePayload, `Сервис: Midjourney\n${prompt_builder.ToString()}`);

		// key.push([
		// 	{
		// 		text: "❤️",
		// 		callback_data: `MakeFavorite_${id}`,
		// 	},
		// ]);

		key.push([
			{
				text: "Промпт",
				switch_inline_query_current_chat: `\n${prompt_builder.ToString()}`,
			},
		]);

		if (userData.thread_id) {
			key.push([
				{
					text: "🔧 Промпт",
					switch_inline_query: `\n${prompt_builder.ToString()}`,
				},
			]);
		}

		key.push([
			{
				text: "Ссылка на файл",
				url: driveLinks.viewLink,
			},
		]);

		await userData.SendPhoto(CompressUrl(imagine.uri, ar, 2048), "", key, message_id);
		// const message = await bot.sendDocument(userData.target_chat_id, filePath, {
		// 	parse_mode: "HTML",
		// 	message_thread_id: userData.thread_id,
		// 	thumbnail: CompressUrl(imagine.uri, ar, 128),
		// 	reply_markup: {
		// 		inline_keyboard: key,
		// 	},
		// });

		filePayload.Dispose();

		await StoreGeneration(id, userData, ServiceType.MIDJOURNEY, {
			google_url: driveLinks,
			prompt: prompt_builder.ToString(),
		});

		// await mjData.set(`${userData.chat_id}_${message.message_id}`, {
		// 	image_id: imagine.id,
		// 	image_flags: imagine.flags,
		// 	prompt: data.prompt,
		// 	index: index,
		// 	hash_data: hashData,
		// });

		return;
	}

	const file = await downloadFileFromUri(imagine.uri);
	const filePathWebp = `${filePathPng.split(".").shift()}.webp`;

	await sharp(file).toFormat("webp").toFile(filePathWebp);

	fs.unlink(file, () => {});

	await bot.sendDocument(userData.target_chat_id, filePathWebp, {
		parse_mode: "HTML",
		message_thread_id: userData.thread_id,
		reply_to_message_id: message_id,
		thumbnail: CompressUrl(imagine.uri, ar, 128),
		reply_markup: {
			inline_keyboard: key,
		},
	});

	fs.unlink(filePathWebp, () => {});

	bot.deleteMessage(userData.target_chat_id, userData.message_id).catch((err) => {});
}

function TrimText(text = "", limit = 1000) {
	text = text.trim();

	if (text.length <= limit) return text;

	text = text.slice(0, limit);

	lastSpace = text.lastIndexOf(" ");

	if (lastSpace > 0) text = text.substring(0, lastSpace);

	return text + "...";
}

function GetAspectRatio(text = "") {
	const match = text.match(/(--ar|--aspect) \d*:\d*/);
	if (!match) return 1;
	const d = match[0].replace(/--ar|--aspect/g, "").split(":");

	return Number(d[0]) / Number(d[1]);
}

/**
 * @param {MJOptions[]} opts
 * @param {import("node-telegram-bot-api").InlineKeyboardButton[][]} keys
 */
function ParseMidjourneyKey(opts, keys, type = "variation") {
	let hashData = "";

	if (type.startsWith("upsample")) {
		keys.push(opts.slice(0, 2));
	}

	if (type === "variation" || type == "reroll") {
		keys.push(opts.slice(0, 4));
		keys.push(opts.slice(5, 9));
		keys.push(opts.slice(4, 5));
	}

	for (let i = 0; i < keys.length; i++) {
		const key_line = keys[i];

		keys[i] = key_line.map((value) => {
			const data = value.custom.split("::");
			const type = data[2];
			const variation = data[3];
			hashData = data[4];
			const solo = data[5] ? `::${data[5]}` : ``;

			return {
				text: value.label,
				callback_data: `${type}::${variation}${solo}`,
			};
		});
	}

	return hashData;
}

function CompressUrl(url, ar, size = 1024) {
	url = url.replace("cdn.discordapp.com", "media.discordapp.net");

	let width = size;
	let height = size;

	if (1 > ar) width = Math.floor(size * ar);
	else height = Math.floor(size / ar);

	return `${url}&quality=lossless&width=${width}&height=${height}`;
}

function IDHalf() {
	let S4 = function () {
		return (((1 + Math.random()) * 0xfffffff) | 0).toString(36).substring(1);
	};
	return `${S4()}${S4()}${S4()}`;
}

/**
 * @param {UserData} userData
 * @param {number} service_type
 * @param {object} meta
 */
function StoreGeneration(id, userData, service_type, meta) {
	return GenerationHistory.create({
		id: id,
		chat_id: userData.chat_id,
		service_type: service_type,
		meta: JSON.stringify(meta),
	});
}
