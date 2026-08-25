const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'users',
    description: "Shows the bot's total users and servers",
    category: 'Information',
    aliases: ['botusers'],

    async execute(message, args, client) {
        const totalServers = client.guilds.cache.size.toLocaleString();
        const totalUsers = client.users.cache.size.toLocaleString();

        const display = new TextDisplayBuilder()
            .setContent(
                `**Groove's Users !**\n` +
                `${emoji.blank}${emoji.wickarrow} Total of **__${totalUsers}__** users in **__${totalServers}__** servers`
            );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(display);

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
