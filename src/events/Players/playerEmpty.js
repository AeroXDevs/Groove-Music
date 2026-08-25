const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "playerEmpty",
  run: async (client, player) => {
    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;

    const guildPrefix = client.db.prefixes.get(player.guildId);
    const prefix = guildPrefix?.prefix || client.prefix;

    try {
      await client.rest
        .put(`/channels/${player.voiceId}/voice-status`, {
          body: { status: `use **${prefix}play** to add songs` },
        })
        .catch(() => { });
    } catch (error) {
    }

    if (player.data.get("playerEmptyProcessed")) {
      return;
    }
    player.data.set("playerEmptyProcessed", true);

    player.data
      .get("message")
      ?.delete()
      .catch(() => null);

    if (player.queue && player.queue.previous) {
      player.queue.previous = [];
    }

    const TwoFourSeven = client.db.twofourseven.get(player.guildId);
    const is247Enabled = !!TwoFourSeven;

    if (is247Enabled) {
      return;
    }
    const vchannel = guild.channels.cache.get(player.voiceId);

    if (vchannel) {
      const existingTimeout = player.data.get("disconnectTimeout");
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const disconnectTimeout = setTimeout(async () => {
        const currentTwoFourSeven = client.db.twofourseven.get(player.guildId);
        if (currentTwoFourSeven) {
          return;
        }

        if ((!player.queue || player.queue.size === 0) && !player.playing && !player.paused) {
          const headerDisplay = new TextDisplayBuilder()
            .setContent(client.t(player.guildId, "player.queueEnded", { e: client.emoji.info }));

          const separator = new SeparatorBuilder();

          const infoDisplay = new TextDisplayBuilder()
            .setContent(client.t(player.guildId, "player.inactivity"));

          const container = new ContainerBuilder()
            .addTextDisplayComponents(headerDisplay)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(infoDisplay);

          client.channels.cache.get(player.textId)?.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          }).catch(() => null);


          const currentPlayer = client.manager.players.get(player.guildId);
          if (currentPlayer && currentPlayer.state !== "DESTROYED") {
            player.destroy().catch(() => null);
          }
        }

        player.data.delete("disconnectTimeout");
      }, 60000);

      player.data.set("disconnectTimeout", disconnectTimeout);
    }
  },
};
