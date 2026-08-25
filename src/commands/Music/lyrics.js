const {
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ComponentType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");
const { convertTime } = require("../../utils/convert.js");
const lyricsFinder = require("@flytri/lyrics-finder");
const axios = require("axios");

class LyricsManager {
    constructor() {
        this.sources = [
            this.fetchFromLyricsFinder.bind(this),
            this.fetchFromLRCLib.bind(this),
            this.fetchFromGenius.bind(this),
        ];
    }

    async fetchFromLyricsFinder(title, artist) {
        try {
            const lyrics = await lyricsFinder(artist, title);
            if (lyrics && lyrics.length > 0) {
                return { lyrics: lyrics, source: "Lyrics Finder", synced: null };
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    async fetchFromLRCLib(title, artist) {
        try {
            const response = await axios.get(
                `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
                { timeout: 5000 }
            );

            if (response.data && response.data.length > 0) {
                const result = response.data[0];
                return {
                    lyrics: result.plainLyrics || result.syncedLyrics,
                    source: "LRClib",
                    synced: result.syncedLyrics || null,
                };
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    async fetchFromGenius(title, artist) {
        try {
            const query = `${artist} ${title}`.trim();
            const response = await axios.get(
                `https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`,
                { timeout: 5000 }
            );

            if (response.data && response.data.lyrics) {
                return { lyrics: response.data.lyrics, source: "Some Random API", synced: null };
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    async fetchLyrics(title, artist) {
        for (const source of this.sources) {
            try {
                const result = await source(title, artist);
                if (result && result.lyrics) {
                    return result;
                }
            } catch (error) {
                continue;
            }
        }
        return null;
    }
}

function parseSyncedLyrics(syncedLyrics) {
    if (!syncedLyrics) return null;

    const lines = syncedLyrics.split("\n");
    const parsed = [];

    for (const line of lines) {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const centiseconds = parseInt(match[3].padEnd(3, "0"));
            const text = match[4].trim();

            const timeMs = minutes * 60000 + seconds * 1000 + centiseconds;

            if (text) {
                parsed.push({ time: timeMs, text });
            }
        }
    }

    return parsed.sort((a, b) => a.time - b.time);
}

function paginateLyrics(lyrics, linesPerPage = 15) {
    const lines = lyrics.split("\n").filter((line) => line.trim());
    const pages = [];

    for (let i = 0; i < lines.length; i += linesPerPage) {
        pages.push(lines.slice(i, i + linesPerPage).join("\n"));
    }

    return pages.length > 0 ? pages : [lyrics];
}

function getCurrentLineIndex(syncedLines, position) {
    for (let i = syncedLines.length - 1; i >= 0; i--) {
        if (position >= syncedLines[i].time) {
            return i;
        }
    }
    return 0;
}

module.exports = {
    name: "lyrics",
    aliases: ["ly", "lyric"],
    category: "Music",
    cooldown: 5,
    description: "Display lyrics for the currently playing song",
    args: false,
    usage: "",
    userPerms: [],
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

        if (!player || !player.queue.current) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.lyrics.noSong", { e: client.emoji.cross }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const track = player.queue.current;

        const loadingDisplay = new TextDisplayBuilder()
            .setContent(client.t(message.guild.id, "music.lyrics.searching", { e: client.emoji.info }));

        const loadingContainer = new ContainerBuilder()
            .addTextDisplayComponents(loadingDisplay);

        const loadingMsg = await message.reply({
            components: [loadingContainer],
            flags: MessageFlags.IsComponentsV2
        });

        const lyricsManager = new LyricsManager();
        const result = await lyricsManager.fetchLyrics(track.title, track.author);

        if (!result || !result.lyrics) {
            const notFoundDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.lyrics.notFound", { e: client.emoji.cross, title: track.title, author: track.author }));

            const notFoundContainer = new ContainerBuilder()
                .addTextDisplayComponents(notFoundDisplay);

            return loadingMsg.edit({
                components: [notFoundContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const { lyrics, source, synced } = result;
        const hasSyncedLyrics = synced && synced.length > 0;

        const headerDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.check} ${track.title}**`);

        const separator1 = new SeparatorBuilder();

        const infoDisplay = new TextDisplayBuilder()
            .setContent(
                `**Artist:** \`${track.author}\`\n` +
                `**Source:** \`${source}\`` +
                (hasSyncedLyrics ? `\n**Sync:** \`Available\`` : '')
            );

        const separator2 = new SeparatorBuilder();

        const choiceButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("static_lyrics")
                .setLabel(client.t(message.guild.id, "buttons.static"))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("live_sync")
                .setLabel(client.t(message.guild.id, "buttons.liveSync"))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!hasSyncedLyrics),
            new ButtonBuilder()
                .setCustomId("close_lyrics")
                .setLabel(client.t(message.guild.id, "buttons.close"))
                .setStyle(ButtonStyle.Secondary)
        );

        const choiceContainer = new ContainerBuilder()
            .addTextDisplayComponents(headerDisplay)
            .addSeparatorComponents(separator1)
            .addTextDisplayComponents(infoDisplay)
            .addSeparatorComponents(separator2)
            .addActionRowComponents(choiceButtons);

        await loadingMsg.edit({
            components: [choiceContainer],
            flags: MessageFlags.IsComponentsV2
        });

        const choiceCollector = loadingMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000,
        });

        choiceCollector.on("collect", async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(client.t(message.guild.id, "music.lyrics.onlyUser", { e: client.emoji.cross, user: message.author.tag }));

                const errorContainer = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return interaction.reply({
                    components: [errorContainer],
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                });
            }

            try {
                await interaction.deferUpdate();

                if (interaction.customId === "close_lyrics") {
                    choiceCollector.stop();
                    return loadingMsg.delete().catch(() => { });
                }

                if (interaction.customId === "static_lyrics") {
                    choiceCollector.stop();
                    await showStaticLyrics(client, loadingMsg, track, lyrics, source, message.author.id);
                } else if (interaction.customId === "live_sync") {
                    choiceCollector.stop();
                    const syncedLines = parseSyncedLyrics(synced);
                    if (syncedLines && syncedLines.length > 0) {
                        await showLiveSyncLyrics(client, loadingMsg, track, syncedLines, player, source, message.author.id, message.guild.id);
                    }
                }
            } catch (error) {
                console.error("Button interaction error:", error);
            }
        });

        choiceCollector.on("end", () => {
            const finalContainer = new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator1)
                .addTextDisplayComponents(infoDisplay);

            loadingMsg.edit({ components: [finalContainer] }).catch(() => { });
        });
    },
};

