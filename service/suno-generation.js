const TelegramBot = require("node-telegram-bot-api");
const bot = require("../bot");
const { SunoClient } = require("../utils/music/suno/client");
const TaskRunner = require("../utils/task-runner");
const { Translate } = require("./danya-vecher-api");
const { GenerationHistory } = require("../app/models");
const { ServiceType } = require("../enumerators");
const { TrimText, sleep, GenerateId } = require("../utils");
const fs = require("fs");
const FilePayload = require("../utils/file-payload");
const { uploadFileToGoogleDrive } = require("../utils/google-drive/google-drive-upload");
const { default: axios } = require("axios");
const { LogGeneration } = require("../utils/error-logger.js");
const UserData = require("../utils/user-data.js");
const crypto = require("node:crypto");

async function downloadFileFromUri(uri = "", file_name = "") {
	const filename = `tmp/${file_name}`;

	const response = await axios({
		method: "get",
		url: uri,
		responseType: "stream",
	});
	const writer = fs.createWriteStream(filename);
	response.data.pipe(writer);

	return new Promise((resolve) => {
		writer.on("close", async () => {
			resolve(filename);
		});
	});
}
/**
 * @typedef {Object} SunoTaskData
 * @property {string?} account_name
 *
 * @property {number} chat_id
 * @property {number} response_chat_id
 * @property {number} thread_id
 *
 * @property {string} title
 * @property {string} prompt
 * @property {string} lyrics
 * @property {boolean} instrumental
 * @property {number?} continue_at
 * @property {number?} continue_clip_id
 * @property {boolean?} uploaded_clip
 * 
 * @property {Date} request_start
 */

/** @type {TaskRunner<SunoTaskData>} */
const task_runner = new TaskRunner(ProcessTask, GenerationError, 5);

/** @type {SunoClient[]} */
const suno_clients = [];

for (let i = 0; i < SETTINGS.SUNO_AUTH.length; i++) {
	const data = SETTINGS.SUNO_AUTH[i];
	suno_clients.push(new SunoClient(data.session, data.cookie, data.uniq_name));
}

let lead_client = suno_clients[0];

setInterval(UpdateLeadClient, 2 * 60 * 1000);

async function UpdateLeadClient() {
	/** @type {Promise<number>[]} */
	const promises = [];
	const tokens = [];

	for (let i = 0; i < suno_clients.length; i++) {
		const client = suno_clients[i];
		promises.push(client.total_credits_left());
	}

	const results = await Promise.all(promises);

	for (let i = 0; i < results.length; i++) {
		const result = results[i];

		tokens.push({
			token: result,
			client: suno_clients[i],
		});
	}

	tokens.sort((a, b) => b.token - a.token);

	lead_client = tokens[0].client;

	const sum = tokens.map((v) => v.token).reduce((s, c) => s + c, 0);

	console.log(`${tokens[0].client.uniq_name} credits left ${tokens[0].token} (${sum})`);

	return tokens;
}

UpdateLeadClient();

function getApiAccount(name = "") {
	for (let i = 0; i < suno_clients.length; i++) {
		if (suno_clients[i].uniq_name === name && suno_clients[i].active_account) {
			return suno_clients[i];
		}
	}

	throw new Error("Account not found");
}

const suno_generation = {};

suno_generation.SetMaxTask = function (amount) {
	task_runner.setMaxConcurrentTasks(amount);
};

suno_generation.GetStats = async function () {
	return (await UpdateLeadClient()).map((v) => {
		return { token: v.token, name: v.client.uniq_name };
	});
};

suno_generation.CheckGeneration = function (chat_id) {
	return task_runner.getTaskPosition(chat_id);
};

suno_generation.AddMessageToDelete = function (chat_id, message_id) {
	const pos = task_runner.getTaskIndex(chat_id);
	if (pos === -1) return bot.deleteMessage(chat_id, message_id).catch((err) => {});
	task_runner.tasks[pos].data.message_to_delete = message_id;
};

/**
 * @param {SunoTaskData} task
 */
