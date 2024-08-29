const fetch = require("node-fetch");
const { SunoCookieManager } = require("./cookie_manager");
const { BaseClient } = require("../base");
const { sleep } = require("../..");
const FormData = require("form-data");
const FilePayload = require("../../file-payload");
const { default: axios } = require("axios");

const BASE_URL = "https://studio-api.suno.ai";
const WAIT_LOOP_LIMIT = 200;
const WAIT_LOOP_DELAY = 5000;

/**
 * @typedef {Object} SunoCreatePayload
 * @property {string} prompt
 * @property {any} tags
 * @property {string} title
 * @property {string} gpt_description_prompt
 * @property {boolean} instrumental
 * @property {'chirp-v2-0' | 'chirp-v3-0'} mv
 */
/**
 * @typedef {Object} SunoTrackData
 * @property {string} title
 * @property {string} track_id
 * @property {string} video_url
 * @property {string} audio_url
 * @property {string} lyrics
 * @property {string} description
 * @property {number} duration
 * @property {string} picture_url
 */

const FEED_RESPONSE = {
	id: "4319c738-fdb8-4047-bc19-ca74d352b93c",
	video_url: "https://cdn1.suno.ai/4319c738-fdb8-4047-bc19-ca74d352b93c.mp4",
	audio_url: "https://cdn1.suno.ai/4319c738-fdb8-4047-bc19-ca74d352b93c.mp3",
	image_url: "https://cdn1.suno.ai/image_4319c738-fdb8-4047-bc19-ca74d352b93c.png",
	image_large_url: "https://cdn1.suno.ai/image_large_4319c738-fdb8-4047-bc19-ca74d352b93c.png",
	is_video_pending: true,
	major_model_version: "v3",
	model_name: "chirp-v3",
	metadata: {
		tags: "bass-heavy dark trap",
		prompt:
			"[Verse]\nBumpin' in the whip\nI'm feelin' so fly\nGotta turn it up\nLet the bass amplify\nPhonk in my system\nGot me feelin' so high\nI'm on top of the world\nTouchin' the sky\n\nLaid back in the cut\nSmokin' on that loud\nPhonk is the sound\nGot the whole crowd wowed\nRidin' with my crew\nWe ain't playin' around\nPhonk is the wave\nWe gon' hold it down\n\n[Verse 2]\nPhonk in my veins\nIt's runnin' through my soul\nGotta let it out\nGotta let it unfold\nDark vibes in the air\nLike a tale untold\nPhonk is the drug\nCan't break the hold",
		gpt_description_prompt: "phonk",
		audio_prompt_id: null,
		history: null,
		concat_history: null,
		type: "gen",
		duration: 98.96,
		refund_credits: false,
		stream: true,
		error_type: null,
		error_message: null,
	},
	is_liked: false,
	user_id: "b8d4061b-b39d-453e-8aab-a5fc57b5c87e",
	display_name: "GrungeSoloArtists207",
	handle: "grungesoloartists207",
	is_handle_updated: false,
	is_trashed: false,
	reaction: null,
	created_at: "2024-05-21T04:30:54.840Z",
	status: "complete",
	title: "Sippin' On That Phonk",
	play_count: 0,
	upvote_count: 0,
	is_public: false,
};

const UPLOAD_RESPONSE = {
	id: "003c6597-7fe9-4600-8e67-9184ff626b22",
	url: "https://suno-uploads.s3.amazonaws.com/",
	fields: {
		"Content-Type": "audio/mpeg",
		key: "raw_uploads/003c6597-7fe9-4600-8e67-9184ff626b22.mp3",
		AWSAccessKeyId: "AKIA2V4GXGDKJMTPWLXO",
		policy:
			"eyJleHBpcmF0aW9uIjogIjIwMjQtMDctMTVUMTg6NTc6MzhaIiwgImNvbmRpdGlvbnMiOiBbWyJjb250ZW50LWxlbmd0aC1yYW5nZSIsIDAsIDEwNDg1NzYwMF0sIFsic3RhcnRzLXdpdGgiLCAiJENvbnRlbnQtVHlwZSIsICJhdWRpby9tcGVnIl0sIHsiYnVja2V0IjogInN1bm8tdXBsb2FkcyJ9LCB7ImtleSI6ICJyYXdfdXBsb2Fkcy8wMDNjNjU5Ny03ZmU5LTQ2MDAtOGU2Ny05MTg0ZmY2MjZiMjIubXAzIn1dfQ==",
		signature: "1gVNvb1u1C1TYUqjS9NNBNFHtt8=",
	},
};

