const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");
const { convertTime } = require("../../utils/convert.js");
const emoji = require("../../emojis.js");

module.exports = {
  name: "nowplaying",
  aliases: ["np"],
  category: "Music",
  description: "Show the current playing song",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  player: true,
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
    const player = client.manager.players.get(message.guild.id);

    if (!player.queue.current) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "music.nothingPlaying", { e: client.emoji.cross }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const track = player.queue.current;
    const duration = track.length;
    const durationFormatted = convertTime(duration);
    const progressBarLength = 30;

    const generateProgressBar = () => {
      const position = player.position || 0;
      const posFormatted = convertTime(position);
      const percentage = position / duration;
      const progressPos = Math.floor(progressBarLength * percentage);
      const bar = "─".repeat(progressPos) + "○" + "─".repeat(progressBarLength - progressPos);

      return {
        bar: bar,
        position: posFormatted
      };
    };

    const createContainer = (prog) => {
      const headerDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "music.nowPlayingShort", { e: client.emoji.check, title: track.title }));

      const separator1 = new SeparatorBuilder();

      const infoDisplay = new TextDisplayBuilder()
        .setContent(
          `> - **Author:** [${cleanAuthorName(track.author)}](${track.uri})\n` +
          `> - **Duration:** \`${durationFormatted}\`\n` +
          `> - **Requester:** [${track.requester.username}](https://discord.com/users/${track.requester.id})\n`+
          `> - \`${prog.position} ${prog.bar} ${durationFormatted}\``
        );

      return new ContainerBuilder()
        .addTextDisplayComponents(headerDisplay)
        .addSeparatorComponents(separator1)
        .addTextDisplayComponents(infoDisplay);
    };

    const prog = generateProgressBar();
    const npmsg = await message.reply({
      components: [createContainer(prog)],
      flags: MessageFlags.IsComponentsV2
    });

    const interval = setInterval(() => {
      if (!player || !player.playing || !npmsg) {
        clearInterval(interval);
        return;
      }

      try {
        const newProg = generateProgressBar();
        npmsg.edit({
          components: [createContainer(newProg)],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => {
          clearInterval(interval);
        });
      } catch (e) {
        clearInterval(interval);
      }
    }, 2000);

    const cleanup = () => {
      if (interval) clearInterval(interval);
    };

    const collector = npmsg.createMessageComponentCollector({ time: 300000 });
    collector.on('end', () => {
      cleanup();
    });

    const playerEndHandler = (p) => {
      if (p.guildId === message.guild.id) cleanup();
    };

    const playerStopHandler = (p) => {
      if (p.guildId === message.guild.id) cleanup();
    };

    const playerEmptyHandler = (p) => {
      if (p.guildId === message.guild.id) cleanup();
    };

    const playerDestroyHandler = (p) => {
      if (p.guildId === message.guild.id) cleanup();
    };

    client.manager.on('playerEnd', playerEndHandler);
    client.manager.on('playerStop', playerStopHandler);
    client.manager.on('playerEmpty', playerEmptyHandler);
    client.manager.on('playerDestroy', playerDestroyHandler);

    collector.once('end', () => {
      client.manager.off('playerEnd', playerEndHandler);
      client.manager.off('playerStop', playerStopHandler);
      client.manager.off('playerEmpty', playerEmptyHandler);
      client.manager.off('playerDestroy', playerDestroyHandler);
    });
  }
};

function cleanAuthorName(author) {
  if (!author) return 'Unknown';

  return author.replace(/\s*-\s*Topic\s*$/i, '').trim();
}

