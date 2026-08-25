const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");
const Wait = require("util").promisify(setTimeout);
const emoji = require("../../emojis");

module.exports = {
  name: "stop",
  category: "Music",
  cooldown: 3,
  description: "Stops the music",
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

    if (!player.queue.current) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "music.playFirst", { e: client.emoji.cross }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    player.queue.clear();
    player.loop = "none";

    const { safeDestroyPlayer } = require("../../utils/playerUtils");
    await safeDestroyPlayer(player);
    await Wait(500);

    const successDisplay = new TextDisplayBuilder()
      .setContent(client.t(message.guild.id, "music.stopped", { e: client.emoji.check }));

    const container = new ContainerBuilder()
      .addTextDisplayComponents(successDisplay);

    message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};

