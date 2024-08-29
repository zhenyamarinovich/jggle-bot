const { convertHtmlChars, splitByTag } = require("./converters");
const { extractAndConvertCodeBlocks, reinsertCodeBlocks } = require("./extractors");

module.exports.markdownToHtml = function (text) {

	// Step 0: Combine blockquotes
	text = combineBlockquotes(text);

	// Step 1: Convert HTML reserved symbols
	text = convertHtmlChars(text);

	// Step 2: Extract and convert code blocks first
	let { output, codeBlocks } = extractAndConvertCodeBlocks(text);

	// Step 3: Escape HTML special characters in the output text
	output = output.replace(/</g, "&lt;").replace(/>/g, "&gt;");

	// Inline code
	output = output.replace(/`(.*?)`/g, "<code>$1</code>");

	// Nested Bold and Italic
	output = output.replace(/\*\*\*((.|\n)*?)\*\*\*/g, "<b><i>$1</i></b>");
	output = output.replace(/___((.|\n)*?)___/g, "<u><i>$1</i></u>");

	// Process markdown formatting tags (bold, underline, italic, strikethrough)
	// and convert them to their respective HTML tags
	output = splitByTag(output, "**", "b");
	output = splitByTag(output, "__", "u");
	output = splitByTag(output, "_", "i");
	output = splitByTag(output, "*", "i");
	output = splitByTag(output, "~~", "s");

	// Remove storage links
	output = output.replace(/【[^】]+】/g, "");

	// Convert links
	output = output.replace(/!?\[(.*?)\]\(([^"]*?)\)/g, '<a href="$2">$1</a>');

	// Convert headings
	output = output.replace(/^\s*#+ (.+)/gm, "<b>$1</b>");

	// Convert unordered lists, preserving indentation
	output = output.replace(/^(\s*)[-*] (.+)/gm, "$1• $2");

	// Step 4: Reinsert the converted HTML code blocks
	output = reinsertCodeBlocks(output, codeBlocks);

	// Step 5: Remove blockquote escaping
	output = removeBlockquoteEscaping(output);

	return output;
}

/** @param {string} output */
function removeBlockquoteEscaping(output) {
	output = output.replace(/&lt;blockquote&gt;/g, "<blockquote>").replace(/&lt;\/blockquote&gt;/g, "</blockquote>");
	return output;
}


/** @param {string} text */
function combineBlockquotes(text) {
	const lines = text.split("\n");
	const combined_lines = [];
	const blockquote_lines = [];
	let in_blockquote = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim().startsWith(">")) {
			in_blockquote = true;
			blockquote_lines.push(line.slice(1).trim());
		} else {
			if (in_blockquote) {
				combined_lines.push(`<blockquote>${blockquote_lines.join("\n")}</blockquote>`);
				blockquote_lines.length = 0;
				in_blockquote = false;
			}
			combined_lines.push(line);
		}
	}

	if (in_blockquote) {
		combined_lines.push(`<blockquote>${blockquote_lines.join("\n")}</blockquote>`);
	}

	return combined_lines.join("\n");
};