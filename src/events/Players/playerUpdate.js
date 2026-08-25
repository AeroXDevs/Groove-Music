module.exports = {
  name: "playerUpdate",
  run: async (client, player) => {
    if (client.voiceHealthMonitor && player.playing) {
      client.voiceHealthMonitor.updateActivity(player.guildId);
    }
  },
};
