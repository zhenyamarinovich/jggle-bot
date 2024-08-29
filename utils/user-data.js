const TelegramBot = require("node-telegram-bot-api");
const bot = require("../bot.js");
const { UserActions, MessageType, UserStatus } = require("../enumerators.js");
const TaskRunner = require("./task-runner.js");
const language = require("../language/language.js");
const User = require("../app/models/User.js");
const { markdownToHtml } = require("./markdown-to-html/telegram_formatter.js");

/**
 * @typedef {Object} AttachData
 * @property {string} file_id
 * @property {MessageType} type
 */

/**
 * @typedef {Object} TaskData
 * @property {number} chat_id
 * @property {number=} thread_id
 * @property {string} text
 * @property {AttachData} attachment
 * @property {TelegramBot.InlineKeyboardButton[][]} keys
 */

/** @type {TaskRunner<TaskData>} */
const notificationQueue = new TaskRunner(SendNotification, undefined, 1);

/**
 * @type { Object<number, number | undefined> }
 */
const cacheRequest = {};

const unlimitedDate = new Date(2024, 4, 1, 18);

/**
 * @type {Object<string, {interval: number; action_count: number;}>}
 */
const action_list = {};

module.exports = class UserData {
	/**
	 * @param {TelegramBot.Message & TelegramBot.CallbackQuery | number} ctx
	 */
	constructor(ctx) {
		if (typeof ctx === "number") {
			this.chat_id = ctx;
			this.CurrText = language.GetText();
			return;
		}

		/**
		 * @type {TelegramBot.Message}
		 */
		const msg = ctx.message ?? ctx;
		const chat = msg.chat;
		const from = ctx.from ?? msg.from;

		/**
		 * @private
		 */
		this.chat_id = from.id;

		this.target_chat_id = chat.id;
		this.thread_id = msg.message_thread_id;

		this.language_code = from?.language_code;
		this.CurrText = language.GetText(from?.language_code);

		this.username = from.username ?? ""; // optional
		this.full_name = this.ParseFullName(from.first_name, from.last_name); // optional

		this.is_callback = ctx.message !== undefined;
		this.query_id = ctx.id;
		this.message_id = msg.message_id;

		this.message_text = msg.caption ?? msg.text ?? "";
		this.message_photo = msg.photo; // optional
		this.message_video = msg.video; // optional
		this.message_video_note = msg.video_note; // optional
		this.message_voice = msg.voice; // optional
		this.message_audio = msg.audio; // optional

		this.log_errors = true;
	}

	async InitData(chat_id) {
		const user = await User.findOne({
			where: {
				chat_id: chat_id ?? this.chat_id,
			},
		});

		if (!user) return false;

		this.SetSqlRaw(user, true);

		return true;
	}

	async CreateUser(ref_code) {
		const user = await User.create({
			chat_id: this.chat_id,
			language_code: this.language_code ?? "ru",
			ref_code: ref_code ?? "",
			status: 0,
			last_username: this.username ?? null,
			last_full_name: this.full_name ?? null,
		});

		this.SetSqlRaw(user, true);

		return true;
	}

	/**
	 * @param {User} sql_user
	 * @param {boolean} full
	 */
	SetSqlRaw(sql_user, full = false) {
		const data = sql_user.dataValues;

		if (full) {
			this.chat_id = data.chat_id;

			this.username = data.last_username ?? "";
			this.full_name = data.last_full_name ?? "";
		}

		this.action = data.actual_user_action;
		this.current_artist = data.current_artist;
		this.status = data.status;

		this.connected_chat_id = data.connected_chat_id;

		this.last_message_id = data.last_message_id;

		this.language_code = data.language_code;
		this.artist_pak_send = data.artist_pak_send === 1 ? true : false;

		this.registration_timestamp = data.registration_timestamp;
		this.updated_timestamp = data.updated_timestamp;
		this.created_timestamp = data.created_timestamp;

		this.CurrText = language.GetText(sql_user.dataValues.language_code);
	}

	get PHOTO() {
		return this.CurrText.PHOTO;
	}

	get file_id() {
		if (this.message_photo) return this.message_photo[this.message_photo.length - 1].file_id;
		if (this.message_video) return this.message_video.file_id;
		if (this.message_voice) return this.message_voice.file_id;
		if (this.message_video_note) return this.message_video_note.file_id;
		if (this.message_audio) return this.message_audio.file_id;

		return undefined;
	}

	get message_type() {
		if (this.message_photo) return MessageType.PHOTO;
		if (this.message_video) return MessageType.VIDEO;
		if (this.message_voice) return MessageType.VOICE;
		if (this.message_video_note) return MessageType.VIDEO_NOTE;
		if (this.message_audio) return MessageType.VIDEO_NOTE;

		return MessageType.TEXT;
	}

	ParseCurrency(amount = 0) {
		return language.ParseCurrency(amount, this.language_code);
	}

	ParseFullName(firstName = "", secondName = "") {
		let full_name = undefined;

		if (firstName) full_name = firstName;

		if (secondName) full_name += full_name ? ` ${secondName}` : secondName;

		if (full_name.length > 254) full_name = full_name.slice(0, 254);
		full_name = full_name.replace(/undefined|[<|>|'|"|\\|\/]/g, "");
		return full_name;
	}

	/**
	 * @param {number} status
	 */
	SetLanguageCode(language_code) {
		if (this.language_code === language_code) return false;

		this.CurrText = language.GetText(language_code);
		this.language_code = language_code;

		return this.sql_ref.update("language_code", language_code);
	}

	/**
	 * @param {number | undefined} action
	 */
	SetStatus(status = UserStatus.NOT_CONFIRM_AGREEMENT) {
		if (this.status === status) return;

		this.status = status;

		return User.update(
			{
				status: status,
			},
			{
				where: {
					chat_id: this.chat_id,
				},
			}
		);
	}

	/**
	 * @param {number | undefined} action
	 */
	SetConnectedChatId(chat_id) {
		if (this.connected_chat_id === chat_id) return;

		this.connected_chat_id = chat_id;

		return User.update(
			{
				connected_chat_id: chat_id,
			},
			{
				where: {
					chat_id: this.chat_id,
				},
			}
		);
	}

	/**
	 * @param {number | undefined} action
	 */
	SetAction(action = UserActions.NONE) {
		if (this.thread_id) return;
		if (this.action === action) return;
		if (action === undefined) action = UserActions.NONE;

		this.action = action;

		return User.update(
			{
				actual_user_action: action,
			},
			{
				where: {
					chat_id: this.chat_id,
				},
			}
		);
	}

	UpdateCurrentArtist(artistId) {
		return User.update(
			{
				current_artist: artistId,
			},
			{
				where: {
					chat_id: this.chat_id,
				},
			}
		);
	}

	UpdateArtistSended(sended) {
		return User.update(
			{
				artist_pak_send: sended ? 1 : 0,
			},
			{
				where: {
					chat_id: this.chat_id,
				},
			}
		);
	}

	ClearMediaMessage() {
		this.message_photo = undefined;
		this.message_video = undefined;
		this.message_video_note = undefined;
		this.message_voice = undefined;
		this.message_audio = undefined;
	}

	HasMedia() {
		return this.message_video !== undefined || this.message_photo !== undefined;
	}

	CanEdit() {
		return this.message_id !== undefined && this.is_callback;
	}

	/**
	 * @param {TelegramBot.ChatAction} action
	 */
	SetChatAction(action) {
		const key = `${this.target_chat_id}_${this.thread_id}`;

		if (action_list[key]) {
			clearInterval(action_list[key].interval);
		}

		bot.sendChatAction(this.target_chat_id, action, {
			message_thread_id: this.thread_id,
		});

		const interval = setInterval(() => {
			action_list[key].action_count++;

			if (action_list[key].action_count > 100) {
				clearInterval(action_list[key].interval);
				return;
			}

			bot.sendChatAction(this.target_chat_id, action, {
				message_thread_id: this.thread_id,
			});
		}, 8000);

		action_list[key] = {
			interval: interval,
			action_count: 0,
		};

		return interval;
	}

	AnswerCallbackQuery(text = "", show_alert = false) {
		if (!this.query_id) return;

		const id = this.query_id;
		this.query_id = undefined;

		return bot
			.answerCallbackQuery(id, {
				text: text,
				show_alert: show_alert,
			})
			.catch((err) => {});
	}

	TryDeletePrevious() {
		if (!this.CanEdit()) return;
		this.query_id = undefined;
		return bot.deleteMessage(this.target_chat_id, this.message_id).catch((err) => {});
	}

	async UpdateLastMessageId(message_id) {
		return User.update(
			{
				last_message_id: message_id,
			},
			{
				where: {
					chat_id: this.chat_id,
				},
			}
		);
	}

	/**
	 * @param {string | internal.Stream | Buffer} video
	 * @param {string} text
	 * @param {TelegramBot.InlineKeyboardButton[][]} key
	 */
	async SendVideo(video, text, key) {
		const opts = {
			chat_id: this.target_chat_id,
			message_thread_id: this.thread_id,

			message_id: this.message_id,
			parse_mode: "HTML",
			reply_markup: {
				inline_keyboard: key,
			},
		};

		const er = new Error();
		this.AnswerCallbackQuery();
		if (this.HasMedia() && this.CanEdit()) {
			return bot
				.editMessageMedia(
					{
						caption: text,
						parse_mode: "HTML",
						type: "video",
						media: video,
					},
					opts
				)
				.catch((err) => {
					if (this.log_errors) console.log(err.message, er);
					return false;
				});
		} else {
			this.TryDeletePrevious();

			opts.caption = text;
			opts.parse_mode = "HTML";

			const msg = await bot.sendVideo(opts.chat_id, video, opts).catch((err) => {
				if (this.log_errors) console.log(err.message, er);
				return false;
			});

			if (!msg) return false;
			await this.UpdateLastMessageId(msg.message_id);
			this.message_id = msg.message_id;
			this.message_video = msg.video;
			this.is_callback = true;
			return msg;
		}
	}

	/**
	 * @param {string} audio
	 * @param {string} text
	 * @param {TelegramBot.InlineKeyboardButton[][]} key
	 */
	async SendAudio(audio, text, key) {
		const opts = {
			chat_id: this.target_chat_id,
			message_thread_id: this.thread_id,

			message_id: this.message_id,
			parse_mode: "HTML",
			reply_markup: {
				inline_keyboard: key,
			},
		};

		const er = new Error();
		this.AnswerCallbackQuery();
		if (this.HasMedia() && this.CanEdit()) {
			return bot
				.editMessageMedia(
					{
						caption: text,
						parse_mode: "HTML",
						type: "audio",
						media: audio,
					},
					opts
				)
				.catch((err) => {
					if (this.log_errors) console.log(err.message, er);
					return false;
				});
		} else {
			this.TryDeletePrevious();

			opts.caption = text;
			opts.parse_mode = "HTML";

			const msg = await bot.sendAudio(opts.chat_id, audio, opts).catch((err) => {
				if (this.log_errors) console.log(err.message, er);
				return false;
			});

			if (!msg) return false;

			await this.UpdateLastMessageId(msg.message_id);
			this.message_id = msg.message_id;
			this.message_video = msg.video;
			this.is_callback = true;
			return msg;
		}
	}

	RemoveInlineButtons() {
		if (this.CanEdit())
			return bot.editMessageReplyMarkup(
				{ inline_keyboard: [] },
				{
					chat_id: this.target_chat_id,
					message_id: this.message_id,
				}
			);
	}

	/** @param {TelegramBot.ChatAction} action */
	StartChatAction(action) {
		this.action_interval = setInterval(() => {
			bot.sendChatAction(this.chat_id, action);
		}, 5000);
		bot.sendChatAction(this.chat_id, action);
	}

	StopChatAction() {
		if (!this.action_interval) return;
		clearInterval(this.action_interval);
		this.action_interval = undefined;
	}

	/**
	 * @param {string | Buffer} img
	 * @param {string} text
	 * @param {TelegramBot.InlineKeyboardButton[][]} key
	 * @param {import("node-telegram-bot-api").ParseMode} parse_mode
	 * @param {number} reply_to_message_id
	 */
	async SendPhoto(img, text, key = [], reply_to_message_id = undefined) {
		const opts = {
			chat_id: this.target_chat_id,
			message_thread_id: this.thread_id,

			message_id: this.message_id,
			parse_mode: "HTML",
			reply_to_message_id: reply_to_message_id,
			reply_markup: {
				inline_keyboard: key,
			},
		};

		const er = new Error();
		this.AnswerCallbackQuery();
		if (this.HasMedia() && this.CanEdit()) {
			return bot
				.editMessageMedia(
					{
						caption: text,
						parse_mode: "HTML",
						type: "photo",
						media: img,
					},
					opts
				)
				.catch((err) => {
					if (this.log_errors) console.log(err.message, er);
					return false;
				});
		} else {
			this.TryDeletePrevious();

			opts.caption = text;
			opts.parse_mode = "HTML";

			const msg = await bot.sendPhoto(opts.chat_id, img, opts).catch((err) => {
				if (this.log_errors) console.log(err.message, er);
				return false;
			});

			if (!msg) return false;

			await this.UpdateLastMessageId(msg.message_id);
			this.message_id = msg.message_id;
			this.message_photo = msg.photo;
			this.is_callback = true;
			return msg;
		}
	}

	/**
	 * @param {string} text
	 * @param {import("node-telegram-bot-api").InlineKeyboardButton[][]} key
	 * @param {import("node-telegram-bot-api").ParseMode | ""} parse_mode
	 * @param {number} reply_to_message_id
	 */
	async SendText(text, key, parse_mode = "HTML", reply_to_message_id = undefined) {
		const opts = {
			chat_id: this.target_chat_id,
			message_thread_id: this.thread_id,

			message_id: this.message_id,
			parse_mode: parse_mode,
			reply_to_message_id: reply_to_message_id,
			reply_markup: {
				inline_keyboard: key,
			},
		};
		const er = new Error();

		this.AnswerCallbackQuery();
		if (!this.HasMedia() && this.CanEdit()) {
			return bot.editMessageText(text, opts).catch((err) => {
				if (this.log_errors) console.log(er, err.message);
				return false;
			});
		} else {
			this.TryDeletePrevious();

			const msg = await bot.sendMessage(opts.chat_id, text, opts).catch((err) => {
				if (this.log_errors) console.log(err.message, er);
				return false;
			});

			if (!msg) return false;

			await this.UpdateLastMessageId(msg.message_id);
			this.message_id = msg.message_id;
			this.is_callback = true;
			return msg;
		}
	}

	/**
	 * @param {string} text
	 * @param {TelegramBot.InlineKeyboardButton[][]} keys
	 * @param {AttachData} attach
	 */
	async SendNotification(text = "", keys = [], attach = {}) {
		keys.push([
			{
				text: this.CurrText.BUTTONS.CLOSE,
				callback_data: "close",
			},
		]);

		notificationQueue.addToQueue({
			data: {
				text: markdownToHtml(text),
				chat_id: this.target_chat_id,
				thread_id: this.thread_id,

				attachment: attach,
				keys: keys,
			},
		});
	}
};

/**
 * @param {TaskData} data
 */
async function SendNotification(data) {
	const attachment = data.attachment;

	if (attachment.file_id === undefined || attachment.type === MessageType.TEXT) {
		return bot
			.sendMessage(data.chat_id, data.text, {
				message_thread_id: data.thread_id,
				parse_mode: "HTML",
				reply_markup: {
					inline_keyboard: data.keys,
				},
			})
			.catch((err) => {
				console.log(err.message, data.text.slice(0, 100));
			});
	}

	const opts = {
		message_thread_id: data.thread_id,
		parse_mode: "",
		caption: data.text,
		reply_markup: {
			inline_keyboard: data.keys,
		},
	};

	const fileOptions = {
		filename: "file",
	};

	switch (attachment.type) {
		case MessageType.PHOTO:
			return bot.sendPhoto(data.chat_id, attachment.file_id, opts, fileOptions);
		case MessageType.VIDEO:
			return bot.sendVideo(data.chat_id, attachment.file_id, opts, fileOptions);
		case MessageType.VIDEO_NOTE:
			return bot.sendVideoNote(data.chat_id, attachment.file_id, opts, fileOptions);
		case MessageType.VOICE:
			return bot.sendVoice(data.chat_id, attachment.file_id, opts, fileOptions);
		default:
			throw new Error(`Unknown type ${attachment.type}`);
	}
}
