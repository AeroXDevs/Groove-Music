const {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    MessageFlags,
    PermissionsBitField
} = require("discord.js");
const LastFM = require("../../utils/lastfm");

module.exports = {
    name: "artistradio",
    category: "Music",
    aliases: ["ar", "radio"],
    description: "Starts a radio based on similar artists from Last.fm",
    inVoiceChannel: true,
    sameVoiceChannel: true,
    botPerms: ["EmbedLinks", "Connect", "Speak"],

    slashOptions: [
        {
            name: "artist",
            description: "The artist to base the radio on",
            type: 3,
            required: true
        }
    ],

    async slashExecute(interaction, client) {
        const artistName = interaction.options.getString("artist");
        await interaction.deferReply();
        await this.processRadio(interaction, artistName, client);
    },

    async execute(message, args, client, prefix) {
        const artistName = args.join(" ");
        if (!artistName) {
            const display = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.artistradio.needArtist", { e: client.emoji.warn, prefix }));
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
        await this.processRadio(message, artistName, client);
    },

    async processRadio(message, artistName, client) {
        const isInteraction = !!message.applicationId;
        const author = isInteraction ? message.user : message.author;
        const channel = message.member.voice.channel;

        let statusMsg = null;
        const reply = async (content, isError = false) => {
            const display = new TextDisplayBuilder()
                .setContent(isError ? `**${client.emoji.cross} ${content}**` : `**${client.emoji.info} ${content}**`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            const payload = { components: [container], flags: MessageFlags.IsComponentsV2 };

            if (isInteraction) {
                return await message.editReply(payload);
            } else {
                if (statusMsg) {
                    return await statusMsg.edit(payload);
                } else {
                    statusMsg = await message.reply(payload);
                    return statusMsg;
                }
            }
        };

        try {
            const lastfm = new LastFM(client);
            await reply(`Searching for **${artistName}**...`);

            const searchResult = await lastfm.searchArtist(artistName);
            if (!searchResult) {
                return await reply(`Could not find any artist named **${artistName}**.`, true);
            }

            const correctedName = searchResult.name;
            if (correctedName.toLowerCase() !== artistName.toLowerCase()) {
                await reply(`Found artist **${correctedName}**. Searching for similar artists...`);
            } else {
                await reply(`Searching for artists similar to **${correctedName}**...`);
            }

            const similarArtists = await lastfm.getSimilarArtists(correctedName, 10);
            if (similarArtists.length === 0) {
                return await reply(`Could not find any artists similar to **${correctedName}**.`, true);
            }

            const originalTracks = await lastfm.getTopTracks(correctedName, 5);
            const radioTracks = [...originalTracks.slice(0, 2)];

            const similarPool = [];
            for (const artist of similarArtists.slice(0, 5)) {
                const tracks = await lastfm.getTopTracks(artist, 2);
                similarPool.push(...tracks);
            }

            for (let i = similarPool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [similarPool[i], similarPool[j]] = [similarPool[j], similarPool[i]];
            }

            radioTracks.push(...similarPool.slice(0, 3));

            if (radioTracks.length === 0) {
                return await reply(client.t(message.guild.id, "music.artistradio.noTracks"), true);
            }

            let player = client.manager.players.get(message.guild.id);
            if (!player) {
                player = await client.manager.createPlayer({
                    guildId: message.guild.id,
                    voiceId: channel.id,
                    textId: message.channel.id,
                    volume: 80,
                    deaf: true,
                });
            }

            let searchEngine = 'ytmsearch';
            try {
                const userPref = client.db.userpreferences.get(author.id);
                if (userPref?.musicSource) {
                    searchEngine = userPref.musicSource;
                }
            } catch (error) {
                console.error("Error fetching user preference:", error);
            }

            let originalQueued = 0;
            let similarQueued = 0;
            await reply(`Resolving tracks for **${correctedName} Radio**...`);

            for (const t of originalTracks.slice(0, 3)) {
                const result = await client.manager.search(`${t.author} ${t.title}`, { requester: author, engine: searchEngine });
                if (result && result.tracks.length > 0) {
                    player.queue.add(result.tracks[0]);
                    originalQueued++;
                }
            }

            for (const t of similarPool) {
                if (originalQueued + similarQueued >= 5) break;
                const result = await client.manager.search(`${t.author} ${t.title}`, { requester: author, engine: searchEngine });
                if (result && result.tracks.length > 0) {
                    player.queue.add(result.tracks[0]);
                    similarQueued++;
                }
            }

            player.data?.set("autoplay", true);

            if (originalQueued + similarQueued === 0) {
                return await reply(client.t(message.guild.id, "music.artistradio.unresolved"), true);
            }

            if (!player.playing && !player.paused) await player.play();

            const successDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.artistradio.started", { e: client.emoji.check, artist: correctedName, original: originalQueued, similar: similarQueued, artists: similarArtists.slice(0, 2).join(", ") }));

            const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);
            if (isInteraction) await message.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            else await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } catch (err) {
            console.error(err);
            await reply(`An error occurred: ${err.message}`, true);
        }
    }
};
