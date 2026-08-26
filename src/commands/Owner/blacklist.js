const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const lodash = require("lodash");
const emoji = require("../../emojis");

module.exports = {
  name: `blacklist`,
  aliases: ["bl"],
  category: "Owner",
  description: "Blacklist users",
  args: false,
  usage: "",
  owner: true,

  slashOptions: [
    {
      name: "add",
      description: "Add a user to the blacklist",
      type: 1,
      options: [
        {
          name: "user",
          description: "User to add",
          type: 6,
          required: true
        }
      ]
    },
    {
      name: "remove",
      description: "Remove a user from the blacklist",
      type: 1,
      options: [
        {
          name: "user",
          description: "User to remove",
          type: 6,
          required: true
        }
      ]
    },
    {
      name: "clear",
      description: "Remove all users from the blacklist",
      type: 1,
      options: []
    },
    {
      name: "list",
      description: "List all blacklisted users",
      type: 1,
      options: []
    }
  ],
  async slashExecute(interaction, client) {
    if (!client.owners.includes(interaction.user.id)) {
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser("user");

    if (subcommand === "list") {
      const blacklistedUsers = client.db.blacklist.getAll();

      if (blacklistedUsers.length === 0) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "bl.empty", { e: client.emoji.info }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const usersPerPage = 10;
      const pages = Math.ceil(blacklistedUsers.length / usersPerPage);
      let currentPage = 0;

      const createContainer = async (page) => {
        const start = page * usersPerPage;
        const end = start + usersPerPage;
        const currentUsers = blacklistedUsers.slice(start, end);

        const userList = await Promise.all(
          currentUsers.map(async (data, i) => {
            const user = await client.users.fetch(data.userId).catch(() => null);
            return user ? `**\`${start + i}\` | ${user.tag} (\`${user.id}\`)**` : `**\`${start + i}.\` Unknown User (\`${data.userId}\`)**`;
          })
        );

        const headerDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "bl.title", { e: client.emoji.check }));

        const separator = new SeparatorBuilder();

        const listDisplay = new TextDisplayBuilder()
          .setContent(userList.join('\n'));

        return new ContainerBuilder()
          .addTextDisplayComponents(headerDisplay)
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(listDisplay);
      };

      const components = [await createContainer(currentPage)];

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
          filter: (i) => i.user.id === interaction.user.id,
          time: 60000
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

          const updatedComponents = [await createContainer(currentPage)];
          if (pages > 1) {
            updatedComponents.push(components[1]);
          }

          await i.update({
            components: updatedComponents,
            flags: MessageFlags.IsComponentsV2
          });
        });

        collector.on('end', async () => {
          const finalComponents = [await createContainer(currentPage)];
          msg.edit({ components: finalComponents }).catch(() => { });
        });
      }
    } else if (subcommand === "add") {
      if (!user) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "own.needUser", { e: client.emoji.warn }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const existing = client.db.blacklist.get(user.id);

      if (existing) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "bl.already", { e: client.emoji.info }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      client.db.blacklist.set(user.id, { developer: interaction.user.id });

      const successDisplay = new TextDisplayBuilder()
        .setContent(client.t(interaction.guildId, "bl.added", { e: client.emoji.check, user }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } else if (subcommand === "remove") {
      if (!user) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "own.needUser", { e: client.emoji.warn }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const blData = client.db.blacklist.get(user.id);

      if (!blData) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "bl.notIn", { e: client.emoji.info }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      client.db.blacklist.delete(user.id);

      const successDisplay = new TextDisplayBuilder()
        .setContent(client.t(interaction.guildId, "bl.removed", { e: client.emoji.check, user }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } else if (subcommand === "clear") {
      const blacklistedUsers = client.db.blacklist.getAll();

      if (blacklistedUsers.length === 0) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "bl.empty", { e: client.emoji.info }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const count = blacklistedUsers.length;
      blacklistedUsers.forEach(u => client.db.blacklist.delete(u.userId));

      const successDisplay = new TextDisplayBuilder()
        .setContent(client.t(interaction.guildId, "bl.removedAllLine", { e: client.emoji.check, count }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
  async execute(message, args, client, prefix) {
    if (!client.owners.includes(message.author.id)) {
      return;
    }

    if (!args[0]) {
      const helpHeader = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "own.argHintBlock2"));

      const separator1 = new SeparatorBuilder();

      const aliasesDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "own.aliasesLine", { value: "[bl]" }));

      const usageDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "own.usageLine", { value: "add/remove/list" }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(helpHeader)
        .addSeparatorComponents(separator1)
        .addTextDisplayComponents(aliasesDisplay)
        .addTextDisplayComponents(usageDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const opt = args[0].toLowerCase();

    if (opt === `list` || opt === `l` || opt === `show`) {
      const blacklistedUsers = client.db.blacklist.getAll();

      if (blacklistedUsers.length === 0) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "bl.empty", { e: client.emoji.info }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const usersPerPage = 10;
      const pages = Math.ceil(blacklistedUsers.length / usersPerPage);
      let currentPage = 0;

      const createContainer = async (page) => {
        const start = page * usersPerPage;
        const end = start + usersPerPage;
        const currentUsers = blacklistedUsers.slice(start, end);

        const userList = await Promise.all(
          currentUsers.map(async (data, i) => {
            const user = await client.users.fetch(data.userId).catch(() => null);
            return user ? `**\`${start + i}\` | ${user.tag} (\`${user.id}\`)**` : `**\`${start + i}.\` Unknown User (\`${data.userId}\`)**`;
          })
        );

        const headerDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "bl.title", { e: client.emoji.check }));

        const separator = new SeparatorBuilder();

        const listDisplay = new TextDisplayBuilder()
          .setContent(userList.join('\n'));

        return new ContainerBuilder()
          .addTextDisplayComponents(headerDisplay)
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(listDisplay);
      };

      const components = [await createContainer(currentPage)];

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

          const updatedComponents = [await createContainer(currentPage)];
          if (pages > 1) {
            updatedComponents.push(components[1]);
          }

          await interaction.update({
            components: updatedComponents,
            flags: MessageFlags.IsComponentsV2
          });
        });

        collector.on('end', async () => {
          const finalComponents = [await createContainer(currentPage)];
          msg.edit({ components: finalComponents }).catch(() => { });
        });
      }
    } else if (opt === `add` || opt === `a` || opt === `+`) {
      const user =
        message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);

      if (!user) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "own.needUser", { e: client.emoji.warn }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const existing = client.db.blacklist.get(user.id);

      if (existing) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "bl.already", { e: client.emoji.info }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      client.db.blacklist.set(user.id, { developer: message.author.id });

      const successDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "bl.added", { e: client.emoji.check, user }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } else if (opt === `remove` || opt === `r` || opt === `-`) {
      if (args[1] && args[1].toLowerCase() === 'all') {
        const blacklistedUsers = client.db.blacklist.getAll();

        if (blacklistedUsers.length === 0) {
          const infoDisplay = new TextDisplayBuilder()
            .setContent(client.t(message.guild.id, "bl.empty", { e: client.emoji.info }));

          const container = new ContainerBuilder()
            .addTextDisplayComponents(infoDisplay);

          return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }

        const count = blacklistedUsers.length;
        blacklistedUsers.forEach(u => client.db.blacklist.delete(u.userId));

        const successDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "bl.removedAllLine", { e: client.emoji.check, count }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const user =
        message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);

      if (!user) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "own.needUserOrAll", { e: client.emoji.warn }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const blData = client.db.blacklist.get(user.id);

      if (!blData) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "bl.notIn", { e: client.emoji.info }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      client.db.blacklist.delete(user.id);

      const successDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "bl.removed", { e: client.emoji.check, user }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
