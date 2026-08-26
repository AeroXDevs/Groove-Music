const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

function buildRequestEmbed(client, guildId) {
  const display = new TextDisplayBuilder()
    .setContent(client.t(guildId, "musicsystem.embed.title", { e: client.emoji.play }) +
      "\n" + client.t(guildId, "musicsystem.embed.body", { e: client.emoji.info }));

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ms_pause_resume")
      .setEmoji(client.emoji.pause)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ms_skip")
      .setEmoji(client.emoji.skip)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ms_stop")
      .setEmoji(client.emoji.stop)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("ms_shuffle")
      .setEmoji(client.emoji.shuffle)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ms_loop")
      .setEmoji(client.emoji.loop)
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ms_voldown")
      .setEmoji(client.emoji.voldown)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ms_volup")
      .setEmoji(client.emoji.volup)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ms_like")
      .setEmoji(client.emoji.like)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ms_previous")
      .setEmoji(client.emoji.previous)
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    components: [
      new ContainerBuilder()
        .addTextDisplayComponents(display)
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(row1)
        .addActionRowComponents(row2)
    ],
    flags: MessageFlags.IsComponentsV2
  };
}

module.exports = {
  name: "musicsystem",
  aliases: ["setup", "musicchannel", "reqchannel"],
  category: "Config",
  cooldown: 10,
  description: "Set up a dedicated music request channel.",
  userPerms: ["ManageGuild"],
  botPerms: ["ManageChannels", "SendMessages"],
  slashOptions: [
    {
      name: "action",
      description: "Enable or disable the music request channel",
      type: 3,
      required: true,
      choices: [
        { name: "Enable", value: "enable" },
        { name: "Disable", value: "disable" },
        { name: "Status", value: "status" }
      ]
    },
    {
      name: "channel",
      description: "Channel to use (creates one if not specified)",
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
      mentions: { channels: new Map() },
      reply: async (options) => {
        if (interaction.deferred) return await interaction.editReply(options);
        else if (interaction.replied) return await interaction.followUp(options);
        else return await interaction.reply(options);
      },
    };

    const action = interaction.options.getString("action");
    const channel = interaction.options.getChannel("channel");
    const args = [action];
    if (channel) {
      args.push(channel.id);
      interactionWrapper.mentions.channels.set(channel.id, channel);
    }
    return this.execute(interactionWrapper, args, client, client.prefix);
  },

  async execute(message, args, client, prefix) {
    const guildId = message.guild.id;
    const action = args[0]?.toLowerCase();

    const reply = (content) => {
      const display = new TextDisplayBuilder().setContent(content);
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    };

    if (!action || !["enable", "disable", "status"].includes(action)) {
      return reply(client.t(guildId, "musicsystem.usage", { e: client.emoji.info, prefix }));
    }

    const existing = client.db.setup.get(guildId);

    if (action === "status") {
      if (!existing || !existing.channelId) {
        return reply(client.t(guildId, "musicsystem.notSetup", { e: client.emoji.info, prefix }));
      }
      return reply(client.t(guildId, "musicsystem.currentStatus", { e: client.emoji.info, channel: existing.channelId }));
    }

    if (action === "disable") {
      if (!existing || !existing.channelId) {
        return reply(client.t(guildId, "musicsystem.notSetup", { e: client.emoji.info, prefix }));
      }
      client.db.setup.delete(guildId);
      return reply(client.t(guildId, "musicsystem.disabled", { e: client.emoji.check }));
    }

    let targetChannel;
    const channelArg = args[1];

    if (channelArg) {
      const channelId = channelArg.replace(/[<#>]/g, "");
      targetChannel = message.guild.channels.cache.get(channelId);
      if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        return reply(client.t(guildId, "musicsystem.invalidChannel", { e: client.emoji.cross }));
      }
    } else {
      try {
        targetChannel = await message.guild.channels.create({
          name: client.t(guildId, "musicsystem.channelName"),
          type: ChannelType.GuildText,
          topic: client.t(guildId, "musicsystem.channelTopic", { bot: client.user.username }),
          permissionOverwrites: [
            {
              id: message.guild.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
              deny: [PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads]
            },
            {
              id: client.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.EmbedLinks]
            }
          ]
        });
      } catch (err) {
        return reply(client.t(guildId, "musicsystem.createFailed", { e: client.emoji.cross, message: err.message }));
      }
    }

    const embedData = buildRequestEmbed(client, guildId);
    let setupMsg;
    try {
      setupMsg = await targetChannel.send(embedData);
    } catch (err) {
      return reply(client.t(guildId, "musicsystem.sendFailed", { e: client.emoji.cross, message: err.message }));
    }

    client.db.setup.set(guildId, {
      channelId: targetChannel.id,
      messageId: setupMsg.id
    });

    return reply(client.t(guildId, "musicsystem.enabled", { e: client.emoji.check, channel: targetChannel.id }));
  },

  buildRequestEmbed,
};
