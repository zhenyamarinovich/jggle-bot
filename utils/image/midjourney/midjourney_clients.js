const MidjourneyClient = require("./midjourney_api_client");

/** @type {MidjourneyClient[]} */
const midjourney_clients = [];

for (let i = 0; i < SETTINGS.DISCORD_AUTH.length; i++) {
	const data = SETTINGS.DISCORD_AUTH[i];

	midjourney_clients.push(new MidjourneyClient(data));

	midjourney[i].api.init();
}

module.exports = midjourney_clients;
