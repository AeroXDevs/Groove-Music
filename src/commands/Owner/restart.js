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
  name: "restart",
  category: "Owner",
  aliases: ["reboot"],
  description: "Restart the bot",
  args: false,
  usage: "",
  owner: true,

  slashOptions: [],
  async slashExecute(interaction, client) {
    if (!client.owners.includes(interaction.user.id)) return;

    const playingGuildsCount = [...client.manager.players.values()].filter(p => p.playing).length;
    const confirmMessage = playingGuildsCount === 0
      ? `**${client.emoji.warn} The bot is not playing anywhere.**\n**${client.emoji.info} Are you sure you want to restart?**`
      : `**${client.emoji.warn} The bot is currently active in \`${playingGuildsCount}\` servers.**\n**${client.emoji.info} Are you sure you want to restart?**`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("restart")
        .setEmoji(client.emoji.check)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("cancel")
        .setEmoji(client.emoji.cross)
        .setStyle(ButtonStyle.Secondary),
    );

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(confirmMessage))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      withResponse: true
    });

    const msg = await interaction.fetchReply();

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 30000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "restart") {
        await i.update({
          components: [
            new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${client.emoji.load} Initializing Reboot Sequence...**`))
          ],
        });

        client.db.reboot.set(Date.now().toString(), {
          messageId: msg.id,
          channelId: interaction.channel.id,
          guildId: interaction.guild.id
        });

        await client.cluster.respawnAll();
      } else {
        await i.update({
          components: [
            new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${client.emoji.cross} Restart operation cancelled.**`))
          ]
        });
        collector.stop();
      }
    });
  },

  async execute(message, args, client) {
    if (!client.owners.includes(message.author.id)) return;

    const playingGuildsCount = [...client.manager.players.values()].filter(p => p.playing).length;
    const confirmMessage = playingGuildsCount === 0
      ? `**${client.emoji.warn} The bot is not playing anywhere.**\n**${client.emoji.info} Are you sure you want to restart?**`
      : `**${client.emoji.warn} The bot is currently active in \`${playingGuildsCount}\` servers.**\n**${client.emoji.info} Are you sure you want to restart?**`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("restart")
        .setEmoji(client.emoji.check)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("cancel")
        .setEmoji(client.emoji.cross)
        .setStyle(ButtonStyle.Secondary),
    );

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(confirmMessage))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    const msg = await message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    }).catch(() => null);

    if (!msg) return;

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 30000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "restart") {
        await i.update({
          components: [
            new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${client.emoji.load} Initializing Reboot Sequence...**`))
          ],
        });


        client.db.reboot.set(Date.now().toString(), {
          messageId: msg.id,
          channelId: message.channel.id,
          guildId: message.guild.id
        });

        await client.cluster.respawnAll();
      } else {
        await i.update({
          components: [
            new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${client.emoji.cross} Restart operation cancelled.**`))
          ]
        });
        collector.stop();
      }
    });
  },
};

