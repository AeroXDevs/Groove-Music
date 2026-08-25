const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "setprefix",
  category: "Config",
  description: "Sets a custom prefix.",
  args: false,
  usage: "",
  aliases: ["prefix"],
  botPrams: ["EMBED_LINKS"],
  userPerms: ["ManageGuild"],
  owner: false,
  cooldown: 3,
  slashOptions: [
    {
      name: "setprefix",
      description: "Set new prefix [max 3 characters]",
      type: 3,
      required: true
    }
  ],
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
    const newPrefix = args.join(" ");

    if (!newPrefix) {
      const infoDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.info} Provide a new prefix.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(infoDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (newPrefix.length > 3) {
      const warnDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} Prefix can't exceed 3 characters.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(warnDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      client.db.prefixes.set(message.guild.id, { prefix: newPrefix });
    } catch (err) {
      console.error(err);

      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} An error occurred while updating the prefix:**\n\`\`\`\n${err.message}\`\`\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const successDisplay = new TextDisplayBuilder()
      .setContent(`**${client.emoji.check} Prefix updated to \`${newPrefix}\`**`);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(successDisplay);

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
