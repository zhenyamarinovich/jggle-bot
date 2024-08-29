const fs = require("fs");
const { RemoveBannedWords } = require("../utils/remove-banned-words");
const uri = {
	main: SETTINGS.STABLE_ADDRESS,
	// main: 'http://127.0.0.1:7860',
	get txt2img() {
		return `${this.main}/sdapi/v1/txt2img`;
	},
	get img2img() {
		return `${this.main}/sdapi/v1/img2img`;
	},
	get upscale() {
		return `${this.main}/sdapi/v1/extra-single-image`;
	},
	get options() {
		return `${this.main}/sdapi/v1/options`;
	},
	get reactor() {
		return `${this.main}/reactor/image`;
	},
};

/** ControlNetUnitConfig
 * @typedef {Object} ControlNetUnitConfig
 * @property {string} input_image
 * @property {?string} mask
 * @property {"none" | "canny" | "depth" | "depth_leres" | "hed" | "mlsd" | "normal_map" | "openpose" | "openpose_hand" | "clip_vision" | "color" | "pidinet" | "scribble" | "fake_scribble" | "segmentation" | "binary"} module: ControlNetModule;
 * @property {?string} model
 * @property {?number} weight
 * @property {?"Scale to Fit (Inner Fit)" | string} resize_mode
 * @property {?boolean} lowvram
 * @property {?number} processor_res
 * @property {?number} threshold_a
 * @property {?number} threshold_b
 * @property {?number} guidance
 * @property {?number} guidance_start
 * @property {?number} guidance_end
};
 */

class ControlNetUnit {
	/**
	 * @param {ControlNetUnitConfig} config
	 */
	constructor(config) {
		/** @type {ControlNetUnitConfig} */
		this.config = config;
	}
	toJson() {
		return {
			input_image: this.config.input_image,
			mask: this.config.mask,
			module: this.config.module ?? "none",
			model: this.config.model ?? "None",
			weight: this.config.weight ?? 1,
			resize_mode: this.config.resize_mode ?? "Scale to Fit (Inner Fit)",
			lowvram: this.config.lowvram ?? false,
			processor_res: this.config.processor_res ?? 64,
			threshold_a: this.config.threshold_a ?? 64,
			threshold_b: this.config.threshold_b ?? 64,
			guidance: this.config.guidance ?? 1,
			guidance_start: this.config.guidance_start ?? 0,
			guidance_end: this.config.guidance_end ?? 1,
		};
	}
}
// const { StableDiffusionApi, ControlNetUnit } = require('stable-diffusion-api');

// const api = new StableDiffusionApi({
//     // host: "95.165.164.57",
//     // port: "7860",
//     // protocol: "http",
//     defaultSampler: "DPM++ SDE Karras",
//     defaultStepCount: 5,
//     timeout: 10 * 60 * 1000,
// });

// const t = new ControlNetUnit({ input_image: "" });
// const t1 = new ControlNetUnit1({ input_image: "" });
// console.log(t1.toJson());
// t.toJson().then(console.log)
// api.txt2img({
//     prompt: "",
//     controlnet_units: [t],
// })

/**
 * @type {txt2imgSettings}
 */
const override_settings = {
	filter_nsfw: true,
	CLIP_stop_at_last_layers: 2,
};

const nsfw_prompt = "(NSFW:1.5), (porn:1.2), (naked:1.5), (nude), (open clothes)";
const stableDiffusionApi = {};

stableDiffusionApi.GenerateTxt2Img = async function (prompt = "", negative_prompt = "", image) {
	prompt = RemoveBannedWords(prompt);

	const payload = {
		prompt,
		negative_prompt: `${nsfw_prompt}${negative_prompt}`,

		width: 768,
		height: 1024,
		sampler_name: "DPM++ SDE Karras",
		cfg_scale: 2,

		steps: 5,
	};

	return PostRequest(uri.txt2img, payload);
};

stableDiffusionApi.GenerateImg2Img = async function (prompt = "", negative_prompt, img = "", denoising_strength = 0.5) {
	prompt = RemoveBannedWords(prompt);

	// const ControlNet = new ControlNetUnit({
	//     input_image: img,
	//     module: "canny",
	//     weight: 0.75,
	//     model: "diffusers_xl_canny_full [2b69fca4]",
	// });

	const payload = {
		prompt,
		negative_prompt: `${nsfw_prompt}${negative_prompt}`,

		init_images: [img],

		// alwayson_scripts: {
		//     ControlNet: {
		//         args: [ControlNet.toJson()]
		//     }
		// },
		denoising_strength: denoising_strength,
		width: 768,
		height: 1024,
		cfg_scale: 2,
		steps: 5,
	};

	return PostRequest(uri.img2img, payload);
};

// stableDiffusionApi.GenerateImg2Img123123 = async function (prompt = '', negative_prompt, img = '', denoising_strength = 0.5) {
//     prompt = RemoveBannedWords(prompt);

//     const ControlNet = new ControlNetUnit({
//         input_image: img,
//         module: "canny",
//         weight: 0.75,
//         model: "control_sd15_canny [fef5e48e]",
//     });

//     const payload = {
//         prompt,
//         negative_prompt: `${nsfw_prompt}${negative_prompt}`,

//         init_images: [img],

//         alwayson_scripts: {
//             ControlNet: {
//                 args: [ControlNet.toJson()]
//             }
//         },
//         denoising_strength: denoising_strength,
//     }

//     return PostRequest(uri.img2img, payload);
// }

// const im = fs.readFileSync("image.png").toString("base64");

// this.GenerateImg2Img("man", "", im, 1).then((res) => {
//     console.log(res);
//     fs.writeFileSync("tmp/test.png", res);
// });

stableDiffusionApi.SwapFace = async function (source, target) {
	const payload = {
		source_image: source,
		target_image: target,

		source_faces_index: [0],
		face_index: [0],

		upscaler: "None",
		scale: 1,
		upscale_visibility: 1,

		face_restorer: "GFPGAN",
		restorer_visibility: 1,
		codeformer_weight: 0.5,
		restore_first: 1,
		model: "inswapper_128.onnx",
		gender_source: 0,
		gender_target: 0,
	};

	return PostRequest(uri.reactor, payload);
};

stableDiffusionApi.UpscaleImg = async function (img = "", upscaling_resize = 2) {
	const payload = {
		image: img,
		upscaler_1: "R-ESRGAN 4x+",
		upscaling_resize: upscaling_resize,
	};

	return PostRequest(uri.upscale, payload);
};

/**
 * @returns {Promise<boolean>}
 */
stableDiffusionApi.CheckStable = async function () {
	return new Promise((resolve, reject) => {
		request.get(uri.main, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				resolve(true);
			} else {
				resolve(false);
			}
		});
	});
};

async function PostRequest(uri, payload) {
	const result = await fetch(uri, {
		method: "post",
		body: JSON.stringify(payload),
		headers: {
			accept: "application/json",
			"content-type": "application/json",
		},
	}).catch((err) => {
		if (!err || err.syscall === "connect") {
			throw new Error("Connection error");
		} else {
			throw err;
		}
	});

	const json = await result.json();
	const base64Image = json.image ?? json.images[0];
	const image = Buffer.from(base64Image, "base64");

	return image;
}

stableDiffusionApi.UpdateUrl = async function (url) {
	return (uri.main = url);
};

module.exports = stableDiffusionApi;
