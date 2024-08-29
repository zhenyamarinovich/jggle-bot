const uri = {
	// main: SETTINGS.STABLE_ADDRESS,
	main: "https://stories.jggl-factory.image-api.atomml.net",
	get thea_api() {
		return `${this.main}/thea-api/`;
	},
};

/**
 * @typedef {"album cover" | "post" | "story" | "avatar"} TheaAiModels
 */

/**
 * @typedef {Object} TheaAiPayload
 * @property {"b64_json"} responseFormat
 * @property {TheaAiModels} model
 * @property {string} mode
 * @property {"square" | "vertical"} resolution
 * @property {string} style
 * @property {number} num_images
 * @property {number} seed
 * @property {string} prompt
 * @property {string} color_palette
 * @property {string[]} tags
 * @property {string} image
 */

/**
 * @returns {TheaAiPayload}
 */
function GetPayload() {
	/** @type {TheaAiPayload} */
	return (default_settings = {
		responseFormat: "b64_json",
		model: "string",
		mode: "string",
		resolution: "square",
		style: "",
		num_images: 4,
		seed: Math.round(Math.random() * 100000),
		prompt: "",
		color_palette: "",
		tags: [""],
		image: "",
	});
}

const TheaAiApi = {};

/**
 * @param {{ prompt: string; model: TheaAiTxt2ImgModels; image: string}} param0
 * @returns
 */
TheaAiApi.GenerateImg = async function ({ prompt, model, image }) {
	const payload = GetPayload();

	payload.prompt = prompt;
	payload.model = model;

	if (image) payload.image = image;
	if (model == "story") payload.resolution = "vertical";
	// if (model == "story") payload.resolution = "horizontal";

	try {
		return {
			images: await PostRequest(uri.thea_api, payload),
			payload,
		};
	} catch (err) {
		err.payload = payload;

		if (!err || err.message === "fetch failed") {
			throw new Error("Ошибка подключение к сервису");
		} else {
			throw err;
		}
	}
};

/**
 * @param {string} uri
 * @param {*} payload
 * @returns {Promise<Buffer[]>}
 */
async function PostRequest(uri, payload) {
	const result = await fetch(uri, {
		method: "post",
		body: JSON.stringify(payload),
		headers: {
			accept: "application/json",
			"content-type": "application/json",
		},
	});

	const json = await result.json().catch((err) => false);

	if (!json) throw new Error(`Server status: ${result.status}\nNot JSON\nResponse: \n${result.body}`);
	if (!result.ok) throw new Error(`Server status: ${result.status}\nResponse: \n${JSON.stringify(json, undefined, " ")}`);

	const data = json.data;

	if (!data.image && !data.images) throw new Error(JSON.stringify(json, undefined, " "));

	const images = data.image ? [data.image] : data.images;

	return images.map((v) => Buffer.from(v.b64_json, "base64"));
}

module.exports = TheaAiApi;
