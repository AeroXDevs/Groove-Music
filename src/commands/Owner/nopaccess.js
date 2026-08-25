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
const { checkBotRank } = require("../../utils/permissionCheck");

module.exports = {
  name: `nopaccess`,
  aliases: ["nopperms", "nop"],
  category: "Owner",
  description: "Add/remove global no-prefix access",
  args: false,
  usage: "<add/remove> <@user>",
  owner: false,
  rank: 'Admin',

  slashOptions: [
    {
      name: "add",
      description: "Add a user to global no-prefix access",
      type: 1,
      options: [
        {
          name: "user",
          description: "User to add",
          type: 6,
          required: true
        },
        {
          name: "duration",
          description: "Duration (e.g., 24h, 10d, 2w, 1m, 1y, or 'permanent')",
          type: 3,
          required: false
        }
      ]
    },
    {
      name: "remove",
      description: "Remove a user from global no-prefix access",
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
      description: "Remove all users from global no-prefix access",
      type: 1,
      options: []
    },
    {
      name: "list",
      description: "List all users with global no-prefix access",
      type: 1,
      options: []
    },
    {
      name: "status",
      description: "Check a user's global no-prefix access status",
      type: 1,
      options: [
        {
          name: "user",
          description: "User to check status for",
          type: 6,
          required: true
        }
      ]
    }
  ],
  async slashExecute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser("user");
    const durationArg = interaction.options.getString("duration");

    if (subcommand === "add") {
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

      let expiresAt = null;

      if (durationArg) {
        const durationLower = durationArg.toLowerCase();

        if (durationLower === 'p' || durationLower === 'perm' || durationLower === 'permanent') {
          expiresAt = null;
        } else {
          const match = durationArg.match(/^(\d+)(h|hr|hrs|d|day|w|week|m|y|yr|yrs)$/i);
          if (match) {
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();

            const now = Date.now();
            let milliseconds = 0;

            if (unit === 'h' || unit === 'hr' || unit === 'hrs') {
              milliseconds = value * 60 * 60 * 1000;
            }
            else if (unit === 'd' || unit === 'day') {
              milliseconds = value * 24 * 60 * 60 * 1000;
            }
            else if (unit === 'w' || unit === 'week') {
              milliseconds = value * 7 * 24 * 60 * 60 * 1000;
            }
            else if (unit === 'm') {
              milliseconds = value * 30 * 24 * 60 * 60 * 1000;
            }
            else if (unit === 'y' || unit === 'yr' || unit === 'yrs') {
              milliseconds = value * 365 * 24 * 60 * 60 * 1000;
            }

            expiresAt = new Date(now + milliseconds);
          } else {
            const errorDisplay = new TextDisplayBuilder()
              .setContent(
                client.t(interaction.guildId, "nop.badDuration", { e: client.emoji.warn }) +
                `**Examples:**\n` +
                `\`24h\` or \`24hrs\` - 24 hours\n` +
                `\`10d\` or \`10day\` - 10 days\n` +
                `\`2w\` or \`2week\` - 2 weeks\n` +
                `\`1m\` - 1 month\n` +
                `\`1y\` or \`1yr\` - 1 year\n` +
                `\`permanent\` or \`perm\` or \`p\` - Permanent`
              );

            const container = new ContainerBuilder()
              .addTextDisplayComponents(errorDisplay);

            return interaction.reply({
              components: [container],
              flags: MessageFlags.IsComponentsV2
            });
          }
        }
      }

      const npData = client.db.noprefix.findOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      if (npData) {
        let newExpiresAt = null;

        if (expiresAt === null && npData.expiresAt === null) {
          newExpiresAt = null;
        } else if (expiresAt === null) {
          newExpiresAt = null;
        } else if (npData.expiresAt === null) {
          newExpiresAt = null;
        } else {
          const now = Date.now();
          const existingExpiry = new Date(npData.expiresAt).getTime();
          const remainingTime = Math.max(0, existingExpiry - now);
          const newDuration = expiresAt.getTime() - now;
          newExpiresAt = new Date(now + remainingTime + newDuration);
        }

        client.db.noprefix.updateOne(
          { userId: user.id, guildId: "GLOBAL", noprefix: true },
          { expiresAt: newExpiresAt }
        );

        const successMessage = newExpiresAt
          ? `**${client.emoji.check} Extended ${user}'s No Prefix Access, Expiring**\n**<t:${Math.floor(newExpiresAt.getTime() / 1000)}:R>.**`
          : client.t(interaction.guildId, "nop.updatedPerm", { e: client.emoji.check, user });

        const successDisplay = new TextDisplayBuilder()
          .setContent(successMessage);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      client.db.noprefix.create({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true,
        expiresAt: expiresAt,
      });

      const successMessage = expiresAt
        ? `**${client.emoji.check} Granted ${user} No Prefix Access, Expiring**\n**<t:${Math.floor(expiresAt.getTime() / 1000)}:R>.**`
        : client.t(interaction.guildId, "nop.granted", { e: client.emoji.check, user });

      const successDisplay = new TextDisplayBuilder()
        .setContent(successMessage);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (subcommand === "remove") {
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

      const npData = client.db.noprefix.findOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      if (!npData) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "nop.thisNotHas", { e: client.emoji.info }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      client.db.noprefix.deleteOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      const successDisplay = new TextDisplayBuilder()
        .setContent(client.t(interaction.guildId, "nop.removed", { e: client.emoji.check, user }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (subcommand === "clear") {
      const result = client.db.noprefix.deleteMany({
        guildId: "GLOBAL",
        noprefix: true
      });

      const count = result.deletedCount || 0;

      const successDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.check} Successfully removed \`${count}\` user${count !== 1 ? 's' : ''} from No Prefix Access.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (subcommand === "status") {
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

      const npData = client.db.noprefix.findOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      if (!npData) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "nop.notHas", { e: client.emoji.info, user }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      let statusMessage;
      if (npData.expiresAt) {
        const expiryTimestamp = Math.floor(new Date(npData.expiresAt).getTime() / 1000);
        const now = Date.now();
        const expiryTime = new Date(npData.expiresAt).getTime();

        if (expiryTime <= now) {
          statusMessage = client.t(interaction.guildId, "nop.expired", { e: client.emoji.info, user });
        } else {
          statusMessage = client.t(interaction.guildId, "nop.hasUntil", { e: client.emoji.check, user, ts: expiryTimestamp });
        }
      } else {
        statusMessage = client.t(interaction.guildId, "nop.hasPermanent", { e: client.emoji.check, user });
      }

      const statusDisplay = new TextDisplayBuilder()
        .setContent(statusMessage);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(statusDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (subcommand === "list") {
      const data = client.db.noprefix.find({
        guildId: "GLOBAL",
        noprefix: true
      });

      if (!data.length) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "nop.none", { e: client.emoji.info }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const usersPerPage = 7;
      const pages = Math.ceil(data.length / usersPerPage);
      let currentPage = 0;

      const createContainer = async (page) => {
        const start = page * usersPerPage;
        const end = start + usersPerPage;
        const currentUsers = data.slice(start, end);

        const userList = await Promise.all(
          currentUsers.map(async (x, i) => {
            const user = await client.users.fetch(x.userId).catch(() => null);
            const userName = user ? `[${user.username}](https://discord.com/users/${user.id}) - \`${user.id}\`` : `Unknown User - \`${x.userId}\``;

            let expiryText = '';
            if (x.expiresAt) {
              const expiryTimestamp = Math.floor(new Date(x.expiresAt).getTime() / 1000);
              expiryText = ` <t:${expiryTimestamp}:R>`;
            } else {
              expiryText = ' \`Never\`';
            }

            return `**\`${start + i + 1}.\`** ${userName}\n╰ Expires : ${expiryText}\n`;
          })
        );

        const headerDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "nop.listTitle", { count: data.length }));

        const separator = new SeparatorBuilder();

        const listDisplay = new TextDisplayBuilder()
          .setContent(userList.join('\n'));

        const separator2 = new SeparatorBuilder();

        const footerDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "own.pageFooter", { page: page + 1, total: pages, user: interaction.user.displayName }));

        return new ContainerBuilder()
          .addTextDisplayComponents(headerDisplay)
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(listDisplay)
          .addSeparatorComponents(separator2)
          .addTextDisplayComponents(footerDisplay);
        ;
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
    }
  },
  async execute(message, args, client, prefix) {
    if (!args[0]) {
      const helpHeader = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "own.argHintBlock"));

      const separator = new SeparatorBuilder();

      const usageDisplay = new TextDisplayBuilder()
        .setContent(
client.t(message.guild.id, "nop.usage", { prefix })
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(helpHeader)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(usageDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const opt = args[0].toLowerCase();

    if (opt === `add` || opt === `a` || opt === `+`) {
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

      let expiresAt = null;
      const durationArg = args[2];

      if (durationArg) {
        const durationLower = durationArg.toLowerCase();

        if (durationLower === 'p' || durationLower === 'perm' || durationLower === 'permanent') {
          expiresAt = null;
        } else {
          const match = durationArg.match(/^(\d+)(h|hr|hrs|d|day|w|week|m|y|yr|yrs)$/i);
          if (match) {
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();

            const now = Date.now();
            let milliseconds = 0;

            if (unit === 'h' || unit === 'hr' || unit === 'hrs') {
              milliseconds = value * 60 * 60 * 1000;
            }
            else if (unit === 'd' || unit === 'day') {
              milliseconds = value * 24 * 60 * 60 * 1000;
            }
            else if (unit === 'w' || unit === 'week') {
              milliseconds = value * 7 * 24 * 60 * 60 * 1000;
            }
            else if (unit === 'm') {
              milliseconds = value * 30 * 24 * 60 * 60 * 1000;
            }
            else if (unit === 'y' || unit === 'yr' || unit === 'yrs') {
              milliseconds = value * 365 * 24 * 60 * 60 * 1000;
            }

            expiresAt = new Date(now + milliseconds);
          } else {
            const errorDisplay = new TextDisplayBuilder()
              .setContent(
                client.t(message.guild.id, "nop.badDuration", { e: client.emoji.warn }) +
                `**Examples:**\n` +
                `\`24h\` or \`24hrs\` - 24 hours\n` +
                `\`10d\` or \`10day\` - 10 days\n` +
                `\`2w\` or \`2week\` - 2 weeks\n` +
                `\`1m\` - 1 month\n` +
                `\`1y\` or \`1yr\` - 1 year\n` +
                `\`permanent\` or \`perm\` or \`p\` - Permanent`
              );

            const container = new ContainerBuilder()
              .addTextDisplayComponents(errorDisplay);

            return message.reply({
              components: [container],
              flags: MessageFlags.IsComponentsV2
            });
          }
        }
      }

      const npData = client.db.noprefix.findOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      if (npData) {
        let newExpiresAt = null;

        if (expiresAt === null && npData.expiresAt === null) {
          newExpiresAt = null;
        } else if (expiresAt === null) {
          newExpiresAt = null;
        } else if (npData.expiresAt === null) {
          newExpiresAt = null;
        } else {
          const now = Date.now();
          const existingExpiry = new Date(npData.expiresAt).getTime();
          const remainingTime = Math.max(0, existingExpiry - now);
          const newDuration = expiresAt.getTime() - now;
          newExpiresAt = new Date(now + remainingTime + newDuration);
        }

        client.db.noprefix.updateOne(
          { userId: user.id, guildId: "GLOBAL", noprefix: true },
          { expiresAt: newExpiresAt }
        );

        const successMessage = newExpiresAt
          ? `**${client.emoji.check} Extended ${user}'s No Prefix Access, Now Expiring **\n**<t:${Math.floor(newExpiresAt.getTime() / 1000)}:R>**`
          : client.t(message.guild.id, "nop.updatedPerm", { e: client.emoji.check, user });

        const successDisplay = new TextDisplayBuilder()
          .setContent(successMessage);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      client.db.noprefix.create({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true,
        expiresAt: expiresAt,
      });

      const successMessage = expiresAt
        ? `**${client.emoji.check} Granted ${user} No Prefix Access, Expiring **\n**<t:${Math.floor(expiresAt.getTime() / 1000)}:R>.**`
        : client.t(message.guild.id, "nop.granted", { e: client.emoji.check, user });

      const successDisplay = new TextDisplayBuilder()
        .setContent(successMessage);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (opt === `remove` || opt === `r` || opt === `-`) {
      if (args[1]?.toLowerCase() === 'all') {
        const result = client.db.noprefix.deleteMany({
          guildId: "GLOBAL",
          noprefix: true
        });

        const count = result.deletedCount || 0;

        const successDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.check} Successfully removed \`${count}\` user${count !== 1 ? 's' : ''} from No Prefix Access.**`);

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

      const npData = client.db.noprefix.findOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      if (!npData) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "nop.thisNotHas", { e: client.emoji.info }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      client.db.noprefix.deleteOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      const successDisplay = new TextDisplayBuilder()
        .setContent(client.t(message.guild.id, "nop.removed", { e: client.emoji.check, user }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (opt === `list` || opt === `show`) {
      const data = client.db.noprefix.find({
        guildId: "GLOBAL",
        noprefix: true
      });

      if (!data.length) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "nop.none", { e: client.emoji.info }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const usersPerPage = 7;
      const pages = Math.ceil(data.length / usersPerPage);
      let currentPage = 0;

      const createContainer = async (page) => {
        const start = page * usersPerPage;
        const end = start + usersPerPage;
        const currentUsers = data.slice(start, end);

        const userList = await Promise.all(
          currentUsers.map(async (x, i) => {
            const user = await client.users.fetch(x.userId).catch(() => null);
            const userName = user ? `[${user.username}](https://discord.com/users/${user.id}) - \`${user.id}\`` : `Unknown User - \`${x.userId}\``;

            let expiryText = '';
            if (x.expiresAt) {
              const expiryTimestamp = Math.floor(new Date(x.expiresAt).getTime() / 1000);
              expiryText = ` <t:${expiryTimestamp}:R>`;
            } else {
              expiryText = ' \`Never\`';
            }

            return `**\`${start + i + 1}.\`** ${userName}\n╰ Expires : ${expiryText}\n`;
          })
        );

        const headerDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "nop.listTitle", { count: data.length }));

        const separator = new SeparatorBuilder();

        const listDisplay = new TextDisplayBuilder()
          .setContent(userList.join('\n'));

        const separator2 = new SeparatorBuilder();

        const footerDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "own.pageFooter", { page: page + 1, total: pages, user: message.author.displayName }));

        return new ContainerBuilder()
          .addTextDisplayComponents(headerDisplay)
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(listDisplay)
          .addSeparatorComponents(separator2)
          .addTextDisplayComponents(footerDisplay);
        ;
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

      const msg = await message.channel.send({
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
    }

    if (opt === `status` || opt === `s` || opt === `check`) {
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

      const npData = client.db.noprefix.findOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      if (!npData) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(client.t(message.guild.id, "nop.notHas", { e: client.emoji.info, user }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      let statusMessage;
      if (npData.expiresAt) {
        const expiryTimestamp = Math.floor(new Date(npData.expiresAt).getTime() / 1000);
        const now = Date.now();
        const expiryTime = new Date(npData.expiresAt).getTime();

        if (expiryTime <= now) {
          statusMessage = client.t(message.guild.id, "nop.expired", { e: client.emoji.info, user });
        } else {
          statusMessage = client.t(message.guild.id, "nop.hasUntil", { e: client.emoji.check, user, ts: expiryTimestamp });
        }
      } else {
        statusMessage = client.t(message.guild.id, "nop.hasPermanent", { e: client.emoji.check, user });
      }

      const statusDisplay = new TextDisplayBuilder()
        .setContent(statusMessage);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(statusDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
