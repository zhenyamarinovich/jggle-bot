/** @param {string} text */
module.exports.convertHtmlChars = function (text) {
    if (!text) return text;
	text = text.replace(/&/g, "&amp;");
	text = text.replace(/</g, "&lt;");
	text = text.replace(/>/g, "&gt;");
	return text;
};

/**
 * @param {string} outText
 * @param {string} mdTag
 * @param {string} htmlTag
 */
module.exports.splitByTag = function (outText, mdTag, htmlTag) {
	// Escaping special characters in the mdTag to create a valid regular expression
	const escapedMdTag = mdTag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

	// Creating a regular expression to find the Markdown tags
	const tagPattern = new RegExp(`(?<!\\w)${escapedMdTag}(.*?)${escapedMdTag}(?!\\w)`, "gs");

	// Replacing the Markdown tags with HTML tags
	return outText.replace(tagPattern, `<${htmlTag}>$1</${htmlTag}>`);
};
