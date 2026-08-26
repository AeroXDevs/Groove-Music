const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
    name: "previous",
    aliases: ["back", "prev"],
    category: "Music",
    cooldown: 3,
    description: "Play the previous song from history",
    args: false,
    usage: "",
    userPrams: [],
    botPrams: ["EMBED_LINKS"],
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
        const player = client.manager.players.get(message.guild.id);

        let history = player.data.get("history") || [];

        if (history.length === 0) {
            const infoDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.noPrevious", { e: client.emoji.info }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(infoDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            }).catch(() =>
                message.channel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                })
            );
        }

        try {
            const previousTrackData = history[history.length - 1];

            const searchResult = await player.search(previousTrackData.uri || previousTrackData.title, {
                requester: message.author
            });

            if (!searchResult || !searchResult.tracks || searchResult.tracks.length === 0) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(client.t(message.guild.id, "music.previousNotFound", { e: client.emoji.cross }));

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                }).catch(() =>
                    message.channel.send({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    })
                );
            }

            const previousTrack = searchResult.tracks[0];

            history.pop();
            player.data.set("history", history);


            player.queue.unshift(previousTrack);

            player.data.set("autoplayAdded", false);

            await player.skip();

            const successDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.playingPrevious", { e: client.emoji.check, title: previousTrack.title, uri: previousTrack.uri }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(successDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            }).catch(() =>
                message.channel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                })
            );
        } catch (error) {
            console.error("Error playing previous track:", error);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.previousFailed", { e: client.emoji.cross }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            }).catch(() =>
                message.channel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                })
            );
        }
    },
};

