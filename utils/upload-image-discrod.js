const fs = require("fs");
const { sleep } = require(".");

// let jobID = 1;
// let finishedJobs: JobData[] = [];
// let runningJobs: JobData[] = [];

// interface JobData {
// 	fileName: string;
// 	channel_id: string;
// 	resolve: (url: string) => void;
// 	reject: (err: any) => void;
// 	status: "pending" | "running" | "done" | "failed";
// 	id: number;
// 	url?: string;
// }

// class DiscordImageUploader {
// 	private discordToken: string;
// 	private jobQueue: JobData[];
// 	private isRunning: boolean;
// 	private waitForUpload: boolean;
// 	private waitTime: number;

// 	/**
// 	 * DiscordImageUploader is a class that allows you to upload files to Discord. It will automatically handle rate limiting and other errors. It will also automatically queue jobs so you don't get rate limited.
// 	 * @param {string} token - The Discord token to use.
// 	 * @param {boolean} waitForUpload - Whether or not to wait for the upload to finish before moving on to the next job. If set to false, you can upload many files very quickly, but at the risk of getting rate limited or banned. Default is true.
// 	 * @param {number} waitTime - How long to wait between jobs if waitForUpload is set to true. This is in seconds. Default is 1 second.
// 	 */
// 	constructor(token: string, waitForUpload = true, waitTime = 1) {
// 		this.discordToken = token;
// 		this.jobQueue = [];
// 		this.isRunning = false;
// 		this.waitForUpload = waitForUpload;
// 		this.waitTime = waitTime;
// 	}

// 	/**
// 	 * Queues a file to be uploaded to discord. Returns an object with a promise and a jobID. The promise will resolve with the URL of the uploaded file. The jobID can be used to check the status of the job.
// 	 * @param {string} fileName - The path to the file to upload. Must be a string. Must be a valid path that fs.readFileSync can read.
// 	 * @param {string} channel_id - The channel ID to upload to. AKA guild ID
// 	 * @returns Object with a promise and a jobID. The promise will resolve with the URL of the uploaded file. The jobID can be used to check the status of the job.
// 	 */
// 	uploadFile(fileName: string, channel_id: string) {
// 		return {
// 			promise: new Promise<string>(async (resolve, reject) => {
// 				let file = null;
// 				try {
// 					file = fs.readFileSync(fileName);
// 				} catch (e) {
// 					console.log(e);
// 					reject(e);
// 				}
// 				if (file == null) reject("Unable to read file");
// 				this.jobQueue.push({
// 					fileName: fileName,
// 					channel_id: channel_id,
// 					resolve: resolve,
// 					reject: reject,
// 					status: "pending",
// 					id: jobID,
// 					url: undefined,
// 				});
// 				if (!this.isRunning) this.run();
// 			}),
// 			jobID: jobID++,
// 		};
// 	}

// 	/**
// 	 * Start the queue. This is called automatically when a job is added to the queue. You should never need to call this manually.
// 	 * @returns Nothing
// 	 */
// 	async run() {
// 		this.isRunning = true;
// 		while (this.jobQueue.length > 0) {
// 			let job = this.jobQueue.shift()!;
// 			runningJobs.push(job);
// 			job.status = "running";
// 			this.uploadFileToDiscordWithMessage(job.fileName, job.channel_id)
// 				.then((url) => {
// 					job.resolve(url);
// 					job.status = "done";
// 					job.url = url;
// 				})
// 				.catch((e) => {
// 					job.reject(e);
// 					job.status = "failed";
// 				})
// 				.finally(() => {
// 					runningJobs.splice(runningJobs.indexOf(job), 1);
// 					finishedJobs.push(job);
// 				});
// 			while (this.waitForUpload && job.status == "running") {
// 				await sleep(0.5);
// 			}
// 			if (this.waitForUpload && this.jobQueue.length > 0) await sleep(this.waitTime);
// 		}
// 		// this line shouldn't be necessary but just in case the async-ness catches up to us, we'll check again
// 		if (this.jobQueue.length == 0) this.isRunning = false;
// 		else this.run();
// 	}

// 	/**
// 	 * Get a job object.
// 	 * @param {number} jobID - The job ID to check. Get this from the object returned by uploadFile()
// 	 * @returns - An object containing the status of the job. The status will be one of the following: "pending", "running", "done", "failed". Also contains the URL of the uploaded file if the job is done, the file name, the message, and the channel ID.
// 	 */
// 	getJob(_jobID: number) {
// 		for (let i = 0; i < this.jobQueue.length; i++) {
// 			if (this.jobQueue[i].id == _jobID) return this.jobQueue[i];
// 		}
// 		for (let i = 0; i < runningJobs.length; i++) {
// 			if (runningJobs[i].id == _jobID) return runningJobs[i];
// 		}
// 		for (let i = 0; i < finishedJobs.length; i++) {
// 			if (finishedJobs[i].id == _jobID) return finishedJobs[i];
// 		}
// 		return null;
// 	}

// 	private async uploadFileToDiscordWithMessage(fileName: string, channel_id: string) {
// 		return new Promise<string>(async (resolve, reject) => {
// 			let file = null;
// 			try {
// 				file = fs.readFileSync(fileName);
// 			} catch (e) {
// 				console.log(e);
// 				reject(e);
// 			}
// 			if (file == null || file == undefined || file.length == undefined) reject("Problem with file");
// 			if (fileName.includes("/")) fileName = fileName.substring(fileName.lastIndexOf("/") + 1);
// 			let file_size = file!.length;
// 			let files_obj = {
// 				files: [
// 					{
// 						filename: fileName,
// 						file_size: file_size,
// 						is_clip: false,
// 					},
// 				],
// 			};
// 			let res = await fetch(`https://discord.com/api/v9/channels/${channel_id}/attachments`, {
// 				headers: {
// 					accept: "*/*",
// 					"accept-language": "en-US,en;q=0.9",
// 					authorization: this.discordToken,
// 					"cache-control": "no-cache",
// 					"content-type": "application/json",
// 				},
// 				body: JSON.stringify(files_obj),
// 				method: "POST",
// 			});
// 			let res2: any = await res.text();
// 			let putData = JSON.parse(res2).attachments[0];
// 			await sleep(0.1);
// 			res = await fetch(putData.upload_url, {
// 				method: "PUT",
// 				body: file,
// 			});
// 			res2 = await res.text();
// 			const payload = {
// 				channel_id: channel_id,
// 				type: 0,
// 				sticker_ids: [],
// 				attachments: [
// 					{
// 						id: "0",
// 						filename: fileName,
// 						uploaded_filename: putData.upload_filename,
// 					},
// 				],
// 			};
// 			await sleep(0.1);
// 			res = await fetch(`https://discord.com/api/v9/channels/${channel_id}/messages`, {
// 				headers: {
// 					accept: "*/*",
// 					"accept-language": "en-US,en;q=0.9",
// 					authorization: this.discordToken,
// 					"cache-control": "no-cache",
// 					"content-type": "application/json",
// 				},
// 				body: JSON.stringify(payload),
// 				method: "POST",
// 			});
// 			res2 = await res.text();
// 			res2 = JSON.parse(res2);
// 			if (res2.hasOwnProperty("attachments")) {
// 				if (res2.attachments.length > 0) {
// 					if (res2.attachments[0].hasOwnProperty("url")) {
// 						resolve(res2.attachments[0].url);
// 					}
// 				}
// 			}
// 			reject("No URL found");
// 		});
// 	}
// }

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
