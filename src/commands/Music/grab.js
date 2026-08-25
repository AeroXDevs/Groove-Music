const {
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder
} = require("discord.js");
const { convertTime } = require("../../utils/convert.js");
const emoji = require("../../emojis");

module.exports = {
  name: "grab",
  aliases: ["save"],
  category: "Music",
  cooldown: 3,
  description: "Grabs and sends you the song that is currently playing.",
  args: false,
  usage: "",
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
        .setContent(client.t(message.guild.id, "music.playFirst", { e: client.emoji.cross }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const song = player.queue.current;
    const total = song.length;

    const successDisplay = new TextDisplayBuilder()
      .setContent(client.t(message.guild.id, "music.grab.sent", { e: client.emoji.check }));

    const container = new ContainerBuilder()
      .addTextDisplayComponents(successDisplay);

    message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    const urlbutt = new ButtonBuilder()
      .setLabel(client.t(message.guild.id, "music.grab.urlButton"))
      .setStyle(ButtonStyle.Link)
      .setURL(song.uri);

    const row2 = new ActionRowBuilder().addComponents(urlbutt);

    const songHeader = new TextDisplayBuilder()
      .setContent(`**${client.emoji.check} [${song.title}](${song.uri})**`);

    const separator = new SeparatorBuilder();

    const songInfoSection = new SectionBuilder()
      .addTextDisplayComponents(
        (textDisplay) => textDisplay.setContent(client.t(message.guild.id, "music.grab.duration", { e: client.emoji.info, value: convertTime(total) })),
        (textDisplay) => textDisplay.setContent(client.t(message.guild.id, "music.grab.author", { e: client.emoji.info, value: cleanAuthorName(song.author) }))
      );

    if (song.thumbnail) {
      songInfoSection.setThumbnailAccessory(
        (thumbnail) => thumbnail.setURL(song.thumbnail)
      );
    }

    const separator2 = new SeparatorBuilder();

    const dmContainer = new ContainerBuilder()
      .addTextDisplayComponents(songHeader)
      .addSeparatorComponents(separator)
      .addSectionComponents(songInfoSection)
      .addSeparatorComponents(separator2)
      .addActionRowComponents(row2);

    return message.author
      .send({
        components: [dmContainer],
        flags: MessageFlags.IsComponentsV2
      })
      .catch(() => null);
  },
};

function cleanAuthorName(author) {
  if (!author) return 'Unknown';


  return author.replace(/\s*-\s*Topic\s*$/i, '').trim();
}
