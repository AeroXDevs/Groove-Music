const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require("discord.js");

module.exports = {
    name: "likeall",
    category: "Favourite",
    description: "Add all songs from the current queue to your favorites",
    args: false,
    usage: "",
    aliases: ["lall", "likequeue"],
    userPerms: [],
    owner: false,
    player: true,
    inVoiceChannel: true,
    sameVoiceChannel: true,
    slashOptions: [],

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
        if (interaction.options) {
            const options = interaction.options.data;
            for (const option of options) {
                if (option.value !== undefined) {
                    args.push(option.value.toString());
                }
            }
        }

        const prefix = client.prefix;
        return this.execute(interactionWrapper, args, client, prefix);
    },

    async execute(message, args, client, prefix) {
        const userId = message.author.id;

        try {
            const player = client.manager.getPlayer(message.guild.id);
            if (!player) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(`**${client.emoji.cross} There is no queue to add to favorites!**`);

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const tracks = [player.queue.current, ...player.queue].filter(track => track);
            if (tracks.length === 0) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(`**${client.emoji.cross} There are no songs in the queue!**`);

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            let songs = client.db.liked.get(userId);
            if (!songs) songs = [];

            let addedCount = 0;
            let alreadyLikedCount = 0;

            const existingUrls = new Set(songs.map(song => song.url));

            for (const track of tracks) {
                if (track.uri && !existingUrls.has(track.uri)) {
                    songs.push({
                        title: track.title,
                        url: track.uri,
                        duration: track.length || track.duration,
                        thumbnail: track.thumbnail,
                        author: track.author
                    });
                    existingUrls.add(track.uri);
                    addedCount++;
                } else if (track.uri && existingUrls.has(track.uri)) {
                    alreadyLikedCount++;
                }
            }

            if (addedCount > 0) {
                client.db.liked.set(userId, songs);
            }

            let description = ``;
            if (addedCount > 0) {
                description += `**${client.emoji.check} Added \`${addedCount}\` songs to your favorites.**\n`;
            }
            if (alreadyLikedCount > 0) {
                description += `**${client.emoji.info} \`${alreadyLikedCount}\` songs were already in your favorites.**\n`;
            }

            const resultDisplay = new TextDisplayBuilder()
                .setContent(description);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(resultDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (err) {
            console.error(err);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.cross} An error occurred while adding songs to favorites!**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
