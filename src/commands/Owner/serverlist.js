const {
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder
} = require("discord.js");
const load = require("lodash");
const emoji = require("../../emojis");

module.exports = {
  name: "serverlist",
  category: "Owner",
  description: "Listing Of Servers",
  aliases: ["sl", "servers"],
  args: false,
  usage: "<string>",
  permission: [],
  owner: true,

  slashOptions: [],
  async slashExecute(interaction, client) {
    if (!client.owners.includes(interaction.user.id)) {
      return;
    }

    const guilds = Array.from(client.guilds.cache.values()).sort((a, b) => b.memberCount - a.memberCount);

    if (guilds.length === 0) {
      const infoDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.info} No servers found.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(infoDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const serversPerPage = 10;
    const pages = Math.ceil(guilds.length / serversPerPage);
    let currentPage = 0;

    const createContainer = (page) => {
      const start = page * serversPerPage;
      const end = start + serversPerPage;
      const currentGuilds = guilds.slice(start, end);

      const serverList = currentGuilds.map((guild, i) => {
        return `**\`${start + i + 1}\`** : \`${guild.name}\` - \`${guild.id}\` - **\`${guild.memberCount}\`**`;
      });

      const headerDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.check} ${client.user.username} Server List**`);

      const separator = new SeparatorBuilder();

      const listDisplay = new TextDisplayBuilder()
        .setContent(serverList.join('\n'));

      return new ContainerBuilder()
        .addTextDisplayComponents(headerDisplay)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(listDisplay);
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

    const msg = await interaction.reply({
      components,
      flags: MessageFlags.IsComponentsV2
    });

    if (pages > 1) {
      const collector = msg.createMessageComponentCollector({
        filter: (i) => {
          if (i.user.id === interaction.user.id) return true;

          const errorDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.cross} Only ${interaction.user.tag} can use this button.**`);

          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          i.reply({
            components: [errorContainer],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          });
          return false;
        },
        time: 60000 * 5,
        idle: 30000
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'close') {
          collector.stop();
          return await i.message.delete().catch(() => { });
        } else if (i.customId === 'home') {
          currentPage = 0;
        } else if (i.customId === 'prev') {
          currentPage = (currentPage - 1 + pages) % pages;
        } else if (i.customId === 'next') {
          currentPage = (currentPage + 1) % pages;
        }

        const updatedComponents = [createContainer(currentPage)];
        if (pages > 1) {
          updatedComponents.push(components[1]);
        }

        await i.update({
          components: updatedComponents,
          flags: MessageFlags.IsComponentsV2
        });
      });

      collector.on('end', async () => {
        const finalComponents = [createContainer(currentPage)];
        msg.edit({ components: finalComponents }).catch(() => { });
      });
    }
  },
  async execute(message, args, client, prefix) {
    if (!client.owners.includes(message.author.id)) {
      return;
    }

    const guilds = Array.from(client.guilds.cache.values()).sort((a, b) => b.memberCount - a.memberCount);

    if (guilds.length === 0) {
      const infoDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.info} No servers found.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(infoDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const serversPerPage = 10;
    const pages = Math.ceil(guilds.length / serversPerPage);
    let currentPage = 0;

    const createContainer = (page) => {
      const start = page * serversPerPage;
      const end = start + serversPerPage;
      const currentGuilds = guilds.slice(start, end);

      const serverList = currentGuilds.map((guild, i) => {
        return `**\`${start + i + 1}\`** : \`${guild.name}\` - \`${guild.id}\` - **\`${guild.memberCount}\`**`;
      });

      const headerDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.check} ${message.client.user.username} Server List**`);

      const separator = new SeparatorBuilder();

      const listDisplay = new TextDisplayBuilder()
        .setContent(serverList.join('\n'));

      return new ContainerBuilder()
        .addTextDisplayComponents(headerDisplay)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(listDisplay);
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

    const msg = await message.channel.send({
      components,
      flags: MessageFlags.IsComponentsV2
    });

    if (pages > 1) {
      const collector = msg.createMessageComponentCollector({
        filter: (i) => {
          if (i.user.id === message.author.id) return true;

          const errorDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.cross} Only ${message.author.tag} can use this button.**`);

          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          i.reply({
            components: [errorContainer],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          });
          return false;
        },
        time: 60000 * 5,
        idle: 30000
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

      collector.on('end', async () => {
        const finalComponents = [createContainer(currentPage)];
        msg.edit({ components: finalComponents }).catch(() => { });
      });
    }
  },
};
