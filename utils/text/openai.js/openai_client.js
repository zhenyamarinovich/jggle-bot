const { OpenAI } = require("openai");
const { CENSOR_INSTRUCTION, TITTLE_GENERATOR, LYRICS_GENERATOR, BANNED_WORDS_INSTRUCTION, LYRICS_GENERATOR_INSTRUCTION } = require("./instructions");
const ChatGptMessages = require("../../../app/models/ChatGptMessages");
const crypto = require("crypto");

/**
 * @typedef {OpenAI.Chat.Completions.ChatCompletionMessageParam[]} ChatCompletionMessageParams
 */

class OpenAiClient {
	constructor() {
		this.client = new OpenAI({
			apiKey: SETTINGS.OPENAI_API_KEY,
			baseURL: "http://213.226.71.94:5000/v1/",
		});
	}

	async generateImage({ prompt = "", amount = 1 }) {
		const result = await this.client.images.generate({
			model: amount === 1 ? "dall-e-3" : "dall-e-2",
			prompt: prompt,
			n: amount,
			quality: "standard",
			size: "1024x1024",
		});

		return result.data;
	}

	/**
	 * @typedef {object} GptMessageStart
	 * @property {number} conversation_id
	 * @property {string} prompt
	 * @property {boolean} complete
	 * @property {string} file_base64
	 * @property {string | undefined} InstructionType
	 * @property {AbortController} abortController
	 * @property {function(string): any} onProgress
	 */

	/**
	 * @param {GptMessageStart} param0
	 */
	async sendMessage({ conversation_id, prompt = "", complete = false, file_base64 = "", abortController, onProgress }) {
		const currentDateString = new Date().toLocaleDateString("en-us", { year: "numeric", month: "numeric", day: "numeric" });
		const initialMessage = `You are ChatGPT, a large language model trained by OpenAI. Respond conversationally. ${BANNED_WORDS_INSTRUCTION}\nCurrent date: ${currentDateString}`;

		const messages_db = await ChatGptMessages.findAll({
			where: {
				chat_id: conversation_id,
			},
			limit: 20,
			order: [["created_timestamp", "DESC"]],
		});

		/**
		 * @type {ChatCompletionMessageParams}
		 */
		const messages = messages_db.map((v) => {
			const data = v.dataValues;
			return {
				role: data.role,
				content: data.content,
			};
		});

		let content = {};

		if (file_base64) {
			content = [
				{
					type: "image_url",
					image_url: {
						url: file_base64,
					},
				},
				{
					type: "text",
					text: prompt,
				},
			];
		} else {
			content = prompt;
		}

		/**
		 * @type {ChatCompletionMessageParams}
		 */
		const instructionsPayload = [
			{
				role: "system",
				content: initialMessage,
			},
			...messages,
		];

		if (!complete) {
			instructionsPayload.push({
				role: "user",
				content: prompt,
			});
		}

		const chatCompletion = await this.client.chat.completions.create({
			user: "atom",
			messages: instructionsPayload,
			stream: true,
			model: "gpt-4o",
			temperature: 1,
			max_tokens: 1024,
		});

		abortController.signal.addEventListener("abort", (ev) => {
			chatCompletion.controller.abort();
		});

		const stream = chatCompletion.toReadableStream();
		const reader = stream.getReader();
		const decoder = new TextDecoder();
		let result = "";
		/**
		 * @type {OpenAI.Chat.Completions.ChatCompletionChunk | undefined}
		 */
		let last_resp = undefined;

		while (true) {
			const { value, done } = await reader.read();

			if (done) break;

			const json = decoder.decode(value);
			/**
			 * @type {OpenAI.Chat.Completions.ChatCompletionChunk}
			 */
			const data = JSON.parse(json);
			const content = data.choices[0].delta.content;

			if (content) {
				result += content;
				onProgress(result);
			}

			last_resp = data;
		}

		result = result.replace(/^"|"$/g, "");

		const date = new Date();

		if (!complete) {
			await ChatGptMessages.create({
				chat_id: conversation_id,
				content: JSON.stringify(content),
				id: crypto.randomUUID(),
				role: "user",
				created_timestamp: date,
				updated_timestamp: date,
			});
		}
		date.setSeconds(date.getSeconds() + 1);
		const response_id = crypto.randomUUID();

		await ChatGptMessages.create({
			chat_id: conversation_id,
			content: result,
			id: response_id,
			role: "assistant",
			created_timestamp: date,
			updated_timestamp: date,
		});

		return {
			last_resp,
			result,
			response_id,
		};
	}

	/** @returns {Promise<false | string>} */
	async censorPrompt(prompt = "") {
		/**
		 * @type {ChatCompletionMessageParams}
		 */
		const instructionsPayload = [
			{
				role: "system",
				content: CENSOR_INSTRUCTION,
			},
			{
				role: "user",
				content: prompt,
			},
		];

		const chatCompletion = await this.client.chat.completions.create({
			messages: instructionsPayload,
			model: "gpt-3.5-turbo-1106",
			temperature: 0,
		});

		const message = chatCompletion.choices[0].message.content;

		if (message && message.match("censorship: true")) {
			const reason = message.match(/\n.*/gm) ?? [""];
			return reason[0].replace("\n", "");
		}

		return false;
	}

	async generateTitle(prompt = "") {
		/**
		 * @type {ChatCompletionMessageParams}
		 */
		const instructionsPayload = [
			{
				role: "system",
				content: TITTLE_GENERATOR,
			},
			{
				role: "user",
				content: prompt,
			},
		];

		return this.makeRequest(instructionsPayload);
	}

	async generateSuno(prompt = "") {
		const chatCompletion = await this.client.chat.completions.create({
			messages: LYRICS_GENERATOR_INSTRUCTION.concat([
				{
					content: [
						{
							type: "text",
							text: prompt,
						},
					],
					role: "user",
				},
			]),
			model: "gpt-4o",
			temperature: 1,
		});

		const message = chatCompletion.choices[0].message;
		return message.content.replace(/^"|"$/g, "");
	}

	async generateLyrics(prompt = "") {
		/**
		 * @type {ChatCompletionMessageParams}
		 */
		const instructionsPayload = [
			{
				role: "system",
				content: LYRICS_GENERATOR,
			},
			{
				role: "user",
				content: prompt,
			},
		];

		return this.makeRequest(instructionsPayload);
	}

	/**
	 * @param {ChatCompletionMessageParams} instructionsPayload
	 */
	async makeRequest(instructionsPayload) {
		for (let i = 0; i < 3; i++) {
			try {
				const chatCompletion = await this.client.chat.completions.create({
					messages: instructionsPayload,
					model: "gpt-3.5-turbo-1106",
					temperature: 0,
				});

				const message = chatCompletion.choices[0].message;

				if (!message.content) continue;

				return message.content.replace(/^"|"$/g, "");
			} catch (error) {
				console.log(error);
			}
		}

		return "";
	}

	// async def get(self, prompt: str, timeout: int = 60):
	//     openai_prompt = self.build_prompt(prompt)
	//     for _ in range(3):
	//         try:
	//             response = await self.client.chat.completions.create(
	//                 model='gpt-3.5-turbo',
	//                 messages=openai_prompt,
	//                 timeout=timeout,
	//             )
	//             return response.choices[0].message.content
	//         except Exception:  # noqa
	//             print_exc()

	// @staticmethod
	// def build_prompt(prompt: str) -> list:
	//     return [
	//         {"role": "system", "content": "You are a helpful assistant."},
	//         {"role": "user", "content": prompt},
	//     ]
}

module.exports = OpenAiClient;
