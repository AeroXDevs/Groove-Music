const { promisify } = require("util");
const Wait = promisify(setTimeout);
const {
  ChannelType,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ComponentType
} = require("discord.js");

module.exports = {
  name: "voiceStateUpdate",
  run: async (client, oldState, newState) => {
    const guildId = newState.guild.id;
    const player = client.manager.players?.get(guildId);
    const guild = client.guilds.cache.get(guildId)

    const botId = client.user.id;
    const botMember = newState.guild.members.cache.get(botId);
    const botVoiceChannel = botMember?.voice.channel;

    if (oldState.id === botId && oldState.channelId && !newState.channelId) {
      try {
        const twoFourSeven = client.db.twofourseven.get(guildId);

        if (twoFourSeven) {
          await Wait(2000);

          const voiceChannel = guild.channels.cache.get(twoFourSeven.voiceId);

          if (voiceChannel && voiceChannel.isVoiceBased()) {

            const existingPlayer = client.manager.players.get(guildId);

            if (!existingPlayer || existingPlayer.state === "DESTROYED") {
              try {
                const botMember = guild.members.me;
                if (!botMember) {
                  console.log(`[247] Bot member not found for guild ${guildId}`);
                  return;
                }

                const permissions = voiceChannel.permissionsFor(botMember);
                if (!permissions || !permissions.has(['Connect', 'Speak'])) {
                  console.log(`[247] Missing permissions in voice channel ${voiceChannel.id}`);
                  client.db.twofourseven.delete(guildId);
                  return;
                }

                const newPlayer = await client.manager.createPlayer({
                  guildId: guildId,
                  voiceId: twoFourSeven.voiceId,
                  textId: twoFourSeven.textId,
                  volume: 80,
                  deaf: true,
                  mute: false,
                });

                await Wait(1000);

                const textChannel = client.channels.cache.get(twoFourSeven.textId);
                if (textChannel) {
                  const display = new TextDisplayBuilder()
                    .setContent(`**Groove !**\n${client.emoji.blank}${client.emoji.wickarrow} **R__ejoined__** <#${twoFourSeven.voiceId}>`);

                  const container = new ContainerBuilder()
                    .addTextDisplayComponents(display);

                  textChannel
                    .send({
                      components: [container],
                      flags: MessageFlags.IsComponentsV2
                    })
                    .then((msg) =>
                      setTimeout(() => msg.delete().catch(() => null), 5000)
                    )
                    .catch(() => null);
                }
              } catch (createError) {
                console.error(`Failed to create player for 247 reconnection:`, createError.message || createError);
                if (createError.message && createError.message.includes('Session not found')) {
                  console.log(`[247] Lavalink session not found, skipping reconnection for guild ${guildId}`);
                }
              }
            } else {
              try {
                existingPlayer.setVoiceChannel(twoFourSeven.voiceId);
                if (existingPlayer.state !== "CONNECTED") {
                  await existingPlayer.connect();
                }

                const textChannel = client.channels.cache.get(twoFourSeven.textId);
                if (textChannel) {
                  const display = new TextDisplayBuilder()
                    .setContent(`**Groove !**\n${client.emoji.blank}${client.emoji.wickarrow} **R__ejoined__** <#${twoFourSeven.voiceId}>`);

                  const container = new ContainerBuilder()
                    .addTextDisplayComponents(display);

                  textChannel
                    .send({
                      components: [container],
                      flags: MessageFlags.IsComponentsV2
                    })
                    .then((msg) =>
                      setTimeout(() => msg.delete().catch(() => null), 5000)
                    )
                    .catch(() => null);
                }
              } catch (reconnectError) {
                console.error(`Failed to reconnect existing player:`, reconnectError.message || reconnectError);
              }
            }
            return;
          } else {
            client.db.twofourseven.delete(guildId);
          }
        }

        if (!player) return;
        await client.rest
          .put(`/channels/${player.voiceId}/voice-status`, {
            body: { status: `` },
          })
          .catch(() => null);

        await Wait(3000);
        try {
          await player?.destroy();
        } catch (destroyError) {
          if (client.manager.players.has(guildId)) {
            client.manager.players.delete(guildId);
          }
          if (client.manager.shoukaku) {
            await client.manager.shoukaku.leaveVoiceChannel(guildId).catch(() => null);
          }
        }

      } catch (error) {
        console.error(`Error handling voiceStateUpdate (disconnect): ${error}`);
      }
      return;
    }

    if (
      player &&
      oldState.id === botId &&
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId
    ) {
      try {
        player.setVoiceChannel(newState.channelId);

        const textChannel = client.channels.cache.get(player.textId);
        if (textChannel) {
          const display = new TextDisplayBuilder()
            .setContent(`**Groove !**\n${client.emoji.blank}${client.emoji.wickarrow} **M__oved__** to another channel`);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(display);

          textChannel
            .send({
              components: [container],
              flags: MessageFlags.IsComponentsV2
            })
            .then((msg) =>
              setTimeout(() => msg.delete().catch(() => null), 5000)
            )
            .catch(() => null);
        }
      } catch (err) {
        console.error(`Error handling bot moved VC: ${err}`);
      }
    }

    const currentChannel = oldState.channel || newState.channel;
    if (
      player &&
      currentChannel &&
      currentChannel.type === ChannelType.GuildVoice &&
      currentChannel.members.has(botId)
    ) {
      const humanCount = currentChannel.members.filter((m) => !m.user.bot).size;

      if (humanCount === 0 && player.playing) {
        player.pause(true);
        player.data.set('pausedByAlone', true);
        player.data.set('aloneStartTime', Date.now());

        await client.rest
          .put(`/channels/${player.voiceId}/voice-status`, {
            body: { status: `${client.emoji.pause} Song Paused` },
          })
          .catch(() => null);

        const textChannel = client.channels.cache.get(player.textId);
        if (textChannel) {
          const display = new TextDisplayBuilder()
            .setContent(`**Groove !**\n${client.emoji.blank}${client.emoji.wickarrow} **P__aused__** Waiting for listeners`);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(display);

          textChannel
            .send({
              components: [container],
              flags: MessageFlags.IsComponentsV2
            })
            .then((msg) =>
              setTimeout(() => msg.delete().catch(() => null), 5000)
            )
            .catch(() => null);
        }

        const destroyTimeout = setTimeout(async () => {
          const activePlayer = client.manager.players.get(guildId);
          const stillInVC = currentChannel.members.has(botId);
          const stillAlone =
            currentChannel.members.filter((m) => !m.user.bot).size === 0;

          if (activePlayer && stillInVC && stillAlone) {
            const twoFourSeven = client.db.twofourseven.get(guildId);

            if (twoFourSeven) {
              const textChannel = client.channels.cache.get(activePlayer.textId);
              if (textChannel) {
                const display = new TextDisplayBuilder()
                  .setContent(`**Groove !**\n${client.emoji.blank}${client.emoji.wickarrow} **P__aused__**`);
                const container = new ContainerBuilder()
                  .addTextDisplayComponents(display);

                textChannel
                  .send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                  })
                  .then((msg) =>
                    setTimeout(() => msg.delete().catch(() => null), 5000)
                  )
                  .catch(() => null);
              }
              return;
            }

            try {
              await activePlayer.destroy();
            } catch (destroyError) {
              if (client.manager.players.has(guildId)) {
                client.manager.players.delete(guildId);
              }
              if (client.manager.shoukaku) {
                await client.manager.shoukaku.leaveVoiceChannel(guildId).catch(() => null);
              }
            }


          }
        }, 1000 * 60);

        player.data.set('aloneTimeout', destroyTimeout);
      }
      else if (humanCount > 0 && player.paused && player.data.get('pausedByAlone')) {
        const aloneTimeout = player.data.get('aloneTimeout');
        if (aloneTimeout) {
          clearTimeout(aloneTimeout);
          player.data.delete('aloneTimeout');
        }

        const aloneStartTime = player.data.get('aloneStartTime');
        const aloneTime = aloneStartTime ? Math.floor((Date.now() - aloneStartTime) / 1000) : 0;

        player.pause(false);
        player.data.delete('pausedByAlone');
        player.data.delete('aloneStartTime');

        const currentTrack = player.queue?.current;
        if (currentTrack) {
          await client.rest
            .put(`/channels/${player.voiceId}/voice-status`, {
              body: { status: `${client.emoji.dance} Playing **${currentTrack.title}**` },
            })
            .catch(() => null);
        }

        const textChannel = client.channels.cache.get(player.textId);
        if (textChannel) {
          const display = new TextDisplayBuilder()
            .setContent(`**Groove !**\n${client.emoji.blank}${client.emoji.wickarrow} **R__esumed__** Welcome back`);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(display);

          textChannel
            .send({
              components: [container],
              flags: MessageFlags.IsComponentsV2
            })
            .then((msg) =>
              setTimeout(() => msg.delete().catch(() => null), 5000)
            )
            .catch(() => null);
        }
      }
    }
  },
};
