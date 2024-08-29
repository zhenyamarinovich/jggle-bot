const express = require("express");
const { PakSendedToReview, User, ArtistPoll } = require("../models");
const PollVote = require("../models/ReviewVote");
const path = require("path");
const GenerationLogs = require("../models/GenerationLogs");
const { Op } = require("sequelize");

const app = express();

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.get("/api/users", async (req, res) => {
	const users = await User.findAll();
	const result = users.map((v) => {
		const data = v.dataValues;

		return {
			chat_id: data.chat_id,
			username: data.last_username,
			full_name: data.last_full_name,
			pak_send: data.artist_pak_send,
			ref_link: data.ref_code,
			registration_date: data.created_timestamp,
		};
	});

	return res.status(200).json(result);
});
/**
 * @typedef {"midjourney" | "thea-ai" | "suno" | "all"} ServiceType
 */

const services = ["midjourney", "suno", "thea-ai", "all"];

function TestNumber(str = "") {
	if (isNaN(str)) {
		return str;
	} else {
		return parseInt(str);
	}
}

app.get("/api/stats", async (req, res) => {
	req.query.from = TestNumber(req.query.from);
	req.query.to = TestNumber(req.query.to);

	const target_id = req.query.id;
	const service_type = req.query.service_type ?? "all";
	const from_date = req.query.from ? new Date(req.query.from) : undefined;
	const to_date = req.query.to ? new Date(req.query.to) : undefined;
	const text = req.query.text ? true : false;

	/**@type {Date[]} */
	const between = [];

	if (from_date) {
		between[0] = from_date;

		if (to_date) {
			between[1] = to_date;
		} else {
			const day = new Date(from_date);

			day.setDate(day.getDate() + 1);

			between[1] = day;
		}
	}

	if (Array.isArray(service_type)) {
		for (let i = 0; i < service_type.length; i++) {
			const service = service_type[i];

			if (!services.includes(service)) {
				return res.status(500).json({ error: `service type only (${services.join(", ")})` });
			}
		}
	} else {
		if (!services.includes(service_type)) return res.status(500).json({ error: `service type only (${services.join(", ")})` });
	}

	try {
		const data = await CalculateData(service_type, target_id, between);

		if (text) {
			return res.status(200).send(Stringify(data));
		} else {
			return res.status(200).json(data);
		}
	} catch (error) {
		return res.status(500).send(error.message);
	}
});

/**
 * @param {ServiceType} service_type
 * @param {string} chat_id
 * @param {Date[]=} between
 * @returns
 */
function GetLogs(service_type, chat_id, between) {
	/**@type {import("sequelize").WhereOptions<GenerationLogs.GenerationLogsAttribute>} */
	let where = {};

	if (between) {
		where.request_timestamp = {
			[Op.between]: between,
		};
	}

	if (chat_id) {
		where.request = {
			[Op.regexp]: `"chat_id":${chat_id}`,
		};
	}

	if (service_type !== "all") {
		where.service_type = service_type;
	}

	return GenerationLogs.findAll({
		where: where,
	});
}

async function GetUsersMap() {
	const users = await User.findAll();
	/** @type {Map<number, User.UserType>} */
	const map = new Map();

	for (let i = 0; i < users.length; i++) {
		const user = users[i];
		const data = user.dataValues;

		map.set(data.chat_id, data);
	}

	return map;
}

/**
 * @typedef {Object} StatisticType
 * @property {string} service_type
 * @property {string} target_id
 *
 * @property {number} average
 * @property {number} median
 * @property {number} average_start_time
 * @property {number} median_start_time
 *
 * @property {number} total
 * @property {number} error_percent
 *
 * @property {{[key: string]: any}} service_count
 *
 * @property {string[]} generation_count
 * @property {Date[]} between
 *
 * @property {any[]} service_type
 * @property {any[]} errors
 * @property {any[]} too_long
 */

/**
 * @param {"midjourney" | "thea-ai" | "suno" | "all"} service_type
 * @param {string} target_id
 * @param {Date[]=} between
 */
