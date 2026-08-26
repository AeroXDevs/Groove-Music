const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");
const { getDefaultVolume } = require("../../utils/playerUtils");

module.exports = {
  name: "playerButtons",
  run: async (client, interaction, setupData) => {
    const guildId = interaction.guildId;

    if (!interaction.member.voice.channel) {
      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "musicsystem.needVoice", { e: client.emoji.warn }));
      return interaction.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      }).catch(() => {});
    }

    let player = client.manager.players.get(guildId);

    if (player && interaction.member.voice.channel.id !== player.voiceId) {
      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "musicsystem.sameVoice", { e: client.emoji.warn }));
      return interaction.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      }).catch(() => {});
    }

    const replyEphemeral = (content) => {
      const display = new TextDisplayBuilder().setContent(content);
      return interaction.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      }).catch(() => {});
    };

    switch (interaction.customId) {
      case "ms_pause_resume": {
        if (!player || !player.queue.current) return replyEphemeral(client.t(guildId, "music.playFirst", { e: client.emoji.warn }));
        if (player.paused) {
          player.pause(false);
          return replyEphemeral(client.t(guildId, "music.resumed", { e: client.emoji.check, title: player.queue.current.title, uri: player.queue.current.uri }));
        } else {
          player.pause(true);
          return replyEphemeral(client.t(guildId, "music.paused", { e: client.emoji.check, title: player.queue.current.title, uri: player.queue.current.uri }));
        }
      }

      case "ms_skip": {
        if (!player || !player.queue.current) return replyEphemeral(client.t(guildId, "music.playFirst", { e: client.emoji.warn }));
        const title = player.queue.current.title;
        const uri = player.queue.current.uri;
        await player.skip();
        return replyEphemeral(client.t(guildId, "music.skipped", { e: client.emoji.check, title, uri }));
      }

      case "ms_stop": {
        if (!player) return replyEphemeral(client.t(guildId, "music.playFirst", { e: client.emoji.warn }));
        player.queue.clear();
        if (player.setLoop) player.setLoop("none");
        else player.loop = "none";
        const { safeDestroyPlayer } = require("../../utils/playerUtils");
        await safeDestroyPlayer(player);
        return replyEphemeral(client.t(guildId, "music.stopped", { e: client.emoji.check }));
      }

      case "ms_shuffle": {
        if (!player || player.queue.size < 2) return replyEphemeral(client.t(guildId, "music.queueEmpty", { e: client.emoji.warn }));
        const beforeShuffle = [...player.queue];
        await player.queue.shuffle();
        player.data.set("beforeShuffle", beforeShuffle);
        return replyEphemeral(client.t(guildId, "music.shuffled", { e: client.emoji.check }));
      }

      case "ms_loop": {
        if (!player || !player.queue.current) return replyEphemeral(client.t(guildId, "music.playFirst", { e: client.emoji.warn }));
        const modes = ["none", "track", "queue"];
        const currentIndex = modes.indexOf(player.loop || "none");
        const nextMode = modes[(currentIndex + 1) % modes.length];
        if (player.setLoop) player.setLoop(nextMode);
        else player.loop = nextMode;
        const modeLabels = {
          none: client.t(guildId, "music.loop.modeNone"),
          track: client.t(guildId, "music.loop.modeTrack"),
          queue: client.t(guildId, "music.loop.modeQueue")
        };
        return replyEphemeral(client.t(guildId, "music.loop.setTo", { mode: modeLabels[nextMode] }));
      }

      case "ms_voldown": {
        if (!player || !player.queue.current) return replyEphemeral(client.t(guildId, "music.playFirst", { e: client.emoji.warn }));
        const newVol = Math.max(0, player.volume - 10);
        await player.setVolume(newVol);
        return replyEphemeral(client.t(guildId, "music.volume.updated", { blank: client.emoji.blank, arrow: client.emoji.wickarrow, value: newVol }));
      }

      case "ms_volup": {
        if (!player || !player.queue.current) return replyEphemeral(client.t(guildId, "music.playFirst", { e: client.emoji.warn }));
        const newVol = Math.min(100, player.volume + 10);
        await player.setVolume(newVol);
        return replyEphemeral(client.t(guildId, "music.volume.updated", { blank: client.emoji.blank, arrow: client.emoji.wickarrow, value: newVol }));
      }

      case "ms_like": {
        if (!player || !player.queue.current) return replyEphemeral(client.t(guildId, "music.playFirst", { e: client.emoji.warn }));
        const track = player.queue.current;
        try {
          const songs = client.db.liked.get(interaction.user.id);
          if (songs.some(s => s.url === (track.uri || track.url))) {
            return replyEphemeral(client.t(guildId, "player.alreadyFav", { e: client.emoji.info, title: track.title }));
          }
          songs.push({
            title: track.title,
            url: track.uri || track.url,
            duration: track.length || track.duration,
            thumbnail: track.thumbnail || track.artworkUrl || track.image,
            author: track.author,
            addedAt: new Date().toISOString()
          });
          client.db.liked.set(interaction.user.id, songs);
          return replyEphemeral(client.t(guildId, "player.addedFav", { e: client.emoji.check, title: track.title }));
        } catch {
          return replyEphemeral(client.t(guildId, "player.favFailed", { e: client.emoji.cross }));
        }
      }

      case "ms_previous": {
        if (!player) return replyEphemeral(client.t(guildId, "music.playFirst", { e: client.emoji.warn }));
        const history = player.data?.get("history") || [];
        if (!history.length) return replyEphemeral(client.t(guildId, "music.noPrevious", { e: client.emoji.info }));
        const lastTrack = history[history.length - 1];
        try {
          const result = await client.manager.search(lastTrack.uri, { requester: interaction.user });
          if (result?.tracks?.length) {
            player.queue.unshift(result.tracks[0]);
            history.pop();
            player.data?.set("history", history);
            await player.skip();
            return replyEphemeral(client.t(guildId, "music.playingPrevious", { e: client.emoji.check, title: lastTrack.title, uri: lastTrack.uri }));
          }
        } catch {}
        return replyEphemeral(client.t(guildId, "music.previousFailed", { e: client.emoji.cross }));
      }

      default:
        await interaction.deferUpdate().catch(() => {});
    }
  }
};
