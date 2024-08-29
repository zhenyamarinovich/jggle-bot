const fs = require("fs");
const { google } = require("googleapis");
const FilePayload = require("../file-payload");
const path = require("path");

const DIRECTORY = path.join(__dirname, "private");

const CREDENTIALS_PATH = path.join(DIRECTORY, "credentials.json");
const TOKEN_PATH = path.join(DIRECTORY, "token.json");


const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));

const { client_secret, client_id, redirect_uris, folders } = credentials.web ?? credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
const UPLOAD_FOLDERS = folders;

let token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));

async function authorize() {
	oAuth2Client.setCredentials(token);

	if (!oAuth2Client.isTokenExpiring()) return;

	const newToken = await oAuth2Client.refreshAccessToken();

	token = newToken.credentials;

	oAuth2Client.setCredentials(newToken.credentials);

	fs.writeFile(TOKEN_PATH, JSON.stringify(newToken.credentials), (err) => {
		if (err) console.error(err);
	});
}

authorize().then(() => {
	console.log("google drive auth success");
});

/**
 * @typedef {Object} FileLinks
 * @property {string} viewLink
 * @property {string} downloadLink
 */

/**
 * @param {string} name
 * @param {string} description
 * @param {FilePayload} file
 * @returns {Promise<FileLinks>}
 */
async function uploadFileToGoogleDrive(name, file, description = "") {
	try {
		await authorize();
		const fileId = await uploadFile(name, file, description);
		await setFilePublic(fileId);
		const result = await generatePublicUrl(fileId);
		return result;
	} catch (error) {
		return {
			viewLink: "https://t.me",
			downloadLink: "https://t.me",
		};
	}
}

/**
 * @param {string} name
 * @param {FilePayload} file
 * @returns {Promise<string>}
 */
async function uploadFile(name, file, description = "") {
	const drive = google.drive({ version: "v3", auth: oAuth2Client });
	const fileMetadata = {
		name: name,
		parents: UPLOAD_FOLDERS,
		description: description,
	};
	const media = {
		mimeType: file.mime_type,
		body: file.stream,
	};

	return new Promise((resolve, reject) => {
		drive.files.create(
			{
				resource: fileMetadata,
				media: media,
				fields: "id",
			},
			(err, file) => {
				if (err) return reject(err);
				resolve(file.data.id);
			}
		);
	});
}

/**
 * @param {string} fileId
 * @returns {Promise<boolean>}
 */
async function setFilePublic(fileId) {
	const drive = google.drive({ version: "v3", auth: oAuth2Client });
	const permissions = {
		type: "anyone",
		role: "reader",
	};

	return new Promise((resolve, reject) => {
		drive.permissions.create(
			{
				resource: permissions,
				fileId: fileId,
				fields: "id",
			},
			(err) => {
				if (err) return reject(err);

				return resolve(true);
			}
		);
	});
}

/**
 * @param {string} fileId
 * @returns {Promise<FileLinks>}
 */
async function generatePublicUrl(fileId) {
	const drive = google.drive({ version: "v3", auth: oAuth2Client });

	return new Promise((resolve, reject) => {
		drive.files.get(
			{
				fileId: fileId,
				fields: "webViewLink, webContentLink",
			},
			(err, file) => {
				if (err) return reject(err);

				return resolve({
					viewLink: file.data.webViewLink,
					downloadLink: file.data.webContentLink,
				});
			}
		);
	});
}

module.exports = { uploadFileToGoogleDrive };

// let asdasdasd = new FilePayload('tmp/jiggl_market_bot_minimalism_Generate_ideas_based_on_this_6f29d982-1396-4c0b-bc40-cc40c90eb887.png', 'photo/png');
// uploadFileToGoogleDrive("jiggl_market_bot_minimalism_Generate_ideas_based_on_this_6f29d982-1396-4c0b-bc40-cc40c90eb887.png", asdasdasd, 'test').then(console.log);