const UPLOAD_STATUS_RESPONSE = {
	id: "003c6597-7fe9-4600-8e67-9184ff626b22",
	status: "complete",
	error_message: null,
	s3_id: "m_f3ffb888-5626-443f-8eda-6628d46e5a2b",
	title: "edinstvennoe-chto-myi-mojem-tut-poluchit-eto",
	image_url: "https://cdn1.suno.ai/image_f3ffb888-5626-443f-8eda-6628d46e5a2b.png",
};

class SunoClient extends BaseClient {
	/**
	 * @param {string} sessionId
	 * @param {string} cookie
	 * @param {string} uniq_name
	 */
	constructor(sessionId, cookie, uniq_name) {
		super(BASE_URL);

		this.active_account = false;

		this.headers = {
			"Content-Type": "text/plain;charset=UTF-8",
			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
			Referer: "https://suno.com",
			Origin: "https://suno.com",
		};

		this.cookie = new SunoCookieManager(cookie, sessionId);
		this.uniq_name = uniq_name;
	}
	// gpt_description_prompt :  "phonk"
	// make_instrumental: false
	// mv: "chirp-v3-0"
	// prompt: ""
	//
	// "prompt": "",
	// "tags": "phonk",
	// "mv": "chirp-v3-0",
	// "title": "",
	// "continue_clip_id": null,
	// "continue_at": null
	/**
	 * @typedef {Object} CreateData
	 * @property {string} prompt
	 * @property {string?} tags
	 * @property {string?} title
	 * @property {string?} gpt_description_prompt
	 * @property {"chirp-v3-5" | "chirp-v3-5-upload"} mv
	 * @property {boolean} make_instrumental
	 * @property {number?} continue_at
	 * @property {number?} continue_clip_id
	 */
	/**
	 * @private
	 * @param {CreateData} data
	 */
	async create(data) {
		const payload = {
			mv: "chirp-v3-5",
			make_instrumental: false,
			prompt: "",
			...data,
		};

		const response = await this._request("POST", "/api/generate/v2/", {
			headers: { Authorization: `Bearer ${await this.cookie.token()}` },
			body: JSON.stringify(payload),
		});

		return await response.json();
	}

	async info() {
		const response = await this._request("GET", `/api/billing/info/`, {
			headers: { Authorization: `Bearer ${await this.cookie.token()}` },
		});

		return await response.json();
	}

	async total_credits_left() {
		try {
			const info = await this.info();

			if (!info.subscription_type) throw new Error();

			this.active_account = info.total_credits_left > 0;

			return info.total_credits_left;
		} catch (error) {
			console.log(`Client err ${this.uniq_name}`);
			this.active_account = false;
			return 0;
		}
	}

	/**
	 * @param {string[]} ids
	 * @returns {Promise<FEED_RESPONSE[]>}
	 */
	async get(ids = []) {
		const response = await this._request("GET", `/api/feed?ids=${ids.join(",")}`, {
			headers: { Authorization: `Bearer ${await this.cookie.token()}` },
		});

		return await response.json();
	}

	/**
	 * @typedef {Object} TaskData
	 * @property {string} title
	 * @property {string} description
	 * @property {string} lyrics
	 * @property {boolean} instrumental
	 * @property {number} continue_at
	 * @property {number} continue_clip_id
	 * @property {boolean} uploaded_clip
	 */

	/**
	 * @param {TaskData} data
	 */
	async processTask(data) {
		let result;

		if (data.lyrics !== undefined) {
			result = await this.create({
				prompt: data.lyrics,
				tags: data.description,
				title: data.title,
				make_instrumental: data.instrumental,
				mv: data.uploaded_clip ? "chirp-v3-5-upload" : "chirp-v3-5",
				continue_at: data.continue_at,
				continue_clip_id: data.continue_clip_id,
			});
		} else {
			result = await this.create({
				gpt_description_prompt: data.description,
				title: data.title,
				instrumental: data.instrumental,
			});
		}

		if (result.status !== "complete") {
			throw new Error(JSON.stringify(result, undefined, " "));
		}

		return this._process(result, data.title);
	}

