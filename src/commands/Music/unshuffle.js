const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "unshuffle",
  category: "Music",
  aliases: ["unsh"],
  cooldown: 3,
  description: "Restore the queue order from before the last shuffle.",
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

    const before = player.data?.get("beforeShuffle");

    if (!before || !before.length) {
      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "unshuffle.noShuffle", { e: client.emoji.warn }));
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    }

    player.queue.clear();
    for (const track of before) {
      player.queue.add(track);
    }
    player.data.set("beforeShuffle", null);

    const display = new TextDisplayBuilder()
      .setContent(client.t(guildId, "unshuffle.done", {
        e: client.emoji.check,
        count: before.length
      }));

    return message.reply({
      components: [new ContainerBuilder().addTextDisplayComponents(display)],
      flags: MessageFlags.IsComponentsV2
    }).catch(() => {});
  },
};
