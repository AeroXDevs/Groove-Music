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
    name: 'rename',
    description: 'Renames a specified channel',
    category: 'Moderation',
    usage: 'rename [channel] <new-name>',
    example: 'rename #general general-chat | rename general-chat',
    slashOptions: [
        {
            name: 'name',
            description: 'The new name for the channel',
            type: 3,
            required: true
        },
        {
            name: 'channel',
            description: 'The channel to rename',
            type: 7,
            required: false,
            channel_types: [ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildCategory, ChannelType.GuildAnnouncement, ChannelType.GuildStageVoice]
        }
    ],
    userPerms: ['ManageChannels'],
    botPerms: ['ManageChannels'],

    async slashExecute(interaction, client) {
        const isOwner = client.owners.includes(interaction.user.id);
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) {
            const display = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "mod.needPermShort", { e: emoji.warn, permission: "Manage Channels" }));
            return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        const newName = interaction.options.getString('name');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            const oldName = channel.name;
            await channel.setName(newName);

            const display = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "mod.renamed", { e: emoji.check, old: oldName, new: newName }));
            return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            const display = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "mod.failed.rename", { e: emoji.warn, message: error.message }));
            return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }
    },

    async execute(message, args, client) {
        const isOwner = client.owners.includes(message.author.id);
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) {
            const display = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.needPermShort", { e: emoji.warn, permission: "Manage Channels" }));
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        if (args.length === 0) {
            const display = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.needChannelName", { e: emoji.warn }));
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        let channel = message.channel;
        let newName;

        const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);

        if (targetChannel && (args[0].includes(targetChannel.id) || args[0] === targetChannel.id)) {
            channel = targetChannel;
            newName = args.slice(1).join(' ');
        } else {
            newName = args.join(' ');
        }

        if (!newName || newName.trim() === '') {
            const display = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.needChannelName", { e: emoji.warn }));
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            const oldName = channel.name;
            await channel.setName(newName);

            const display = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.renamed", { e: emoji.check, old: oldName, new: newName }));
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            const display = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.failed.rename", { e: emoji.warn, message: error.message }));
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
