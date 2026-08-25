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
const { convertTime } = require("../../utils/convert.js");

module.exports = {
    name: "similar",
    category: "Music",
    aliases: ["sim", "related"],
    cooldown: 15,
    description: "Get songs similar to currently playing track",
    args: false,
    usage: "",
    userPerms: [],
    botPerms: [],
    owner: false,
    player: true,
    inVoiceChannel: true,
    sameVoiceChannel: true,

    slashOptions: [],

    async slashExecute(interaction, client) {
        return module.exports.runSimilar(interaction, client, true);
    },

    async execute(message, args, client, prefix) {
        return module.exports.runSimilar(message, client, false);
    },

    async runSimilar(context, client, isSlash) {
        const author = isSlash ? context.user : context.author;
        const guildId = context.guild.id;

        if (isSlash && !context.deferred) await context.deferReply();

        let player = client.manager.players.get(guildId);
        if (!player || !player.queue.current) {
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(message.guild.id, "music.nothingPlaying", { e: client.emoji.cross }));
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            const options = { components: [container], flags: MessageFlags.IsComponentsV2 };
            return isSlash ? context.editReply(options) : context.reply(options);
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

        const currentTrack = player.queue.current;
        const query = `${currentTrack.title} ${currentTrack.author}`;

        const fetchTracks = async (engine) => {
            const res = await player.search(query, { requester: author, engine: engine });
            return res?.tracks || [];
        };

        let tracks = await fetchTracks(searchEngine);
        let page = 0;
        const multiple = 5;

        if (tracks.length === 0) {
            const noResultsDisplay = new TextDisplayBuilder().setContent(client.t(message.guild.id, "music.similar.none", { e: client.emoji.cross, engine: searchEngine }));
            const noResultsContainer = new ContainerBuilder().addTextDisplayComponents(noResultsDisplay);
            const options = { components: [noResultsContainer], flags: MessageFlags.IsComponentsV2 };
            return isSlash ? (context.deferred ? context.editReply(options) : context.reply(options)) : context.reply(options);
        }

        const generateContainer = (p) => {
            const container = new ContainerBuilder();
            const start = p * multiple;

            const headerRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('sim_close')
                    .setLabel(client.t(message.guild.id, "buttons.close"))
                    .setStyle(ButtonStyle.Secondary)
            );
            container.addActionRowComponents(headerRow);
            container.addSeparatorComponents(new SeparatorBuilder());

            const currentBatch = tracks.slice(start, start + multiple);
            const totalPages = Math.ceil(tracks.length / multiple);

            currentBatch.forEach((track, i) => {
                const index = start + i + 1;
                const duration = convertTime(track.length || 0);
                const authorName = (track.author || 'Unknown Artist').replace(/\s*-\s*Topic\s*$/i, '').trim();

                const section = new SectionBuilder();
                section.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**${index}.** ${track.title.substring(0, 100)}`),
                    new TextDisplayBuilder().setContent(`-# ${authorName} • ${duration}`)
                );

                const addButton = new ButtonBuilder()
                    .setCustomId(`add_sim_${index - 1}`)
                    .setEmoji(client.emoji.add)
                    .setStyle(ButtonStyle.Secondary);

                section.setButtonAccessory(addButton);
                container.addSectionComponents(section);
            });

            container.addSeparatorComponents(new SeparatorBuilder());
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `-# Page ${p + 1}/${totalPages} • Searching similar for: ${currentTrack.title.substring(0, 30)}...`
            ));

            return container;
        };

        const generateButtons = (p) => {
            const totalPages = Math.ceil(tracks.length / multiple);

            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('sim_prev')
                    .setLabel(client.t(message.guild.id, "buttons.previous"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === 0),
                new ButtonBuilder()
                    .setCustomId('sim_next')
                    .setLabel(client.t(message.guild.id, "buttons.next"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === totalPages - 1 || totalPages === 0),
                new ButtonBuilder()
                    .setCustomId('sim_all')
                    .setLabel(client.t(message.guild.id, "buttons.queueAll"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(tracks.length === 0)
            );
        };

        const initialOptions = {
            components: [generateContainer(page), generateButtons(page)],
            flags: MessageFlags.IsComponentsV2
        };

        const responseMsg = isSlash ? (context.deferred ? await context.editReply(initialOptions) : await context.reply(initialOptions)) : await context.reply(initialOptions);
        const collector = responseMsg.createMessageComponentCollector({
            filter: (i) => i.user.id === author.id,
            time: 300000
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'sim_close') {
                collector.stop();
                return i.message.delete().catch(() => { });
            }

            if (i.customId === 'sim_prev') {
                await i.deferUpdate().catch(() => { });
                const total = Math.ceil(tracks.length / multiple);
                page = page > 0 ? page - 1 : total - 1;
                await i.editReply({ components: [generateContainer(page), generateButtons(page)], flags: MessageFlags.IsComponentsV2 });
            } else if (i.customId === 'sim_next') {
                await i.deferUpdate().catch(() => { });
                const total = Math.ceil(tracks.length / multiple);
                page = page + 1 < total ? page + 1 : 0;
                await i.editReply({ components: [generateContainer(page), generateButtons(page)], flags: MessageFlags.IsComponentsV2 });
            } else if (i.customId.startsWith('add_sim_')) {
                await i.deferUpdate().catch(() => { });
                const index = parseInt(i.customId.split('_')[2]);
                const track = tracks[index];
                if (!track) return;
                player.queue.add(track);
                if (!player.playing && !player.paused) await player.play();

                const successDisplay = new TextDisplayBuilder()
                    .setContent(client.t(message.guild.id, "music.similar.added", { e: client.emoji.check, title: track.title, uri: track.uri }));
                const successContainer = new ContainerBuilder().addTextDisplayComponents(successDisplay);

                return i.channel.send({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
            } else if (i.customId === 'sim_all') {
                await i.deferUpdate().catch(() => { });
                tracks.forEach(t => player.queue.add(t));
                if (!player.playing && !player.paused) await player.play();

                const successDisplay = new TextDisplayBuilder()
                    .setContent(client.t(message.guild.id, "music.similar.addedAll", { e: client.emoji.check, count: tracks.length }));
                const successContainer = new ContainerBuilder().addTextDisplayComponents(successDisplay);

                return i.channel.send({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
            }
        });

        collector.on('end', () => {
            if (isSlash) context.editReply({ components: [generateContainer(page)] }).catch(() => { });
        });
    },
};

async function searchPlatform(player, engine, query, requester) {
    try {
        const result = await player.search(query, { engine, requester });
        return result.tracks || [];
    } catch (error) {
        console.error(`Error searching ${engine}:`, error);
        return [];
    }
}
