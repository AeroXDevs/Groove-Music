const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");
const emoji = require("../../emojis");
const { safeDestroyPlayer } = require("../../utils/playerUtils");

module.exports = {
  name: "leave",
  aliases: ["dc", "disconnect"],
  category: "Music",
  cooldown: 3,
  description: "Leave voice channel",
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  owner: false,
  player: false,
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

    if (!player) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "music.notInVoiceChannel", { e: client.emoji.cross }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const twoFourSeven = client.db.twofourseven.get(message.guild.id);

    client.rest
      .put(`/channels/${player.voiceId}/voice-status`, { body: { status: `` } })
      .catch(() => null);

    await safeDestroyPlayer(player);

    if (twoFourSeven) {
      const successDisplay = new TextDisplayBuilder()
        .setContent(
          client.t(message.guild.id, "music.left247", { e: client.emoji.check, i: client.emoji.info })
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() =>
        message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        })
      );
    }

    const successDisplay = new TextDisplayBuilder()
      .setContent(client.t(message.guild.id, "music.left", { e: client.emoji.check }));

    const container = new ContainerBuilder()
      .addTextDisplayComponents(successDisplay);

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    }).catch(() =>
      message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      })
    );
  },
};

