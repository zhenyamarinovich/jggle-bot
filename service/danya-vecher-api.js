const { translate } = require("google-translate-api-x");
const { default: axios } = require("axios");

function IdGenerator() {
	let S4 = function () {
		return (((1 + Math.random()) * 0xfffffff) | 0).toString(36).substring(1);
	};
	return `${S4()}-${S4()}-${S4()}`;
}

const TRANSLATE_FIX = [/([Ss]hort)( )(-cut)/g, /([Tt])( )(-shirt)/g];

/**
 * @returns {Promise<String>}
 */
module.exports.Translate = async function (toTranslate = "") {
	if (toTranslate === "") return "";
	if (toTranslate.replace(/[\b\d\s\w\*\.\,\?\!\/\-:\n\@\(\)\[\]\'\"\\]/g, "") === "") return toTranslate;

	let translated_text = await TranslateText(toTranslate);

	for (let i = 0; i < TRANSLATE_FIX.length; i++) {
		const fix = TRANSLATE_FIX[i];
		translated_text = translated_text.replace(fix, "$1$3");
	}

	return translated_text;
};

/**
 * @returns {Promise<String>}
 */
async function TranslateText(text) {
	try {
		const google_result = await translate(text, {
			autoCorrect: false,
			to: "en",
		});

		return google_result.text;
	} catch (error) {}

	try {
		const result = await PostRequestTranslate("http://213.226.71.94:5000/v1/translate", { texts: [text] });

		return result.translations[0].text;
	} catch (error) {}

	try {
		const result = await PostRequestTranslate("http://91.107.126.225:8088/v1/service/translate", { texts: [text] });
		return result.translations[0].text;
	} catch (error) {}

	return text;
}

async function PostRequestTranslate(url, data) {
	const response = await axios.post(url, data);

	return response.data;
}
