const { TrimText } = require("../..");
const { Translate } = require("../../../service/danya-vecher-api");

const MJ_LINK_EXPRESSION = /https:\/\/[^\r\n\t\f\v >]+/g;
const MJ_LINK_REGEX = new RegExp(MJ_LINK_EXPRESSION);

const LINK_EXPRESSION = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;
const LINK_REGEX = new RegExp(LINK_EXPRESSION);

/**
 * @typedef {Object} CustomStyles
 * @property {string} prefix
 * @property {string} suffix
 */

module.exports = class MidjourneyPromptBuilder {
	/**
	 * @param {string} prompt
	 * @param {CustomStyles=} customStyle
	 */
	constructor(prompt, customStyle) {
		prompt = prompt.replace(/—/g, "--");

		this.init_prompt = prompt;

		this.customStyle = customStyle;

		const { raw_prompt, params } = ExtractParams(prompt);

		this.raw_prompt = raw_prompt;
		this.params = params;

		/** @type {string[]} */
		this.links = this.raw_prompt.match(LINK_REGEX) ?? [];
		this.raw_prompt = this.raw_prompt.replace(LINK_REGEX, "");

		this.raw_prompt = this.raw_prompt.trim();
	}

	async TranslatePrompt() {
		this.translated_prompt = await Translate(this.raw_prompt);
		this.translated_prompt = this.translated_prompt.replace(/([\w\d])( )(-[\w\d])/g, "$1$3");
		return this.translated_prompt;
	}

	get prompt() {
		return this.translated_prompt ?? this.raw_prompt;
	}

	get aspect_ratio() {
		const match = this.MatchParam(/(ar|aspect) \d*:\d*/);

		if (!match) return 1;

		const d = match[0].replace(/ar|aspect/g, "").split(":");

		return Number(d[0]) / Number(d[1]);
	}

	/**
	 * @param {string | RegExp} regexp
	 */
	MatchParam(regexp) {
		if (this.customStyle) {
			const match = this.customStyle?.suffix?.match(regexp);
			if (match) return match;
		}

		for (let i = 0; i < this.params.length; i++) {
			const param = this.params[i];
			const match = param.match(regexp);
			if (match) return match;
		}
	}

	/**
	 * @param {string} link
	 */
	AddLink(link) {
		this.links.push(link);
	}

	UpdateLinks(prompt) {
		const { raw_prompt, params } = ExtractParams(prompt);
		const mj_links = raw_prompt.match(MJ_LINK_REGEX) ?? [];

		for (let i = 0; i < mj_links.length; i++) {
			const link = mj_links[i];

			this.links[i] = link;
		}

		for (let i = 0; i < params.length; i++) {
			const param = params[i];

			if (!param.startsWith("cref")) continue;

			const link = param.match(MJ_LINK_REGEX)[0];

			this.AddParam("cref", link);

			break;
		}
	}

	/**
	 * @param {string} command
	 * @param {string} value
	 */
	AddParam(command, value) {
		for (let i = 0; i < this.params.length; i++) {
			const param = this.params[i];

			if (param.startsWith(command)) {
				this.params[i] = `${command} ${value}`;
				return;
			}
		}

		this.params.push(`${command} ${value}`);
	}

	ToString(style = true) {
		let prompt = this.prompt;

		if (style && this.customStyle) {
			prompt = `${this.customStyle.prefix.trim()} ${prompt} ${this.customStyle.suffix.trim()}`.trim();
		}

		return `${this.links.join(" ")} ${prompt}${this.params.join(" --")}`.trim();
	}

	GetDescription(full = false) {
		if (full) {
			return `<b>🖌️ Prompt</b>: <code>${TrimText(this.ToString(), 950)}</code>`;
		} else {
			return `<b>🖌️ Prompt</b>: <code>${TrimText(this.prompt, 950)}</code>`;
		}
	}
};

function ExtractParams(prompt = "") {
	const params_match = prompt.match(/--/);
	let params;

	if (!params_match || !params_match.index) {
		return {
			raw_prompt: prompt,
			params: [""],
		};
	}

	const slice_end = params_match.index;

	params = prompt.slice(slice_end).split("--");
	params = params.map((v) => v.trim());

	return {
		raw_prompt: prompt.slice(0, slice_end).trim(),
		params: params,
	};
}
