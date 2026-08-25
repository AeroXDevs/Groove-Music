const {
    ContainerBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    MessageFlags,
    PermissionsBitField
} = require("discord.js");
const LastFM = require("../../utils/lastfm");

module.exports = {
    name: "mood",
    category: "Music",
    aliases: ["genre", "vibe"],
    description: "Play music based on your mood or genre",
    inVoiceChannel: true,
    sameVoiceChannel: true,
    botPerms: ["EmbedLinks", "Connect", "Speak"],

    async execute(message, args, client, prefix) {
        const regions = [
            { label: "Global", value: "global", description: "International chart-toppers" },
            { label: "English", value: "english", description: "Popular English vibes" },
            { label: "Hindi", value: "hindi", description: "Pure Hindi music" },
            { label: "Bollywood", value: "bollywood", description: "Iconic Indian cinema tracks" },
            { label: "Punjabi", value: "punjabi", description: "Bhangra and Punjabi beats" },
            { label: "Haryanvi", value: "haryanvi", description: "Top Haryanvi music" },
            { label: "K-Pop", value: "k-pop", description: "Best of Korean pop" },
            { label: "Spanish", value: "spanish", description: "Top Spanish language hits" },
            { label: "Latin", value: "latin", description: "Rhythms from Latin America" }
        ];

        const regionMenu = new StringSelectMenuBuilder()
            .setCustomId("region_select")
            .setPlaceholder(client.t(message.guild.id, "music.mood.regionPlaceholder"))
            .addOptions(regions);

        const row = new ActionRowBuilder().addComponents(regionMenu);
        const display = new TextDisplayBuilder()
            .setContent(client.t(message.guild.id, "music.mood.title", { e: client.emoji.dance }));

        const container = new ContainerBuilder().addTextDisplayComponents(display);

        const msg = await message.reply({
            components: [container, row],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 60000
        });

        let selectedRegion = null;

        collector.on("collect", async (interaction) => {
            if (interaction.customId === "region_select") {
                selectedRegion = regions.find(r => r.value === interaction.values[0]);
                await interaction.deferUpdate();

                const moodOptions = [
                    { label: "Chill / Lofi", value: "chill", description: "Relaxing vibes" },
                    { label: "Party / Dance", value: "party", description: "Energy boost" },
                    { label: "Sad / Emotional", value: "sad", description: "Deep feels" },
                    { label: "Romance", value: "romance", description: "Love songs" }
                ];

                const moodMenu = new StringSelectMenuBuilder()
                    .setCustomId("mood_select")
                    .setPlaceholder(client.t(message.guild.id, "music.mood.moodPlaceholder", { region: selectedRegion.label }))
                    .addOptions(moodOptions);

                const moodRow = new ActionRowBuilder().addComponents(moodMenu);
                const moodDisplay = new TextDisplayBuilder()
                    .setContent(client.t(message.guild.id, "music.mood.moodTitle", { region: selectedRegion.label }));

                const moodContainer = new ContainerBuilder().addTextDisplayComponents(moodDisplay);
                await msg.edit({ components: [moodContainer, moodRow] });

            } else if (interaction.customId === "mood_select") {
                const moodValue = interaction.values[0];
                await interaction.deferUpdate();

                const tagMap = {
                    global: { chill: "lofi", party: "party", sad: "sad", romance: "romance", keyword: "" },
                    english: { chill: "chill house", party: "pop", sad: "sad pop", romance: "lovesong", keyword: "English" },
                    hindi: { chill: "hindi", party: "hindi", sad: "hindi sad", romance: "hindi", keyword: "Hindi" },
                    bollywood: { chill: "bollywood chill", party: "bollywood dance", sad: "hindi sad", romance: "bollywood romance", keyword: "Bollywood" },
                    punjabi: { chill: "punjabi", party: "bhangra", sad: "punjabi sad", romance: "punjabi", keyword: "Punjabi" },
                    haryanvi: { chill: "haryanvi", party: "haryanvi", sad: "haryanvi", romance: "haryanvi", keyword: "Haryanvi" },
                    "k-pop": { chill: "k-pop chill", party: "k-pop", sad: "k-pop ballad", romance: "k-pop", keyword: "K-Pop" },
                    spanish: { chill: "spanish chill", party: "spanish party", sad: "spanish sad", romance: "spanish romance", keyword: "Spanish" },
                    latin: { chill: "latin chill", party: "reggaeton", sad: "latin ballad", romance: "latin romance", keyword: "Latin" }
                };

                const regionData = tagMap[selectedRegion.value];
                const finalTag = regionData[moodValue];
                const searchKeyword = regionData.keyword;
                const moodLabel = interaction.component.options.find(o => o.value === moodValue).label;

                await this.startMoodRadio(message, finalTag, `${selectedRegion.label} ${moodLabel}`, client, msg, searchKeyword);
                collector.stop();
            }
        });
    },

    async startMoodRadio(message, tag, label, client, statusMsg, searchKeyword = "") {
        const author = message.author || message.user;
        const channel = message.member.voice.channel;

        const updateStatus = async (content, isError = false) => {
            const display = new TextDisplayBuilder()
                .setContent(isError ? `**${client.emoji.cross} ${content}**` : `**${client.emoji.info} ${content}**`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            await statusMsg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
        };

        try {
            await updateStatus(`Fetching **${label}** tracks...`);

            const lastfm = new LastFM(client);
            const tracks = await lastfm.getTopTracksByTag(tag, 20);

            if (tracks.length === 0) {
                return await updateStatus(`Could not find any tracks for: **${label}**.`, true);
            }

            for (let i = tracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
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
            await updateStatus(`Resolving tracks for **${label}** radio...`);

            for (const t of tracks.slice(0, 5)) {
                const query = `${t.author} ${t.title} ${searchKeyword}`.trim();
                const result = await client.manager.search(query, { requester: author, engine: searchEngine });

                if (result && result.tracks.length > 0) {
                    player.queue.add(result.tracks[0]);
                    originalQueued++;
                }
            }

            player.data?.set("autoplay", true);

            if (originalQueued === 0) {
                return await updateStatus(client.t(message.guild.id, "music.mood.unresolved"), true);
            }

            if (!player.playing && !player.paused) await player.play();

            const successDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.mood.started", { e: client.emoji.check, label, count: originalQueued }));

            const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);
            await statusMsg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } catch (err) {
            console.error(err);
            await updateStatus(`An error occurred: ${err.message}`, true);
        }
    }
};
