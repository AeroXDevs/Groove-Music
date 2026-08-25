const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
  name: "node",
  category: "Information",
  description: "Shows Node information.",
  botPrams: ["EMBED_LINKS"],
  args: false,
  usage: "",
  userPerms: [],
  owner: true,
  cooldown: 3,

  slashOptions: [],
  async slashExecute(interaction, client) {
    const nodes = [...client.manager.shoukaku.nodes.values()];

    if (nodes.length === 0 || !nodes[0].stats) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} Node: Disconnected**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const node = nodes[0];
    const status = node.stats ? "Connected" : "Disconnected";
    const uptime = node.stats ? new Date(node.stats.uptime).toISOString().slice(11, 19) : "N/A";

    const headerDisplay = new TextDisplayBuilder()
      .setContent(`**${client.emoji.check} Lavalink Node**`);

    const separator1 = new SeparatorBuilder();

    const connectionDisplay = new TextDisplayBuilder()
      .setContent(
        `**Groove is ${status}**\n` +
        `> Players \`:\` **\`${node.stats.players}\`**\n` +
        `> Playing \`:\` **\`${node.stats.playingPlayers}\`**\n` +
        `> Uptime \`:\` **\`${uptime}\`**`
      );

    const separator2 = new SeparatorBuilder();

    const memoryDisplay = new TextDisplayBuilder()
      .setContent(
        `**Memory**\n` +
        `> Reservable \`:\` **\`${Math.round(node.stats.memory.reservable / 1024 / 1024)} MB\`**\n` +
        `> Used \`:\` **\`${Math.round(node.stats.memory.used / 1024 / 1024)} MB\`**\n` +
        `> Free \`:\` **\`${Math.round(node.stats.memory.free / 1024 / 1024)} MB\`**\n` +
        `> Allocated \`:\` **\`${Math.round(node.stats.memory.allocated / 1024 / 1024)} MB\`**`
      );

    const separator3 = new SeparatorBuilder();

    const cpuDisplay = new TextDisplayBuilder()
      .setContent(
        `**CPU**\n` +
        `> Cores \`:\` **\`${node.stats.cpu.cores}\`**\n` +
        `> System Load \`:\` **\`${(Math.round(node.stats.cpu.systemLoad * 100) / 100).toFixed(2)}%\`**\n` +
        `> Lavalink Load \`:\` **\`${(Math.round(node.stats.cpu.lavalinkLoad * 100) / 100).toFixed(2)}%\`**`
      );

    const container = new ContainerBuilder()
      .addTextDisplayComponents(headerDisplay)
      .addSeparatorComponents(separator1)
      .addTextDisplayComponents(connectionDisplay)
      .addSeparatorComponents(separator2)
      .addTextDisplayComponents(memoryDisplay)
      .addSeparatorComponents(separator3)
      .addTextDisplayComponents(cpuDisplay);

    interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
  async execute(message, args, client, prefix) {
    const nodes = [...client.manager.shoukaku.nodes.values()];

    if (nodes.length === 0 || !nodes[0].stats) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} Node: Disconnected**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const node = nodes[0];
    const status = node.stats ? "Connected" : "Disconnected";
    const uptime = node.stats ? new Date(node.stats.uptime).toISOString().slice(11, 19) : "N/A";

    const headerDisplay = new TextDisplayBuilder()
      .setContent(`**${client.emoji.check} Lavalink Node**`);

    const separator1 = new SeparatorBuilder();

    const connectionDisplay = new TextDisplayBuilder()
      .setContent(
        `**Groove is ${status}**\n` +
        `> Players \`:\` **\`${node.stats.players}\`**\n` +
        `> Playing \`:\` **\`${node.stats.playingPlayers}\`**\n` +
        `> Uptime \`:\` **\`${uptime}\`**`
      );

    const separator2 = new SeparatorBuilder();

    const memoryDisplay = new TextDisplayBuilder()
      .setContent(
        `**Memory**\n` +
        `> Reservable \`:\` **\`${Math.round(node.stats.memory.reservable / 1024 / 1024)} MB\`**\n` +
        `> Used \`:\` **\`${Math.round(node.stats.memory.used / 1024 / 1024)} MB\`**\n` +
        `> Free \`:\` **\`${Math.round(node.stats.memory.free / 1024 / 1024)} MB\`**\n` +
        `> Allocated \`:\` **\`${Math.round(node.stats.memory.allocated / 1024 / 1024)} MB\`**`
      );

    const separator3 = new SeparatorBuilder();

    const cpuDisplay = new TextDisplayBuilder()
      .setContent(
        `**CPU**\n` +
        `> Cores \`:\` **\`${node.stats.cpu.cores}\`**\n` +
        `> System Load \`:\` **\`${(Math.round(node.stats.cpu.systemLoad * 100) / 100).toFixed(2)}%\`**\n` +
        `> Lavalink Load \`:\` **\`${(Math.round(node.stats.cpu.lavalinkLoad * 100) / 100).toFixed(2)}%\`**`
      );

    const container = new ContainerBuilder()
      .addTextDisplayComponents(headerDisplay)
      .addSeparatorComponents(separator1)
      .addTextDisplayComponents(connectionDisplay)
      .addSeparatorComponents(separator2)
      .addTextDisplayComponents(memoryDisplay)
      .addSeparatorComponents(separator3)
      .addTextDisplayComponents(cpuDisplay);

    message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
