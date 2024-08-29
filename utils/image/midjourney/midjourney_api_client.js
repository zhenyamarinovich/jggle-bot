const { Midjourney } = require("midjourney");
const FilePayload = require("../../file-payload");
const { uploadFileToDiscord } = require("./upload-image-discord");
const MidjourneyOptionsTranslator = require("./midjourney_options_translator");

class MidjourneyClient {
	/** @param {import("../../../definitions").DiscordAuthData} data */
	constructor(data) {
		this.name = data.name;

		this.api = new Midjourney({
			ServerId: data.server_id,
			ChannelId: data.channel_id,
			SalaiToken: data.salai_token,
			Debug: false,
			// Remix: true,
			Ws: true, //enable ws is required for remix mode (and custom zoom)
		});
	}

	/**
	 * @param {FilePayload} image
	 */
	async UploadImage(image) {
		const config = this.api.config;

		return uploadFileToDiscord(image.file_src, config.ChannelId, config.SalaiToken);
	}

	/**
	 * @param {string} url
	 * @param {number} ar
	 * @param {number} size
	 */
	static CompressImageUrl(url, ar = 1, size = 1024) {
		url = url.replace("cdn.discordapp.com", "media.discordapp.net");

		let width = size;
		let height = size;

		if (1 > ar) width = Math.floor(size * ar);
		else height = Math.floor(size / ar);

		return `${url}&quality=lossless&width=${width}&height=${height}`;
	}

	/** @param {import("midjourney").MJOptions[]} options */
	ParseMidjourneyOptions(options) {
		const action = MidjourneyOptionsTranslator.extract_options(options);

		return action;
	}
}

module.exports = MidjourneyClient;
