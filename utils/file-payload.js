const fs = require("fs");

module.exports = class FilePayload {
	constructor(file_src = "", mime_type = "", file_name = undefined) {
		/** @type {string} */
		this.src = file_src;
		this.mime_type = mime_type;
		this.file_name = file_name ?? this.src.split("/")?.pop();

		/**@private @type {string | undefined} */
		this._base64 = undefined;
		/**@private @type {Buffer | undefined} */
		this._buffer = undefined;
		/**@private @type {fs.ReadStream | undefined} */
		this._stream = undefined;
	}

	get extension() {
		return this.src.split(".")?.pop();
	}

	get buffer() {
		if (this._buffer) return this._buffer;

		this._buffer = fs.readFileSync(this.src);

		return this._buffer;
	}

	get base64() {
		if (this._base64) return this._base64;

		this._base64 = fs.readFileSync(this.src, "base64");

		return this._base64;
	}

	get stream() {
		if (this._stream) return this._stream;

		this._stream = fs.createReadStream(this.src);

		return this._stream;
	}

	Dispose() {
		fs.unlinkSync(this.src);
		// return new Promise<void>((resolve, reject) => {
		// 	fs.unlink(this.file_src, (err) => {
		// 		if (err) return reject(err);
		// 		return resolve();
		// 	});
		// });
	}
};
