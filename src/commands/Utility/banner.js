const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    name: 'banner',
    aliases: ['userbanner', 'ub'],
    description: "Displays a user's banner with download link.",
    category: 'Utility',
    slashOptions: [
        {
            name: 'user',
            description: 'The user whose banner you want to see',
            type: 6,
            required: false
        }
    ],
    args: false,
    usage: "[user]",
    userPerms: [],
    owner: false,

    async slashExecute(interaction, client) {
        const interactionWrapper = {
            guild: interaction.guild,
            channel: interaction.channel,
            author: interaction.user,
            member: interaction.member,
            createdTimestamp: interaction.createdTimestamp,
            mentions: {
                users: interaction.options.getUser('user') ? new Map([[interaction.options.getUser('user').id, interaction.options.getUser('user')]]) : new Map()
            },
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
        const user = interaction.options.getUser('user');
        if (user) {
            args.push(user.id);
        }

        const prefix = client.prefix;
        return this.execute(interactionWrapper, args, client, prefix);
    },

    async execute(message, args, client) {
        let userId;

        if (args.length > 0) {
            if (message.mentions.users.size > 0) {
                userId = Array.from(message.mentions.users.values())[0].id;
            } else {
                userId = args[0];
            }
        } else {
            userId = message.author.id;
        }

        let user;
        try {
            user = await client.users.fetch(userId, { force: true });
        } catch (error) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "ui.noUserData", { e: client.emoji.cross }));

            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                content: '',
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const bannerURL = user.bannerURL({ size: 1024, extension: 'png' });

        if (!bannerURL) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`${client.emoji.warn} **\`${user.displayName}\`** does not have a banner set.`);

            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                content: '',
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const header = new TextDisplayBuilder()
            .setContent(`### ${user.displayName}'s Banner\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

        const separator1 = new SeparatorBuilder();

        const links = new TextDisplayBuilder()
            .setContent(`[\`Download\`](${bannerURL})`);

        const separator2 = new SeparatorBuilder();

        const mediaItem = new MediaGalleryItemBuilder()
            .setURL(bannerURL);

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
