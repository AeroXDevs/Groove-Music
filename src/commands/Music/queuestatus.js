const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");

function formatDuration(ms) {
  if (!ms || ms === 0) return "Live";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function progressBar(current, total, length = 12) {
  if (!total || total === 0) return "▬".repeat(length);
  const progress = Math.round((current / total) * length);
  return "▓".repeat(Math.min(progress, length)) + "░".repeat(length - Math.min(progress, length));
}

module.exports = {
  name: "queuestatus",
  aliases: ["qs", "status", "np"],
  category: "Music",
  cooldown: 3,
  description: "Show detailed player and queue status.",
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
        if (interaction.deferred) return await interaction.editReply(options);
        else if (interaction.replied) return await interaction.followUp(options);
        else return await interaction.reply(options);
      },
    };
    return this.execute(interactionWrapper, [], client, client.prefix);
  },

  async execute(message, args, client, prefix) {
    const guildId = message.guild.id;
    const player = client.manager.players.get(guildId);

    if (!player.queue.current) {
      const display = new TextDisplayBuilder()
        .setContent(client.t(guildId, "music.nothingPlaying", { e: client.emoji.warn }));
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    }

    const track = player.queue.current;
    const position = player.shoukaku?.position || player.position || 0;
    const duration = track.length || track.duration || 0;
    const isStream = !duration || duration === 0;

    const loopModes = { none: client.t(guildId, "queuestatus.loopOff"), track: client.t(guildId, "queuestatus.loopTrack"), queue: client.t(guildId, "queuestatus.loopQueue") };
    const loopMode = loopModes[player.loop] || loopModes.none;

    const autoplay = player.data?.get("autoplay") ? client.t(guildId, "music.enabled") : client.t(guildId, "music.disabled");

    const radioStation = player.data?.get("radioStation");

    let totalQueueDuration = 0;
    for (const t of player.queue) {
      totalQueueDuration += t.length || t.duration || 0;
    }

    const bar = isStream ? "🔴 LIVE" : `${progressBar(position, duration)} \`${formatDuration(position)} / ${formatDuration(duration)}\``;

    const lines = [
      `### ${client.emoji.play} ${client.t(guildId, "queuestatus.title")}`,
      "",
      `**${client.t(guildId, "queuestatus.nowPlaying")}**`,
      `> [**${track.title}**](${track.uri})`,
      `> ${client.t(guildId, "queuestatus.by")} \`${track.author || "Unknown"}\` ${client.t(guildId, "queuestatus.requestedBy")} ${track.requester || "Unknown"}`,
      "",
      bar,
      "",
    ];

    if (radioStation) {
      lines.push(`📻 **${client.t(guildId, "queuestatus.radioMode")}:** \`${radioStation}\``);
    }

    const statusItems = [
      `${client.emoji.volup} **${client.t(guildId, "queuestatus.volume")}:** \`${player.volume}%\``,
      `${client.emoji.loop} **${client.t(guildId, "queuestatus.loop")}:** \`${loopMode}\``,
      `${client.emoji.shuffle} **${client.t(guildId, "queuestatus.autoplay")}:** \`${autoplay}\``,
      `${player.paused ? client.emoji.pause : client.emoji.play} **${client.t(guildId, "queuestatus.state")}:** \`${player.paused ? client.t(guildId, "queuestatus.paused") : client.t(guildId, "queuestatus.playing")}\``,
    ];

    lines.push(statusItems.join("  ·  "));
    lines.push("");

    if (player.queue.size > 0) {
      lines.push(`**${client.t(guildId, "queuestatus.upNext")}** (${player.queue.size} ${client.t(guildId, "queuestatus.tracksLabel")}${totalQueueDuration ? ` · ${formatDuration(totalQueueDuration)}` : ""})`);
      const next = [...player.queue].slice(0, 3);
      next.forEach((t, i) => {
        lines.push(`> \`${i + 1}.\` ${t.title} — \`${formatDuration(t.length || t.duration || 0)}\``);
      });
      if (player.queue.size > 3) {
        lines.push(`> ... +${player.queue.size - 3} ${client.t(guildId, "queuestatus.more")}`);
      }
    } else {
      lines.push(`*${client.t(guildId, "queuestatus.queueEmpty")}*`);
    }

    const display = new TextDisplayBuilder().setContent(lines.join("\n"));

    return message.reply({
      components: [new ContainerBuilder().addTextDisplayComponents(display)],
      flags: MessageFlags.IsComponentsV2
    }).catch(() => {});
  },
};
