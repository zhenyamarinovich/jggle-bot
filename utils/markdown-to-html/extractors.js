/** @param {string} text */
function ensureClosingDelimiters(text) {
	/**
	 * Ensures that if an opening ` or ``` is found without a matching closing delimiter,
	 * the missing delimiter is appended to the end of the text.
	 */
	// For triple backticks
	if ((text.match(/```/g) || []).length % 2 !== 0) {
		text += "```";
	}
	// For single backticks
	if ((text.match(/`/g) || []).length % 2 !== 0) {
		text += "`";
	}
	return text;
}

/** @param {string} text */
module.exports.extractAndConvertCodeBlocks = function (text) {
	/**
	 * Extracts code blocks from the text, converting them to HTML <pre><code> format,
	 * and replaces them with placeholders. Also ensures closing delimiters for unmatched blocks.
	 */
	text = ensureClosingDelimiters(text);
	const placeholders = [];
	const codeBlocks = {};

	function replacer(match, p1, p2, p3) {
		const language = p1 || "";
		const codeContent = p3;
		const placeholder = `CODEBLOCKPLACEHOLDER${placeholders.length}`;
		placeholders.push(placeholder);
		const htmlCodeBlock = language ? `<pre><code class="language-${language}">${codeContent}</code></pre>` : `<pre><code>${codeContent}</code></pre>`;
		return [placeholder, htmlCodeBlock];
	}

	let output = text;
	const codeBlockRegex = /```(\w*)?(\n)?(.*?)```/gs;
	let match;
	while ((match = codeBlockRegex.exec(text)) !== null) {
		const [placeholder, htmlCodeBlock] = replacer(...match);
		codeBlocks[placeholder] = htmlCodeBlock;
		output = output.replace(match[0], placeholder);
	}

	return { output, codeBlocks };
};

/**
 * @param {string} text
 * @param {object} codeBlocks
 */
module.exports.reinsertCodeBlocks = function (text, codeBlocks) {
	/**
	 * Reinserts HTML code blocks into the text, replacing their placeholders.
	 */
	for (const [placeholder, htmlCodeBlock] of Object.entries(codeBlocks)) {
		text = text.replace(placeholder, htmlCodeBlock);
	}
	return text;
};
