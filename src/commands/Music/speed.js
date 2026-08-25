const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
    name: "speed",
    aliases: ["playback", "tempo"],
    category: "Music",
    cooldown: 3,
    description: "Change the playback speed of the current song",
    args: false,
    usage: "[speed]",
    userPrams: [],
    botPrams: ["EMBED_LINKS"],
    dj: true,
    owner: false,
    player: true,
    inVoiceChannel: true,
    sameVoiceChannel: true,

    slashOptions: [
        {
            name: "speed",
            description: "Playback speed (0.25 - 3.0)",
            type: 10,
            required: false
        }
    ],

    async slashExecute(interaction, client) {
        const player = client.manager.players.get(interaction.guild.id);
        if (!player.queue.current) {
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.playFirst", { e: client.emoji.warn }));
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const currentSpeed = player.data.get("speed") || 1.0;
        let speed = interaction.options.getNumber("speed");

        if (speed === null) {
            const headerDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.speed.title", { e: client.emoji.info }));
            const separator1 = new SeparatorBuilder();
            const infoDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.speed.info", { speed: currentSpeed }));
            const container = new ContainerBuilder().addTextDisplayComponents(headerDisplay).addSeparatorComponents(separator1).addTextDisplayComponents(infoDisplay);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (speed < 0.25 || speed > 3) {
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.speed.invalid", { e: client.emoji.cross }));
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            const currentPitch = player.data.get("pitch") || 1.0;
            await player.shoukaku.setFilters({ timescale: { speed: speed, pitch: currentPitch, rate: 1.0 } });
            player.data.set("speed", speed);
            const successDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.speed.set", { e: client.emoji.check, speed }));
            const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error("Error setting speed:", error);
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.speed.failed", { e: client.emoji.cross }));
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
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

        const currentSpeed = player.data.get("speed") || 1.0;

        if (args.length === 0) {
            const headerDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.speed.title", { e: client.emoji.info }));

            const separator1 = new SeparatorBuilder();

            const infoDisplay = new TextDisplayBuilder()
                .setContent(
client.t(message.guild.id, "music.speed.info", { speed: currentSpeed })
                );

            const separator2 = new SeparatorBuilder();

            const promptDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.speed.prompt", { e: client.emoji.dot }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator1)
                .addTextDisplayComponents(infoDisplay)
                .addSeparatorComponents(separator2)
                .addTextDisplayComponents(promptDisplay);

            const promptMsg = await message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            const filter = (m) => m.author.id === message.author.id;
            const collector = message.channel.createMessageCollector({
                filter,
                time: 30000,
                max: 1
            });

            collector.on('collect', async (m) => {
                const speedInput = m.content.toLowerCase().replace('x', '').trim();
                const speed = parseFloat(speedInput);

                if (isNaN(speed) || speed < 0.25 || speed > 3) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent(
client.t(message.guild.id, "music.speed.invalidEx", { e: client.emoji.cross })
                        );

                    const errorContainer = new ContainerBuilder()
                        .addTextDisplayComponents(errorDisplay);

                    await m.reply({
                        components: [errorContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                    return;
                }

                try {
                    const currentPitch = player.data.get("pitch") || 1.0;
                    await player.shoukaku.setFilters({
                        timescale: {
                            speed: speed,
                            pitch: currentPitch,
                            rate: 1.0
                        }
                    });
                    player.data.set("speed", speed);

                    const successDisplay = new TextDisplayBuilder()
                        .setContent(client.t(message.guild.id, "music.speed.set", { e: client.emoji.check, speed }));

                    const successContainer = new ContainerBuilder()
                        .addTextDisplayComponents(successDisplay);

                    await m.reply({
                        components: [successContainer],
                        flags: MessageFlags.IsComponentsV2
                    });

                    await promptMsg.delete().catch(() => { });
                } catch (error) {
                    console.error("Error setting speed:", error);

                    const errorDisplay = new TextDisplayBuilder()
                        .setContent(client.t(message.guild.id, "music.speed.failed", { e: client.emoji.cross }));

                    const errorContainer = new ContainerBuilder()
                        .addTextDisplayComponents(errorDisplay);

                    await m.reply({
                        components: [errorContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    const timeoutDisplay = new TextDisplayBuilder()
                        .setContent(client.t(message.guild.id, "music.speed.timedOut", { e: client.emoji.info }));

                    const timeoutContainer = new ContainerBuilder()
                        .addTextDisplayComponents(timeoutDisplay);

                    await promptMsg.edit({
                        components: [timeoutContainer],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => { });
                }
            });

            return;
        }

        const speed = parseFloat(args[0]);

        if (isNaN(speed) || speed < 0.25 || speed > 3) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(
client.t(message.guild.id, "music.speed.usage", { e: client.emoji.cross, prefix, speed: currentSpeed })
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

        try {
            const currentPitch = player.data.get("pitch") || 1.0;
            await player.shoukaku.setFilters({
                timescale: {
                    speed: speed,
                    pitch: currentPitch,
                    rate: 1.0
                }
            });
            player.data.set("speed", speed);

            const successDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.speed.set", { e: client.emoji.check, speed }));

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
            console.error("Error setting speed:", error);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.speed.failed", { e: client.emoji.cross }));

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