	/**
	 * @param {string} title: Track title
	 * @param {string} description: Stylistic description
	 * @param {boolean} instrumental: Create an instrumental
	 * @param {*} kwargs: Stylistic tags
	 */
	async simple(title, description, instrumental = false, kwargs = {}) {
		const extendedDescription = this._extendDescription(description, kwargs);
		const data = await this.create("", null, title, extendedDescription, instrumental);
		return await this._process(data, title);
	}

	/**
	 * @param {string} title: Track title
	 * @param {string | undefined} lyrics: Track text
	 * @param {string} description: Stylistic description
	 * @param {*} kwargs: Stylistic tags
	 */
	async extended(title, lyrics, description = "", instrumental = false, kwargs) {
		const extendedDescription = this._extendDescription(description, kwargs);
		const data = await this.create(lyrics, extendedDescription, title, undefined, instrumental);
		return await this._process(data, title);
	}

	async download(url) {
		const response = await this._request("GET", url);
		return response.json();
	}

	/**
	 * @param {FilePayload} file_payload
	 */
	async UploadFile(file_payload) {
		/**
		 * @type {UPLOAD_RESPONSE}
		 */
		const upload = await this._createUploadRequest(file_payload);
		const form_data = new FormData();

		for (const key in upload.fields) {
			form_data.append(key, upload.fields[key]);
		}

		form_data.append("file", file_payload.stream);
		await axios.post(upload.url, form_data);

		const upload_finish = await this._request("POST", `/api/uploads/audio/${upload.id}/upload-finish/`, {
			headers: { Authorization: `Bearer ${await this.cookie.token()}` },
			body: JSON.stringify({
				upload_type: "file_upload",
				upload_filename: file_payload.file_name,
			}),
		});
		const finish_resp = await upload_finish.json();
		if (finish_resp.detail) {
			throw new Error(JSON.stringify(finish_resp, undefined, " "));
		}

		const upload_status = await this.WaitUntilUploaded(upload.id);
		const initialize_clip = await this._request("POST", `/api/uploads/audio/${upload.id}/initialize-clip/`, {
			headers: { Authorization: `Bearer ${await this.cookie.token()}` },
		});
		const response = await initialize_clip.json();
		const track_data = await this.get([response.clip_id]);

		console.log(`success upload`, response.clip_id);

		return ParseTrackData(track_data[0]);
	}

	/**
	 * @private
	 * @param {FilePayload} file_payload
	 */
	async _createUploadRequest(file_payload) {
		const uploadResponse = await this._request("POST", "/api/uploads/audio/", {
			headers: { Authorization: `Bearer ${await this.cookie.token()}` },
			body: JSON.stringify({ extension: file_payload.extension }),
		});

		if (!uploadResponse.ok) throw new Error(`Create upload request error ${JSON.stringify(uploadResponse.body)}`);

		return uploadResponse.json();
	}

	/**
	 * @param {string} id
	 * @returns {Promise<UPLOAD_STATUS_RESPONSE>}
	 */
	async _uploadRequestStatus(id) {
		const result = await this._request("GET", `/api/uploads/audio/${id}/`, {
			headers: { Authorization: `Bearer ${await this.cookie.token()}` },
		});

		return result.json();
	}

	/**
	 * @private
	 * @param {string} url
	 */
	async _stream(url) {
		const response = await fetch(url);
		if (response.ok && response.body) {
			const reader = response.body;
			try {
				while (true) {
					response.body.read();
				}
			} catch (err) {}
		} else {
			throw new Error(`Failed to stream, status code: ${response.status}`);
		}
	}

	/**
	 * @private
	 * @param {string} description
	 * @param {any} kwargs
	 */
	_extendDescription(description, kwargs = {}) {
		return `${description}, ${Object.entries(kwargs)
			.map(([k, v]) => `${k}: ${v}`)
			.join(", ")}`;
	}

	/**
	 * @private
	 * @param {any} data
	 * @param {any} title
	 * @returns {Promise<SunoTrackData[]>}
	 */
	async _process(data, title) {
		const ids = data.clips.map((clip) => clip.id);

		await this.WaitUntilGenerated(ids);

		// console.log(urls);

		// try {
		// await Promise.all(urls.map((url) => this._stream(url)));
		// } catch (error) {}

		// await this.WaitUntil(ids, (track) => track.audio_url.match(".mp3"));

		const tracks = await this.get(ids);
		return tracks.map(ParseTrackData);
	}

