module.exports.LanguageType = {
	russian: "ru",
};

module.exports.UserActions = {
	NONE: 0,
	LISTEN_MESSAGE: 1,
	LISTEN_MESSAGE_CHAT_GPT: 2,
	LISTEN_MESSAGE_MIDJOURNEY: 3,
	LISTEN_MESSAGE_STABLE_DIFFUSION: 4,
	LISTEN_MESSAGE_UPSCALE: 5,

	LISTEN_MESSAGE_DALLE: 7,

	LISTEN_MESSAGE_SUNO: 10,
	LISTEN_MESSAGE_SUNO_EDIT: 11,

	LISTEN_MESSAGE_THEA_AI: 15,

	LISTEN_MESSAGE_STABLE_DIFFUSION_SETTINGS: 20,

	LISTEN_MESSAGE_ARTIST_PAK: 50,

	LISTEN_MESSAGE_ADMIN: 1000,
};

module.exports.UserStatus = {
	NOT_CONFIRM_AGREEMENT: 0,
	CONFIRM_AGREEMENT: 1,
};

module.exports.MessageType = {
	TEXT: 0,
	VIDEO: 1,
	VOICE: 2,
	PHOTO: 3,
	VIDEO_NOTE: 4,
	AUDIO: 5,
};

module.exports.TopInviteType = {
	ALL: "ALL",
	DAY: "DAY",
	WEEK: "WEEK",
	MONTH: "MONTH",
};

module.exports.ChatGptPrefixType = {
	TonyRobbins: "TonyRobbins",
	TimeManager: "TimeManager",
	Millionaire: "Millionaire",
	AIDoctor: "AIDoctor",
	Cook: "Cook",
	Copywriter: "Copywriter",
	Default: "Default",
};

module.exports.ServiceType = {
	CHAT_GPT: 0,
	STABLE_DIFFUSION: 1,
	MIDJOURNEY: 2,
	SUNO: 3,
	DALLE: 4,
	THEA_AI: 5,
};

module.exports.MidjourneySelection = {
	SINGLE: 1,
	MANY: 2,
};

/**
 * @typedef {'suno' | 'midjourney' | 'chat_gpt' | 'thea_ai'} AIServiceType
 * @exports AIServiceType
 */

/**
 * @typedef {"many" | "single" | "optional_single"} MidjourneySelectionType
 * @typedef {Object} MidjourneyCommandType
 * @property {MidjourneySelectionType} type
 * @property {string} prefix
 * @property {string=} suffix
 * @property {string[]} commands
 */

/**
 * @type {{[key: string]:  MidjourneyCommandType}}
 */
module.exports.MidjourneyCommands = {
	STYLE: {
		type: "many",
		prefix: "",
		commands: ["pixar", "cyberpunk", "hyperrealism", "realism", "pencil", "minimalism"],
	},
	ASPECT: {
		type: "single",
		prefix: "--ar ",
		commands: ["1:1", "2:3", "3:2", "4:3", "4:5", "9:16", "16:9"],
	},
	OTHER: {
		type: "many",
		prefix: "",
		commands: ["B/W", "CHAOS", "HDR"],
	},
	LIGHT: {
		type: "optional_single",
		prefix: "",
		suffix: " lighting",
		commands: ["cinema", "dramatic", "volume", "soft", "studio", "neon", "contour", "gloomy", "dark", "atmospheric"],
	},
	VERSION: {
		type: "single",
		prefix: "--",
		commands: ["niji 6", "niji 5", "v 6.1", "v 6.0", "v 5.2", "v 5.1", "v 5.0", "v 4.0"],
	},
};