async function showStaticLyrics(client, message, track, lyrics, source, authorId) {
    const pages = paginateLyrics(lyrics);
    let currentPage = 0;

    const updateMessage = async () => {
        const headerDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.check} ${track.title}**`);

        const separator1 = new SeparatorBuilder();

        const lyricsDisplay = new TextDisplayBuilder()
            .setContent(pages[currentPage]);

        const separator2 = new SeparatorBuilder();

        const footerDisplay = new TextDisplayBuilder()
            .setContent(client.t(message.guild.id, "music.lyrics.page", { current: currentPage + 1, total: pages.length }));

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("previous")
                .setLabel(client.t(message.guild.id, "buttons.previous"))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId("next")
                .setLabel(client.t(message.guild.id, "buttons.next"))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === pages.length - 1),
            new ButtonBuilder()
                .setCustomId("close")
                .setLabel(client.t(message.guild.id, "buttons.close"))
                .setStyle(ButtonStyle.Secondary)
        );

        const separator3 = new SeparatorBuilder();

        const container = new ContainerBuilder()
            .addTextDisplayComponents(headerDisplay)
            .addSeparatorComponents(separator1)
            .addTextDisplayComponents(lyricsDisplay)
            .addSeparatorComponents(separator2)
            .addTextDisplayComponents(footerDisplay)
            .addSeparatorComponents(separator3)
            .addActionRowComponents(buttons);

        await message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
    };

    await updateMessage();

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000,
    });

    collector.on("collect", async (interaction) => {
        if (interaction.user.id !== authorId) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.lyrics.onlyInvoker", { e: client.emoji.cross }));

            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
            });
        }

        try {
            await interaction.deferUpdate();

            if (interaction.customId === "previous") {
                currentPage = Math.max(0, currentPage - 1);
                await updateMessage();
            } else if (interaction.customId === "next") {
                currentPage = Math.min(pages.length - 1, currentPage + 1);
                await updateMessage();
            } else if (interaction.customId === "close") {
                collector.stop();
                await message.delete().catch(() => { });
            }
        } catch (error) {
            console.error("Static lyrics button error:", error);
        }
    });

    collector.on("end", () => {
        const headerDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.check} ${track.title}**`);

        const separator = new SeparatorBuilder();

        const lyricsDisplay = new TextDisplayBuilder()
            .setContent(pages[currentPage]);

        const finalContainer = new ContainerBuilder()
            .addTextDisplayComponents(headerDisplay)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(lyricsDisplay);

        message.edit({ components: [finalContainer] }).catch(() => { });
    });
}

