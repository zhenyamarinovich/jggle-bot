class BaseClient {
	/**
	 * @param {string} BASE_URL
	 */
	constructor(BASE_URL) {
		this.AUTH_HEADER = "Authorization";
		this.BASE_URL = BASE_URL;
		/**
		 * @type {HeadersInit}
		 */
		this.headers = {};
	}

	async close() {
		// Implement close logic if needed
	}

	/**
	 * @protected
	 * @param {'POST' | 'GET' | 'PUT'} method
	 * @param {string} url
	 * @param {RequestInit} options
	 * @returns
	 */
	async _request(method, url, options = {}) {
		options.headers = { ...options.headers, ...this.headers };
		const response = await fetch(`${this.BASE_URL}${url}`, {
			method,
			...options,
		});

		return response;
	}

	static _parseResponse(response) {
		if (response.ok) {
			return response.json();
		} else {
			throw new Error(`Request failed with status ${response.status}`);
		}
	}

	async enter() {
		return this;
	}

	async exit() {
		await this.close();
	}
}

module.exports = { BaseClient };
