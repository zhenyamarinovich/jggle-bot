const fs = require("fs");
const { ServiceType } = require("../enumerators");
const { default: axios } = require("axios");

/**
 * @returns {Promise<string>}
 */
module.exports.downloadFileFromUri = async function (uri = "") {
	const filename =
		"tmp/jggl_bot_" +
		uri
			.split("/")
			.pop()
			.split("?")
			.shift()
			.replace(/^[^_]*_/, "")
			.split(".")
			.shift() +
		".png";

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
};

module.exports.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports.TrimText = function (text = "", limit = 1012) {
	if (!text) return "";

	text = text.trim();

	if (text.length <= limit) return text;

	text = text.slice(0, limit);

	const lastSpace = text.lastIndexOf(" ");

	if (lastSpace > 0) text = text.substring(0, lastSpace);

	return text + "...";
};

module.exports.DefaultNeuronSettings = {
	[ServiceType.MIDJOURNEY]: { VERSION: ["v 6.0"], ASPECT: ["1:1"] },
	[ServiceType.SUNO]: { INSTRUMENTAL: false, EXTENDED: false },
	[ServiceType.STABLE_DIFFUSION]: {
		NEGATIVE:
			"(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), (text, watermark:1.1), disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation",
	},
};

module.exports.GenerateId = function (segments_count = 4) {
	const S4 = function () {
		return (((1 + Math.random()) * 0xfffffff) | 0).toString(36).substring(1);
	};

	let id = "";

	for (let i = 0; i < segments_count; i++) {
		id += S4();
	}

	return id;
};

module.exports.IsDefaultSettings = function (settings, type) {
	return deepEqual(settings, module.exports.DefaultNeuronSettings[type]);
};
module.exports.GetImageDescription = function (prompt) {
	return `<b>🖌️ Prompt</b>: <code>${module.exports.TrimText(prompt, 1000)}</code>`;
};

module.exports.CompleteMarkdown = function (text) {
	// Регулярное выражение для поиска открытых тегов Markdown
	const regex = /([*]{2}|[*]{1}|[_]{2}|~|[`]{3}|[`]{1})/g;
	const match = text.match(regex);
	const tags = {};

	if (!match) return text;

	for (let i = 0; i < match.length; i++) {
		const m = match[i];
		if (tags[m]) {
			tags[m]++;
		} else {
			tags[m] = 1;
		}
	}

	for (const key in tags) {
		if (tags[key] % 2 === 0) continue;

		text += key;
	}

	return text;
};

function deepEqual(object1, object2) {
	const keys1 = Object.keys(object1);
	const keys2 = Object.keys(object2);

	if (keys1.length !== keys2.length) {
		return false;
	}

	for (const key of keys1) {
		const val1 = object1[key];
		const val2 = object2[key];
		const areObjects = isObject(val1) && isObject(val2);
		if ((areObjects && !deepEqual(val1, val2)) || (!areObjects && val1 !== val2)) {
			return false;
		}
	}

	return true;
}

function isObject(object) {
	return object != null && typeof object === "object";
}
