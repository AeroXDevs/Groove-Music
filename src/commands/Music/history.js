const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
    name: "history",
    aliases: ["played", "recent"],
    category: "Music",
    cooldown: 3,
    description: "Show the history of recently played songs",
    args: false,
    usage: "",
    userPrams: [],
    botPrams: ["EMBED_LINKS"],
    owner: false,
    player: true,
    inVoiceChannel: false,
    sameVoiceChannel: false,
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

        const history = player.data.get("history") || [];

        if (history.length === 0) {
            const infoDisplay = new TextDisplayBuilder()
                .setContent(
                    client.t(message.guild.id, "music.history.empty", { e: client.emoji.info })
                );

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

        const songsPerPage = 10;
        const totalPages = Math.ceil(history.length / songsPerPage);
        let currentPage = 0;

        const createContainer = (page) => {
            const start = page * songsPerPage;
            const end = start + songsPerPage;
            const pageHistory = history.slice(start, end);

            const songList = pageHistory.map((track, index) => {
                const position = start + index;
                const title = track.title.length > 40 ? track.title.substring(0, 40) + "..." : track.title;
                return `**\`${position}\` | [${title}](${track.uri})**`;
            });

            const headerDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.history.title", { e: client.emoji.info }));

            const separator = new SeparatorBuilder();

            const listDisplay = new TextDisplayBuilder()
                .setContent(songList.join('\n'));

            return new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator)
                .addTextDisplayComponents(listDisplay);
        };

        const components = [createContainer(currentPage)];

        if (totalPages > 1) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('home')
                    .setLabel(client.t(message.guild.id, "buttons.home"))
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel(client.t(message.guild.id, "buttons.previous"))
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel(client.t(message.guild.id, "buttons.next"))
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('close')
                    .setLabel(client.t(message.guild.id, "buttons.close"))
                    .setStyle(ButtonStyle.Danger)
            );
            components.push(row);
        }

        const historyMsg = await message.reply({
            components,
            flags: MessageFlags.IsComponentsV2
        });

        if (totalPages > 1) {
            const collector = historyMsg.createMessageComponentCollector({
                filter: (i) => {
                    if (i.user.id === message.author.id) return true;

                    const errorDisplay = new TextDisplayBuilder()
                        .setContent(client.t(message.guild.id, "music.history.onlyUser", { e: client.emoji.cross, user: message.author.tag }));

                    const errorContainer = new ContainerBuilder()
                        .addTextDisplayComponents(errorDisplay);

                    i.reply({
                        components: [errorContainer],
                        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                    });
                    return false;
                },
                time: 120000,
            });

            collector.on("collect", async (interaction) => {
                if (interaction.customId === 'close') {
                    collector.stop();
                    return await interaction.message.delete().catch(() => { });
                } else if (interaction.customId === 'home') {
                    currentPage = 0;
                } else if (interaction.customId === 'prev') {
                    currentPage = (currentPage - 1 + totalPages) % totalPages;
                } else if (interaction.customId === 'next') {
                    currentPage = (currentPage + 1) % totalPages;
                }

                const updatedComponents = [createContainer(currentPage)];
                if (totalPages > 1) {
                    updatedComponents.push(components[1]);
                }

                await interaction.update({
                    components: updatedComponents,
                    flags: MessageFlags.IsComponentsV2
                });
            });

            collector.on("end", async () => {
                const finalComponents = [createContainer(currentPage)];
                historyMsg.edit({ components: finalComponents }).catch(() => { });
            });
        }
    },
};

