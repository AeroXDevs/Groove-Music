

module.exports = {
  name: "ready",
  run: async (client, name) => {
    client.logger.log(`Lavalink "${name}" connected.`, "ready");
    client.logger.log("Auto Reconnect Collecting player 24/7 data", "log");

    const maindata = client.db.twofourseven.getAll();
    client.logger.log(
      `Auto Reconnect found ${maindata.length
        ? `${maindata.length} queue${maindata.length > 1 ? "s" : ""}. Resuming all auto reconnect queue`
        : "0 queue"
      }`,
      "ready",
    );

    for (const data of maindata) {
      try {
        const channel = client.channels.cache.get(data.textId);
        const voice = client.channels.cache.get(data.voiceId);

        if (!channel || !voice) {
          client.logger.log(
            `Auto Reconnect: Channels not found for guild ${data.guildId}. Cleaning up database entry.`,
            "warn"
          );
          client.db.twofourseven.delete(data.guildId);
          continue;
        }


        const guild = voice.guild;
        const botMember = guild.members.cache.get(client.user.id);

        if (!botMember) {
          client.logger.log(
            `Auto Reconnect: Bot not in guild ${data.guildId}. Cleaning up database entry.`,
            "warn"
          );
          client.db.twofourseven.delete(data.guildId);
          continue;
        }

        const permissions = voice.permissionsFor(botMember);
        if (!permissions || !permissions.has(['Connect', 'Speak'])) {
          client.logger.log(
            `Auto Reconnect: Missing permissions for voice channel in guild ${data.guildId}. Cleaning up database entry.`,
            "warn"
          );
          client.db.twofourseven.delete(data.guildId);
          continue;
        }

        const player = await client.manager.createPlayer({
          guildId: data.guildId,
          voiceId: data.voiceId,
          textId: data.textId,
          deaf: true,
          volume: 80,
        });

        client.logger.log(
          `Auto Reconnect: Successfully reconnected to ${voice.name} in ${voice.guild.name}`,
          "ready"
        );


        await new Promise((resolve) =>
          setTimeout(resolve, Math.floor(Math.random() * (780 - 500 + 1)) + 500),
        );
      } catch (error) {

        if (error.message && (
          error.message.includes('missing connection endpoint') ||
          error.message.includes('Session not found') ||
          error.message.includes('voice connection')
        )) {
          client.logger.log(
            `Auto Reconnect: Voice connection failed for guild ${data.guildId}. Cleaning up database entry.`,
            "warn"
          );
          try {
            client.db.twofourseven.delete(data.guildId);
          } catch (deleteError) {
            client.logger.log(
              `Auto Reconnect: Failed to clean up database entry for guild ${data.guildId}`,
              "error"
            );
          }
        } else {
          client.logger.log(
            `Auto Reconnect: Failed to reconnect for guild ${data.guildId}: ${error.message}`,
            "error"
          );
          console.error(`[Auto Reconnect Error]`, error);
        }
      }
    }
  },
};
