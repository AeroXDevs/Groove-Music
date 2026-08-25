const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'uptime',
    description: "Shows the bot's uptime",
    category: 'Information',
    aliases: ['up'],

    async execute(message, args, client) {
        let totalSeconds = (client.uptime / 1000);
        let days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);

        let parts = [];
        if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
        if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);

        const uptimeString = parts.join(', ');

        const display = new TextDisplayBuilder()
            .setContent(
                `**Groove's Uptime !**\n` +
                `${emoji.blank}${emoji.wickarrow} I have been online for **${uptimeString}**`
            );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(display);

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
