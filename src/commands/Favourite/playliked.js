const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "playliked",
  category: "Favourite",
  description: "Play your favorite songs",
  args: false,
  usage: "",
  aliases: ["pfav", "playfav", "playfavorites"],
  userPerms: [],
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
    const userId = message.author.id;

    try {
      if (!message.member.voice.channel) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.cross} You must be in a voice channel!**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const songs = client.db.liked.get(userId);
      if (!songs || !songs.length) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.info} You don't have any favorite songs to play!**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const { waitForNodeConnection, hasAvailableNodes } = require("../../utils/nodeUtils");

      if (!hasAvailableNodes(client.manager)) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.cross} The music server is currently unavailable. Please try again later.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }


      let player = client.manager.players.get(message.guild.id);

      if (!player) {
        try {
          player = await client.manager.createPlayer({
            guildId: message.guild.id,
            voiceId: message.member.voice.channel.id,
            textId: message.channel.id,
            volume: 80,
            deaf: true,
          });
        } catch (createError) {
          console.error('Failed to create player:', createError);

          const errorDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.cross} Failed to connect to the music server. Please try again later.**`);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }
      } else {
        if (player.voiceId !== message.member.voice.channel.id) {
          const errorDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.cross} You must be in the same voice channel as the bot!**`);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }

        if (player.textId !== message.channel.id) {
          player.textId = message.channel.id;
        }
      }

      const loadingDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.load} Loading ${songs.length} songs from your favorites...**`);

      const loadingContainer = new ContainerBuilder()
        .addTextDisplayComponents(loadingDisplay);

      const loadingMsg = await message.reply({
        components: [loadingContainer],
        flags: MessageFlags.IsComponentsV2
      });

      let loadedCount = 0;
      let errorCount = 0;
      const wasEmpty = player.queue.size === 0;

      const batchSize = 5;
      for (let i = 0; i < songs.length; i += batchSize) {
        const batch = songs.slice(i, i + batchSize);

        const batchPromises = batch.map(async (song) => {
          try {
            const result = await player.search(song.url || song.title, { requester: message.author });
            if (result.tracks && result.tracks.length > 0) {
              const track = result.tracks[0];
              player.queue.add(track);
              return { success: true };
            } else {
              return { success: false };
            }
          } catch (error) {
            console.error(`Error loading song ${song.url}:`, error);
            return { success: false };
          }
        });

        const batchResults = await Promise.all(batchPromises);

        batchResults.forEach(result => {
          if (result.success) {
            loadedCount++;
          } else {
            errorCount++;
          }
        });

        if (i + batchSize < songs.length) {
          const progressDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.load} Loaded \`${Math.min(i + batchSize, songs.length)}\` songs out of \`${songs.length}\`.**`);

          const progressContainer = new ContainerBuilder()
            .addTextDisplayComponents(progressDisplay);

          await loadingMsg.edit({
            components: [progressContainer],
            flags: MessageFlags.IsComponentsV2
          });
        }
      }

      if (wasEmpty && loadedCount > 0 && !player.playing && !player.paused) {
        await player.play();
      }

      let resultText = `**${client.emoji.info} Loaded ${loadedCount} songs from your favorites!**\n`;
      if (errorCount > 0) {
        resultText += `**${client.emoji.warn} Failed to load ${errorCount} songs**\n`;
      }
      if (player.playing && player.queue.length > loadedCount) {
        resultText += `**${client.emoji.info} Added to queue - will play after current tracks**`;
      } else {
        resultText += `**${client.emoji.check} Now playing your favorites!**`;
      }

      const resultDisplay = new TextDisplayBuilder()
        .setContent(resultText);

      const resultContainer = new ContainerBuilder()
        .addTextDisplayComponents(resultDisplay);

      await loadingMsg.edit({
        components: [resultContainer],
        flags: MessageFlags.IsComponentsV2
      });

    } catch (err) {
      console.error(err);

      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} An error occurred while playing your favorites.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
