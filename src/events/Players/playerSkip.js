const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");
const { convertTime } = require("../../utils/convert.js");

module.exports = {
  name: "playerSkip",
  run: async (client, player) => {
    try {
      if (!player.queue.previous) {
        player.queue.previous = [];
      }

      if (player.queue.current) {
        player.queue.previous.push(player.queue.current);
      }

      const channel = client.channels.cache.get(player.textId);
      if (!channel) return;

      const messages = await channel.messages.fetch({ limit: 20 });
      const queueMsg = messages.find(m =>
        m.author.id === client.user.id &&
        m.components.length > 0 &&
        Date.now() - m.createdTimestamp < 60000
      );

      if (!queueMsg) return;

      const queue = player.queue.tracks;
      const current = player.queue.current;

      if (!current) {
        const nothingDisplay = new TextDisplayBuilder()
          .setContent(client.t(player.guildId, "music.nothingPlaying", { e: client.emoji.info }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(nothingDisplay);

        return queueMsg.edit({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => { });
      }

      const multiple = 10;
      const currDuration = convertTime(current.length || 0);

      const headerDisplay = new TextDisplayBuilder()
        .setContent(client.t(player.guildId, "player.nowPlayingTitle", { e: client.emoji.info }));

      const separator1 = new SeparatorBuilder();

      const currentDisplay = new TextDisplayBuilder()
        .setContent(`**\`0\` | \`${current.title}\` - \`[${currDuration}]\`**`);

      let queueText = '';
      if (queue.length > 0) {
        const separator2 = new SeparatorBuilder();
        queueText = queue.slice(0, multiple).map((track, i) =>
          `**\`${i + 1}\` | \`${track.title}\` - \`[${convertTime(track.length)}]\`**`
        ).join('\n');
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(headerDisplay)
        .addSeparatorComponents(separator1)
        .addTextDisplayComponents(currentDisplay);

      if (queueText) {
        const separator2 = new SeparatorBuilder();
        const queueDisplay = new TextDisplayBuilder()
          .setContent(queueText);

        container
          .addSeparatorComponents(separator2)
          .addTextDisplayComponents(queueDisplay);
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("previous")
          .setLabel(client.t(player.guildId, "buttons.previous"))
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("home")
          .setLabel(client.t(player.guildId, "buttons.home"))
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel(client.t(player.guildId, "buttons.next"))
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("close")
          .setLabel(client.t(player.guildId, "buttons.close"))
          .setStyle(ButtonStyle.Danger)
      );

      if (queue.length > 10) {
        const separator3 = new SeparatorBuilder();
        container.addSeparatorComponents(separator3).addActionRowComponents(row);
      }

      await queueMsg.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => { });

    } catch (error) {
      console.error("Error in playerSkip event:", error);
    }
  }
};
