const lastErrorTime = new Map();
const ERROR_THROTTLE_MS = 60000;

module.exports = {
  name: "error",
  run: async (client, name, error) => {
    const errorKey = `${name}_${error.code || error.message}`;
    const now = Date.now();
    const lastTime = lastErrorTime.get(errorKey) || 0;

    if (error.code === 'ETIMEDOUT' || error.message?.includes('ETIMEDOUT')) {
      if (now - lastTime < ERROR_THROTTLE_MS) {
        return;
      }
      lastErrorTime.set(errorKey, now);
      client.logger.log(`Lavalink "${name}" connection timeout (will retry automatically)`, "warn");
      return;
    }

    client.logger.log(`Lavalink "${name}" error ${error}`, "error");

    if (error && error.message && error.message.includes('Session not found')) {
      client.logger.log(`Session lost for node "${name}", cleaning up affected players...`, "warn");

      const players = [...client.manager.players.values()];

      for (const player of players) {
        try {
          if (player.node && player.node.name === name) {
            client.logger.log(`Cleaning up player for guild ${player.guildId} due to session loss`, "warn");

            player.destroy().catch(() => {
              client.manager.players.delete(player.guildId);
              if (client.manager.shoukaku) {
                client.manager.shoukaku.leaveVoiceChannel(player.guildId).catch(() => null);
              }
            });

            if (client.voiceHealthMonitor) {
              client.voiceHealthMonitor.stopMonitoring(player.guildId);
            }
          }
        } catch (cleanupError) {
          client.logger.log(`Error cleaning up player ${player.guildId}: ${cleanupError.message}`, "error");
        }
      }
    }
  },
};
