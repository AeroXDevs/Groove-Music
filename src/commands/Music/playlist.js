const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "playlist",
  category: "Music",
  aliases: ["savedqueue", "sq", "pl"],
  cooldown: 3,
  description: "Create, manage and play saved playlists.",
  inVoiceChannel: false,
  slashOptions: [
    {
      name: "action",
      description: "Action to perform",
      type: 3,
      required: true,
      choices: [
        { name: "Create", value: "create" },
        { name: "Play", value: "play" },
        { name: "List", value: "list" },
        { name: "Show", value: "show" },
        { name: "Delete", value: "delete" },
        { name: "Add Current", value: "addcurrent" },
        { name: "Add Queue", value: "addqueue" },
      ]
    },
    {
      name: "name",
      description: "Playlist name (max 20 characters)",
      type: 3,
      required: false
    }
  ],

  async slashExecute(interaction, client) {
    const interactionWrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      createdTimestamp: interaction.createdTimestamp,
      reply: async (options) => {
        if (interaction.deferred) return await interaction.editReply(options);
        else if (interaction.replied) return await interaction.followUp(options);
        else return await interaction.reply(options);
      },
    };

    const action = interaction.options.getString("action");
    const name = interaction.options.getString("name");
    const args = [action];
    if (name) args.push(name);
    return this.execute(interactionWrapper, args, client, client.prefix);
  },

  async execute(message, args, client, prefix) {
    const guildId = message.guild.id;
    const userId = message.author.id;
    const action = args[0]?.toLowerCase();
    const name = args[1]?.trim();

    const MAX_PLAYLISTS = 10;
    const MAX_NAME_LENGTH = 20;

    const reply = (content) => {
      const display = new TextDisplayBuilder().setContent(content);
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    };

    if (!action) {
      return reply(client.t(guildId, "playlist.usage", { e: client.emoji.info, prefix }));
    }

    switch (action) {
      case "create":
      case "save": {
        if (!name) return reply(client.t(guildId, "playlist.needName", { e: client.emoji.warn }));
        if (name.length > MAX_NAME_LENGTH) return reply(client.t(guildId, "playlist.nameTooLong", { e: client.emoji.warn, max: MAX_NAME_LENGTH }));

        const existing = client.db.savedqueues.get(userId, name);
        if (existing) return reply(client.t(guildId, "playlist.alreadyExists", { e: client.emoji.warn, name }));

        const count = client.db.savedqueues.count(userId);
        if (count >= MAX_PLAYLISTS) return reply(client.t(guildId, "playlist.maxReached", { e: client.emoji.warn, max: MAX_PLAYLISTS }));

        const player = client.manager.players.get(guildId);
        const tracks = [];

        if (player && player.queue.current) {
          tracks.push({ title: player.queue.current.title, url: player.queue.current.uri });
          for (const track of player.queue) {
            tracks.push({ title: track.title, url: track.uri });
          }
        }

        client.db.savedqueues.create(userId, name, tracks);
        return reply(client.t(guildId, "playlist.created", { e: client.emoji.check, name, count: tracks.length }));
      }

      case "play":
      case "load": {
        if (!name) return reply(client.t(guildId, "playlist.needName", { e: client.emoji.warn }));

        const playlist = client.db.savedqueues.get(userId, name);
        if (!playlist) return reply(client.t(guildId, "playlist.notFound", { e: client.emoji.cross, name }));
        if (!playlist.tracks.length) return reply(client.t(guildId, "playlist.empty", { e: client.emoji.warn, name }));

        const channel = message.member?.voice?.channel;
        if (!channel) return reply(client.t(guildId, "music.mustBeInVoice", { e: client.emoji.warn }));

        let player = client.manager.players.get(guildId);
        if (!player) {
          try {
            player = await client.manager.createPlayer({
              guildId,
              voiceId: channel.id,
              textId: message.channel.id,
              volume: require("../../utils/playerUtils").getDefaultVolume(client, guildId),
              deaf: true,
            });
          } catch (err) {
            return reply(`**${client.emoji.cross} ${err.message}**`);
          }
        }

        reply(client.t(guildId, "playlist.loading", { e: client.emoji.load, name, count: playlist.tracks.length }));

        let loaded = 0;
        for (const track of playlist.tracks) {
          try {
            const result = await player.search(track.url || track.title, {
              requester: message.author,
            });
            if (result?.tracks?.length) {
              player.queue.add(result.tracks[0]);
              loaded++;
            }
          } catch { continue; }
        }

        if (!player.playing && !player.paused && player.queue.size > 0) {
          await player.play();
        }

        return reply(client.t(guildId, "playlist.loaded", { e: client.emoji.check, name, count: loaded }));
      }

      case "list":
      case "show":
      case "showall": {
        if (action === "show" && name) {
          const playlist = client.db.savedqueues.get(userId, name);
          if (!playlist) return reply(client.t(guildId, "playlist.notFound", { e: client.emoji.cross, name }));

          const trackList = playlist.tracks.slice(0, 20).map((t, i) =>
            `\`${i + 1}.\` ${t.title}`
          ).join("\n");

          const remaining = playlist.tracks.length > 20 ? `\n... +${playlist.tracks.length - 20}` : "";

          return reply(client.t(guildId, "playlist.details", {
            e: client.emoji.info,
            name,
            count: playlist.tracks.length,
            list: trackList + remaining
          }));
        }

        const playlists = client.db.savedqueues.getAll(userId);
        if (!playlists.length) return reply(client.t(guildId, "playlist.noPlaylists", { e: client.emoji.info }));

        const list = playlists.map(p =>
          `**${p.name}** — \`${p.tracks.length}\` ${client.t(guildId, "playlist.tracks")}`
        ).join("\n");

        return reply(client.t(guildId, "playlist.listAll", { e: client.emoji.info, list, count: playlists.length }));
      }

      case "delete":
      case "remove": {
        if (!name) return reply(client.t(guildId, "playlist.needName", { e: client.emoji.warn }));

        const existing = client.db.savedqueues.get(userId, name);
        if (!existing) return reply(client.t(guildId, "playlist.notFound", { e: client.emoji.cross, name }));

        client.db.savedqueues.delete(userId, name);
        return reply(client.t(guildId, "playlist.deleted", { e: client.emoji.check, name }));
      }

      case "addcurrent":
      case "addcurrenttrack": {
        if (!name) return reply(client.t(guildId, "playlist.needName", { e: client.emoji.warn }));

        const playlist = client.db.savedqueues.get(userId, name);
        if (!playlist) return reply(client.t(guildId, "playlist.notFound", { e: client.emoji.cross, name }));

        const player = client.manager.players.get(guildId);
        if (!player?.queue?.current) return reply(client.t(guildId, "music.playFirst", { e: client.emoji.warn }));

        const track = player.queue.current;
        playlist.tracks.push({ title: track.title, url: track.uri });
        client.db.savedqueues.update(userId, name, playlist.tracks);

        return reply(client.t(guildId, "playlist.trackAdded", { e: client.emoji.check, title: track.title, name }));
      }

      case "addqueue":
      case "addcurrentqueue": {
        if (!name) return reply(client.t(guildId, "playlist.needName", { e: client.emoji.warn }));

        const playlist = client.db.savedqueues.get(userId, name);
        if (!playlist) return reply(client.t(guildId, "playlist.notFound", { e: client.emoji.cross, name }));

        const player = client.manager.players.get(guildId);
        if (!player?.queue?.current) return reply(client.t(guildId, "music.playFirst", { e: client.emoji.warn }));

        const newTracks = [];
        if (player.queue.current) {
          newTracks.push({ title: player.queue.current.title, url: player.queue.current.uri });
        }
        for (const t of player.queue) {
          newTracks.push({ title: t.title, url: t.uri });
        }

        playlist.tracks.push(...newTracks);
        client.db.savedqueues.update(userId, name, playlist.tracks);

        return reply(client.t(guildId, "playlist.queueAdded", { e: client.emoji.check, count: newTracks.length, name }));
      }

      default:
        return reply(client.t(guildId, "playlist.usage", { e: client.emoji.info, prefix }));
    }
  },
};