	/**
	 * @param {string} id
	 */
	async WaitUntilUploaded(id) {
		for (let i = 0; i < WAIT_LOOP_LIMIT; i++) {
			const data = await this._uploadRequestStatus(id);

			if (data.status === "error") throw new Error(`${data.error_message}`);
			if (data.status === "complete") return data;

			await sleep(1000);
		}

		throw new Error("Upload error");
	}

	/**
	 * @param {string[]} ids
	 */
	async WaitUntilGenerated(ids) {
		let notCompleteIds = ids.slice();

		for (let i = 0; i < WAIT_LOOP_LIMIT; i++) {
			const data = await this.get(notCompleteIds);

			if (!data) continue;
			if (data[0]?.status === "error") throw new Error(`${data[0].metadata.error_type}\n${data[0].metadata.error_message}`);

			for (let i = 0; i < data.length; i++) {
				const element = data[i];

				if (element?.status === "complete") {
					notCompleteIds = notCompleteIds.filter((v) => element.id !== v);
				}
			}

			if (notCompleteIds.length === 0) break;
			// urls = data.map(process_callback);

			// if (urls.every((url) => url)) break;
			await sleep(WAIT_LOOP_DELAY);
		}

		return ids;
	}
}

/** @param {FEED_RESPONSE} track  */
function ParseTrackData(track) {
	return {
		title: track.title,
		track_id: track.id,
		video_url: track.video_url,
		audio_url: track.audio_url,
		lyrics: track.metadata.prompt,
		description: track.metadata.tags,
		duration: track.metadata.duration,
		picture_url: track.image_large_url,
		type: track.metadata.type,
	};
}

// fetch("https://studio-api.suno.ai/api/generate/v2/", {
//   "headers": {
//     "accept": "*/*",
//     "accept-language": "ru",
//     "authorization": "Bearer eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDExMUFBQSIsImtpZCI6Imluc18yT1o2eU1EZzhscWRKRWloMXJvemY4T3ptZG4iLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJzdW5vLWFwaSIsImF6cCI6Imh0dHBzOi8vc3Vuby5jb20iLCJleHAiOjE3MTU3OTkzMTksImh0dHBzOi8vc3Vuby5haS9jbGFpbXMvY2xlcmtfaWQiOiJ1c2VyXzJnVzJNTUdmWDVQYzdtVlVnc1FLQnd4dk1ETyIsImh0dHBzOi8vc3Vuby5haS9jbGFpbXMvZW1haWwiOiJhbGV4cnVkc2hpbGRAZ21haWwuY29tIiwiaWF0IjoxNzE1Nzk5MjU5LCJpc3MiOiJodHRwczovL2NsZXJrLnN1bm8uY29tIiwianRpIjoiYjY5N2Y3MzdlMDk5ZGI5YTU4YmQiLCJuYmYiOjE3MTU3OTkyNDksInNpZCI6InNlc3NfMmdXMk1LVkloVWdGMDd0YnZRZW5UTjZHRk5vIiwic3ViIjoidXNlcl8yZ1cyTU1HZlg1UGM3bVZVZ3NRS0J3eHZNRE8ifQ.Zs-tz4Jr5XnWtsyJpvKmLDnNJzXwsvqy9If5k628grMTZqwZyRYtfxgZ3usC13oGcLqNpk1MDCrGeI-ueUPirn8On7ZLQi3KP95jy3fuRofhUff2o18lZtj7Xtjub_HlTsfTPo7-K-ACfTpLltVcsOOg9oPpFqoqJ5iAnHagvIrmxH-zzBx8oZgT1TUauXNqZMe0SVNd47nC3mbGQPnZFVDv2SA-T3P7-jbi72CiZuRxfK5Hs5nCamfGBNnuJ3wErmpTJvRVSsNtziJ-1Yf6wiOgLLDYzWLj90O13zBUA4gIGWmEE6Z9SZf3EvYOsrQuaG52tJRc5z6IGibmsmgrQA",
//     "content-type": "text/plain;charset=UTF-8",
//     "sec-ch-ua": "\"Opera GX\";v=\"109\", \"Not:A-Brand\";v=\"8\", \"Chromium\";v=\"123\"",
//     "sec-ch-ua-mobile": "?0",
//     "sec-ch-ua-platform": "\"Windows\"",
//     "sec-fetch-dest": "empty",
//     "sec-fetch-mode": "cors",
//     "sec-fetch-site": "cross-site",
//     "Referer": "https://suno.com/",
//     "Referrer-Policy": "strict-origin-when-cross-origin"
//   },
//   "body": "{\"prompt\":\"\",\"tags\":\"Drift phonk\",\"mv\":\"chirp-v3-0\",\"title\":\"phonk\",\"continue_clip_id\":null,\"continue_at\":null}",
//   "method": "POST"
// });

