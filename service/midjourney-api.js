const { Midjourney } = require("midjourney");

/** @type {Midjourney[]} */
const midjourney = [];

for (let i = 0; i < SETTINGS.DISCORD_AUTH.length; i++) {
	const data = SETTINGS.DISCORD_AUTH[i];

	midjourney.push(
		new Midjourney({
			ServerId: data.server_id,
			ChannelId: data.channel_id,
			SalaiToken: data.salai_token,
			Debug: false,
			// Remix: true,
			Ws: true, //enable ws is required for remix mode (and custom zoom)
		})
	);

	midjourney[i].name = data.name;

	// midjourney[i].init();
}

module.exports = midjourney;