suno_generation.AddGeneration = function (task) {
	const pos = task_runner.getTaskPosition(task.chat_id);

	if (task.account_name) {
		try {
			getApiAccount(task.account_name);
		} catch (error) {
			return false;
		}
	}

	if (pos.place >= 0) return { contains: true, place: pos.place, length: pos.length };

    task.request_start = new Date();

	task_runner.addToQueue({
		id: task.chat_id,
		data: task,
		priority: 0,
	});

	const count = task_runner.length;

	return { place: count, length: count };
};

/**
 * @param {UserData} userData
 * @param {string} file_name
 * @param {string} file_id
 */
suno_generation.UploadAudio = async function (userData, file_name, file_id) {
	console.log("start upload file");
	const client = lead_client;
	let file_path = await bot.downloadFile(file_id, "./tmp");

	if (file_path.match(/\.oga$/)) {
		const old = file_path;
		file_path = file_path.replace(/\.oga$/, ".ogg");
		fs.renameSync(old, file_path);
	}

	const file_payload = new FilePayload(file_path, "", file_name.replace(/\.oga$/, ".ogg"));
	const message = await userData.SendText("Идет загрузка трека на сервер...", [], "HTML", userData.message_id);

	try {
		const track_data = await client.UploadFile(file_payload);
		const tack_length = track_data.duration;
		const id = crypto.randomUUID();
		await GenerationHistory.create({
			id: id,
			chat_id: userData.chat_id,
			meta: JSON.stringify({ ...track_data, uniq_name: client.uniq_name }),
			service_type: ServiceType.SUNO,
		});

		const extend_buttons = GetExtendButton(userData.thread_id, id, tack_length, track_data.title);

		await userData.SendAudio(file_path, "", extend_buttons);
	} catch (err) {
		bot.deleteMessage(userData.target_chat_id, message.message_id).catch((err) => {});
		userData.is_callback = false;
		userData.SendText(`При загрузке трека произошла ошибка, повторите попытку.\nПричина:\n\n<pre>${err.message}</pre>`);
	} finally {
		bot.deleteMessage(userData.target_chat_id, message.message_id).catch((err) => {});
		file_payload.Dispose();
	}
	console.log(`upload finish`);
};

/**
 * @param {SunoTaskData} data
 */
async function ProcessTask(data) {
	while (!lead_client) {
		await sleep(2000);
	}

	const userData = new UserData(data.chat_id);
	await userData.InitData();
	userData.target_chat_id = data.response_chat_id;
	userData.thread_id = data.thread_id;
	userData.is_callback = true;

	console.log(`start audio ${data.chat_id}`);
	const request_timestamp = new Date();
	const request_start_timestamp = data.request_start;

	delete data.request_start;

	const action_interval = userData.SetChatAction("record_voice");

	try {
		if (!data.account_name && task_runner.total === 5) {
			await UpdateLeadClient();
		}

		await GenerateAudio(userData, data);

		LogGeneration({
			request: data,
			request_timestamp: request_timestamp,
            request_start: request_start_timestamp,
			status: "success",
			type: "suno",
		});
	} catch (err) {
		console.log(err);

		LogGeneration({
			request: data,
			response: err.message,
			request_timestamp: request_timestamp,
            request_start: request_start_timestamp,
			status: "success",
			type: "suno",
		});

		userData.SendText(`При генерации запроса произошла ошибка, повторите попытку.\nПричина:\n\n<pre>${err.message}</pre>`);
	} finally {
		clearInterval(action_interval);

		if (data.message_to_delete) {
			bot.deleteMessage(data.response_chat_id, data.message_to_delete).catch((err) => {});
		}
	}

	console.log(`done audio ${data.chat_id} (${task_runner.total - 1}/${task_runner.maxConcurrentTasks})`);
}

/**
 * @param {UserData} userData
 * @param {SunoTaskData} data
 */
