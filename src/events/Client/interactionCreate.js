const {
  CommandInteraction,
  InteractionType,
  PermissionFlagsBits,
  PermissionsBitField,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  name: "interactionCreate",
  run: async (client, interaction) => {
    let prefix = client.prefix;
    const ress = client.db.prefixes.get(interaction.guildId);
    if (ress && ress.prefix) prefix = ress.prefix;



    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      const command = client.slashCommands.get(interaction.commandName);
      if (!command || !command.autocomplete) return;

      try {
        await command.autocomplete(interaction, client);
      } catch (error) {
        console.error(`Autocomplete error for ${interaction.commandName}:`, error);
      }
      return;
    }

    if (interaction.type === InteractionType.ApplicationCommand) {
      if (!client.slashCommands) {
        console.error("slashCommands collection is not initialized");
        return;
      }

      const command = client.slashCommands.get(interaction.commandName);
      if (!command) return;

      const { checkBotRank } = require("../../utils/permissionCheck");
      if (command.rank) {
        const hasRank = await checkBotRank(interaction.user.id, command.rank, client, command.name);
        if (!hasRank) return;
      } else if (command.owner && !client.owners.includes(interaction.user.id)) {
        return;
      }

      if (command.botPerms) {
        if (
          !interaction.guild.members.me.permissions.has(
            PermissionsBitField.resolve(command.botPerms || []),
          )
        ) {
          const errorDisplay = new TextDisplayBuilder()
            .setContent(
              client.t(interaction.guildId, "core.noBotPermSlash", { warn: client.emoji.warn, permission: command.botPerms, channel: interaction.channel.toString(), command: command.name })
            );

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }
      }

      if (command.userPerms && !client.owners.includes(interaction.user.id)) {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.resolve(command.userPerms || []),
          )
        ) {
          const errorDisplay = new TextDisplayBuilder()
            .setContent(
              client.t(interaction.guildId, "core.noUserPermSlash", { warn: client.emoji.warn, permission: command.userPerms, channel: interaction.channel.toString(), command: command.name })
            );

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }
      }

      const player = interaction.client.manager.players.get(
        interaction.guildId,
      );
      if (command.player && !player) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "core.noPlayerSlash", { warn: client.emoji.warn }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        if (interaction.replied) {
          return await interaction
            .editReply({
              components: [container],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            })
            .catch(() => { });
        } else {
          return await interaction
            .reply({
              components: [container],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            })
            .catch(() => { });
        }
      }
      if (command.inVoiceChannel && !interaction.member.voice.channel) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "core.notInVoiceSlash", { warn: client.emoji.warn }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        if (interaction.replied) {
          return await interaction
            .editReply({
              components: [container],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            })
            .catch(() => { });
        } else {
          return await interaction
            .reply({
              components: [container],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            })
            .catch(() => { });
        }
      }
      if (command.sameVoiceChannel) {
        if (!interaction.guild || !interaction.guild.members.me) {
          const errorDisplay = new TextDisplayBuilder()
            .setContent(client.t(interaction.guildId, "core.notConnected", { warn: client.emoji.warn }));

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          return await interaction
            .reply({
              components: [container],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            })
            .catch(() => { });
        }

        const botVoiceChannel = interaction.guild.members.me.voice.channel;
        const userVoiceChannel = interaction.member.voice.channel;

        if (botVoiceChannel) {
          if (userVoiceChannel !== botVoiceChannel) {
            const errorDisplay = new TextDisplayBuilder()
              .setContent(client.t(interaction.guildId, "core.notSameVoiceSlash", { warn: client.emoji.warn, channel: botVoiceChannel.toString() }));

            const container = new ContainerBuilder()
              .addTextDisplayComponents(errorDisplay);

            return await interaction
              .reply({
                components: [container],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
              })
              .catch(() => { });
          }
        }
      }

      try {
        const interactionWrapper = {
          guild: interaction.guild,
          channel: interaction.channel,
          author: interaction.user,
          member: interaction.member,
          createdTimestamp: interaction.createdTimestamp,
          mentions: {
            channels: new Map()
          },
          reply: async (options) => {
            if (interaction.deferred) {
              return await interaction.editReply(options);
            } else if (interaction.replied) {
              return await interaction.followUp(options);
            } else {
              await interaction.reply(options);
              return await interaction.fetchReply();
            }
          },
        };

        const args = [];
        if (interaction.options) {
          const action = interaction.options.getString('action');
          const channel = interaction.options.getChannel('channel');
          const prefix = interaction.options.getString('prefix');
          const source = interaction.options.getString('source');
          const query = interaction.options.getString('query');
          const song = interaction.options.getString('song');
          const name = interaction.options.getString('name');
          const input = interaction.options.getString('input');
          const text = interaction.options.getString('text');
          const number = interaction.options.getInteger('number');
          const amount = interaction.options.getInteger('amount');
          const position = interaction.options.getInteger('position');

          if (action) args.push(action);
          if (channel) {
            args.push(channel.id);
            interactionWrapper.mentions.channels.set(channel.id, channel);
            interactionWrapper.mentions.channels.first = () => channel;
          }
          if (prefix) args.push(prefix);
          if (source) args.push(source);
          if (query) args.push(...query.split(' '));
          if (song) args.push(...song.split(' '));
          if (name) args.push(...name.split(' '));
          if (input) args.push(...input.split(' '));
          if (text) args.push(...text.split(' '));
          if (number !== null && number !== undefined) args.push(number.toString());
          if (amount !== null && amount !== undefined) args.push(amount.toString());
          if (position !== null && position !== undefined) args.push(position.toString());
        }

        if (command.slashExecute) {
          await command.slashExecute(interaction, client);
        } else if (command.execute) {
          await command.execute(interactionWrapper, args, client, prefix);
        } else if (command.run) {
          await command.run(client, interactionWrapper, prefix);
        }

        if (client.config.Webhooks?.cmdrun) {
          const { WebhookClient, EmbedBuilder } = require("discord.js");
          const web = new WebhookClient({ url: client.config.Webhooks.cmdrun });

          const getCommandString = () => {
            let cmdString = `/${interaction.commandName}`;
            if (interaction.options) {
              const subcommand = interaction.options.getSubcommand(false);
              if (subcommand) {
                cmdString += ` ${subcommand}`;
              }
              const options = interaction.options.data;
              if (options && options.length > 0) {
                const optionStrings = options
                  .filter(opt => opt.type !== 1)
                  .map(opt => `${opt.name}:${opt.value}`)
                  .join(' ');
                if (optionStrings) cmdString += ` ${optionStrings}`;
              }
            }
            return cmdString;
          };

          const commandlog = new EmbedBuilder()
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setColor(client.color)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setDescription(
              `**${client.emoji.dot} Command Used In:** \`${interaction.guild.name} | ${interaction.guild.id}\`\n` +
              `**${client.emoji.dot} Channel:** \`${interaction.channel.name} | ${interaction.channel.id}\`\n` +
              `**${client.emoji.dot} Command:** \`${command.name}\` (Slash)\n` +
              `**${client.emoji.dot} Executor:** \`${interaction.user.tag} | ${interaction.user.id}\`\n` +
              `**${client.emoji.dot} Content:** \`${getCommandString()}\``
            );

          web.send({ embeds: [commandlog] }).catch(console.error);
        }

      } catch (error) {
        // Handle Unknown Message error gracefully
        if (error.code === 10008) return;

        const errorDisplay = new TextDisplayBuilder()
          .setContent(client.t(interaction.guildId, "core.unexpectedError", { warn: client.emoji.warn }));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        if (interaction.replied || interaction.deferred) {
          await interaction
            .editReply({
              components: [container],
              flags: MessageFlags.IsComponentsV2,
            })
            .catch(() => { });
        } else {
          await interaction
            .reply({
              components: [container],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            })
            .catch(() => { });
        }
        console.error(error);
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'bioset_modal' || interaction.customId.startsWith('bio_')) {
        try {
          const command = require("../../commands/Profile/bioset");
          await command.modalHandler(interaction);
        } catch (error) {
          console.error("Error handling bioset modal submission:", error);

          const errorDisplay = new TextDisplayBuilder()
            .setContent(client.t(interaction.guildId, "core.inputError", { warn: client.emoji.warn }));

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
          }).catch(() => { });
        }
      }
    }

    if (interaction.isButton()) {
      const customIdParts = interaction.customId.split('_');
      const potentialCommandName = customIdParts[0];

      let command = client.commands.get(potentialCommandName);

      if (!command) {
        const commandName = client.aliases.get(potentialCommandName);
        if (commandName) {
          command = client.commands.get(commandName);
        }
      }

      if (command && typeof command.componentsV2 === 'function') {
        try {
          await command.componentsV2(interaction, client);
          return;
        } catch (error) {
          console.error(`Error executing componentsV2 for ${potentialCommandName}:`, error);

          const errorDisplay = new TextDisplayBuilder()
            .setContent(client.t(interaction.guildId, "core.interactionError", { cross: client.emoji.cross }));

          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          const errorMessage = {
            components: [errorContainer],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          };

          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage).catch(() => { });
          } else {
            await interaction.reply(errorMessage).catch(() => { });
          }
          return;
        }
      }

      const data = client.db.setup.get(interaction.guildId);
      if (
        data &&
        interaction.channelId === data.channelId &&
        interaction.message.id === data.messageId
      )
        return client.emit("playerButtons", interaction, data);
    }
  },
};