module.exports.MidjourneyPrompts = {
	TEXT: {
		QUEEN_LOOKING:
			"- <code>A high angle photo of a futuristic queen standing on top of a high mountain, views of the entire island, ocean in the distance, futuristic city highrise in the distance, really long dress blowing in the wind, pastel colors, summer --ar 2:3</code>",
		CARTOON_PANDA:
			"- <code>Adorable panda eating ramen with chop sticks in front of window, outside of window is a busy city, Pixar style, 4k, lots of food on his table, the panda is smiling with cute fangs.</code>",
		SALAD:
			"- <code>salad flying through the air with cheese and lettuce, Editorial Photography, Photography, Shot on 70mm lens, Depth of Field, Bokeh, DOF, Tilt Blur, Shutter Speed 1/1000, F/22, White Balance, 32k, Super-Resolution, white background;</code>",
		LEO_HIPSTER: "- <code>hipster lion portrait. headshot. –no glasses –v 4 –s 750</code>",
		ANIME_GIRL: "- <code>anime girl, large expressive eyes, wearing school uniform, detailed painting --niji 5</code>",
		PUPPY:
			"- <code>a puppy happy with excitement, in the style of cartoon realism, disney animation, hyper-realistic portraits, 32k uhd, cute cartoonish designs, wallpaper, luminous brushwork --ar 2:1</code>",
		OFFICE_FUTURE: "- <code>an isometric spiral-shaped office building with a Helix design, by Frank Lloyd Wright</code>",
		INTERIOR_DESIGN:
			"- <code>infinity luxury art deco living room, in the style of dark blue, gold, yellow and black, maximalism, royalcore, maximalist, marble, ultrahd, — s 750 — ar 4:5 — v 5.0</code>",
		KITTEN:
			"- <code>a cat wide eyed paying attention, in the style of cartoon realism, disney animation, hyper-realistic portraits, 32k uhd, cute cartoonish designs, wallpaper, luminous brushwork --ar 2:1</code>",
		CYBERPUNK: "- <code>[hyper realistic man blogging in]::2 [a futuristic cyber punk new york penthouse at night]::3 photorealistic::5 direct sunlight::1 dslr::3</code>",
		IRON_MAN: "- <code>Iron Man holding a hand with a V sign and two fingers calling for peace, for advertising, real color, funny style, high resolution</code>",
		POKEMON_GO: "- <code>sci-fi futuristic  one Pokémon --no human -AR 3:2 -Version 5.0</code>",
		SITE_DESIGN: "- <code>website landing page template for augmented reality application in black, orange, blue and violet colors, ui ux --ar 3:2 --v 5.0</code>",
		HOTEL: "- <code>futuristic resort with beach, dreamy summer palette, surrealism, smooth, epic details, travel, bird view;</code>",
		SORCERESS:
			"- <code>A magical teenage girl with platinum hair dressed in an Aboriginal poncho. It is illuminated by the moon and has a special connection with the stars that give it strength</code>",
	},
	IMAGES: {
		QUEEN_LOOKING: "AgACAgIAAxkBAAJDj2VoGhymB_sE9k0L7xyfwU2onsTjAALh1zEb22NAS9iG9NloLeXTAQADAgADeQADMwQ",
		CARTOON_PANDA: "AgACAgIAAxkBAAJDkWVoGo7oCqDyEw190f7aVaRWsOPwAALk1zEb22NAS2IGTG7b08dDAQADAgADeQADMwQ",

		LEO_HIPSTER: "AgACAgIAAxkBAAJDk2VoGo6RirbNqYegY4lmRjy7aWfBAALm1zEb22NAS4K64Z3MNty5AQADAgADeQADMwQ",
		SALAD: "AgACAgIAAxkBAAJDkmVoGo7VxXCXib5E0kXQ-fZXlSfRAALl1zEb22NAS_d9y-dKBKbHAQADAgADeQADMwQ",

		ANIME_GIRL: "AgACAgIAAxkBAAJDl2VoGvAN0YAjLoeRsl58IDg_tso3AALn1zEb22NAS-hnDcSCyhCpAQADAgADeQADMwQ",

		PUPPY: "AgACAgIAAxkBAAJDmGVoGvCB78ijWODeOsfotRn7LQbrAALo1zEb22NAS4vApYRjhcK_AQADAgADeQADMwQ",
		OFFICE_FUTURE: "AgACAgIAAxkBAAJDmWVoGvBMnxJ8_cT3BJuv_ofiJgF_AALp1zEb22NAS2R8X8OM7GSyAQADAgADeQADMwQ",
		INTERIOR_DESIGN: "AgACAgIAAxkBAAJDnWVoG7gAAdm6ROMQH2HGfqCkfXUENgAC7NcxG9tjQEvaHYFCPoq0gQEAAwIAA3kAAzME",

		KITTEN: "AgACAgIAAxkBAAJDnmVoG7jKS6v9zQEv6XXGlYCTYEgYAALt1zEb22NAS0uzIpNmhWndAQADAgADeQADMwQ",
		CYBERPUNK: "AgACAgIAAxkBAAJDn2VoG7hZoBTK1txQL_Frdt2HsAPQAALu1zEb22NAS-myrQ8k96isAQADAgADeQADMwQ",
		IRON_MAN: "AgACAgIAAxkBAAJDo2VoHB7nKMxplfFZzT4R6XmjvH_dAAL01zEb22NAS9TSCTj31KRRAQADAgADeQADMwQ",

		POKEMON_GO: "AgACAgIAAxkBAAJDpGVoHB6WMg6nwHBA9t8fo_MwiHTVAAL11zEb22NASxTQfiMglyXWAQADAgADeQADMwQ",
		SITE_DESIGN: "AgACAgIAAxkBAAJDpWVoHB68-pWtb0L11M39ueVqU1fzAAL21zEb22NASy0c9WTA8yulAQADAgADeQADMwQ",
		HOTEL: "AgACAgIAAxkBAAJDqWVoHIvHoSXk6zNcFykkqNoUtDFaAAL81zEb22NASyEmFT7ospboAQADAgADeQADMwQ",
		SORCERESS: "AgACAgIAAxkBAAJDqmVoHItJX2ATzxHvREoO5R87L6tvAAL-1zEb22NAS_IUvTVPS6bFAQADAgADeQADMwQ",
	},
};
