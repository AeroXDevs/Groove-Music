const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "guildMemberRemove",
  once: false,
  run: async (client, member) => {
    if (member.user.bot) return;

    const guildId = member.guild.id;
    const config = client.db.welcome.get(guildId);
    if (!config || !config.enabled || !config.channelId) return;

    const channel = member.guild.channels.cache.get(config.channelId);
    if (!channel) return;

    const { formatWelcomeMessage } = require("../../commands/Config/welcome");
    const template = config.goodbyeMsg || client.t(guildId, "welcome.defaultBye");
    const text = formatWelcomeMessage(template, member, member.guild);

    const display = new TextDisplayBuilder().setContent(text);
    channel.send({
      components: [new ContainerBuilder().addTextDisplayComponents(display)],
      flags: MessageFlags.IsComponentsV2
    }).catch(() => {});
  },
};
