const { KazagumoPlayer } = require("kazagumo");

module.exports = {
  name: "playerCreate",

  run: async (client, player) => {
    const name = client.guilds.cache.get(player.guildId).name;
    client.logger.log(`Player Create in ${name} [ ${player.guildId} ]`, "log");

    const guildPrefix = client.db.prefixes.get(player.guildId);
    const prefix = guildPrefix?.prefix || client.prefix;

    client.rest
      .put(`/channels/${player.voiceId}/voice-status`, {
        body: { status: `use **${prefix}play** to add songs` },
      })
      .catch(() => null);

    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;

    if (client.voiceHealthMonitor) {
      client.voiceHealthMonitor.startMonitoring(player);
    }
  },
};
