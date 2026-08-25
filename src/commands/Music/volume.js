const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");
const Wait = require("util").promisify(setTimeout);

module.exports = {
  name: "volume",
  aliases: ["v", "vol"],
  category: "Music",
  cooldown: 3,
  description: "Change volume of currently playing music",
  args: false,
  usage: "[volume 0-100]",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  dj: true,
  owner: false,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  slashOptions: [
    {
      name: "amount",
      description: "Volume amount (0-100)",
      type: 4,
      required: false
    }
  ],

  async slashExecute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);
    if (!player.queue.current) {
      const errorDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.playFirst", { e: client.emoji.warn }));
      const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    let volume = interaction.options.getInteger("amount");
    if (volume === null) {
      const volumeDisplay = new TextDisplayBuilder()
        .setContent(
          client.t(interaction.guildId, "music.volume.header") +
          client.t(interaction.guildId, "music.volume.current", { blank: client.emoji.blank, arrow: client.emoji.wickarrow, value: player.volume })
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(volumeDisplay);

      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (volume < 0 || volume > 100) {
      const errorDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.volume.range", { e: client.emoji.cross }));
      const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    await player.setVolume(volume);

    const successDisplay = new TextDisplayBuilder()
      .setContent(
        client.t(interaction.guildId, "music.volume.header") +
        client.t(interaction.guildId, "music.volume.updated", { blank: client.emoji.blank, arrow: client.emoji.wickarrow, value: volume })
      );

    const container = new ContainerBuilder()
      .addTextDisplayComponents(successDisplay);

    return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client, prefix) {
    const player = client.manager.players.get(message.guild.id);

    if (!player.queue.current) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "music.playFirst", { e: client.emoji.warn }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (args.length) {
      const volume = Number(args[0]);

      if (isNaN(volume) || volume < 0 || volume > 100) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(
client.t(message.guild.id, "music.volume.usage", { e: client.emoji.cross, arrow: client.emoji.wickarrow, prefix, value: player.volume })
          );

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      await player.setVolume(volume);
      await Wait(500);

      const successDisplay = new TextDisplayBuilder()
        .setContent(
          client.t(message.guild.id, "music.volume.header") +
          client.t(message.guild.id, "music.volume.updated2", { blank: client.emoji.blank, arrow: client.emoji.wickarrow, value: volume })
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const createVolumeContainer = (currentVol) => {
      const volumeDisplay = new TextDisplayBuilder()
        .setContent(
          client.t(message.guild.id, "music.volume.header") +
          client.t(message.guild.id, "music.volume.currentPlain", { blank: client.emoji.blank, arrow: client.emoji.wickarrow, value: currentVol })
        );

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("vol_minus")
          .setEmoji(client.emoji.voldown)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentVol <= 0),
        new ButtonBuilder()
          .setCustomId("vol_plus")
          .setEmoji(client.emoji.volup)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentVol >= 100)
      );

      return new ContainerBuilder()
        .addTextDisplayComponents(volumeDisplay)
        .addActionRowComponents(buttons);
    };

    const volumeMsg = await message.reply({
      components: [createVolumeContainer(player.volume)],
      flags: MessageFlags.IsComponentsV2
    });

    const collector = volumeMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 120000,
    });

    collector.on("collect", async (interaction) => {
      try {
        const currentPlayer = client.manager.players.get(message.guild.id);
        if (!currentPlayer) {
          const errorDisplay = new TextDisplayBuilder()
            .setContent(client.t(message.guild.id, "music.volume.noPlayer", { e: client.emoji.cross }));

          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          await interaction.update({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
          });
          return collector.stop();
        }

        let newVolume = currentPlayer.volume;

        switch (interaction.customId) {
          case "vol_plus":
            newVolume = Math.min(100, currentPlayer.volume + 10);
            break;
          case "vol_minus":
            newVolume = Math.max(0, currentPlayer.volume - 10);
            break;
        }

        await currentPlayer.setVolume(newVolume);
        await Wait(300);

        await interaction.update({
          components: [createVolumeContainer(newVolume)],
          flags: MessageFlags.IsComponentsV2
        });

      } catch (error) {
        console.error("Volume control error:", error);

        const errorDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "music.volume.error", { e: client.emoji.cross }));

        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        await interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        }).catch(() => { });
      }
    });

    collector.on("end", async () => {
      try {
        const finalPlayer = client.manager.players.get(message.guild.id);
        const finalVolume = finalPlayer ? finalPlayer.volume : 0;

        const volumeDisplay = new TextDisplayBuilder()
          .setContent(
            client.t(message.guild.id, "music.volume.header") +
            client.t(message.guild.id, "music.volume.current", { blank: client.emoji.blank, arrow: client.emoji.wickarrow, value: finalVolume })
          );

        const finalContainer = new ContainerBuilder()
          .addTextDisplayComponents(volumeDisplay);

        await volumeMsg.edit({
          components: [finalContainer],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => { });
      } catch (error) {
        console.error("Volume collector end error:", error);
      }
    });
  },
};
