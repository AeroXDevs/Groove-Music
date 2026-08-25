const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");
const Wait = require("util").promisify(setTimeout);

module.exports = {
    name: "sleep",
    aliases: ["sleeptimer", "timer"],
    category: "Music",
    cooldown: 3,
    description: "Set a sleep timer to stop music after a duration",
    args: false,
    usage: "[duration] (e.g., 30m, 1h, 45m)",
    userPrams: [],
    botPrams: ["EmbedLinks"],
    dj: true,
    owner: false,
    player: true,
    inVoiceChannel: true,
    sameVoiceChannel: true,

    slashOptions: [
        {
            name: "duration",
            description: "Duration for the sleep timer (e.g. 30m, 1h) or 'cancel' to stop it",
            type: 3,
            required: true
        }
    ],

    async slashExecute(interaction, client) {
        const player = client.manager.players.get(interaction.guild.id);
        if (!player.queue.current) {
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.sleep.noMusic", { e: client.emoji.cross }));
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const input = interaction.options.getString("duration");
        const existingTimer = player.data.get("sleepTimer");

        if (input === "cancel") {
            if (!existingTimer) {
                const errorDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.sleep.noTimer", { e: client.emoji.cross }));
                const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
                return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
            clearTimeout(existingTimer.timeout);
            player.data.delete("sleepTimer");
            const successDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.sleep.cancelled", { e: client.emoji.check }));
            const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const duration = parseDuration(input);
        if (!duration || duration < 1 || duration > 180) {
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.sleep.invalid", { e: client.emoji.cross }));
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const endTime = Date.now() + (duration * 60 * 1000);
        const headerDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.sleep.set", { e: client.emoji.check }));
        const separator = new SeparatorBuilder();
        const infoDisplay = new TextDisplayBuilder()
            .setContent(client.t(interaction.guildId, "music.sleep.details", { d: client.emoji.dot, duration, ends: Math.floor(endTime / 1000) }));
        const container = new ContainerBuilder().addTextDisplayComponents(headerDisplay).addSeparatorComponents(separator).addTextDisplayComponents(infoDisplay);

        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        const timeout = setTimeout(async () => {
            try {
                const guild = client.guilds.cache.get(interaction.guild.id);
                const member = guild?.members.cache.get(interaction.user.id);
                if (member && member.voice.channel) {
                    await member.voice.disconnect("Sleep timer ended");
                    const textChannel = client.channels.cache.get(player.textId);
                    if (textChannel) {
                        const sleepDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.sleep.ended", { e: client.emoji.info, user: interaction.user }));
                        const sleepContainer = new ContainerBuilder().addTextDisplayComponents(sleepDisplay);
                        textChannel.send({ components: [sleepContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
                    }
                }
            } catch (error) { console.error("Sleep timer error:", error); }
            player.data.delete("sleepTimer");
        }, duration * 60 * 1000);

        player.data.set("sleepTimer", { timeout, endTime, startedBy: interaction.user.id });
    },

    async execute(message, args, client, prefix) {
        const player = client.manager.players.get(message.guild.id);

        if (!player.queue.current) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.sleep.noMusic", { e: client.emoji.cross }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }


        const existingTimer = player.data.get("sleepTimer");
        if (existingTimer && args[0] !== "cancel") {
            const timeLeft = Math.ceil((existingTimer.endTime - Date.now()) / 1000 / 60);

            const infoDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.info} Timer already active**\n\n` +
                    `**${client.emoji.dot} Time left** \`:\` \`${timeLeft}m\`\n` +
                    `**${client.emoji.dot} Cancel** \`:\` \`${prefix}sleep cancel\``
                );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(infoDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }


        if (args[0] === "cancel") {
            if (!existingTimer) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(client.t(message.guild.id, "music.sleep.noTimer", { e: client.emoji.cross }));

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            clearTimeout(existingTimer.timeout);
            if (existingTimer.fadeInterval) {
                clearInterval(existingTimer.fadeInterval);
            }
            player.data.delete("sleepTimer");

            const successDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.sleep.cancelled", { e: client.emoji.check }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(successDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }


        if (!args[0]) {
            const usageDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.info} Sleep Timer**\n\n` +
                    `**${client.emoji.dot} Usage** \`:\` \`${prefix}sleep [time]\`\n` +
                    `**${client.emoji.dot} Examples** \`:\`\n` +
                    `  \`${prefix}sleep 30m\` \`${prefix}sleep 1h\`\n` +
                    `**${client.emoji.dot} Cancel** \`:\` \`${prefix}sleep cancel\``
                );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(usageDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const duration = parseDuration(args[0]);
        if (!duration || duration < 1 || duration > 180) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.cross} Invalid duration**\n\n` +
                    `Use: \`30m\`, \`1h\`, \`45m\` (1-180 min)`
                );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const endTime = Date.now() + (duration * 60 * 1000);

        const headerDisplay = new TextDisplayBuilder()
            .setContent(client.t(message.guild.id, "music.sleep.set", { e: client.emoji.check }));

        const separator = new SeparatorBuilder();

        const infoDisplay = new TextDisplayBuilder()
            .setContent(
                `**${client.emoji.dot} Duration** \`:\` \`${duration}m\`\n` +
                `**${client.emoji.dot} Ends** \`:\` <t:${Math.floor(endTime / 1000)}:t>\n` +
                `**${client.emoji.dot} Action** \`:\` Disconnect from VC\n\n` +
                `Cancel: \`${prefix}sleep cancel\``
            );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(headerDisplay)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(infoDisplay);

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });


        const timeout = setTimeout(async () => {
            try {
                const guild = client.guilds.cache.get(message.guild.id);
                const member = guild?.members.cache.get(message.author.id);

                if (member && member.voice.channel) {
                    await member.voice.disconnect("Sleep timer ended");

                    const textChannel = client.channels.cache.get(player.textId);
                    if (textChannel) {
                        const sleepDisplay = new TextDisplayBuilder()
                            .setContent(client.t(message.guild.id, "music.sleep.ended", { e: client.emoji.info, user: message.author }));

                        const sleepContainer = new ContainerBuilder()
                            .addTextDisplayComponents(sleepDisplay);

                        textChannel.send({
                            components: [sleepContainer],
                            flags: MessageFlags.IsComponentsV2
                        }).catch(() => null);
                    }
                }
            } catch (error) {
                console.error("Sleep timer error:", error);
            }

            player.data.delete("sleepTimer");
        }, duration * 60 * 1000);




        player.data.set("sleepTimer", {
            timeout,
            endTime,
            startedBy: message.author.id
        });
    },
};

function parseDuration(input) {
    const match = input.match(/^(\d+)(m|h)$/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    if (unit === 'm') {
        return value;
    } else if (unit === 'h') {
        return value * 60;
    }

    return null;
}
