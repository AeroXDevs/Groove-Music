const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "like",
  category: "Favourite",
  description: "Add current song to your favorites",
  args: false,
  usage: "",
  aliases: ["fav", "favourite", "favorite"],
  userPerms: [],
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
        .setContent(`**${client.emoji.cross} Nothing is playing right now.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const song = player.queue.current;
    const userId = message.author.id;

    try {
      let songs = client.db.liked.get(userId);

      const songExists = songs.find(s => s.url === song.uri);
      if (songExists) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.info} This song is already in your favorites!**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      songs.push({
        title: song.title,
        url: song.uri,
        duration: song.length || song.duration,
        thumbnail: song.thumbnail,
        author: song.author
      });

      client.db.liked.set(userId, songs);

      const successDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.check} Added [${song.title}](${song.uri}) to your favorites!** `);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });

    } catch (err) {
      console.error(err);

      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} An error occurred while saving to favorites.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
