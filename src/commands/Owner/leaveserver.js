const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
  name: "leaveserver",
  category: "Owner",
  aliases: ["lv"],
  description: "Leave server",
  args: false,
  usage: "<guild id>",
  permission: [],
  owner: true,

  slashOptions: [
    {
      name: "guild_id",
      description: "The ID of the guild to leave",
      type: 3,
      required: true
    }
  ],
  async slashExecute(interaction, client) {
    if (!client.owners.includes(interaction.user.id)) {
      return;
    }

    const guildId = interaction.options.getString("guild_id");
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} Could not find the Guild to Leave.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    guild
      .leave()
      .then((g) => {
        const successDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.check} Left \`${g.name}\` [\`${g.id}\`]**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay);

        interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      })
      .catch((e) => {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.cross} Error:**\n\`\`\`js\n${e.message ? e.message : e}\n\`\`\``);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      });
  },
  async execute(message, args, client, prefix) {
    if (!args[0]) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} Please provide a guild ID.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const guild = client.guilds.cache.get(args[0]);

    if (!guild) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} Could not find the Guild to Leave.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    guild
      .leave()
      .then((g) => {
        const successDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.check} Left \`${g.name}\` [\`${g.id}\`]**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay);

        message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      })
      .catch((e) => {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.cross} Error:**\n\`\`\`js\n${e.message ? e.message : e}\n\`\`\``);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      });
  },
};
