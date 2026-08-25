const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "support",
  aliases: [],
  category: "Information",
  description: "Get the support server invite link",
  args: false,
  usage: "",
  userPerms: [],
  botPerms: ["EmbedLinks"],
  owner: false,
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
    try {
      const supportURL = client.config.links?.support;

      if (!supportURL) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.cross} Support server link is not configured.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const supportRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(client.t(message.guild.id, "info.supportServer"))
          .setStyle(ButtonStyle.Link)
          .setURL(supportURL.trim()),
      );

      const separator = new SeparatorBuilder();

      const supportDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.info} Join our support server for help, updates, and community!**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(supportDisplay)
        .addSeparatorComponents(separator)
        .addActionRowComponents(supportRow);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} Error: ${error.message}**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
