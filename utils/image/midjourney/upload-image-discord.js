const fs = require("fs");
const { sleep } = require("../..");

function getUploadFileData(file_name) {
	let file = null;

	try {
		file = fs.readFileSync(file_name);
	} catch (e) {
		throw new Error(e);
	}

	if (file == null || file == undefined || file.length == undefined) throw new Error("Problem with file");
	if (file_name.includes("/")) file_name = file_name.substring(file_name.lastIndexOf("/") + 1);

	const file_size = file.length;
	const files_obj = {
		files: [
			{
				filename: file_name,
				file_size: file_size,
				is_clip: false,
			},
		],
	};

	return {
		file: file,
		payload: files_obj,
	};
}

async function getPutData(file_data, channel_id, discord_token = "") {
	const res = await fetch(`https://discord.com/api/v9/channels/${channel_id}/attachments`, {
		headers: {
			accept: "*/*",
			"accept-language": "en-US,en;q=0.9",
			authorization: discord_token,
			"cache-control": "no-cache",
			"content-type": "application/json",
		},
		body: JSON.stringify(file_data.payload),
		method: "POST",
	});

	const text = await res.text();

	return JSON.parse(text).attachments[0];
}

async function putFileToServer(file_data, put_data, channel_id) {
	const res = await fetch(put_data.upload_url, {
		method: "PUT",
		body: file_data.file,
	});

	await res.text();

	return {
		channel_id: channel_id,
		type: 0,
		sticker_ids: [],
		attachments: [
			{
				id: "0",
				filename: file_data.payload.files[0].filename,
				uploaded_filename: put_data.upload_filename,
			},
		],
	};
}

async function postFileToServer(payload, channel_id, discord_token = "") {
	const res = await fetch(`https://discord.com/api/v9/channels/${channel_id}/messages`, {
		headers: {
			accept: "*/*",
			"accept-language": "en-US,en;q=0.9",
			authorization: discord_token,
			"cache-control": "no-cache",
			"content-type": "application/json",
		},
		body: JSON.stringify(payload),
		method: "POST",
	});

	const text = await res.text();
	const data = JSON.parse(text);

	if (data.attachments !== undefined && data.attachments.length > 0 && data.attachments[0].url !== undefined) {
		return data.attachments[0].url;
	}

	throw new Error("No URL found");
}

/**
 * @param {string} file_path
 * @param {string} channel_id
 * @param {string} discord_token
 * @returns {Promise<string>}
 */
module.exports.uploadFileToDiscord = async (file_path, channel_id, discord_token = "") => {
	const file_data = getUploadFileData(file_path);
	const putData = await getPutData(file_data, channel_id, discord_token);

	await sleep(0.1);

	const payload = await putFileToServer(file_data, putData, channel_id);

	await sleep(0.1);

	return postFileToServer(payload, channel_id, discord_token);
};
