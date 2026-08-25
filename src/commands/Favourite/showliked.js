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
  name: "showliked",
  category: "Favourite",
  description: "Show your favorite songs",
  args: false,
  usage: "",
  aliases: ["liked", "favorites", "favourites"],
  userPerms: [],
  owner: false,
  player: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
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
      const songs = client.db.liked.get(userId);
      if (!songs || !songs.length) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.info} You don't have any favorite songs yet!**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const songsPerPage = 10;
      const pages = Math.ceil(songs.length / songsPerPage);
      let currentPage = 0;

      const createContainer = (page) => {
        const start = page * songsPerPage;
        const end = start + songsPerPage;
        const currentSongs = songs.slice(start, end);

        const headerDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.check} Tracks you added to liked songs :**`);

        const separator = new SeparatorBuilder();

        const formatDuration = (ms) => {
          if (!ms || ms === 0 || ms === 'Unknown') return 'Unknown';
          if (typeof ms === 'string' && ms.includes(':')) return ms;

          const duration = parseInt(ms);
          if (isNaN(duration)) return 'Unknown';

          const seconds = Math.floor((duration / 1000) % 60);
          const minutes = Math.floor((duration / (1000 * 60)) % 60);
          const hours = Math.floor(duration / (1000 * 60 * 60));

          if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          return `${minutes}:${String(seconds).padStart(2, '0')}`;
        };

        const songsDisplay = new TextDisplayBuilder()
          .setContent(
            currentSongs.map((song, i) => {
              const duration = song.duration || song.length;
              return `** \`${start + i}\` | ${song.title} - \`${formatDuration(duration)}\`**`;
            }).join('\n')
          );

        return new ContainerBuilder()
          .addTextDisplayComponents(headerDisplay)
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(songsDisplay);
      };

      const components = [createContainer(currentPage)];
      if (pages > 1) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('home')
            .setLabel('Home')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('close')
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
        );
        components.push(row);
      }

      const msg = await message.reply({
        components,
        flags: MessageFlags.IsComponentsV2
      });

      if (pages > 1) {
        const collector = msg.createMessageComponentCollector({
          filter: (i) => i.user.id === message.author.id,
          time: 60000
        });

        collector.on('collect', async (interaction) => {
          if (interaction.customId === 'close') {
            collector.stop();
            return await interaction.message.delete().catch(() => { });
          } else if (interaction.customId === 'home') {
            currentPage = 0;
          } else if (interaction.customId === 'prev') {
            currentPage = (currentPage - 1 + pages) % pages;
          } else if (interaction.customId === 'next') {
            currentPage = (currentPage + 1) % pages;
          }

          const updatedComponents = [createContainer(currentPage)];
          if (pages > 1) {
            updatedComponents.push(components[1]);
          }

          await interaction.update({
            components: updatedComponents,
            flags: MessageFlags.IsComponentsV2
          });
        });

        collector.on('end', () => {
          msg.edit({ components: [createContainer(currentPage)] }).catch(() => { });
        });
      }

    } catch (err) {
      console.error(err);

      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} An error occurred while fetching your favorites.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
