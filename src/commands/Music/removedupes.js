const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "removedupes",
  category: "Music",
  aliases: ["rd", "dedupe"],
  cooldown: 3,
  description: "Remove duplicate tracks from the queue.",
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  dj: true,
  slashOptions: [],

  async slashExecute(interaction, client) {
    const interactionWrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      createdTimestamp: interaction.createdTimestamp,
      reply: async (options) => {
        if (interaction.deferred) return await interaction.editReply(options);
        else if (interaction.replied) return await interaction.followUp(options);
        else return await interaction.reply(options);
      },
    };
    return this.execute(interactionWrapper, [], client, client.prefix);
  },

  async execute(message, args, client, prefix) {
    const guildId = message.guild.id;
    const player = client.manager.players.get(guildId);

    if (!player.queue.length) {
      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "music.queueEmpty", { e: client.emoji.warn }));
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    }

    const seen = new Set();
    const toRemove = [];

    for (let i = 0; i < player.queue.length; i++) {
      const track = player.queue[i];
      const key = track.uri || track.identifier || track.title;
      if (seen.has(key)) {
        toRemove.push(i);
      } else {
        seen.add(key);
      }
    }

    if (!toRemove.length) {
      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "removedupes.none", { e: client.emoji.info }));
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      player.queue.splice(toRemove[i], 1);
    }

    const display = new TextDisplayBuilder()
      .setContent(client.t(guildId, "removedupes.done", {
        e: client.emoji.check,
        count: toRemove.length,
        remaining: player.queue.length
      }));

    return message.reply({
      components: [new ContainerBuilder().addTextDisplayComponents(display)],
      flags: MessageFlags.IsComponentsV2
    }).catch(() => {});
  },
};
