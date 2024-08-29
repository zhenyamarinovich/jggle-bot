const { ServiceType, ChatGptPrefixType } = require("../enumerators.js");

module.exports = {
	LANGUAGE_TYPE: "🇷🇺 Русский",

	BUTTONS: {
		SELECT: "✅️ Выбрать",
		LEFT: "⬅️",
		RIGHT: "➡️",
		CROSS: "❌",
		BACK: "↩️ Назад",
		YES: "✅️ Да",
		NO: "❌️ Нет",
		SCREEN_SHOOT: "Сĸриншот",
		TEXT: "Теĸст",

		INSTRUCTION: "📄 Инструкция",
		CHATS: "💭 Тех. поддержка и общение",
		NEURON: "🚀 Нейросети",
		SEND_JOB: "📨 Отправить работы",

        SETTINGS_GENERATION_CHAT: "Управление чатом для генерации",

		UPDATE_INFORMATION: "🔁 Обновить информацию",

		MIDJOURNEY: "🏞️ Midjourney",
		STABLE_DIFFUSION: "🌄 Stable Diffusion",
		CHATGPT: "✍🏻 ChatGPT",
		SUNO: "🎧 Suno",
		THEA_AI: "🌄 Thea AI",

		CONTINUE_TYPE: "Продолжай",
		DO_ACTIVATE: "✅️ Режим активации",
		FILE_STRUCT: "📑 Моя структура",
		ACTIVATE: "✅️ Активировать",
		CLOSE: "Скрыть",
		CANCEL: "❌️ Отмена",
		CONFIRM: "✅️ Подтвердить",
		DELETE_HISTORY: "🗑️ Забыть историю диалога",
		INSTRUCTION_REPLENISH: "ИНСТРУКЦИЯ ПОПОЛНЕНИЯ",

		EDIT: "📝 Редактировать",
		CLEAR_PROMPT: "❌ Очистить промпт",
		RESET_SETTINGS: "🗑️ Сбросить настройки",
		SETTINGS: "⚙️ Настройки",
	},
	MenuStatus: {
		MEDIA: "Вложение",
		PHOTO: "Изображения",
		AUDIO: "Песни",
		DESCRIPTION: "Описание",

		PAK_SEND_CONFIRM:
			"Вы уверены в отправке 3 артистов на проверку?\n" +
			"После отправки, <u>редактировать артистов больше будет невозможно.</u>\n" +
			"После завершения конкурса вы получите уведомление о прохождении в следующий этап.\n\n" +
			'Нажимая "Да" Вы даете согласие Оператору на обработку персональных данных. \n' +
			'Ознакомиться с согласием на обработку персональных данных Вы можете по ссылке ниже.',
		PAK_SEND_ERROR: "Не все ваши артисты имеют описание, изображение, песню, пожалуйста проверьте всех артистов и повторите снова.",
		PAK_SEND_SUCCESS: "Ваши работы успешно отправлены на рассмотрение.\nПосле завершения конкурса вы получите уведомление о прохождении в следующий этап.",

		SEND_ARTIST_EXAMPLE:
			"- нажмите на 📎 и выберите фотографию или песню из вашей галереи;\n" +
			"- Либо отошлите сгенерированный трек + фото AI “предварительно скачав его в галерею”\n" +
			"- у вас отразилось вложение, теперь текстом опишите вашего артиста и отправьте его;\n" +
			"- если есть ещё примеры, можете повторить с начала.",
		// "📲 <b>Инструкция по отправке:</b>\n" +
		// "- <i>нажмите на 📎 и выберите фотографию или песню из вашей галереи;\n" +
		// "- Либо перешлите сообщение\n" +
		// "- у вас отразилось вложение, теперь текстом опишите вашего артиста и отправьте его;\n" +
		// "- если есть ещё примеры, можете повторить с начала.</i>\n\n",

		WELCOME_TO_MENU: "<b>Добро пожаловать! 🙌</b>",

		YOU_IN_QUEUE: "Сервис: {service_type}\nВы в очереди\nна генерацию ({amount} из {total})",

		REQUEST_GENERATING: "Сервис: {service_type}\nВаш запрос генерируется...",
		WAIT_GENERATION: "Вы можете генерировать только один запрос за раз, подождите пока ваш прошлый запрос сгенерируется...",

		TO_START_CHATGPT: "✍🏻 Что бы начать, отправьте сообщение для\n✍🏻 ChatGPT",
		TO_START_DALLE: "Отправьте сообщение для генерации изображений в\n🌠 DALL-E",
		TO_START_PERPLEXITY: "🔎 Что бы начать, отправьте сообщение для\n🔎 Perplexity",
		TO_START_STABLE_DIFFUSION: "Отправьте сообщение или картинку с текстом для изменения и генерации изображений в\n🌄 Stable Diffusion",
		TO_START_THEA_AI_SELECT: "Выберете модель для начало работы\n🌄 Thea AI",
		TO_START_THEA_AI: "Отправьте сообщение или изображение с лицом и текстом для изменения и генерации изображений в\n🌄 Thea AI",
		TO_START_THEA_AI_IMAGE: "Отправьте <b><u>изображение с лицом и текстом</u></b> для изменения и генерации изображений в\n🌄 Thea AI",
		TO_START_MIDJOURNEY: "Вы можете отправить текст и прикрепить картинку что бы взять референс персонажа для генерации изображений в\n🌠 Midjourney",
	},
	Notification: {
		ERROR_MESSAGE_GENERATION: `При генерации запроса произошла ошибка, повторите попытку.\nПричина:\n\n\`\`\`\n{reason}\`\`\``,

		EXPIRE_REASON: "Слишком долгое время ожидания сервера",
	},

	CommandsText: {
		ASPECT: "🔍 Размер",
		VERSION: "🎛 Версия",
		STYLE: "💃 Стиль",
		LIGHT: "💡 Свет",
		OTHER: "💠 Другое",

		pixar: "пиксар",
		cyberpunk: "киберпанк",
		hyperrealism: "гиперреализм",
		realism: "реализм",
		pencil: "карандашом",
		minimalism: "минимализм",
		"B/W": "Ч/Б",
		CHAOS: "хаос",
		cinema: "кино",
		dramatic: "драматичный",
		volume: "объемный",
		soft: "мягкий",
		studio: "студийный",
		neon: "неон",
		contour: "контурный",
		gloomy: "мрачный",
		dark: "темный",
		atmospheric: "атмосферный",
	},

	PHOTO: {
		CHATGPT: "https://cdn.discordapp.com/attachments/1174054512185593876/1258762914718945382/JPT_1.png?ex=668939d1&is=6687e851&hm=8010c3f0e1e9b34ba788c57c3418d3fed9c88a95ede8486af0886dd2233fa375&",
		MIDJOURNEY: "https://cdn.discordapp.com/attachments/1174054512185593876/1255862984815673455/Midj.png?ex=667ead0c&is=667d5b8c&hm=fc09574e7295f793d8e460cc608db0da73eef41d64f2d9e578e11a2ccc082ec6&",
		SUNO: "https://cdn.discordapp.com/attachments/1174054512185593876/1255862985277177866/Suno.png?ex=667ead0c&is=667d5b8c&hm=8e990f3e711648396d316748aaf37a4e97a763f6bc93a4b924dad38146734b67&",

		NEURON_NET:
			"https://cdn.discordapp.com/attachments/1174054512185593876/1258762914148646932/Cover_1_2.png?ex=668939d1&is=6687e851&hm=c738a90e9efd6e64f6bb2f845240a2590594db05dd02f332a7ecd635b43aabd2&",
	},
};
