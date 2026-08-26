const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");
const { convertTime } = require("../../utils/convert.js");
const emoji = require("../../emojis");

module.exports = {
  name: "remove",
  aliases: ["rm"],
  category: "Music",
  cooldown: 3,
  description: "Remove tracks from the queue",
  args: false,
  usage: "[track number]",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
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

    if (args[0]) {
      const position = Number(args[0]);

      if (isNaN(position) || position < 0 || position >= player.queue.length) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(
client.t(message.guild.id, "music.remove.invalidPos", { e: client.emoji.info, value: args[0], total: player.queue.length })
          );

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const song = player.queue[position];
      await player.queue.splice(position, 1);

      const successDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "music.remove.removed", { e: client.emoji.check, title: song.title, uri: song.uri }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const queue = player.queue;

    if (queue.length === 0) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "music.queueEmpty", { e: client.emoji.info }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const songsPerPage = 10;
    let totalPages = Math.ceil(queue.length / songsPerPage);
    let currentPage = 0;

    const generateContainer = (page, currentQueue) => {
      const start = page * songsPerPage;
      const end = Math.min(start + songsPerPage, currentQueue.length);
      const pageTracks = currentQueue.slice(start, end);

      const headerDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "music.remove.title", { e: client.emoji.info }));

      const separator1 = new SeparatorBuilder();

      const infoDisplay = new TextDisplayBuilder()
        .setContent(
          `**Queue:** \`${currentQueue.length} tracks\`\n` +
          `**Page:** \`${page + 1} of ${Math.ceil(currentQueue.length / songsPerPage)}\``
        );

      const separator2 = new SeparatorBuilder();

      const tracksText = pageTracks.map((track, i) => {
        const position = start + i;
        return `**\`${position}\` | ${track.title} - \`${convertTime(track.length)}\`**`;
      }).join('\n');

      const tracksDisplay = new TextDisplayBuilder()
        .setContent(tracksText);

      return new ContainerBuilder()
        .addTextDisplayComponents(headerDisplay)
        .addSeparatorComponents(separator1)
        .addTextDisplayComponents(infoDisplay)
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(tracksDisplay);
    };

    const generateSelectMenu = (page, currentQueue) => {
      const start = page * songsPerPage;
      const end = Math.min(start + songsPerPage, currentQueue.length);
      const pageTracks = currentQueue.slice(start, end);

      const options = pageTracks.map((track, i) => {
        const position = start + i;
        return {
          label: `${position}. ${track.title.substring(0, 90)}`,
          description: client.t(message.guild.id, "music.remove.duration", { value: convertTime(track.length) }),
          value: `remove_${position}`
        };
      });

      return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select_track')
          .setPlaceholder(client.t(message.guild.id, "music.remove.placeholder"))
          .setMinValues(1)
          .setMaxValues(Math.min(options.length, 10))
          .addOptions(options)
      );
    };

    const generateButtons = (page, currentQueue) => {
      const currentTotalPages = Math.ceil(currentQueue.length / songsPerPage);
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('clear_queue')
          .setLabel(client.t(message.guild.id, "buttons.clearQueue"))
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('previous')
          .setLabel(client.t(message.guild.id, "buttons.previous"))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentTotalPages <= 1),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel(client.t(message.guild.id, "buttons.next"))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentTotalPages <= 1),
        new ButtonBuilder()
          .setCustomId('close_session')
          .setLabel(client.t(message.guild.id, "buttons.close"))
          .setStyle(ButtonStyle.Secondary)
      );
    };

    const components = [
      generateContainer(currentPage, player.queue),
      generateSelectMenu(currentPage, player.queue),
      generateButtons(currentPage, player.queue)
    ];

    const msg = await message.reply({
      components,
      flags: MessageFlags.IsComponentsV2
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => {
        if (i.user.id === message.author.id) return true;

        const errorDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "music.remove.onlyUser", { e: client.emoji.cross, user: message.author.tag }));

        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        i.reply({
          components: [errorContainer],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return false;
      },
      idle: 60000
    });

    collector.on('collect', async (interaction) => {
      if (player.queue.length === 0 && interaction.customId !== 'clear_queue') {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "music.remove.nowEmpty", { e: client.emoji.info }));
        const errorContainer = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
        await interaction.reply({ components: [errorContainer], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        collector.stop();
        return;
      }

      if (interaction.customId === 'select_track') {
        await interaction.deferUpdate();

        const selectedValues = interaction.values;
        const positions = selectedValues.map(v => parseInt(v.split('_')[1])).sort((a, b) => b - a);

        const removedTracks = [];
        for (const pos of positions) {
          const track = player.queue[pos];
          if (track) {
            removedTracks.push(track.title);
            player.queue.splice(pos, 1);
          }
        }

        const newTotalPages = Math.ceil(player.queue.length / songsPerPage);
        if (currentPage >= newTotalPages && newTotalPages > 0) {
          currentPage = newTotalPages - 1;
        }

        if (player.queue.length === 0) {
          const emptyDisplay = new TextDisplayBuilder()
            .setContent(client.t(message.guild.id, "music.remove.doneEmpty", { e: client.emoji.check, count: removedTracks.length }));
          const emptyContainer = new ContainerBuilder().addTextDisplayComponents(emptyDisplay);
          await msg.edit({ components: [emptyContainer], flags: MessageFlags.IsComponentsV2 });
          collector.stop();
        } else {
          const successDisplay = new TextDisplayBuilder()
            .setContent(client.t(message.guild.id, "music.remove.done", { e: client.emoji.check, count: removedTracks.length }));
          const successContainer = new ContainerBuilder().addTextDisplayComponents(successDisplay);

          await msg.edit({
            components: [
              successContainer,
              generateContainer(currentPage, player.queue),
              generateSelectMenu(currentPage, player.queue),
              generateButtons(currentPage, player.queue)
            ],
            flags: MessageFlags.IsComponentsV2
          });
        }
      } else if (interaction.customId === 'previous') {
        await interaction.deferUpdate();
        const totalPagesNow = Math.ceil(player.queue.length / songsPerPage);
        currentPage = currentPage > 0 ? currentPage - 1 : totalPagesNow - 1;

        await msg.edit({
          components: [
            generateContainer(currentPage, player.queue),
            generateSelectMenu(currentPage, player.queue),
            generateButtons(currentPage, player.queue)
          ],
          flags: MessageFlags.IsComponentsV2
        });
      } else if (interaction.customId === 'next') {
        await interaction.deferUpdate();
        const totalPagesNow = Math.ceil(player.queue.length / songsPerPage);
        currentPage = currentPage < totalPagesNow - 1 ? currentPage + 1 : 0;

        await msg.edit({
          components: [
            generateContainer(currentPage, player.queue),
            generateSelectMenu(currentPage, player.queue),
            generateButtons(currentPage, player.queue)
          ],
          flags: MessageFlags.IsComponentsV2
        });
      } else if (interaction.customId === 'clear_queue') {
        await interaction.deferUpdate();

        const queueSize = player.queue.length;
        player.queue.clear();

        const successDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "music.remove.cleared", { e: client.emoji.check, count: queueSize }));

        const successContainer = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay);

        await msg.edit({
          components: [successContainer],
          flags: MessageFlags.IsComponentsV2
        });

        collector.stop();
      } else if (interaction.customId === 'close_session') {
        await interaction.deferUpdate();
        collector.stop('manual');
        await msg.delete().catch(() => { });
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'idle' || reason === 'time') {
        const timeoutDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "music.remove.timedOut", { e: client.emoji.info }));
        const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(timeoutDisplay);

        await msg.edit({
          components: [timeoutContainer],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => { });
      }
    });

  },
};

