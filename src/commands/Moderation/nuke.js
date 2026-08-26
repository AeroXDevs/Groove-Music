const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ComponentType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'nuke',
    aliases: ['rebuild'],
    description: 'Clones and deletes the channel',
    category: 'Moderation',
    usage: 'nuke [channel]',
    example: 'nuke #general | nuke',
    slashOptions: [
        {
            name: 'channel',
            description: 'The channel to clone and delete (defaults to current)',
            type: 7,
            required: false,
            channel_types: [ChannelType.GuildText]
        }
    ],
    userPerms: ['ManageChannels'],
    botPerms: ['ManageChannels'],

    async slashExecute(interaction, client) {
        const isOwner = client.owners.includes(interaction.user.id);
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) {
            const display = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "mod.needPerm", { e: emoji.warn, permission: "Manage Channels" }));
            return interaction.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(display)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const channel = interaction.options.getChannel('channel') || interaction.channel;
        return module.exports.confirmNuke(interaction, channel, client, true);
    },

    async execute(message, args, client) {
        const userId = message.author?.id || message.user?.id;
        const isOwner = client.owners.includes(userId);

        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) {
            const display = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.needPerm", { e: emoji.warn, permission: "Manage Channels" }));
            return message.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(display)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        let channel = message.channel;
        if (args.length > 0) {
            const channelId = args[0].replace(/[<#>]/g, '');
            channel = message.guild.channels.cache.get(channelId);
            if (!channel) {
                const display = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.channelNotFound", { e: emoji.warn }));
                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(display)],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        return module.exports.confirmNuke(message, channel, client, false);
    },

    async confirmNuke(context, channel, client, isSlash) {
        if (channel.type !== ChannelType.GuildText) {
            const display = new TextDisplayBuilder().setContent(client.t(context.guild.id, "mod.nuke.textOnly", { e: emoji.warn }));
            return isSlash ?
                context.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 }) :
                context.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        if (!context.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const display = new TextDisplayBuilder().setContent(client.t(context.guild.id, "mod.botNeedPerm", { e: emoji.warn, permission: "Manage Channels" }));
            return isSlash ?
                context.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 }) :
                context.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        const confirmDisplay = new TextDisplayBuilder()
            .setContent(client.t(context.guild.id, "mod.nuke.confirm", { e: emoji.warn, channel }));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_nuke')
                .setLabel(client.t(context.guild.id, "buttons.confirm"))
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_nuke')
                .setLabel(client.t(context.guild.id, "buttons.cancel"))
                .setStyle(ButtonStyle.Secondary)
        );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(confirmDisplay)
            .addActionRowComponents(row);

        const response = isSlash ?
            await context.reply({ components: [container], flags: MessageFlags.IsComponentsV2, withResponse: true }) :
            await context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        const msg = isSlash ? await context.fetchReply() : response;

        const userId = isSlash ? context.user.id : context.author.id;
        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === userId,
            time: 20000,
            max: 1,
            componentType: ComponentType.Button
        });

        collector.on('collect', async (confirmation) => {
            if (confirmation.customId === 'confirm_nuke') {
                const loadingDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "mod.nuke.running", { e: emoji.load }));
                const loadingContainer = new ContainerBuilder().addTextDisplayComponents(loadingDisplay);

                await confirmation.update({
                    components: [loadingContainer],
                    flags: MessageFlags.IsComponentsV2
                });

                return module.exports.performNuke(context, channel, client, isSlash, confirmation);
            } else {
                const cancelDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "mod.nuke.cancelled", { e: emoji.check }));
                await confirmation.update({ components: [new ContainerBuilder().addTextDisplayComponents(cancelDisplay)], flags: MessageFlags.IsComponentsV2 });
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                const timeoutDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "mod.nuke.timedOut", { e: emoji.warn }));
                const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(timeoutDisplay);

                if (isSlash) {
                    await context.editReply({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
                } else {
                    await msg.edit({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
                }
            }
        });
    },

    async performNuke(context, channel, client, isSlash, interaction) {
        try {
            const position = channel.rawPosition;
            const parentId = channel.parentId;

            const newChannel = await channel.clone({
                position: position,
                parent: parentId
            });

            await newChannel.setPosition(position);
            await channel.delete();

            const user = isSlash ? context.user : context.author;
            const successMsg = await newChannel.send({
                content: `Nuked by \`${user.username}\``
            });

            setTimeout(() => successMsg.delete().catch(() => { }), 10000);

        } catch (error) {
            console.error('Nuke error:', error);
            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(context.guild.id, "mod.nuke.failed", { e: emoji.warn, message: error.message }));

            if (interaction && (interaction.replied || interaction.deferred)) {
                return interaction.followUp({
                    components: [new ContainerBuilder().addTextDisplayComponents(errorDisplay)],
                    flags: MessageFlags.IsComponentsV2
                });
            } else {
                return context.channel.send({
                    components: [new ContainerBuilder().addTextDisplayComponents(errorDisplay)],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }
    }
};
