const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "playerError",
  run: async (client, player, type, error) => {
    try {
      client.logger.log(`Player get error: Type=${type}, Error=${error.message}`, "error");

      const guild = client.guilds.cache.get(player.guildId);
      if (!guild) return;

      switch (type) {
        case 'TrackStuckEvent':
          if (player.queue.length > 0) {
            const channel = client.channels.cache.get(player.textId);
            if (channel) {
              const stuckDisplay = new TextDisplayBuilder()
                .setContent(
client.t(player.guildId, "player.trackStuck", { e: client.emoji.warn, i: client.emoji.info })
                );

              const container = new ContainerBuilder()
                .addTextDisplayComponents(stuckDisplay);

              await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
              }).catch(() => null);
            }
            player.skip();
            return;
          }
          break;

        case 'TrackLoadFailed':
          if (player.queue.length > 0) {
            const channel = client.channels.cache.get(player.textId);
            if (channel) {
              const loadFailDisplay = new TextDisplayBuilder()
                .setContent(
client.t(player.guildId, "player.loadFailed", { e: client.emoji.warn, i: client.emoji.info })
                );

              const container = new ContainerBuilder()
                .addTextDisplayComponents(loadFailDisplay);

              await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
              }).catch(() => null);
            }
            player.skip();
            return;
          }
          break;

        default:
          const channel = client.channels.cache.get(player.textId);
          if (channel) {
            const errorDisplay = new TextDisplayBuilder()
              .setContent(
client.t(player.guildId, "player.unexpected", { e: client.emoji.warn, i: client.emoji.info })
              );

            const container = new ContainerBuilder()
              .addTextDisplayComponents(errorDisplay);

            await channel.send({
              components: [container],
              flags: MessageFlags.IsComponentsV2
            }).catch(() => null);
          }
          try {
            await player.destroy(guild.id);
          } catch (e) {
            if (client.manager.players.has(player.guildId)) {
              client.manager.players.delete(player.guildId);
            }
            if (client.manager.shoukaku) {
              client.manager.shoukaku.leaveVoiceChannel(player.guildId).catch(() => null);
            }
          }
      }
    } catch (err) {
      console.error("Error in playerError handler:", err);
      if (player && !player.destroyed) {
        try {
          await player.destroy(guild.id);
        } catch (e) {
          if (client.manager.players.has(player.guildId)) {
            client.manager.players.delete(player.guildId);
          }
          if (client.manager.shoukaku) {
            client.manager.shoukaku.leaveVoiceChannel(player.guildId).catch(() => null);
          }
        }
      }
    }
  },
};
