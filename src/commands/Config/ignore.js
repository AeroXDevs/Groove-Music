const {
  PermissionsBitField,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "ignore",
  aliases: ["ig"],
  category: "Config",
  description: "Ignorechannel",
  usage: "",
  userPerms: [],
  args: false,
  cooldown: 3,
  slashOptions: [
    {
      name: "action",
      description: "Action to perform (add/remove/list/reset)",
      type: 3,
      required: true,
      choices: [
        { name: "add", value: "add" },
        { name: "remove", value: "remove" },
        { name: "list", value: "list" },
        { name: "reset", value: "reset" }
      ]
    },
    {
      name: "channel",
      description: "Channel to add or remove from ignore list",
      type: 7,
      required: false
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
    if (
      !message.member.permissions.has(
        PermissionsBitField.resolve("ManageChannels"),
      )
    ) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`-# **${client.emoji.warn} You must have \`Manage Channels\` permissions to use this command.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (!args[0]) {
      const usageDisplay = new TextDisplayBuilder()
        .setContent(` \`\`\`[] = Optional Argument\n<> = Required Argument\nDo NOT type these when using commands!\`\`\``);

      const separator1 = new SeparatorBuilder();

      const aliasesDisplay = new TextDisplayBuilder()
        .setContent(`**Aliases:** \`\`[ignore]\`\``);

      const usageInfoDisplay = new TextDisplayBuilder()
        .setContent(`**Usage:** \`\`add/remove/list/reset\`\``);

      const separator2 = new SeparatorBuilder();

      const footerDisplay = new TextDisplayBuilder()
        .setContent(`Requested By ${message.author.displayName}`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(usageDisplay)
        .addSeparatorComponents(separator1)
        .addTextDisplayComponents(aliasesDisplay)
        .addTextDisplayComponents(usageInfoDisplay)
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(footerDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const option = args[0].toLowerCase();
    if (option === "add") {
      const channel =
        message.mentions.channels.first() ||
        message.guild.channels.cache.get(args[1]);
      if (!channel) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} Please provide a valid channel.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
      const data = client.db.ignorechannels.get(message.guild.id, channel.id);
      if (data) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.info} This channel is already in the ignore channel list.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      client.db.ignorechannels.add(message.guild.id, channel.id);

      const successDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.check} Successfully added ${channel} to the ignore channel list.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } else if (option === "remove") {
      const channel =
        message.mentions.channels.first() ||
        message.guild.channels.cache.get(args[1]);
      if (!channel) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} Please provide a valid channel.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const data = client.db.ignorechannels.get(message.guild.id, channel.id);

      if (!data) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.info} This channel is not in the ignore channel list.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } else {
        client.db.ignorechannels.remove(message.guild.id, channel.id);
        const successDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.check} Successfully removed ${channel} from the ignore channel list.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay);

        return message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
    } else if (option === "list") {
      const data = client.db.ignorechannels.getForGuild(message.guild.id);
      if (data.length === 0) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.info} There are no channels in the ignore channel list.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
      const channels = data
        .map((d, i) => `\`${i + 1}.\` <#${d.channelId}>`)
        .join("\n");

      const listDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.check} Ignore channel list :**\n\n** ${channels}**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(listDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } else if (option === "reset") {
      const data = client.db.ignorechannels.getForGuild(message.guild.id);
      if (data.length === 0) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.info} There are no channels in the ignore channel list.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      client.db.ignorechannels.deleteForGuild(message.guild.id);

      const successDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.check} Successfully cleared the ignore channel list.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
