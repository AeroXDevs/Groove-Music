const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: '247',
  category: 'Config',
  aliases: ['24/7', 'alwayson'],
  description: 'Enable or disable 24/7 mode to keep the bot in voice channel',
  cooldown: 5,
  inVoiceChannel: true,
  slashOptions: [
    {
      name: "action",
      description: "Enable or disable 24/7 mode",
      type: 3,
      required: true,
      choices: [
        { name: "Enable", value: "enable" },
        { name: "Disable", value: "disable" }
      ]
    }
  ],

  async slashExecute(interaction, client) {
    const action = interaction.options.getString("action");

    const interactionWrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      reply: async (options) => {
        try {
          if (interaction.deferred || interaction.replied) {
            return await interaction.editReply(options);
          } else {
            return await interaction.reply(options);
          }
        } catch (e) {
          if (interaction.replied || interaction.deferred) {
            return await interaction.followUp(options).catch(() => { });
          }
        }
      },
    };

    const args = [action];
    return this.execute(interactionWrapper, args, client, client.prefix);
  },

  async execute(message, args, client, prefix) {
    const safeReply = async (options) => {
      try {
        return await message.reply(options);
      } catch (error) {
        return await message.channel.send(options).catch(() => { });
      }
    };

    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`### ${client.emoji.warn} **Not in Voice Channel**`);

        const separator = new SeparatorBuilder();

        const infoDisplay = new TextDisplayBuilder()
          .setContent(`You need to be in a voice channel to use this command.`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay)
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(infoDisplay);

        return safeReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const player = client.manager.players.get(message.guild.id);
      if (player && player.voiceId) {
        if (voiceChannel.id !== player.voiceId) {
          const errorDisplay = new TextDisplayBuilder()
            .setContent(`### ${client.emoji.warn} **Different Voice Channel**`);

          const separator = new SeparatorBuilder();

          const infoDisplay = new TextDisplayBuilder()
            .setContent(`You need to be in the same voice channel as me to use this command.`);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(infoDisplay);

          return safeReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }
      }

      const action = args[0]?.toLowerCase();

      if (action === 'enable') {
        client.db.twofourseven.set(message.guild.id, {
          textId: message.channel.id,
          voiceId: voiceChannel.id
        });

        let currentPlayer = client.manager.players.get(message.guild.id);
        if (!currentPlayer) {
          currentPlayer = await client.manager.createPlayer({
            guildId: message.guild.id,
            voiceId: voiceChannel.id,
            textId: message.channel.id,
            deaf: true,
            volume: 80
          });
        }

        const successDisplay = new TextDisplayBuilder()
          .setContent(`247 Current Status: \`Enabled\``);

        const separator = new SeparatorBuilder();

        const actionByDisplay = new TextDisplayBuilder()
          .setContent(`-# Action Performed by ${message.author.displayName}`);

        const successContainer = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay)
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(actionByDisplay);

        return safeReply({
          components: [successContainer],
          flags: MessageFlags.IsComponentsV2
        });

      } else if (action === 'disable') {
        client.db.twofourseven.delete(message.guild.id);

        const successDisplay = new TextDisplayBuilder()
          .setContent(`247 Current Status: \`Disabled\``);

        const separator = new SeparatorBuilder();

        const actionByDisplay = new TextDisplayBuilder()
          .setContent(`-# Action Performed by ${message.author.displayName}`);

        const successContainer = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay)
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(actionByDisplay);

        return safeReply({
          components: [successContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const current247 = client.db.twofourseven.get(message.guild.id);
      const is247Enabled = !!current247;

      const statusDisplay = new TextDisplayBuilder()
        .setContent(`247 Current Status: \`${is247Enabled ? 'Enabled' : 'Disabled'}\``);

      const separator = new SeparatorBuilder();

      const actionByDisplay = new TextDisplayBuilder()
        .setContent(`-# Action Performed by ${message.author.displayName}`);

      const enableButton = new ButtonBuilder()
        .setCustomId('247_enable')
        .setLabel('Enable')
        .setStyle(ButtonStyle.Success);

      const disableButton = new ButtonBuilder()
        .setCustomId('247_disable')
        .setLabel('Disable')
        .setStyle(ButtonStyle.Danger);

      if (is247Enabled) {
        enableButton.setDisabled(true);
      } else {
        disableButton.setDisabled(true);
      }

      const buttonRow = new ActionRowBuilder().addComponents(enableButton, disableButton);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(statusDisplay)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(actionByDisplay)
        .addActionRowComponents(buttonRow);

      const response = await safeReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });

      if (!response) return;

      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        max: 1,
        time: 60000,
        filter: (interaction) => interaction.user.id === message.author.id
      });

      collector.on('collect', async (interaction) => {
        try {
          const member = await message.guild.members.fetch(interaction.user.id);
          if (!member.voice.channel) {
            const errorDisplay = new TextDisplayBuilder()
              .setContent(`### ${client.emoji.warn} **Not in Voice Channel**`);

            const separator = new SeparatorBuilder();

            const infoDisplay = new TextDisplayBuilder()
              .setContent(`You need to be in a voice channel to use this.`);

            const errorContainer = new ContainerBuilder()
              .addTextDisplayComponents(errorDisplay)
              .addSeparatorComponents(separator)
              .addTextDisplayComponents(infoDisplay);

            return interaction.reply({
              components: [errorContainer],
              flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
          }

          const currentVoiceChannel = member.voice.channel;

          if (interaction.customId === '247_enable') {
            client.db.twofourseven.set(message.guild.id, {
              textId: message.channel.id,
              voiceId: currentVoiceChannel.id
            });

            let player = client.manager.players.get(message.guild.id);
            if (!player) {
              player = await client.manager.createPlayer({
                guildId: message.guild.id,
                voiceId: currentVoiceChannel.id,
                textId: message.channel.id,
                deaf: true,
                volume: 80
              });
            }

            const successDisplay = new TextDisplayBuilder()
              .setContent(`247 Current Status: \`Enabled\``);

            const separator = new SeparatorBuilder();

            const actionByDisplay = new TextDisplayBuilder()
              .setContent(`-# Action Performed by ${interaction.user.displayName}`);

            const successContainer = new ContainerBuilder()
              .addTextDisplayComponents(successDisplay)
              .addSeparatorComponents(separator)
              .addTextDisplayComponents(actionByDisplay);

            await interaction.update({
              components: [successContainer],
              flags: MessageFlags.IsComponentsV2
            }).catch(() => { });

          } else if (interaction.customId === '247_disable') {
            client.db.twofourseven.delete(message.guild.id);

            const successDisplay = new TextDisplayBuilder()
              .setContent(`247 Current Status: \`Disabled\``);

            const separator = new SeparatorBuilder();

            const actionByDisplay = new TextDisplayBuilder()
              .setContent(`-# Action Performed by ${interaction.user.displayName}`);

            const successContainer = new ContainerBuilder()
              .addTextDisplayComponents(successDisplay)
              .addSeparatorComponents(separator)
              .addTextDisplayComponents(actionByDisplay);

            await interaction.update({
              components: [successContainer],
              flags: MessageFlags.IsComponentsV2
            }).catch(() => { });
          }

        } catch (error) {
          console.error('Error in 247 button interaction:', error);

          const errorDisplay = new TextDisplayBuilder()
            .setContent(`### ${client.emoji.cross} **Error Occurred**`);

          const separator = new SeparatorBuilder();

          const errorInfo = new TextDisplayBuilder()
            .setContent(`An error occurred while updating 24/7 mode. Please try again.`);

          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(errorInfo);

          await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          }).catch(() => { });
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          const timeoutDisplay = new TextDisplayBuilder()
            .setContent(`247 Current Status: \`${is247Enabled ? 'Enabled' : 'Disabled'}\``);

          const separator = new SeparatorBuilder();

          const timeoutInfo = new TextDisplayBuilder()
            .setContent(`-# 247 settings menu timed out!`);

          const timeoutContainer = new ContainerBuilder()
            .addTextDisplayComponents(timeoutDisplay)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(timeoutInfo);

          response.edit({
            components: [timeoutContainer],
            flags: MessageFlags.IsComponentsV2
          }).catch(() => { });
        }
      });

    } catch (error) {
      console.error('Error in 247 command:', error);

      const errorDisplay = new TextDisplayBuilder()
        .setContent(`### ${client.emoji.cross} **Error Occurred**`);

      const separator = new SeparatorBuilder();

      const errorInfo = new TextDisplayBuilder()
        .setContent(`An error occurred while loading 247 settings. Please try again later.`);

      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(errorInfo);

      return safeReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
