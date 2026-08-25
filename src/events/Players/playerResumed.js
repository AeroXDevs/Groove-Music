module.exports = {
  name: "playerResumed",
  run: async (client, player) => {
    client.logger.log(`Player Resume in @ ${player.guildId}`, "log");

    if (!player.playing && !player.paused) {
      const guildPrefix = client.db.prefixes.get(player.guildId);
      const prefix = guildPrefix?.prefix || client.prefix;
      await client.rest
        .put(`/channels/${player.voiceId}/voice-status`, {
          body: { status: `use **${prefix}play** to add songs` },
        })
        .catch(() => null);
    }

    if (client.voiceHealthMonitor) {
      client.voiceHealthMonitor.updateActivity(player.guildId);
    }
  },
};