async function showLiveSyncLyrics(client, message, track, syncedLines, player, source, authorId, guildId) {
    let updateInterval;
    let isActive = true;
    let lastIndex = -1;

    const updateLyrics = async () => {
        if (!isActive) {
            if (updateInterval) clearInterval(updateInterval);
            return;
        }

        try {
            const currentPlayer = client.manager.players.get(guildId);

            if (!currentPlayer || !currentPlayer.playing) {
                if (updateInterval) clearInterval(updateInterval);
                isActive = false;
                return;
            }

            const position = currentPlayer.position || 0;
            const duration = track.length || track.duration || 0;
            const currentIndex = getCurrentLineIndex(syncedLines, position);

            if (currentIndex !== lastIndex) {
                lastIndex = currentIndex;

                const contextLines = 5;
                const start = Math.max(0, currentIndex - contextLines);
                const end = Math.min(syncedLines.length, currentIndex + contextLines + 1);

                let lyricsText = "";
                for (let i = start; i < end; i++) {
                    const line = syncedLines[i];
                    if (i === currentIndex) {
                        lyricsText += `**► ${line.text}**\n`;
                    } else {
                        lyricsText += `${line.text}\n`;
                    }
                }

                const progress = Math.floor((position / duration) * 100);
                const progressBarLength = 30;
                const progressPos = Math.floor(progressBarLength * (progress / 100));
                const progressBar = "─".repeat(progressPos) + "○" + "─".repeat(progressBarLength - progressPos);

                const headerDisplay = new TextDisplayBuilder()
                    .setContent(`**${client.emoji.check} ${track.title}**`);

                const separator1 = new SeparatorBuilder();

                const progressDisplay = new TextDisplayBuilder()
                    .setContent(
                        `**${convertTime(position)}** \`/\` **${convertTime(duration)}**\n` +
                        `${progressBar} **${progress}%**`
                    );

                const separator2 = new SeparatorBuilder();

                const lyricsDisplay = new TextDisplayBuilder()
                    .setContent(lyricsText);

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("back_to_static")
                        .setLabel(client.t(message.guild.id, "buttons.static"))
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("close_sync")
                        .setLabel(client.t(message.guild.id, "buttons.close"))
                        .setStyle(ButtonStyle.Secondary)
                );

                const separator3 = new SeparatorBuilder();

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(headerDisplay)
                    .addSeparatorComponents(separator1)
                    .addTextDisplayComponents(progressDisplay)
                    .addSeparatorComponents(separator2)
                    .addTextDisplayComponents(lyricsDisplay)
                    .addSeparatorComponents(separator3)
                    .addActionRowComponents(buttons);

                await message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch((err) => {
                    console.error("Failed to update lyrics:", err);
                    if (updateInterval) clearInterval(updateInterval);
                    isActive = false;
                });
            }
        } catch (error) {
            console.error("Update lyrics error:", error);
            if (updateInterval) clearInterval(updateInterval);
            isActive = false;
        }
    };

    await updateLyrics();
    updateInterval = setInterval(updateLyrics, 5);

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600000,
    });

    collector.on("collect", async (interaction) => {
        if (interaction.user.id !== authorId) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.lyrics.onlyInvoker", { e: client.emoji.cross }));

            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
            });
        }

        try {
            await interaction.deferUpdate();

            if (interaction.customId === "close_sync") {
                isActive = false;
                if (updateInterval) clearInterval(updateInterval);
                collector.stop();
                await message.delete().catch(() => { });
            } else if (interaction.customId === "back_to_static") {
                isActive = false;
                if (updateInterval) clearInterval(updateInterval);
                collector.stop();

                const lyricsManager = new LyricsManager();
                const result = await lyricsManager.fetchLyrics(track.title, track.author);
                if (result && result.lyrics) {
                    await showStaticLyrics(client, message, track, result.lyrics, result.source, authorId);
                }
            }
        } catch (error) {
            console.error("Live sync button error:", error);
        }
    });

    collector.on("end", () => {
        isActive = false;
        if (updateInterval) clearInterval(updateInterval);
    });

    const cleanup = () => {
        isActive = false;
        if (updateInterval) clearInterval(updateInterval);
        collector.stop();
    };

    const playerEndHandler = (p) => {
        if (p.guildId === guildId) cleanup();
    };

    const playerDestroyHandler = (p) => {
        if (p.guildId === guildId) cleanup();
    };

    client.manager.once("playerEnd", playerEndHandler);
    client.manager.once("playerDestroy", playerDestroyHandler);

    collector.once("end", () => {
        client.manager.off("playerEnd", playerEndHandler);
        client.manager.off("playerDestroy", playerDestroyHandler);
    });
}

