const { GenerationHistory } = require("../app/models");
const { ServiceType } = require("../enumerators");
const FilePayload = require("../utils/file-payload");
const MidjourneyPromptBuilder = require("../utils/image/midjourney/midjourney-prompt-builder");
const midjourney_clients = require("../utils/image/midjourney/midjourney_clients");
const TaskRunner = require("../utils/task-runner");
const UserData = require("../utils/user-data");

/**
 * @typedef {Object} TaskData
 *
 * @property {number} chat_id
 * @property {string} account_name
 * @property {string} prompt
 * @property {string=} job_id
 * 
 * @property {number=} message_id
 * @property {MidjourneyPromptBuilder.CustomStyles=} styles
 * @property {FilePayload[]=} files
 */

/**
 * @typedef {Object} TaskInput
 * @property {number} chat_id
 * @property {string=} prompt
 * @property {string=} account_name
 * @property {string=} job_id
 * 
 * @property {number=} message_id
 * @property {MidjourneyPromptBuilder.CustomStyles=} styles
 * @property {FilePayload[]=} files
 */

const midjourney_generation = {};

/** @type {{[key: string]: TaskRunner<TaskData>}} */
const generationQueue = {};

for (let i = 0; i < midjourney_clients.length; i++) {
	generationQueue[midjourney_clients[i].name] = new TaskRunner(ProcessTask, ExpireTask, 3);
}

/**
 * @param {number} chat_id
 */
function getTaskPositionAll(chat_id) {
	for (const key in generationQueue) {
		if (!Object.prototype.hasOwnProperty.call(generationQueue, key)) continue;

		const runner = generationQueue[key];
		const pos = runner.getTaskPosition(chat_id);

		if (pos.place === -1) continue;

		return pos;
	}

	return { place: -1, length: -1 };
}

function getActiveAccount() {
	const date = new Date();
	const currHour = Math.floor(date.getHours() / 12) + 1;

	generationQueue;
	const index = currHour % midjourney_clients.length;

	return midjourney_clients[Math.floor(index)].name;
}

function getMidjourneyClient(name = "") {
	for (let i = 0; i < midjourney_clients.length; i++) {
		if (midjourney_clients[i].name === name) {
			return midjourney_clients[i];
		}
	}

	throw new Error("Account not found");
}

/** @param {UserData} userData */
midjourney_generation.GetGenerationMeta = async function (userData) {
	const generation = await GenerationHistory.findOne({
		where: {
			chat_id: userData.chat_id,
			id: userData.message_id,
		},
	});

    if (!generation) return;
    
	return JSON.parse(generation.dataValues.meta);
};

/**
 * @param {TaskInput} task
 */
midjourney_generation.AddTask = function (task, priority = 0) {
	const position = getTaskPositionAll(task.chat_id);

	if (position.place !== -1) return position;

	const name = task.account_name ?? getActiveAccount();
	const taskRunner = generationQueue[name];

	taskRunner.addToQueue({
		id: task.chat_id,
		data: {
			account_name: name,
			chat_id: task.chat_id,
			prompt: task.prompt.replace(/—/g, "--"),
			message_id: task.message_id,

            job_id: task.job_id,

			styles: task.styles,
			files: task.files,
		},
		priority,
	});

	return taskRunner.getTaskPosition(task.chat_id);
};

/** @param {UserData} userData */
midjourney_generation.RestoreKey = async function (userData) {
	const generation = await GenerationHistory.findOne({
		where: {
			chat_id: userData.chat_id,
			id: userData.message_id,
		},
	});

	if (!generation) return [];

	const meta = JSON.parse(generation.dataValues.meta);

	/** @type {import("node-telegram-bot-api").InlineKeyboardButton[][]} */
	return SerializeMidjourneyKeys(meta.actions_list, meta.job_type);
};

/**
 * @param {TaskData} data
 */
async function ProcessTask(data) {
	const userData = new UserData(data.chat_id);
	await userData.InitData();
	userData.is_callback = true;

	const action_interval = userData.SetChatAction("upload_photo");

	try {
		if (data.job_id) {
			await CustomTask(userData, data);
		} else {
			await ImagineTask(userData, data);
		}
	} catch (error) {
		console.log(error);
	} finally {
		data.files?.forEach((v) => {
			v.Dispose();
		});
	}
}

/**
 * @param {UserData} userData
 * @param {TaskData} data
 */
