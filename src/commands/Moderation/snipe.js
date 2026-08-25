const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'snipe',
    description: 'Shows the last deleted message in the channel',
    category: 'Moderation',
    usage: 'snipe',
    example: 'snipe',
    userPerms: [],
    botPerms: [],

    async execute(message, args, client) {
        if (!client.snipes) client.snipes = new Map();

        const snipe = client.snipes.get(message.channel.id);

        if (!snipe) {
            const display = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.snipe.none", { e: emoji.warn }));
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        const timeSince = Math.floor((Date.now() - snipe.timestamp) / 1000);
        const timeString = timeSince < 60 ? `${timeSince}s ago` :
            timeSince < 3600 ? `${Math.floor(timeSince / 60)}m ago` :
                `${Math.floor(timeSince / 3600)}h ago`;

        const container = new ContainerBuilder();


        let header = `> **Author:** ${snipe.author}\n` +
            `> **Deleted:** \` ${timeString} \` \n\n`;

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(header));

        if (snipe.content) {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**__Content__**\n> ${snipe.content}`));
        }

        if (snipe.image) {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**__Attachment__**\n${snipe.image}`));
        }

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

    }
};
