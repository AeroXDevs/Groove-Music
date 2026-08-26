const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SeparatorBuilder
} = require("discord.js");
const { convertTime } = require("../../utils/convert.js");
const ms = require("ms");
const emoji = require("../../emojis");

module.exports = {
  name: "seek",
  aliases: [],
  category: "Music",
  cooldown: 3,
  description: "Seek the currently playing song",
  args: false,
  usage: "40 || 1:30 || 10s || 1m || 1h to seek",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  dj: true,
  owner: false,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  slashOptions: [
    {
      name: "time",
      description: "Time to seek to (e.g. 40, 1:30, 10s, 1m)",
      type: 3,
      required: true
    }
  ],

  async slashExecute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);
    if (!player.queue.current) {
      const errorDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.playFirst", { e: client.emoji.warn }));
      const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const timeInput = interaction.options.getString("time");
    let time;

    if (/^\d+$/.test(timeInput)) {
      time = parseInt(timeInput) * 1000;
    } else if (/^\d+:\d+$/.test(timeInput)) {
      const [minutes, seconds] = timeInput.split(':').map(Number);
      time = (minutes * 60 + seconds) * 1000;
    } else if (/^\d+:\d+:\d+$/.test(timeInput)) {
      const [hours, minutes, seconds] = timeInput.split(':').map(Number);
      time = (hours * 3600 + minutes * 60 + seconds) * 1000;
    } else {
      time = ms(timeInput);
    }

    if (!time || isNaN(time)) {
      const errorDisplay = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "music.seek.invalidTime", { e: client.emoji.warn }));
      const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const position = player.shoukaku.position;
    const duration = player.queue.current.length;
    const song = player.queue.current;

    if (time <= duration) {
      await player.shoukaku.seekTo(time);
      const action = client.t(interaction.guildId, time > position ? "music.seek.forwarded" : "music.seek.rewound");
      const successDisplay = new TextDisplayBuilder()
        .setContent(
          client.t(interaction.guildId, "music.seek.success", { action, blank: emoji.blank, arrow: emoji.wickarrow, title: song.title.substring(0, 45), uri: song.uri, position: convertTime(time), duration: convertTime(duration) })
        );
      const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);
      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } else {
      const warnDisplay = new TextDisplayBuilder()
        .setContent(client.t(interaction.guildId, "music.seek.outOfBounds", { e: client.emoji.warn, blank: emoji.blank, arrow: emoji.wickarrow, duration: convertTime(duration) }));
      const container = new ContainerBuilder().addTextDisplayComponents(warnDisplay);
      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  },

  async execute(message, args, client) {
    if (!args.length) {
      const author = message.author || message.user;
      const header = new TextDisplayBuilder().setContent(client.t(message.guild.id, "music.seek.header", { e: emoji.info }));
      const usage = new TextDisplayBuilder().setContent(client.t(message.guild.id, "music.seek.usage", { blank: emoji.blank, arrow: emoji.wickarrow }));
      const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(usage);
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
    return this.runSeek(message, args, client);
  },

  async runSeek(message, args, client) {
    const player = client.manager.players.get(message.guild.id);

    if (!player.queue.current) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "music.playFirst", { e: client.emoji.warn }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    let time;
    const input = args[0];

    if (/^\d+$/.test(input)) {
      time = parseInt(input) * 1000;
    } else if (/^\d+:\d+$/.test(input)) {
      const [minutes, seconds] = input.split(':').map(Number);
      time = (minutes * 60 + seconds) * 1000;
    } else if (/^\d+:\d+:\d+$/.test(input)) {
      const [hours, minutes, seconds] = input.split(':').map(Number);
      time = (hours * 3600 + minutes * 60 + seconds) * 1000;
    } else {
      time = ms(input);
    }

    if (!time || isNaN(time)) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "music.seek.invalidTime", { e: client.emoji.warn }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const position = player.shoukaku.position;
    const duration = player.queue.current.length;
    const song = player.queue.current;

    if (time <= duration) {
      await player.shoukaku.seekTo(time);
      const action = client.t(message.guild.id, time > position ? "music.seek.forwarded" : "music.seek.rewound");

      const successDisplay = new TextDisplayBuilder()
        .setContent(
          client.t(message.guild.id, "music.seek.success", { action, blank: emoji.blank, arrow: emoji.wickarrow, title: song.title.substring(0, 45), uri: song.uri, position: convertTime(time), duration: convertTime(duration) })
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } else {
      const warnDisplay = new TextDisplayBuilder()
        .setContent(
          `**${client.emoji.warn} Out of Bounds**\n` +
          `${emoji.blank}${emoji.wickarrow} Song Duration: \` ${convertTime(duration)} \``
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(warnDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