async function ImagineTask(userData, data) {
	const prompt_data = new MidjourneyPromptBuilder(data.prompt, data.styles);
	await prompt_data.TranslatePrompt();

	const client = getMidjourneyClient(data.account_name);

	if (data.files) {
		for (let i = 0; i < data.files.length; i++) {
			const link = await client.UploadImage(data.files[i]);

			if (i === 0 && prompt_data.MatchParam(/(v|version) (6|6\.0)/)) {
				prompt_data.AddParam("cref", link);
			} else {
				prompt_data.AddLink(link);
			}
		}
	}

	console.log(prompt_data.ToString());

	let sended = true;

	const imagine_result = await client.api.Imagine(prompt_data.ToString(), async (url, progress) => {
		if (!sended) return;
		sended = false;
		const compress_url = client.CompressImageUrl(url, prompt_data.aspect_ratio, 512);
		await userData.SendPhoto(compress_url, `${prompt_data.GetDescription()} ${progress}`);
		sended = true;
	});

	if (!imagine_result) throw new Error("imagine_result undefined");
	if (!imagine_result.options) throw new Error("options undefined");

	prompt_data.UpdateLinks(imagine_result.content);

	const options = client.ParseMidjourneyOptions(imagine_result.options);
	const compress_img = client.CompressImageUrl(imagine_result.uri, prompt_data.aspect_ratio);

	/** @type {import("node-telegram-bot-api").InlineKeyboardButton[][]} */
	const key = SerializeMidjourneyKeys(options.actions_list, "imagine");

	key.push([
		{
			text: userData.CurrText.BUTTONS.SETTINGS,
			callback_data: "SendMidjourneySettings_saveMjKey",
		},
	]);

	const message = await userData.SendPhoto(compress_img, prompt_data.GetDescription(), key);

	await GenerationHistory.create({
		chat_id: data.chat_id,
		id: message.message_id,
		service_type: ServiceType.MIDJOURNEY,
		meta: JSON.stringify({
			msg_id: options.id,
			flags: options.flags,

			job_id: options.job_id,
			actions_list: options.actions_list,

			job_type: "imagine",
			account_name: client.name,
			prompt: prompt_data.ToString(),
			img_url: imagine_result.uri,
		}),
	});
}

/**
 * @param {UserData} userData
 * @param {TaskData} data
 */
async function CustomTask(userData, data) {
	if (!data.message_id) throw new Error("No Generation ID");

	const generation = await GenerationHistory.findOne({
		where: {
			id: data.message_id,
			chat_id: data.chat_id,
		},
	});

	if (!generation) throw new Error("Generation not found");

	userData.ClearMediaMessage();
	userData.is_callback = false;

	const meta = JSON.parse(generation.dataValues.meta);

	const prompt_data = new MidjourneyPromptBuilder(meta.prompt);

	const account = getMidjourneyClient(data.account_name);

	console.log(prompt_data.ToString());

	let sended = true;

	const imagine_result = await account.Custom({
		customId: data.job_id,
		msgId: meta.msg_id,
		flags: data.flags,

		content: data.prompt,
		loading: async (url, progress) => {
			if (!sended) return;
			sended = false;
			const compress_url = client.CompressImageUrl(url, prompt_data.aspect_ratio, 512);
			await userData.SendPhoto(compress_url, `${prompt_data.GetDescription()} ${progress}`, data.message_id);
			sended = true;
		},
	});

	if (!imagine_result) throw new Error("imagine_result undefined");
	if (!imagine_result.options) throw new Error("options undefined");

	const options = client.ParseMidjourneyOptions(imagine_result.options);
	const compress_img = client.CompressImageUrl(imagine_result.uri, prompt_data.aspect_ratio);

	/** @type {import("node-telegram-bot-api").InlineKeyboardButton[][]} */
	const key = SerializeMidjourneyKeys(options.actions_list, data.job_id);

	key.push([
		{
			text: userData.CurrText.BUTTONS.SETTINGS,
			callback_data: "SendMidjourneySettings_saveMjKey",
		},
	]);

	const message = await userData.SendPhoto(compress_img, prompt_data.GetDescription(), key);

	await GenerationHistory.create({
		chat_id: data.chat_id,
		id: message.message_id,
		service_type: ServiceType.MIDJOURNEY,
		meta: JSON.stringify({
			msg_id: options.id,
			flags: options.flags,

			job_id: options.job_id,
			actions_list: options.actions_list,

			job_type: data.job_id,
			account_name: client.name,
			prompt: prompt_data.ToString(),
			img_url: imagine_result.uri,
		}),
	});
}

/**
 *
 * @param {{ label: string; action_data: string; }[]} options
 * @param {'imagine' | 'upscale' | 'reroll' | 'variation'} type
 */
function SerializeMidjourneyKeys(options, type, db_id) {
	/** @type {any[][]} */
	const tg_keys = [];

	switch (type) {
		case "upscale":
			tg_keys.push(options.slice(0, 2));
			break;
		case "reroll":
		case "variation":
		case "imagine":
			tg_keys.push(options.slice(0, 4));
			tg_keys.push(options.slice(5, 9));
			tg_keys.push(options.slice(4, 5));
			break;

		default:
			for (let i = 0; i < options.length; i += 4) {
				tg_keys.push(options.slice(0, 4));
			}
			break;
	}

	for (let i = 0; i < tg_keys.length; i++) {
		tg_keys[i] = tg_keys[i].map((v) => {
			return {
				text: v.label,
				callback_data: v.action_data,
			};
		});
	}

	return tg_keys;
}

/**
 * @param {TaskData} task
 */
async function ExpireTask(task) {
	const userData = new UserData(task.chat_id);
	await userData.InitData();
	userData.is_callback = true;
	const Notification = userData.CurrText.Notification;

	return userData.SendNotification(userData.CurrText.Notification.ERROR_MESSAGE_GENERATION.replace(/{reason}/g, Notification.EXPIRE_REASON));
}

function IDHalf() {
	let S4 = function () {
		return (((1 + Math.random()) * 0xfffffff) | 0).toString(36).substring(1);
	};
	return `${S4()}${S4()}${S4()}`;
}

module.exports = midjourney_generation;
