const { Kazagumo, KazagumoTrack } = require("kazagumo");
const { Connectors } = require("shoukaku");
const Spotify = require("kazagumo-spotify");

const searchEngines = {
  DEEZER: "dzsearch",
  SPOTIFY: "spsearch",
  YOUTUBE: "ytsearch",
  JIO_SAAVAN: "jssearch",
  APPLE_MUSIC: "amsearch",
  YOUTUBE_MUSIC: "ytmsearch",
  GAANA: "gnsearch",
  SOUNDCLOUD: "scsearch"
};

const fallbackEngines = ["ytmsearch", "amsearch", "spsearch", "ytsearch"];

module.exports = function loadPlayerManager(client) {
  const manager = new Kazagumo(
    {
      defaultSearchEngine: client.config.node_source || "ytmsearch",
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      },
      plugins: client.config.spotifyId ? [
        new Spotify({
          clientId: client.config.spotifyId,
          clientSecret: client.config.spotifySecret,
          playlistPageLimit: 1,
          albumPageLimit: 1,
          searchLimit: 10,
          searchMarket: 'IN',
        }),
      ] : [],
    },
    new Connectors.DiscordJS(client),
    client.config.nodes,
    client.config.node_options
  );

  manager.searchEngines = searchEngines;

  const originalSearch = manager.search.bind(manager);

  manager.search = async function (query, options = {}) {
    const node = [...this.shoukaku.nodes.values()].find(n => n.state === 1) || [...this.shoukaku.nodes.values()][0];
    if (!node) return { type: "SEARCH", tracks: [] };

    let cleanQuery = query.trim().replace(/[<>]/g, '');

    const ytIdRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = cleanQuery.match(ytIdRegex);
    const videoId = ytMatch ? ytMatch[1] : null;

    if (videoId) {
      cleanQuery = `https://www.youtube.com/watch?v=${videoId}`;
    }

    const isUrl = /^https?:\/\//.test(cleanQuery);
    const isYouTube = cleanQuery.includes('youtube.com') || cleanQuery.includes('youtu.be') || cleanQuery.includes('music.youtube.com');

    if (isYouTube) {
      const strategies = videoId
        ? [cleanQuery, `ytsearch:${videoId}`, `ytmsearch:${videoId}`]
        : [cleanQuery, `ytsearch:${cleanQuery}`, `ytmsearch:${cleanQuery}`];

      for (const q of strategies) {
        const res = await node.rest.resolve(q).catch(() => null);
        if (res && res.loadType !== 'EMPTY' && res.loadType !== 'ERROR' && res.loadType !== 'NO_MATCHES') {
          const result = processSearchResult(res, options.requester);
          if (result.tracks.length > 0) return result;
        }
      }
    }

    if (!isUrl) {
      let searchEngineList = [options.engine || this.defaultSearchEngine];
      if (!options.engine) {
        searchEngineList = [...new Set([...searchEngineList, ...fallbackEngines])];
      }

      for (const engine of searchEngineList) {
        if (!engine) continue;
        const searchQuery = engine.includes(':') ? cleanQuery : `${engine}:${cleanQuery}`;
        const searchRes = await node.rest.resolve(searchQuery).catch(() => null);
        if (searchRes && searchRes.loadType !== 'EMPTY' && searchRes.loadType !== 'ERROR' && searchRes.loadType !== 'NO_MATCHES') {
          return processSearchResult(searchRes, options.requester);
        }
      }
    }

    return originalSearch(cleanQuery, options);
  };

  function processSearchResult(res, requester) {
    if (!res) return { type: "SEARCH", tracks: [] };
    const loadType = res.loadType?.toUpperCase() || '';

    try {
      if (loadType.includes('TRACK')) {
        const trackData = res.data || (res.tracks ? res.tracks[0] : null);
        if (!trackData) return { type: "SEARCH", tracks: [] };
        return { type: "TRACK", tracks: [new KazagumoTrack(trackData, requester)] };
      }

      if (loadType.includes('PLAYLIST')) {
        const playlistData = res.data || res;
        const tracks = playlistData.tracks || res.tracks || [];
        const name = playlistData.info?.name || res.playlistInfo?.name || "Unknown Playlist";
        return {
          type: "PLAYLIST",
          playlistName: name,
          tracks: (Array.isArray(tracks) ? tracks : []).map((track) => new KazagumoTrack(track, requester))
        };
      }

      if (loadType.includes('SEARCH') || Array.isArray(res.data) || Array.isArray(res.tracks)) {
        let tracks = [];
        if (Array.isArray(res.data)) tracks = res.data;
        else if (res.data?.tracks) tracks = res.data.tracks;
        else if (Array.isArray(res.tracks)) tracks = res.tracks;

        return {
          type: "SEARCH",
          tracks: tracks.map((track) => new KazagumoTrack(track, requester))
        };
      }
    } catch (e) {
      console.error("[Music] Result processing error:", e);
    }
    return { type: "SEARCH", tracks: [] };
  }

  manager.on("nodeConnect", (node) => console.log(`[Lavalink] Node "${node.name}" connected.`));
  manager.on("nodeError", (node, error) => console.log(`[Lavalink] Node "${node.name}" error: ${error.message}`));
  manager.on("nodeDisconnect", (node, reason) => console.log(`[Lavalink] Node "${node.name}" disconnected. Reason: ${reason || 'Unknown'}`));

  manager.on("error", (error) => {
    if (error.message?.includes("Connection exist but player not found")) return;
    console.error(`[Kazagumo] Error:`, error);
  });

  manager.shoukaku.on("ready", (name) => console.log(`[Lavalink-Core] ${name} is READY.`));
  manager.shoukaku.on("error", (name, error) => console.log(`[Lavalink-Core] ${name} ERROR: ${error}`));
  manager.shoukaku.on("close", (name, code, reason) => console.log(`[Lavalink-Core] ${name} CLOSED (Code: ${code}, Reason: ${reason})`));

  client.manager = manager;
  return manager;
};