// class SunoClient1 extends BaseClient {
// 	constructor(sessionId, cookie) {
// 		super("https://studio-api.suno.ai");
// 		this.cookie = new SunoCookieManager(cookie, sessionId);
// 		this.headers = {
// 			"Content-Type": "text/plain;charset=UTF-8",
// 			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
// 			Referer: "https://suno.com",
// 			Origin: "https://suno.com",
// 		};
// 	}

// 	/**
// 	 * @param {string} prompt
// 	 * @param {*} tags
// 	 * @param {*} title
// 	 * @param {*} gptDescriptionPrompt
// 	 * @param {*} instrumental
// 	 * @param {*} mv
// 	 */
// 	async create(prompt = "", tags = null, title = null, gptDescriptionPrompt = null, instrumental = false, mv = "chirp-v3-0") {
// 		const data = {
// 			mv,
// 			make_instrumental: instrumental,
// 			prompt,
// 		};

// 		if (gptDescriptionPrompt) data.gpt_description_prompt = gptDescriptionPrompt;
// 		if (tags) data.tags = tags;
// 		if (title) data.title = title;

// 		const response = await this._request("POST", "/api/generate/v2/", {
// 			headers: { Authorization: `Bearer ${await this.cookie.token()}` },
// 			body: JSON.stringify(data),
// 		});

// 		return await response.json();
// 	}

// 	async get(ids = []) {
// 		const response = await this._request("GET", "/api/feed/", {
// 			headers: { Authorization: `Bearer ${await this.cookie.token()}` },
// 			params: { ids: ids.join(",") },
// 		});

// 		return await response.json();
// 	}

// 	async simple(title, description, instrumental = false, kwargs) {
// 		const extendedDescription = this._extendDescription(description, kwargs);
// 		const data = await this.create("", null, title, extendedDescription, instrumental);
// 		return await this._process(data, title);
// 	}

// 	async extended(title, lyrics, description = "", kwargs) {
// 		const extendedDescription = this._extendDescription(description, kwargs);
// 		const data = await this.create(lyrics, extendedDescription, title);
// 		return await this._process(data, title);
// 	}

// 	async download(url) {
// 		const response = await this._request("GET", url);
// 		return response.json();
// 	}

// 	async _stream(url) {
// 		const response = await this._request("GET", url);
// 		if (response.ok) {
// 			await pipeline(response.body, process.stdout);
// 		} else {
// 			throw new Error(`Failed to stream, status code: ${response.status}`);
// 		}
// 	}

// 	_extendDescription(description, kwargs) {
// 		return `${description}, ${Object.entries(kwargs)
// 			.map(([k, v]) => `${k}: ${v}`)
// 			.join(", ")}`;
// 	}

// 	async _process(data, title) {
// 		const ids = data.clips.map((clip) => clip.id);
// 		let urls = [];

// 		for (let i = 0; i < this.WAIT_LOOP_LIMIT; i++) {
// 			const data = await this.get(ids);
// 			urls = data.map((track) => track.audio_url);
// 			if (urls.every((url) => url)) break;
// 			await new Promise((resolve) => setTimeout(resolve, this.WAIT_LOOP_DELAY));
// 		}

// 		if (!urls.length) return null;

// 		await Promise.all(urls.map((url) => this._stream(url)));

// 		const tracks = await this.get(ids);
// 		return tracks.map((track) => ({
// 			title,
// 			audio_url: track.audio_url,
// 			lyrics: track.metadata.prompt,
// 			description: track.metadata.tags,
// 			duration: track.metadata.duration,
// 			picture_url: track.image_large_url,
// 		}));
// 	}
// }

module.exports = { SunoClient };
