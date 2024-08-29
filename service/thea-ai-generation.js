const bot = require("../bot");
const TaskRunner = require("../utils/task-runner");
const { TrimText, GenerateId } = require("../utils");
const fs = require("fs");
const FilePayload = require("../utils/file-payload");
const { uploadFileToGoogleDrive } = require("../utils/google-drive/google-drive-upload");
const TheaAiApi = require("../utils/image/thea-ai/thea-ai-api");
const sharp = require("sharp");
const { LogGeneration } = require("../utils/error-logger");
const sizeOf = require("buffer-image-size");
const UserData = require("../utils/user-data.js");

/**
 * @typedef {Object} TheaAiTaskData
 * @property {number} chat_id
 * @property {number} response_chat_id
 * @property {number} thread_id
 *
 * @property {Date} request_start
 *
 * @property {number} message_id
 * @property {number=} message_to_delete
 * @property {string} prompt
 * @property {TheaAiApi.TheaAiModels} model
 * @property {string} photo_id
 */

/** @type {TaskRunner<TheaAiTaskData>} */
const task_runner = new TaskRunner(ProcessTask, GenerationError, 1);

const thea_ai_genearation = {};

thea_ai_genearation.CheckGeneration = function (chat_id) {
	return task_runner.getTaskPosition(chat_id);
};

thea_ai_genearation.SetMaxTask = function (amount) {
	task_runner.setMaxConcurrentTasks(amount);
};

thea_ai_genearation.AddMessageToDelete = function (chat_id, serviceType, message_id) {
	const pos = task_runner.getTaskIndex(chat_id);
	if (pos === -1) return bot.deleteMessage(chat_id, message_id).catch((err) => {});
	task_runner.tasks[pos].data.message_to_delete = message_id;

	// return bot.deleteMessage(chat_id, message_id).catch((err) => {});
};

/**
 * @param {TheaAiTaskData} task
 */
thea_ai_genearation.AddGeneration = function (task) {
	const pos = task_runner.getTaskPosition(task.chat_id);

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
 * @param {TheaAiTaskData} data
 */
async function ProcessTask(data) {
	console.log(`start thea ai ${data.chat_id}`);
	const request_timestamp = new Date();
	const request_start_timestamp = data.request_start;

	delete data.request_start;

	const userData = new UserData(data.chat_id);
	await userData.InitData();
	userData.target_chat_id = data.response_chat_id;
	userData.thread_id = data.thread_id;
	userData.is_callback = true;

	const action_interval = userData.SetChatAction("upload_photo");

	try {
		let image = undefined;
		const translated_prompt = data.prompt;

		if (data.photo_id) {
			const photo_path = await bot.downloadFile(data.photo_id, "./tmp");
			image = fs.readFileSync(photo_path, "base64");
			fs.unlinkSync(photo_path);
		}

		const result = await TheaAiApi.GenerateImg({
			prompt: translated_prompt,
			model: data.model,
			image: image,
		});

		const grid_size = GetGridSize(result.images.length);
		const grid = await CombineImageToGrid(result.images, grid_size);
		const filePath = `tmp/${GenerateId()}.jpg`;
		await grid.toFile(filePath);

		const buttons = [];

		const links = await Promise.all(result.images.map((v, i) => UploadFileToDrive(v, i, translated_prompt, data.model)));
		for (let i = 0; i < links.length; i++) {
			const link = links[i];
			const col_index = Math.floor(i / grid_size.cols);

			if (!buttons[col_index]) buttons[col_index] = [];

			buttons[col_index].push({
				text: `U${i + 1}`,
				url: link.viewLink,
			});
		}

		buttons.push([
			{
				text: "Промпт",
				switch_inline_query_current_chat: `\n${data.prompt}`,
			},
		]);

		if (userData.thread_id) {
			buttons.push([
				{
					text: "🔧 Промпт",
					switch_inline_query: `\n${data.prompt}`,
				},
			]);
		}

		await userData.SendPhoto(filePath, "", buttons, data.message_id);

		fs.unlinkSync(filePath);

		data.thea_payload = result.payload;

		LogGeneration({
			type: "thea-ai",
			status: "success",
			request: data,
            request_start: request_start_timestamp,
			request_timestamp: request_timestamp,
		});
	} catch (err) {
		data.thea_payload = err.payload;

		LogGeneration({
			type: "thea-ai",
			status: "error",
			request: data,
			response: err.message,
            request_start: request_start_timestamp,
			request_timestamp: request_timestamp,
		});

		bot.sendMessage(data.response_chat_id, `При генерации запроса произошла ошибка, повторите попытку.\nПричина:\n\n<pre>${err.message}</pre>`, {
			message_thread_id: data.thread_id,
			parse_mode: "HTML",
		});
	} finally {
		clearInterval(action_interval);

		if (data.message_to_delete) {
			bot.deleteMessage(data.response_chat_id, data.message_to_delete).catch(() => {});
		}
	}

	console.log(`done thea ai ${data.chat_id} (${task_runner.total - 1}/${task_runner.maxConcurrentTasks})`);
}

function CalculateImageSize(width, height, rows, cols) {
	const containerAspectRatio = width / height;
	const innerAspectRatio = (width * cols) / (height * rows);

	let newWidth, newHeight;

	if (innerAspectRatio > containerAspectRatio) {
		newWidth = width;
		newHeight = width / innerAspectRatio;
	} else {
		newHeight = height;
		newWidth = height * innerAspectRatio;
	}

	return {
		width: Math.floor(newWidth),
		height: Math.floor(newHeight),
	};
}

function GetGridSize(item_count) {
	const rows = Math.floor(Math.sqrt(item_count));
	const cols = Math.ceil(item_count / rows);

	return {
		rows,
		cols,
	};
}

/**
 * @param {Buffer[]} images
 */
async function CombineImageToGrid(images, grid) {
	if (images.length === 1) return sharp(images[0]);

	const image_size = sizeOf(images[0]);

	const rows = grid.rows;
	const cols = grid.cols;

	const { height, width } = CalculateImageSize(image_size.width * 2, image_size.height * 2, rows, cols);

	const resize_height = Math.floor(height / rows);
	const resize_width = Math.floor(width / cols);

	let image = sharp({ create: { background: "black", channels: 3, height: height, width: width } });

	const resize_images = await Promise.all(
		images.map(async (v, i) => {
			return {
				input: await sharp(v).resize(resize_width, resize_height).toBuffer(),
				top: Math.floor((i / cols) % rows) * resize_height,
				left: (i % cols) * resize_width,
			};
		})
	);

	image = image.composite(resize_images);

	return image;
}

/**
 * @param {Buffer} image
 */
async function UploadFileToDrive(image, index, prompt, model) {
	const filePath = `tmp/${GenerateId()}.webp`;

	if (model === "story") {
		await sharp(image).toFormat("webp").toFile(filePath);
	} else {
		await sharp(image).resize(1080, 1080).toFormat("webp").toFile(filePath);
	}

	const file = new FilePayload(filePath, "image/webp");
	const fileName = `${prompt.slice(0, 30).replace(/[ ]/g, "_")} ${index + 1}.webp`;
	const driveLinks = await uploadFileToGoogleDrive(fileName, file, `Сервис: Thea AI\n${prompt}`);

	file.Dispose();

	return driveLinks;
}

function GetImageDescription(prompt) {
	return `<b>🖌️ Prompt</b>: <code>${TrimText(prompt, 900)}</code>`;
}

/**
 * @param {TheaAiTaskData} data
 */
async function GenerationError(data) {}

module.exports = thea_ai_genearation;
