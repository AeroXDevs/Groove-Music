const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "autoplay",
  aliases: ["ap", "auto"],
  category: "Music",
  cooldown: 3,
  description: "Toggle autoplay mode",
  botPrams: ["EmbedLinks"],
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  slashOptions: [],

  async slashExecute(interaction, client) {
    const interactionWrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      createdTimestamp: interaction.createdTimestamp,
      reply: async (options) => {
        if (interaction.deferred) {
          return await interaction.editReply(options);
        } else if (interaction.replied) {
          return await interaction.followUp(options);
        } else {
          return await interaction.reply(options);
        }
      },
    };

    const args = [];
    if (interaction.options) {
      const options = interaction.options.data;
      for (const option of options) {
        if (option.value !== undefined) {
          args.push(option.value.toString());
        }
      }
    }

    const prefix = client.prefix;
    return this.execute(interactionWrapper, args, client, prefix);
  },

  async execute(message, args, client, prefix) {
    const player = client.manager.players.get(message.guild.id);

    const currentStatus = player.data.get("autoplay") || false;
    const newStatus = !currentStatus;
    player.data.set("autoplay", newStatus);

    const statusDisplay = new TextDisplayBuilder()
      .setContent(
        client.t(message.guild.id, "music.autoplayToggled", { e: client.emoji.check, state: client.t(message.guild.id, newStatus ? "music.enabled" : "music.disabled") })
      );

    const container = new ContainerBuilder()
      .addTextDisplayComponents(statusDisplay);

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
