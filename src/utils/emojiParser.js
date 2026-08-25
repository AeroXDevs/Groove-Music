/**
 * Parse a Discord emoji string to an emoji object
 * Supports formats like: <:name:id>, <a:name:id>, or unicode emojis
 * @param {string} emojiString - The emoji string to parse
 * @returns {object|string} - Parsed emoji object or original string if unicode
 */
function parseEmoji(emojiString) {
    if (!emojiString) return undefined;
    
    // Check if it's already a string with the emoji format
    if (typeof emojiString !== 'string') {
        return emojiString;
    }

    // Match animated or static emoji format: <a:name:id> or <:name:id>
    const match = emojiString.match(/^<(a)?:([a-zA-Z0-9_]+):(\d+)>$/);
    
    if (match) {
        return {
            name: match[2],
            id: match[3],
            animated: !!match[1]
        };
    }

    // If it's a unicode emoji or plain string, return as is
    return emojiString;
}

module.exports = { parseEmoji };
