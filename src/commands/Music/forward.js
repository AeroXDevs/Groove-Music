const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
    name: "forward",
    aliases: ["ff", "fastforward"],
    category: "Music",
    cooldown: 3,
    description: "Fast forward the current song by specified seconds",
    args: false,
    usage: "[seconds]",
    userPrams: [],
    botPrams: ["EMBED_LINKS"],
    owner: false,
    player: true,
    inVoiceChannel: true,
    slashOptions: [
        {
            name: "seconds",
            description: "Seconds to fast-forward",
            type: 4,
            required: false
        }
    ],

    async slashExecute(interaction, client) {
        const seconds = interaction.options.getInteger("seconds");
        const args = seconds ? [seconds.toString()] : [];
        const interactionWrapper = {
            guildPath: interaction.guild,
            guild: interaction.guild,
            channel: interaction.channel,
            author: interaction.user,
            member: interaction.member,
            createdTimestamp: interaction.createdTimestamp,
            reply: async (options) => {
                if (interaction.deferred) return await interaction.editReply(options);
                if (interaction.replied) return await interaction.followUp(options);
                return await interaction.reply(options);
            },
        };
        const prefix = client.prefix;
        return this.execute(interactionWrapper, args, client, prefix);
    },

    async execute(message, args, client, prefix) {
        const player = client.manager.players.get(message.guild.id);

        if (!player.queue.current) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.playFirst", { e: client.emoji.warn }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const currentTrack = player.queue.current;
        const duration = currentTrack.length;

        let seconds = 10;

        if (args.length > 0) {
            seconds = parseInt(args[0]);

            if (isNaN(seconds) || seconds <= 0) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(
                        client.t(message.guild.id, "music.forward.usage", { e: client.emoji.cross, prefix })
                    );

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
        }

        const currentPosition = player.position;
        const newPosition = currentPosition + (seconds * 1000);

        if (newPosition >= duration) {
            const warnDisplay = new TextDisplayBuilder()
                .setContent(
                    client.t(message.guild.id, "music.forward.beyond", { e: client.emoji.warn, i: client.emoji.info })
                );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(warnDisplay);

            await message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            }).catch(() =>
                message.channel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                })
            );

            return player.skip();
        }

        try {
            await player.seek(newPosition);

            const formatTime = (ms) => {
                const totalSeconds = Math.floor(ms / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const secs = totalSeconds % 60;
                return `${minutes}:${secs.toString().padStart(2, '0')}`;
            };

            const successDisplay = new TextDisplayBuilder()
                .setContent(
                    client.t(message.guild.id, "music.forward.done", { e: client.emoji.check, seconds, position: formatTime(newPosition) })
                );

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
            console.error("Error fast forwarding:", error);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.forward.failed", { e: client.emoji.cross }));

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
