const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    name: 'servericon',
    aliases: ['sicon', 'guildicon'],
    description: "Displays the server's icon with download link.",
    category: 'Utility',
    slashOptions: [
        {
            name: 'guildid',
            description: 'The guild ID to view icon from',
            type: 3,
            required: false
        }
    ],
    args: false,
    usage: "[guildid]",
    userPerms: [],
    owner: false,

    async slashExecute(interaction, client) {
        const interactionWrapper = {
            guild: interaction.guild,
            channel: interaction.channel,
            author: interaction.user,
            member: interaction.member,
            createdTimestamp: interaction.createdTimestamp,
            reply: async (options) => {
                if (interaction.deferred) {
                    return await interaction.editReply(options);
                } else if (interaction.replied) {
                    return await interaction.followUp(options);
                } else {
                    return await interaction.reply(options);
                }
            },
        };

        const args = [];
        const guildId = interaction.options.getString('guildid');
        if (guildId) {
            args.push(guildId);
        }

        const prefix = client.prefix;
        return this.execute(interactionWrapper, args, client, prefix);
    },

    async execute(message, args, client) {
        let guild;

        if (args.length > 0) {
            try {
                guild = await client.guilds.fetch(args[0]);
            } catch (error) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(`${client.emoji.cross} Could not find a server with ID: \`${args[0]}\``);

                const errorContainer = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return message.reply({
                    content: '',
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        } else {
            guild = message.guild;
        }

        const iconURL = guild.iconURL({ size: 256, extension: 'png' });

        if (!iconURL) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`${client.emoji.warn} **\`${guild.name}\`** does not have a server icon set.`);

            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                content: '',
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const header = new TextDisplayBuilder()
            .setContent(`### ${guild.name}'s Icon\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

        const separator1 = new SeparatorBuilder();

        const links = new TextDisplayBuilder()
            .setContent(`[\`Download\`](${iconURL})`);

        const separator2 = new SeparatorBuilder();

        const mediaItem = new MediaGalleryItemBuilder()
            .setURL(iconURL);

        const mediaGallery = new MediaGalleryBuilder()
            .addItems(mediaItem);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addSeparatorComponents(separator1)
            .addTextDisplayComponents(links)
            .addSeparatorComponents(separator2)
            .addMediaGalleryComponents(mediaGallery);

        await message.reply({
            content: '',
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