async function GenerateAudio(userData, data) {
	const client = data.account_name ? getApiAccount(data.account_name) : lead_client;

	if (!client.active_account) {
		if (data.account_name) {
			throw new Error("Извините невозможно продлить трек");
		} else {
			throw new Error("Извините невозможно сгенерировать трек");
		}
	}

	let response;
	let error_message;

	for (let i = 0; i < 1; i++) {
		try {
			response = await client.processTask({
				uploaded_clip: data.uploaded_clip,
				continue_at: data.continue_at,
				continue_clip_id: data.continue_clip_id,

				description: data.prompt,
				instrumental: data.instrumental,
				lyrics: data.lyrics,
				title: data.title.slice(0, 60),
			});

			break;
		} catch (error) {
			error_message = error.message;
			console.log(error);
		}
	}

	if (!response) throw new Error(`Ошибка при генерации\n${error_message}`);

	for (let i = 0; i < response.length; i++) {
		const generated_result = response[i];
		await SendTrack(i, userData, generated_result, client);
	}
}

/**
 * @param {UserData} userData
 * @param {string} generation_id
 * @param {import("../utils/music/suno/client").SunoTrackData} generated_result
 * @param {SunoClient} client
 */
async function SendTrack(index, userData, generated_result, client) {
	const file_name = `${generated_result.title.replace(/\//g, "\u2215")} ${index + 1}.mp3`;
	const file_path = await downloadFileFromUri(generated_result.audio_url, file_name);
	const file = new FilePayload(file_path, "audio/mp3");
	const url = await uploadFileToGoogleDrive(
		`${generated_result.title} ${index + 1}.mp3`,
		file,
		`Сервис: Suno\nНазвание: ${generated_result.title}\nОписание: ${generated_result.description}\nТекст: ${generated_result.lyrics}`
	);

    const id = crypto.randomUUID();
	await GenerationHistory.create({
		id: id,
		chat_id: userData.chat_id,
		meta: JSON.stringify({ ...generated_result, uniq_name: client.uniq_name, google_url: url }),
		service_type: ServiceType.SUNO,
	});

	const key = GetExtendButton(userData.thread_id, id, generated_result.duration, generated_result.title, generated_result.description);

	key.unshift([
		{
			text: "Ссылка на файл",
			url: url.viewLink,
		},
	]);

	const text = `Название: ${generated_result.title}\nСтили: ${generated_result.description}\nТекст: ${generated_result.lyrics}`;

	const send_settings = {
		message_thread_id: userData.thread_id,
		reply_markup: {
			inline_keyboard: key,
		},
		caption: TrimText(text, 1000),
	};

	try {
		await TrySendFile(userData, send_settings, file_name, [url.downloadLink, file.src, generated_result.audio_url]);
	} catch (error) {
		console.log(error);

		throw new Error("Ошибка при отправке файла " + generated_result.audio_url);
	} finally {
		file.Dispose();
	}
}

/**
 * @param {UserData} userData
 * @param {*} settings
 * @param {*} file_name
 * @param {*} files
 * @returns
 */
async function TrySendFile(userData, settings, file_name, files = []) {
	for (let i = 0; i < files.length; i++) {
		const file = files[i];

		try {
			await bot.sendAudio(userData.target_chat_id, file, settings, {
				filename: file_name,
			});

			return;
		} catch (error) {
			console.log(error);
		}
	}

	throw new Error("File send Error");
}

/** @returns {TelegramBot.InlineKeyboardButton} */
function GetExtendButton(thread_id, id, length, title = "", style = "") {
	length = Math.floor(length);

	const second = `0${length % 60}`.slice(-2);
	const minute = Math.floor(length / 60);
	const button_text = `\nЗаджигли это👇\n\nID трека: ${id}\nПродлить с: ${minute}:${second}\n\nНазвание: ${title}\n\nСтили: ${style}\n\nТекст:`;

	const key = [
		[
			{
				text: "Продлить трек",
				switch_inline_query_current_chat: button_text,
			},
		],
	];

	if (thread_id) {
		key.push([
			{
				text: "🔧 Продлить трек",
				switch_inline_query: button_text,
			},
		]);
	}

	return key;
}

/**
 * @param {SunoTaskData} data
 */
async function GenerationError(data) {}

module.exports = suno_generation;
