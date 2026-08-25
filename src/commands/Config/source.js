const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'source',
  category: 'Config',
  description: 'Set your preferred music source for searches',
  cooldown: 5,
  slashOptions: [
    {
      name: "source",
      description: "Choose your preferred music source",
      type: 3,
      required: true,
      choices: [
        { name: "YouTube Music", value: "ytmsearch" },
        { name: "YouTube", value: "ytsearch" },
        { name: "Spotify", value: "spsearch" },
        { name: "Apple Music", value: "amsearch" },
        { name: "Deezer", value: "dzsearch" },
        { name: "JioSaavn", value: "jssearch" },
        { name: "Gaana", value: "gnsearch" },
        { name: "SoundCloud", value: "scsearch" }
      ]
    }
  ],

  async slashExecute(interaction, client) {
    try {
      const selectedSource = interaction.options.getString("source");

      const sourceNames = {
        'ytmsearch': 'YouTube Music',
        'ytsearch': 'YouTube',
        'spsearch': 'Spotify',
        'amsearch': 'Apple Music',
        'dzsearch': 'Deezer',
        'jssearch': 'JioSaavn',
        'gnsearch': 'Gaana',
        'scsearch': 'SoundCloud'
      };

      const selectedSourceName = sourceNames[selectedSource];

      client.db.userpreferences.set(interaction.user.id, {
        musicSource: selectedSource
      });

      const successDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.check} Your preferred music source has been set to \`${selectedSourceName}\`**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });

    } catch (error) {
      console.error('Error in source slash command:', error);

      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} An error occurred while saving your preference. Please try again.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },

  async execute(message, args, client, prefix) {
    try {
      const sourceOptions = [
        { label: 'YouTube Music', value: 'ytmsearch', emoji: client.emoji.ytmusic },
        { label: 'YouTube', value: 'ytsearch', emoji: client.emoji.youtube },
        { label: 'Spotify', value: 'spsearch', emoji: client.emoji.spotify },
        { label: 'Apple Music', value: 'amsearch', emoji: client.emoji.applemusic },
        { label: 'Deezer', value: 'dzsearch', emoji: client.emoji.deezer },
        { label: 'JioSaavn', value: 'jssearch', emoji: client.emoji.jiosaavn },
        { label: 'Gaana', value: 'gnsearch', emoji: client.emoji.gaana },
        { label: 'SoundCloud', value: 'scsearch', emoji: client.emoji.soundcloud },
      ];

      const selectedSource = args[0];
      if (selectedSource && ['ytmsearch', 'ytsearch', 'spsearch', 'amsearch', 'dzsearch', 'jssearch', 'gnsearch', 'scsearch'].includes(selectedSource)) {
        const selectedSourceName = sourceOptions.find(opt => opt.value === selectedSource)?.label;

        client.db.userpreferences.set(message.author.id, {
          musicSource: selectedSource
        });

        const successDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.check} Your preferred music source has been set to \`${selectedSourceName}\`**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('source_select')
        .setPlaceholder('Choose your preferred music source')
        .addOptions(sourceOptions);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const response = await message.reply({ components: [row] });

      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000,
        filter: (interaction) => interaction.user.id === message.author.id
      });

      collector.on('collect', async (interaction) => {
        try {
          const selectedSource = interaction.values[0];
          const selectedSourceName = sourceOptions.find(opt => opt.value === selectedSource)?.label;

          client.db.userpreferences.set(message.author.id, {
            musicSource: selectedSource
          });

          const successDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.check} Your preferred music source has been set to \`${selectedSourceName}\`**`);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(successDisplay);

          await interaction.update({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });

        } catch (error) {
          console.error('Error updating user preference:', error);

          const errorDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.cross} An error occurred while saving your preference. Please try again.**`);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          await interaction.update({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          response.delete().catch(() => { });
        }
      });

    } catch (error) {
      console.error('Error in source command:', error);

      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} An error occurred while loading the source menu. Please try again.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
