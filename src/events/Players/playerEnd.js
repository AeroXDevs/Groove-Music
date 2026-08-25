const { EmbedBuilder } = require("discord.js");
const { updateVoiceChannel } = require("../../utils/voiceConnect");

module.exports = {
  name: "playerEnd",
  run: async (client, player, track) => {
    try {
      if (track) {
        let history = player.data?.get("history") || [];
        if (history.length === 0 || history[history.length - 1]?.uri !== track.uri) {
          history.push({
            title: track.title,
            author: track.author,
            uri: track.uri,
            length: track.length,
            thumbnail: track.thumbnail,
            requester: track.requester,
            identifier: track.identifier,
            sourceName: track.sourceName
          });
          if (history.length > 20) history.shift();
          player.data?.set("history", history);
        }
      }

      player.data.get("message")?.delete().catch(() => null);
      await updateVoiceChannel(client, player, true);

      const guild = client.guilds.cache.get(player.guildId);
      if (!guild) return;

      if (player.queue && player.queue.size > 0) return;
      if (player.playing) return;

      const autoplay = player.data?.get("autoplay");
      if (autoplay && track) {
        const history = player.data?.get("history") || [];

        const extractCoreName = (title) => {
          let core = title.toLowerCase();
          core = core.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '');
          core = core.replace(/official|video|audio|lyric|lyrics|music|song|full|hd|4k|8k|version|remix|edit|remaster/gi, '');
          core = core.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
          return core;
        };

        const isSimilarTitle = (title1, title2) => {
          const core1 = extractCoreName(title1);
          const core2 = extractCoreName(title2);
          if (core1 === core2) return true;
          if (core1.length > 3 && core2.length > 3) {
            if (core1.includes(core2) || core2.includes(core1)) return true;
          }
          const words1 = core1.split(' ').filter(w => w.length > 2);
          const words2 = core2.split(' ').filter(w => w.length > 2);
          if (words1.length === 0 || words2.length === 0) return core1 === core2;
          const commonWords = words1.filter(w => words2.includes(w));
          const similarity = commonWords.length / Math.max(words1.length, words2.length);
          return similarity > 0.6;
        };

        const cleanAuthor = track.author.replace(/\s*-\s*Topic\s*$/i, '').trim();
        const cleanTitle = track.title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

        let recommendations = [];

        try {
          const LastFM = require("../../utils/lastfm");
          const lastfm = new LastFM(client);
          recommendations = await lastfm.getSimilarTracks(cleanAuthor, cleanTitle, 10);

          if (recommendations.length === 0) {
            const similarArtists = await lastfm.getSimilarArtists(cleanAuthor, 3);
            for (const artist of similarArtists) {
              const artistTracks = await lastfm.getTopTracks(artist, 3);
              recommendations.push(...artistTracks);
            }
          }

          recommendations = recommendations.sort(() => Math.random() - 0.5);
        } catch (err) {
          console.error("Last.fm error:", err);
        }

        const searchQueries = recommendations.map(r => `${r.author} ${r.title}`);

        let engines = ["ytmsearch", "ytsearch", "spsearch", "amsearch", "dzsearch", "jssearch", "gnsearch", "scsearch"];
        try {
          const userId = track.requester?.id || track.requester;
          const userPref = client.db.userpreferences.get(userId);
          if (userPref && userPref.musicSource) {
            engines = [userPref.musicSource, ...engines.filter(e => e !== userPref.musicSource)];
          }
        } catch (err) { }

        const findTrack = async (query) => {
          for (const engine of engines.slice(0, 2)) {
            try {
              const result = await client.manager.search(query, { engine, requester: client.user });
              if (result && result.tracks && result.tracks.length > 0) {
                const found = result.tracks.find(t => {
                  const inHistory = history.some(h => h.uri === t.uri || h.identifier === t.identifier || isSimilarTitle(h.title, t.title));
                  const isCurrent = t.uri === track.uri || t.identifier === track.identifier || isSimilarTitle(t.title, track.title);
                  return !inHistory && !isCurrent;
                });
                if (found) return found;
              }
            } catch (e) { continue; }
          }
          return null;
        };

        let nextTrack = null;
        if (searchQueries.length > 0) {

          const searchPromises = searchQueries.slice(0, 3).map(query => findTrack(query));
          const results = await Promise.all(searchPromises);
          nextTrack = results.find(t => t !== null);

          if (!nextTrack && searchQueries.length > 3) {
            for (let i = 3; i < searchQueries.length; i++) {
              nextTrack = await findTrack(searchQueries[i]);
              if (nextTrack) break;
            }
          }
        }

        if (nextTrack) {
          player.queue.add(nextTrack);
          if (!player.playing && !player.paused) await player.play();
        } else {
          console.log(`[Autoplay Test] No tracks found for queries: ${searchQueries.join(', ')}`);
        }
      }
    } catch (error) {
      console.error("Error in playerEnd event:", error);
    }
  },
};
