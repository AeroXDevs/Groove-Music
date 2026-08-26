const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    name: 'avatar',
    aliases: ['av', 'pfp', 'profilepic'],
    description: "Displays a user's avatar with download links.",
    category: 'Utility',
    slashOptions: [
        {
            name: 'user',
            description: 'The user whose avatar you want to see',
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
        let user;

        if (args.length > 0) {
            if (message.mentions.users.size > 0) {
                user = Array.from(message.mentions.users.values())[0];
            } else {
                try {
                    user = await client.users.fetch(args[0]);
                } catch (error) {
                    user = message.author;
                }
            }
        } else {
            user = message.author;
        }

        const avatarURL = user.displayAvatarURL({ dynamic: true, size: 256 });
        const pngURL = user.displayAvatarURL({ extension: 'png', size: 4096 });
        const jpgURL = user.displayAvatarURL({ extension: 'jpg', size: 4096 });
        const webpURL = user.displayAvatarURL({ extension: 'webp', size: 4096 });

        const header = new TextDisplayBuilder()
            .setContent(`### ${user.displayName}'s Avatar\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

        const separator1 = new SeparatorBuilder();

        const links = new TextDisplayBuilder()
            .setContent(`[\`Download\`](${avatarURL})`);

        const separator2 = new SeparatorBuilder();

        const mediaItem = new MediaGalleryItemBuilder()
            .setURL(avatarURL);

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
