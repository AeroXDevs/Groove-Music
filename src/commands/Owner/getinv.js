const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'getinv',
    aliases: ['ginv'],
    description: 'Get an invite link for a server where the bot is present',
    category: 'Owner',
    owner: true,
    args: false,
    usage: '[server id]',
    slashOptions: [
        {
            name: 'server_id',
            description: 'The ID of the server to get an invite for',
            type: 3,
            required: false
        }
    ],

    async slashExecute(interaction, client) {
        if (!client.owners.includes(interaction.user.id)) return;

        const serverId = interaction.options.getString('server_id') || interaction.guildId;
        const result = await module.exports.getInvite(client, serverId);

        const container = new ContainerBuilder();
        const display = new TextDisplayBuilder();

        if (result.success) {
            display.setContent(`${emoji.check} **Invite for ${result.guildName}:**\n${result.invite}`);
        } else {
            display.setContent(`${emoji.cross} **Error:** ${result.error}`);
        }

        container.addTextDisplayComponents(display);

        return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    },

    async execute(message, args, client) {
        if (!client.owners.includes(message.author.id)) return;

        const serverId = args[0] || message.guild.id;
        const result = await module.exports.getInvite(client, serverId);

        const container = new ContainerBuilder();
        const display = new TextDisplayBuilder();

        if (result.success) {
            display.setContent(`${emoji.check} **Invite for ${result.guildName}:**\n${result.invite}`);
        } else {
            display.setContent(`${emoji.cross} **Error:** ${result.error}`);
        }

        container.addTextDisplayComponents(display);

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    },

    async getInvite(client, serverId) {
        const guild = client.guilds.cache.get(serverId);
        if (!guild) return { success: false, error: 'Bot is not in this server or invalid ID.' };

        try {
            const existingInvites = await guild.invites.fetch().catch(() => null);
            if (existingInvites && existingInvites.size > 0) {
                const inv = existingInvites.find(i => !i.expiresAt) || existingInvites.first();
                return { success: true, guildName: guild.name, invite: inv.url };
            }

            const channel = guild.channels.cache.find(c =>
                c.isTextBased() &&
                guild.members.me.permissionsIn(c).has(PermissionFlagsBits.CreateInstantInvite)
            );

            if (!channel) return { success: false, error: 'Could not find a channel to create an invite.' };

            const newInv = await channel.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
            if (!newInv) return { success: false, error: 'Failed to create an invite link.' };

            return { success: true, guildName: guild.name, invite: newInv.url };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
