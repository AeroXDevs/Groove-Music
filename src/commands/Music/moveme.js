const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "moveme",
  category: "Music",
  aliases: ["mm"],
  cooldown: 5,
  description: "Move yourself to the bot's voice channel.",
  inVoiceChannel: true,
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
    const botChannel = message.guild.members.me?.voice?.channel;

    if (!botChannel) {
      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "moveme.botNotInVoice", { e: client.emoji.warn }));
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    }

    const memberChannel = message.member.voice.channel;

    if (memberChannel.id === botChannel.id) {
      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "moveme.alreadyHere", { e: client.emoji.info, channel: botChannel.id }));
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    }

    if (botChannel.userLimit > 0 && botChannel.members.size >= botChannel.userLimit) {
      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "moveme.channelFull", { e: client.emoji.cross, channel: botChannel.id }));
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    }

    try {
      await message.member.voice.setChannel(botChannel);
      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "moveme.moved", { e: client.emoji.check, channel: botChannel.id }));
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    } catch {
      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "moveme.noPermission", { e: client.emoji.cross }));
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    }
  },
};
