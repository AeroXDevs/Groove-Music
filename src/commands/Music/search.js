const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    MessageFlags
} = require('discord.js');
const { KazagumoTrack } = require('kazagumo');
const { convertTime } = require("../../utils/convert.js");


module.exports = {
    name: 'search',
    category: 'Music',
    aliases: ['find'],
    cooldown: 5,
    description: 'Search for songs and artists and add them to queue',
    inVoiceChannel: true,
    sameVoiceChannel: true,

    slashOptions: [
        {
            name: 'song',
            description: 'The song you want to search for',
            type: 3,
            required: true
        }
    ],

    async slashExecute(interaction, client) {
        const query = interaction.options.getString('song');
        return module.exports.runSearch(interaction, client, query, true);
    },

    async execute(message, args, client, prefix) {
        if (!args.length) {
            const usageDisplay = new TextDisplayBuilder()
                .setContent(
client.t(message.guild.id, "music.search.usage", { d: client.emoji.dot, prefix })
                );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(usageDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const query = args.join(' ');
        return module.exports.runSearch(message, client, query, false);
    },

    async runSearch(context, client, query, isSlash) {
        const author = isSlash ? context.user : context.author;
        const guildId = context.guild.id;

        if (isSlash && !context.deferred) await context.deferReply();

        let searchEngine = 'ytmsearch';
        try {
            const userPref = client.db.userpreferences.get(author.id);
            if (userPref?.musicSource) {
                searchEngine = userPref.musicSource;
            }
        } catch (error) {
            console.error("Error fetching user preference:", error);
        }


        let player = client.manager.players.get(guildId);
        const channel = context.member.voice.channel;

        if (!player) {
            player = await client.manager.createPlayer({
                guildId: guildId,
                voiceId: channel.id,
                textId: context.channel.id,
                volume: 80,
                deaf: true,
            });
        }

        const node = [...client.manager.shoukaku.nodes.values()][0];
        if (!node) {
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(message.guild.id, "music.search.noNode", { e: client.emoji.cross }));
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            const options = { components: [container], flags: MessageFlags.IsComponentsV2 };
            return isSlash ? context.editReply(options) : context.reply(options);
        }

        const searchSongs = async (q) => {
            let res = await player.search(q, { requester: author, engine: searchEngine });
            if ((!res || !res.tracks || res.tracks.length === 0) && searchEngine !== 'ytsearch') {
                res = await player.search(q, { requester: author, engine: 'ytsearch' });
            }
            return res?.tracks || [];
        };

        const searchArtists = async (q) => {
            let res = await player.search(q, { requester: author, engine: searchEngine });
            if ((!res || !res.tracks || res.tracks.length === 0) && searchEngine !== 'ytsearch') {
                res = await player.search(q, { requester: author, engine: 'ytsearch' });
            }
            return res?.tracks || [];
        };

        const loadArtistTracks = async (artistQuery) => {
            let res = await player.search(artistQuery, { requester: author, engine: searchEngine });
            if ((!res || !res.tracks || res.tracks.length === 0) && searchEngine !== 'ytsearch') {
                res = await player.search(artistQuery, { requester: author, engine: 'ytsearch' });
            }
            return res?.tracks || [];
        };


        let mode = 'songs';
        let view = 'list';
        let songs = await searchSongs(query);
        let artists = [];
        let page = 0;
        const multiple = 5;

        if (songs.length === 0) {
            const noResultsDisplay = new TextDisplayBuilder().setContent(client.t(message.guild.id, "music.search.noResults", { e: client.emoji.cross, query }));
            const noResultsContainer = new ContainerBuilder().addTextDisplayComponents(noResultsDisplay);
            const options = { components: [noResultsContainer], flags: MessageFlags.IsComponentsV2 };
            return isSlash ? context.editReply(options) : context.reply(options);
        }

        const generateContainer = (p) => {
            const container = new ContainerBuilder();
            const start = p * multiple;

            if (view === 'list') {
                const headerRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('mode_songs')
                        .setLabel(client.t(message.guild.id, "buttons.songs"))
                        .setStyle(mode === 'songs' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('mode_artists')
                        .setLabel(client.t(message.guild.id, "buttons.artists"))
                        .setStyle(mode === 'artists' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('delete_search')
                        .setLabel(client.t(message.guild.id, "buttons.close"))
                        .setStyle(ButtonStyle.Secondary)
                );
                container.addActionRowComponents(headerRow);
                container.addSeparatorComponents(new SeparatorBuilder());
            }

            if (mode === 'songs') {
                const currentTracks = songs.slice(start, start + multiple);
                const totalPages = Math.ceil(songs.length / multiple);

                currentTracks.forEach((track, i) => {
                    const index = start + i + 1;
                    const duration = convertTime(track.length || 0);
                    const authorName = (track.author || 'Unknown Artist').replace(/\s*-\s*Topic\s*$/i, '').trim();

                    const section = new SectionBuilder();
                    section.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**${index}.** ${track.title}`),
                        new TextDisplayBuilder().setContent(`-# ${authorName} • ${duration}`)
                    );

                    const addButton = new ButtonBuilder()
                        .setCustomId(`add_track_${index - 1}`)
                        .setEmoji(client.emoji.add)
                        .setStyle(ButtonStyle.Secondary);

                    section.setButtonAccessory(addButton);
                    container.addSectionComponents(section);
                });

                container.addSeparatorComponents(new SeparatorBuilder());
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `-# Page ${p + 1}/${totalPages} • ${songs.length} results • Initiated By ${author.displayName}`
                ));
            } else {
                const currentArtists = artists.slice(start, start + multiple);
                const totalPages = Math.ceil(artists.length / multiple);

                currentArtists.forEach((artist, i) => {
                    const index = start + i + 1;
                    const section = new SectionBuilder();
                    section.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**${index}.** ${artist.author || artist.title}`)
                    );

                    const viewButton = new ButtonBuilder()
                        .setCustomId(`view_artist_${index - 1}`)
                        .setEmoji(client.emoji.arrowright)
                        .setStyle(ButtonStyle.Secondary);

                    section.setButtonAccessory(viewButton);
                    container.addSectionComponents(section);
                });

                container.addSeparatorComponents(new SeparatorBuilder());
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `-# Page ${p + 1}/${totalPages} • ${artists.length} results • Initiated By ${author.displayName}`
                ));
            }

            return container;
        };

        const generateButtons = (p) => {
            const currentCount = mode === 'songs' ? songs.length : artists.length;
            const totalPages = Math.ceil(currentCount / multiple);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel(client.t(message.guild.id, "buttons.previous"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel(client.t(message.guild.id, "buttons.next"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === totalPages - 1 || totalPages === 0),
                new ButtonBuilder()
                    .setCustomId('last')
                    .setLabel(client.t(message.guild.id, "buttons.last"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === totalPages - 1 || totalPages === 0)
            );

            if (mode === 'songs') {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('queue_all')
                        .setLabel(client.t(message.guild.id, "buttons.queueAll"))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(songs.length === 0)
                );
            }

            return row;
        };

        const updateMainMessage = async (i) => {
            const options = {
                components: [generateContainer(page), generateButtons(page)],
                flags: MessageFlags.IsComponentsV2
            };
            if (i && !i.replied && !i.deferred) {
                await i.update(options).catch(() => { });
            } else if (i) {
                await i.editReply(options).catch(() => { });
            } else {
                if (isSlash) await context.editReply(options);
                else await responseMsg.edit(options);
            }
        };

        const initialOptions = {
            components: [generateContainer(page), generateButtons(page)],
            flags: MessageFlags.IsComponentsV2
        };

        const responseMsg = isSlash ? await context.editReply(initialOptions) : await context.reply(initialOptions);
        const mainCollector = responseMsg.createMessageComponentCollector({
            filter: (i) => i.user.id === author.id,
            time: 40000000
        });

        mainCollector.on('collect', async (i) => {
            if (i.customId === 'delete_search') {
                mainCollector.stop();
                return i.message.delete().catch(() => { });
            }

            if (i.customId === 'mode_songs') {
                await i.deferUpdate().catch(() => { });
                if (mode === 'songs') return;
                mode = 'songs';
                page = 0;
                await updateMainMessage(i);
            } else if (i.customId === 'mode_artists') {
                await i.deferUpdate().catch(() => { });
                if (mode === 'artists') return;
                mode = 'artists';
                page = 0;
                if (artists.length === 0) artists = await searchArtists(query);
                await updateMainMessage(i);
            } else if (i.customId === 'prev') {
                await i.deferUpdate().catch(() => { });
                const count = mode === 'songs' ? songs.length : artists.length;
                const total = Math.ceil(count / multiple);
                page = page > 0 ? page - 1 : total - 1;
                await updateMainMessage(i);
            } else if (i.customId === 'next') {
                await i.deferUpdate().catch(() => { });
                const count = mode === 'songs' ? songs.length : artists.length;
                const total = Math.ceil(count / multiple);
                page = page + 1 < total ? page + 1 : 0;
                await updateMainMessage(i);
            } else if (i.customId === 'last') {
                await i.deferUpdate().catch(() => { });
                const count = mode === 'songs' ? songs.length : artists.length;
                page = Math.ceil(count / multiple) - 1;
                await updateMainMessage(i);
            } else if (i.customId.startsWith('add_track_')) {
                await i.deferUpdate().catch(() => { });
                const index = parseInt(i.customId.split('_')[2]);
                const track = songs[index];
                if (!track) return;
                player.queue.add(track);
                if (!player.playing && !player.paused) await player.play();

                const successDisplay = new TextDisplayBuilder()
                    .setContent(client.t(message.guild.id, "music.search.added", { e: client.emoji.check, title: track.title, uri: track.uri }));
                const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);

                return i.channel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } else if (i.customId === 'queue_all') {
                await i.deferUpdate().catch(() => { });
                songs.forEach(t => player.queue.add(t));
                if (!player.playing && !player.paused) await player.play();

                const successDisplay = new TextDisplayBuilder()
                    .setContent(client.t(message.guild.id, "music.search.addedAll", { e: client.emoji.check, count: songs.length }));
                const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);

                return i.channel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } else if (i.customId.startsWith('view_artist_')) {
                try {
                    await i.deferReply({ ephemeral: true });
                    const index = parseInt(i.customId.split('_')[2]);
                    const artist = artists[index];

                    if (!artist) {
                        return i.editReply({ content: client.t(message.guild.id, "music.search.noArtist", { e: client.emoji.cross }) });
                    }

                    const artistTracks = await loadArtistTracks(artist.author || artist.title);

                    if (!artistTracks || artistTracks.length === 0) {
                        return i.editReply({ content: client.t(message.guild.id, "music.search.noArtistTracks", { e: client.emoji.cross }) });
                    }

                    let artistPage = 0;
                    const generateArtistContainer = (ap) => {
                        const start = ap * multiple;
                        const currentTracks = artistTracks.slice(start, start + multiple);
                        const totalPages = Math.ceil(artistTracks.length / multiple);

                        const container = new ContainerBuilder();
                        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${artist.author || artist.title}`));
                        container.addSeparatorComponents(new SeparatorBuilder());

                        currentTracks.forEach((track, idx) => {
                            const tIdx = start + idx + 1;
                            const tTrack = new SectionBuilder();
                            tTrack.addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`**${tIdx}.** ${track.title}`),
                                new TextDisplayBuilder().setContent(`-# ${convertTime(track.length)}`)
                            );
                            tTrack.setButtonAccessory(new ButtonBuilder().setCustomId(`add_art_${start + idx}`).setEmoji(client.emoji.add).setStyle(ButtonStyle.Secondary));
                            container.addSectionComponents(tTrack);
                        });

                        container.addSeparatorComponents(new SeparatorBuilder());
                        return container;
                    };

                    const generateArtistButtons = (ap) => {
                        const totalPages = Math.ceil(artistTracks.length / multiple);
                        return new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('aprev').setLabel(client.t(message.guild.id, "buttons.previous")).setStyle(ButtonStyle.Secondary).setDisabled(ap === 0),
                            new ButtonBuilder().setCustomId('anext').setLabel(client.t(message.guild.id, "buttons.next")).setStyle(ButtonStyle.Secondary).setDisabled(ap === totalPages - 1),
                            new ButtonBuilder().setCustomId('alast').setLabel(client.t(message.guild.id, "buttons.last")).setStyle(ButtonStyle.Secondary).setDisabled(ap === totalPages - 1),
                            new ButtonBuilder().setCustomId('aall').setLabel(client.t(message.guild.id, "buttons.queueAll")).setStyle(ButtonStyle.Secondary)
                        );
                    };

                    const artistMsg = await i.editReply({
                        components: [generateArtistContainer(0), generateArtistButtons(0)],
                        flags: MessageFlags.IsComponentsV2
                    });

                    const artistCollector = artistMsg.createMessageComponentCollector({ time: 120000 });
                    artistCollector.on('collect', async (ai) => {
                        if (ai.customId === 'aprev') {
                            artistPage = artistPage > 0 ? artistPage - 1 : Math.ceil(artistTracks.length / multiple) - 1;
                        } else if (ai.customId === 'anext') {
                            artistPage = (artistPage + 1) % Math.ceil(artistTracks.length / multiple);
                        } else if (ai.customId === 'alast') {
                            artistPage = Math.ceil(artistTracks.length / multiple) - 1;
                        } else if (ai.customId.startsWith('add_art_')) {
                            await ai.deferUpdate().catch(() => { });
                            const trackIdx = parseInt(ai.customId.split('_')[2]);
                            const track = artistTracks[trackIdx];
                            player.queue.add(track);
                            if (!player.playing && !player.paused) await player.play();

                            const successDisplay = new TextDisplayBuilder()
                                .setContent(client.t(message.guild.id, "music.search.added", { e: client.emoji.check, title: track.title, uri: track.uri }));
                            const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);

                            return ai.channel.send({
                                components: [container],
                                flags: MessageFlags.IsComponentsV2
                            });
                        } else if (ai.customId === 'aall') {
                            await ai.deferUpdate().catch(() => { });
                            artistTracks.forEach(t => player.queue.add(t));
                            if (!player.playing && !player.paused) await player.play();

                            const successDisplay = new TextDisplayBuilder()
                                .setContent(client.t(message.guild.id, "music.search.addedAll", { e: client.emoji.check, count: artistTracks.length }));
                            const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);

                            return ai.channel.send({
                                components: [container],
                                flags: MessageFlags.IsComponentsV2
                            });
                        }
                        await ai.update({ components: [generateArtistContainer(artistPage), generateArtistButtons(artistPage)], flags: MessageFlags.IsComponentsV2 });
                    });
                } catch (error) {
                    console.error('Error in artist view:', error);
                    return i.editReply({ content: `**${client.emoji.cross} Something went wrong while loading artist tracks.**` }).catch(() => { });
                }
            }
        });

        mainCollector.on('end', () => {
            if (isSlash) context.editReply({ components: [generateContainer(page)] }).catch(() => { });
        });
    }
};
