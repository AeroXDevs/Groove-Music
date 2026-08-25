const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "defaultvolume",
  category: "Config",
  aliases: ["dv", "defvol"],
  cooldown: 3,
  description: "Set the default volume for this server.",
  userPrams: ["MANAGE_GUILD"],
  slashOptions: [
    {
      name: "volume",
      description: "Default volume (1-150). Leave empty to see current.",
      type: 4,
      required: false,
      min_value: 1,
      max_value: 150
    }
  ],

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

    const vol = interaction.options.getInteger("volume");
    const args = vol ? [String(vol)] : [];
    return this.execute(interactionWrapper, args, client, client.prefix);
  },

  async execute(message, args, client, prefix) {
    const guildId = message.guild.id;

    const reply = (content) => {
      const display = new TextDisplayBuilder().setContent(content);
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    };

    if (!args.length) {
      const current = client.db.defaultvolume.get(guildId) ?? 80;
      return reply(client.t(guildId, "defaultvolume.current", { e: client.emoji.info, volume: current }));
    }

    const volume = parseInt(args[0]);
    if (isNaN(volume) || volume < 1 || volume > 150) {
      return reply(client.t(guildId, "defaultvolume.invalid", { e: client.emoji.warn }));
    }

    client.db.defaultvolume.set(guildId, volume);

    return reply(client.t(guildId, "defaultvolume.set", { e: client.emoji.check, volume }));
  },
};
