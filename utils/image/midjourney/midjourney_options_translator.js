const OPTION_TEMPLATE = "MJ::JOB::{1}::{2}::{3}";

/**
 MJ::JOB::upsample::4::105560a5-1f76-455f-a3d4-3d9ce4eca383
 MJ::JOB::variation::4::105560a5-1f76-455f-a3d4-3d9ce4eca383
 MJ::JOB::reroll::0::105560a5-1f76-455f-a3d4-3d9ce4eca383::SOLO
 
 MJ::JOB::upsample_v5_4x::1::4d6dc2a7-4808-48cb-b248-e8e1f352ece2::SOLO
 MJ::JOB::high_variation::1::4d6dc2a7-4808-48cb-b248-e8e1f352ece2::SOLO
 MJ::JOB::pan_left::1::4d6dc2a7-4808-48cb-b248-e8e1f352ece2::SOLO
 
 MJ::Inpaint::1::4d6dc2a7-4808-48cb-b248-e8e1f352ece2::SOLO
 MJ::Outpaint::50::1::4d6dc2a7-4808-48cb-b248-e8e1f352ece2::SOLO
 MJ::Outpaint::75::1::4d6dc2a7-4808-48cb-b248-e8e1f352ece2::SOLO
 MJ::Outpaint::100::1::4d6dc2a7-4808-48cb-b248-e8e1f352ece2::SOLO
 
 MJ::CustomZoom::4d6dc2a7-4808-48cb-b248-e8e1f352ece2
*/
const isMultiJob = { upsample: true, variation: true };

const MidjourneyOptionsTranslator = {};

/**
 * @param {string} option
 * @param {string} job_id
 */
MidjourneyOptionsTranslator.convert_to_custom_id = function (option, job_id) {
	const [action, number] = option.split(" ");

	let job = OPTION_TEMPLATE.replace("{1}", action).replace("{2}", number).replace("{3}", job_id);

	if (!isMultiJob[action]) job += "::SOLO";

	return {
		job,
		action,
	};
};

/**
 * @param {string} custom_id
 *
 * {0 MJ}::{1 JOB}::{2 ACT}::{3 NUM}::{4 JOB_ID}::{5 SOLO}
 */
MidjourneyOptionsTranslator.convert_custom_id_to_action = function (custom_id) {
	if (!custom_id) return;

	const parts = custom_id.split("::");

	if (parts[1] !== "JOB") return;

	return {
		action: `${parts[2]} ${parts[3]}`,
		job_id: parts[4],
	};
};

/**
 * @param {import("midjourney").MJOptions[]} options
 */
MidjourneyOptionsTranslator.extract_options = function (options) {
	const actions_list = [];
	let job_id = "";

	for (let i = 0; i < options.length; i++) {
		const job = options[i];

		const custom_id = job.custom;
		const action_data = this.convert_custom_id_to_action(custom_id);

		if (action_data) {
			actions_list.push({
				label: job.label,
				action_data: action_data.action,
			});

			job_id = action_data.job_id;
		}
	}

	return {
		actions_list,
		job_id,
	};
};

// /**
//  * @param {*} message
//  */
//  extract_job_id(self, message){

//  }
//     filename = self.extract_filename_from_message(message)

//     if not filename:
//         return ""
//     job_id = filename.split("_")[-1].split(".")[0]
//     return job_id

// @staticmethod
// def extract_filename_from_message(message: dict) -> str | None:
//     return message.get('attachments', [{}])[0].get('filename', None)

module.exports = MidjourneyOptionsTranslator;