async function CalculateData(service_type, target_id, between) {
	const logs = await GetLogs(service_type, target_id, between);
	const users_map = await GetUsersMap();

	/** @type {StatisticType} */
	const output = {
		service_type,
		target_id,
		between,
		errors: [],
		too_long: [],
		average_start_time: 0,
		median_start_time: 0,
		average: 0,
		median: 0,
		total: logs.length,
		error_percent: 0,
		generation_count: {},
		service_count: {
			midjourney: 0,
			"thea-ai": 0,
			suno: 0,
		},
	};

	const generation_count = {};
	const diff_times = [];
	const diff_start_times = [];

	for (let i = 0; i < logs.length; i++) {
		const log = logs[i];
		const data = log.dataValues;
		const json_request = JSON.parse(data.request);
		// const user = users_map.get(json_request.chat_id);
		// data.request.username = user.last_username ?? user.last_full_name;

		if (data.request.match(/hashId":"upsample/)) continue;

		output.service_count[data.service_type] = 1 + (output.service_count[data.service_type] ?? 0);

		if (data.status === "error") {
			output.errors.push({
				request_timestamp: data.request_timestamp,
				response_timestamp: data.response_timestamp,
				request: data.request,
				response: data.response,
			});

			continue;
		}

		generation_count[json_request.chat_id] = 1 + (generation_count[json_request.chat_id] ?? 0);

		if (data.request_start_timestamp) {
			const diff_start = (data.request_timestamp - data.request_start_timestamp) / 1000;

			diff_start_times.push(diff_start);
		}

		const diff = (data.response_timestamp - data.request_timestamp) / 1000;

		if (diff > 600) {
			output.too_long.push(data);
		}

		diff_times.push(diff);
	}

	output.average_start_time = GetAverage(diff_start_times);
	output.average = GetAverage(diff_times);

	output.median = Math.floor(FindMedian(diff_times));

	output.error_percent = Math.floor((100 / logs.length) * output.errors.length);
	output.generation_count = GetTopGeneration(generation_count);

	return output;
}

function GetAverage(values = []) {
	if (values.length === 0) return 0;

	let sum = 0;

	for (let i = 0; i < values.length; i++) {
		sum += values[i];
	}

	return Math.floor(sum / values.length);
}

function GetTopGeneration(generation_count) {
	const arr = Object.entries(generation_count);

	arr.sort((a, b) => b[1] - a[1]);

	return arr.map((v) => `${v[0]}: ${v[1]}`);
}

/**
 * @param {StatisticType} data
 */
function Stringify(data) {
	let text = "";

	if (data.service_type === "all") {
		text += `service count:\n${Object.entries(data.service_count).join("\n").replace(/,/g, ": ")}\n\n`;
	} else {
		text += `service: ${data.service_type}\n`;
	}

	if (data.between) {
		text += `${data.between[0].toLocaleString("ru", { dateStyle: "short" })} - `;
		text += `${data.between[1].toLocaleString("ru", { dateStyle: "short" })}\n`;
	}

	text += `generations/errors: ${data.total}/${data.errors.length} (${data.error_percent}%)\n`;
	text += `average time to start: ${NumberToTime(data.average_start_time)}\n`;
	text += `average: ${NumberToTime(data.average)}\n`;
	text += `median: ${NumberToTime(data.median)}\n\n`;

	if (!data.target_id) {
		text += `most generation:\n${data.generation_count.slice(0, 5).join("\n")}\n\n`;

		data.generation_count.reverse();

		text += `least generation:\n${data.generation_count.slice(0, 5).join("\n")}`;
	}

	return text;
}

function NumberToTime(time) {
	const seconds = `0${time % 60}`.slice(-2);
	const minutes = Math.floor(time / 60);

	return `${minutes}:${seconds}`;
}

function FindMedian(arr) {
	if (!Array.isArray(arr) || arr.length === 0) {
		return 0;
	}

	arr.sort((a, b) => a - b);

	const mid = Math.floor(arr.length / 2);

	if (arr.length % 2 !== 0) {
		return arr[mid];
	}

	return (arr[mid - 1] + arr[mid]) / 2;
}

/**
 * @param {ArtistPoll[]} polls
 */
async function GetPollsResults(polls) {
	let photo = {
		count: 0,
		amount: 0,
		not_all: false,
	};
	let audio = {
		count: 0,
		amount: 0,
		not_all: false,
	};

	for (let i = 0; i < polls.length; i++) {
		const poll = polls[i];
		/** @type {PollVote[]} */
		const votes = await PollVote.findAll({
			where: {
				poll_id: poll.dataValues.poll_id,
			},
		});
		const count = await CountAllVotes(votes);

		if (poll.dataValues.chat_id === SETTINGS.TELEGRAM_REVIEW_CHATS.music_chat) {
			audio.count++;
			audio.amount += count;
			if (count === 0) {
				audio.not_all = true;
			}
		} else {
			photo.count++;
			photo.amount += count;
			if (count === 0) {
				photo.not_all = true;
			}
		}
	}

	audio.amount /= audio.count;
	photo.amount /= photo.count;

	return {
		audio_count: audio.not_all ? -1 : RoundToTwoDecimal(audio.amount),
		photo_count: photo.not_all ? -1 : RoundToTwoDecimal(photo.amount),
	};
}

/**
 * @param {PollVote[]} votes
 */
async function CountAllVotes(votes) {
	let count = 0;

	for (let i = 0; i < votes.length; i++) {
		const vote = votes[i];
		count += vote.dataValues.vote_option + 1;
	}

	count /= votes.length;

	return RoundToTwoDecimal(count);
}

/**
 * @param {Number} number
 */
function RoundToTwoDecimal(number) {
	if (Number.isNaN(number)) return 0;

	return Math.round(number * 10) / 10 ?? 0;
}

// simple route
app.get("/", (req, res) => {
	res.json({ message: "Welcome." });
});

// set port, listen for requests
const PORT = 8200;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}.`);
});
