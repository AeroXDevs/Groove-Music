const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'hideall',
    description: 'Hides all text channels in the server',
    category: 'Moderation',
    usage: 'hideall',
    example: 'hideall',
    userPerms: ['ManageChannels'],
    botPerms: ['ManageChannels'],

    async slashExecute(interaction, client) {
        const isOwner = client.owners.includes(interaction.user.id);
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) {
            const display = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "mod.needPermShort", { e: emoji.warn, permission: "Manage Channels" }));
            return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        return module.exports.executeLogic(interaction, client, true);
    },

    async execute(message, args, client) {
        const isOwner = client.owners.includes(message.author.id);
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) {
            const display = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.needPermShort", { e: emoji.warn, permission: "Manage Channels" }));
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        return module.exports.executeLogic(message, client, false);
    },

    async executeLogic(context, client, isSlash) {
        const guild = context.guild;

        if (isSlash) await context.reply({ content: client.t(guild.id, "mod.bulk.hiding", { e: emoji.load }) });
        else var waitMsg = await context.reply({ content: client.t(guild.id, "mod.bulk.hiding", { e: emoji.load }) });

        try {
            const channels = guild.channels.cache.filter(c =>
                c.type === ChannelType.GuildText &&
                c.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.ViewChannel)
            );

            if (channels.size === 0) {
                const display = new TextDisplayBuilder().setContent(client.t(guild.id, "mod.bulk.allHidden", { e: emoji.warn }));
                const container = new ContainerBuilder().addTextDisplayComponents(display);
                if (isSlash) return context.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                return waitMsg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            let count = 0;
            for (const [id, channel] of channels) {
                await channel.permissionOverwrites.edit(guild.roles.everyone, {
                    ViewChannel: false
                }).catch(() => { });
                count++;
            }

            const display = new TextDisplayBuilder().setContent(client.t(guild.id, "mod.bulk.hidden", { e: emoji.check, count }));
            const container = new ContainerBuilder().addTextDisplayComponents(display);

            if (isSlash) {
                return context.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            } else {
                return waitMsg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
        } catch (error) {
            const display = new TextDisplayBuilder().setContent(client.t(guild.id, "mod.failed.hideAll", { e: emoji.warn, message: error.message }));
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            if (isSlash) return context.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            return waitMsg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
