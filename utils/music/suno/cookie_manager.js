const { CookieJar } = require("tough-cookie");
const fetch = require("node-fetch");

class SunoCookieManager {
	/**
	 * @param {string} cookie
	 * @param {string} sessionId
	 */
	constructor(cookie, sessionId) {
		this._cookieJar = new CookieJar();
		this._sessionId = sessionId;

        this.valid_client = false;

		this._last_touch = 0;
        this._last_token = 0;

        this._token = "";

		cookie.split("; ").map((v) => {
			this.cookie = v;
		});
	}

	static get BASE_URL() {
		return "https://clerk.suno.com";
	}

	get cookie() {
		return this._cookieJar.getCookieStringSync(SunoCookieManager.BASE_URL);
	}

	set cookie(value) {
		this._cookieJar.setCookieSync(value, SunoCookieManager.BASE_URL);
	}

	get sessionId() {
		return this._sessionId;
	}

	set sessionId(value) {
		this._sessionId = value;
	}

	/**
	 * @param {'POST' | 'GET'} method
	 * @param {string} url
	 * @param {any} options
	 * @returns
	 */
	async _request(method, url, options = {}) {
		const headers = options.headers || {};
		headers["cookie"] = this.cookie;

		const response = await fetch(`${SunoCookieManager.BASE_URL}${url}`, {
			method,
			...options,
			headers,
		});

		if (response.headers.has("set-cookie")) {
			const cookies = response.headers.raw()["set-cookie"];
			cookies.forEach((cookie) => this._cookieJar.setCookieSync(cookie, SunoCookieManager.BASE_URL));
		}

		return response;
	}

	async token() {
		await this.touch();

		const response = await this._request("POST", `/v1/client/sessions/${this.sessionId}/tokens?_clerk_js_version=4.73.3`, {
			headers: { "Content-Type": "application/json" },
		});

		if (response.ok) {
			const data = await response.json();
            this._token = data.jwt;
			return data.jwt;
		} else {
			throw new Error(`Failed to fetch token, status code: ${response.status} ${JSON.stringify(await response.json(), undefined, " ")}`);
		}
	}

	async touch() {
		if (this._last_touch + 60_000 > Date.now()) return;
		this._last_touch = Date.now();

		const response = await this._request("POST", `/v1/client/sessions/${this.sessionId}/touch?_clerk_js_version=4.73.3`, {
			headers: { "Content-Type": "application/json" },
		});

        this.valid_client = response.ok;

		if (response.ok) {
			const data = await response.json();
			return data;
		} else {
			throw new Error(`Failed to fetch touch, status code: ${response.status} ${JSON.stringify(await response.json(), undefined, " ")}`);
		}
	}
}

module.exports = { SunoCookieManager };
