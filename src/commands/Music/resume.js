const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
  name: "resume",
  aliases: ["r"],
  category: "Music",
  cooldown: 3,
  description: "Resume currently playing music",
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  dj: true,
  owner: false,
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
    const song = player.queue.current;

    if (!song) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "music.playFirst", { e: client.emoji.cross }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (!player.shoukaku.paused) {
      const warnDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "music.alreadyResumed", { e: client.emoji.warn }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(warnDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    await player.pause(false);

    const { updateNowPlayingButtons } = require("../../events/Players/playerStart");
    await updateNowPlayingButtons(client, player, false);

    const successDisplay = new TextDisplayBuilder()
      .setContent(client.t(message.guild.id, "music.resumed", { e: client.emoji.check, title: song.title, uri: song.uri }));

    const container = new ContainerBuilder()
      .addTextDisplayComponents(successDisplay);

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};

