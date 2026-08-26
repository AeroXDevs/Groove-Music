const {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "voteskip",
  aliases: ["vs", "vskip"],
  category: "Music",
  cooldown: 5,
  description: "Start a vote to skip the current song.",
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

    if (!player.queue.current) {
      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "music.playFirst", { e: client.emoji.warn }));
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    }

    const voiceChannel = message.member.voice.channel;
    const listeners = voiceChannel.members.filter(m => !m.user.bot).size;

    if (listeners <= 2) {
      const currentTrack = player.queue.current;
      await player.skip();
      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "voteskip.skippedFew", { e: client.emoji.check, title: currentTrack.title, uri: currentTrack.uri }));
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    }

    const needed = Math.ceil(listeners / 2);
    const voters = new Set([message.author.id]);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("voteskip_yes")
        .setLabel(client.t(guildId, "voteskip.voteButton", { current: voters.size, needed }))
        .setEmoji(client.emoji.skip)
        .setStyle(ButtonStyle.Primary)
    );

    const display = new TextDisplayBuilder()
      .setContent(client.t(guildId, "voteskip.started", {
        e: client.emoji.info,
        user: message.author.toString(),
        title: player.queue.current.title,
        current: voters.size,
        needed
      }));

    const voteMsg = await message.reply({
      components: [new ContainerBuilder().addTextDisplayComponents(display).addActionRowComponents(row)],
      flags: MessageFlags.IsComponentsV2
    }).catch(() => null);

    if (!voteMsg) return;

    const collector = voteMsg.createMessageComponentCollector({
      filter: (i) => i.customId === "voteskip_yes",
      time: 30000
    });

    collector.on("collect", async (i) => {
      if (!i.member.voice.channel || i.member.voice.channel.id !== voiceChannel.id) {
        return i.reply({
          content: client.t(guildId, "voteskip.mustBeInVoice", { e: client.emoji.warn }),
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
      }

      voters.add(i.user.id);

      if (voters.size >= needed) {
        collector.stop("passed");
        const currentTrack = player.queue.current;
        if (currentTrack) await player.skip();

        const doneDisplay = new TextDisplayBuilder()
          .setContent(client.t(guildId, "voteskip.passed", {
            e: client.emoji.check,
            title: currentTrack?.title || "Unknown",
            current: voters.size,
            needed
          }));

        return voteMsg.edit({
          components: [new ContainerBuilder().addTextDisplayComponents(doneDisplay)],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
      }

      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("voteskip_yes")
          .setLabel(client.t(guildId, "voteskip.voteButton", { current: voters.size, needed }))
          .setEmoji(client.emoji.skip)
          .setStyle(ButtonStyle.Primary)
      );

      const updatedDisplay = new TextDisplayBuilder()
        .setContent(client.t(guildId, "voteskip.started", {
          e: client.emoji.info,
          user: message.author.toString(),
          title: player.queue.current?.title || "Unknown",
          current: voters.size,
          needed
        }));

      await i.update({
        components: [new ContainerBuilder().addTextDisplayComponents(updatedDisplay).addActionRowComponents(updatedRow)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    });

    collector.on("end", (_, reason) => {
      if (reason === "passed") return;

      const failDisplay = new TextDisplayBuilder()
        .setContent(client.t(guildId, "voteskip.failed", {
          e: client.emoji.cross,
          current: voters.size,
          needed
        }));

      voteMsg.edit({
        components: [new ContainerBuilder().addTextDisplayComponents(failDisplay)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    });
  },
};
