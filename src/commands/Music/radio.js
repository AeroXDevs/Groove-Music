const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags
} = require("discord.js");
const radioStations = require("../../data/radiostations.json");

module.exports = {
  name: "radio",
  category: "Music",
  aliases: ["radyo", "stream"],
  cooldown: 5,
  description: "Play live Turkish radio stations.",
  inVoiceChannel: true,
  sameVoiceChannel: true,
  botPerms: ["EmbedLinks", "Connect", "Speak"],

  slashOptions: [
    {
      name: "station",
      description: "Radio station name or number",
      type: 3,
      required: false,
      autocomplete: true
    }
  ],

  autocomplete: async (interaction, client) => {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const filtered = radioStations
      .filter(s => s.name.toLowerCase().includes(focusedValue) || !focusedValue)
      .slice(0, 25)
      .map((s, i) => ({
        name: `${s.emoji} ${s.name}`,
        value: String(i)
      }));
    return interaction.respond(filtered).catch(() => {});
  },

  async slashExecute(interaction, client) {
    const interactionWrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      createdTimestamp: interaction.createdTimestamp,
      reply: async (options) => {
        if (interaction.deferred) return await interaction.editReply(options);
        else if (interaction.replied) return await interaction.followUp(options);
        else return await interaction.reply(options);
      },
    };

    const stationArg = interaction.options.getString("station");
    const args = stationArg ? [stationArg] : [];
    return this.execute(interactionWrapper, args, client, client.prefix);
  },

  async execute(message, args, client, prefix) {
    const guildId = message.guild.id;

    const playStation = async (station) => {
      const channel = message.member.voice.channel;

      let player = client.manager.players.get(guildId);

      if (!player) {
        const { hasAvailableNodes } = require("../../utils/nodeUtils");
        if (!hasAvailableNodes(client.manager)) {
          const display = new TextDisplayBuilder()
            .setContent(client.t(guildId, "music.play.serverDown", { e: client.emoji.cross }));
          return message.reply({
            components: [new ContainerBuilder().addTextDisplayComponents(display)],
            flags: MessageFlags.IsComponentsV2
          }).catch(() => {});
        }

        try {
          player = await client.manager.createPlayer({
            guildId,
            voiceId: channel.id,
            textId: message.channel.id,
            volume: require("../../utils/playerUtils").getDefaultVolume(client, guildId),
            deaf: true,
          });
        } catch (err) {
          const display = new TextDisplayBuilder()
            .setContent(`**${client.emoji.cross} ${client.t(guildId, "music.play.genericError", { message: err.message })}**`);
          return message.reply({
            components: [new ContainerBuilder().addTextDisplayComponents(display)],
            flags: MessageFlags.IsComponentsV2
          }).catch(() => {});
        }
      }

      if (player.queue.size > 0) player.queue.clear();

      try {
        const result = await player.search(station.url, {
          requester: message.author,
        });

        if (!result || !result.tracks || !result.tracks.length) {
          const display = new TextDisplayBuilder()
            .setContent(client.t(guildId, "radio.loadFailed", { e: client.emoji.cross, name: station.name }));
          return message.reply({
            components: [new ContainerBuilder().addTextDisplayComponents(display)],
            flags: MessageFlags.IsComponentsV2
          }).catch(() => {});
        }

        player.queue.add(result.tracks[0]);

        if (player.playing || player.paused) {
          await player.skip();
        } else {
          await player.play();
        }

        player.data.set("radioStation", station.name);

        const display = new TextDisplayBuilder()
          .setContent(client.t(guildId, "radio.playing", { e: client.emoji.check, name: station.name, emoji: station.emoji }));

        return message.reply({
          components: [new ContainerBuilder().addTextDisplayComponents(display)],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => {});

      } catch (err) {
        console.error("Radio play error:", err);
        const display = new TextDisplayBuilder()
          .setContent(client.t(guildId, "radio.loadFailed", { e: client.emoji.cross, name: station.name }));
        return message.reply({
          components: [new ContainerBuilder().addTextDisplayComponents(display)],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
      }
    };

    const query = args.join(" ").trim();

    if (query && !isNaN(query)) {
      const idx = parseInt(query);
      if (idx >= 0 && idx < radioStations.length) {
        return playStation(radioStations[idx]);
      }
      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "radio.invalidNumber", { e: client.emoji.cross, max: radioStations.length }));
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    }

    if (query) {
      const q = query.toLowerCase().replace(/-/g, " ");
      const match = radioStations.find(s =>
        s.name.toLowerCase().includes(q) ||
        s.name.toLowerCase().replace(/\s/g, "").includes(q.replace(/\s/g, ""))
      );
      if (match) return playStation(match);

      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "radio.notFound", { e: client.emoji.cross, query }));
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    }

    const options = radioStations.slice(0, 25).map((s, i) => ({
      label: s.name,
      value: String(i),
      description: client.t(guildId, "radio.liveStream"),
      emoji: s.emoji
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("radio_select")
      .setPlaceholder(client.t(guildId, "radio.selectPlaceholder"))
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const popular = radioStations.slice(0, 6).map(s => `\`${s.name}\``).join(" · ");

    const titleDisplay = new TextDisplayBuilder()
      .setContent(client.t(guildId, "radio.title", { e: client.emoji.info }));

    const bodyDisplay = new TextDisplayBuilder()
      .setContent(client.t(guildId, "radio.body", { count: radioStations.length, popular, prefix }));

    const container = new ContainerBuilder()
      .addTextDisplayComponents(titleDisplay)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(bodyDisplay)
      .addActionRowComponents(row);

    let menuMsg;
    try {
      menuMsg = await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch { return; }

    const collector = menuMsg.createMessageComponentCollector({
      filter: (i) => i.customId === "radio_select" && i.user.id === message.author.id,
      time: 60000
    });

    collector.on("collect", async (i) => {
      if (!i.member.voice.channel) {
        return i.reply({
          content: client.t(guildId, "radio.joinFirst", { e: client.emoji.warn }),
          ephemeral: true
        }).catch(() => {});
      }
      await i.deferUpdate().catch(() => {});
      collector.stop();
      const station = radioStations[Number(i.values[0])];
      if (station) playStation(station);
    });

    collector.on("end", () => {
      menuMsg.edit({ components: [] }).catch(() => {});
    });
  },
};
