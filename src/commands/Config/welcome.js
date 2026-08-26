const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  ChannelType
} = require("discord.js");

module.exports = {
  name: "welcome",
  aliases: ["greet", "welcomemsg"],
  category: "Config",
  cooldown: 5,
  description: "Configure welcome and goodbye messages.",
  userPerms: ["ManageGuild"],
  botPerms: ["SendMessages"],
  slashOptions: [
    {
      name: "action",
      description: "Configure welcome system",
      type: 3,
      required: true,
      choices: [
        { name: "Enable", value: "enable" },
        { name: "Disable", value: "disable" },
        { name: "Channel", value: "channel" },
        { name: "Message", value: "message" },
        { name: "Goodbye", value: "goodbye" },
        { name: "Status", value: "status" },
        { name: "Test", value: "test" }
      ]
    },
    {
      name: "input",
      description: "Channel mention or custom message text",
      type: 3,
      required: false
    }
  ],

  async slashExecute(interaction, client) {
    const interactionWrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      createdTimestamp: interaction.createdTimestamp,
      mentions: { channels: new Map() },
      reply: async (options) => {
        if (interaction.deferred) return await interaction.editReply(options);
        else if (interaction.replied) return await interaction.followUp(options);
        else return await interaction.reply(options);
      },
    };

    const action = interaction.options.getString("action");
    const input = interaction.options.getString("input");
    const args = [action];
    if (input) args.push(...input.split(" "));
    return this.execute(interactionWrapper, args, client, client.prefix);
  },

  async execute(message, args, client, prefix) {
    const guildId = message.guild.id;
    const action = args[0]?.toLowerCase();

    const reply = (content) => {
      const display = new TextDisplayBuilder().setContent(content);
      return message.reply({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    };

    if (!action || !["enable", "disable", "channel", "message", "goodbye", "status", "test"].includes(action)) {
      return reply(client.t(guildId, "welcome.usage", { e: client.emoji.info, prefix }));
    }

    const existing = client.db.welcome.get(guildId) || {};

    if (action === "status") {
      const enabled = existing.enabled ? client.t(guildId, "music.enabled") : client.t(guildId, "music.disabled");
      const ch = existing.channelId ? `<#${existing.channelId}>` : client.t(guildId, "welcome.notConfigured");
      const msg = existing.welcomeMsg || client.t(guildId, "welcome.defaultMsg");
      const bye = existing.goodbyeMsg || client.t(guildId, "welcome.defaultBye");
      return reply(client.t(guildId, "welcome.status", { e: client.emoji.info, enabled, channel: ch, message: msg, goodbye: bye }));
    }

    if (action === "enable") {
      client.db.welcome.set(guildId, { ...existing, enabled: 1 });
      return reply(client.t(guildId, "welcome.enabled", { e: client.emoji.check }));
    }

    if (action === "disable") {
      client.db.welcome.set(guildId, { ...existing, enabled: 0 });
      return reply(client.t(guildId, "welcome.disabled", { e: client.emoji.check }));
    }

    if (action === "channel") {
      const channelArg = args[1];
      if (!channelArg) {
        return reply(client.t(guildId, "welcome.noChannel", { e: client.emoji.cross }));
      }
      const channelId = channelArg.replace(/[<#>]/g, "");
      const channel = message.guild.channels.cache.get(channelId);
      if (!channel || channel.type !== ChannelType.GuildText) {
        return reply(client.t(guildId, "welcome.invalidChannel", { e: client.emoji.cross }));
      }
      client.db.welcome.set(guildId, { ...existing, channelId: channel.id });
      return reply(client.t(guildId, "welcome.channelSet", { e: client.emoji.check, channel: channel.id }));
    }

    if (action === "message") {
      const msg = args.slice(1).join(" ");
      if (!msg) {
        return reply(client.t(guildId, "welcome.variables", { e: client.emoji.info }));
      }
      client.db.welcome.set(guildId, { ...existing, welcomeMsg: msg });
      return reply(client.t(guildId, "welcome.messageSet", { e: client.emoji.check }));
    }

    if (action === "goodbye") {
      const msg = args.slice(1).join(" ");
      if (!msg) {
        return reply(client.t(guildId, "welcome.variables", { e: client.emoji.info }));
      }
      client.db.welcome.set(guildId, { ...existing, goodbyeMsg: msg });
      return reply(client.t(guildId, "welcome.goodbyeSet", { e: client.emoji.check }));
    }

    if (action === "test") {
      if (!existing.channelId) {
        return reply(client.t(guildId, "welcome.noChannel", { e: client.emoji.cross }));
      }
      const channel = message.guild.channels.cache.get(existing.channelId);
      if (!channel) {
        return reply(client.t(guildId, "welcome.invalidChannel", { e: client.emoji.cross }));
      }

      const welcomeMsg = formatWelcomeMessage(existing.welcomeMsg || client.t(guildId, "welcome.defaultMsg"), message.member, message.guild);
      const goodbyeMsg = formatWelcomeMessage(existing.goodbyeMsg || client.t(guildId, "welcome.defaultBye"), message.member, message.guild);

      const display = new TextDisplayBuilder().setContent(welcomeMsg + "\n\n---\n\n" + goodbyeMsg);
      await channel.send({
        components: [new ContainerBuilder().addTextDisplayComponents(display)],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});

      return reply(client.t(guildId, "welcome.testSent", { e: client.emoji.check, channel: existing.channelId }));
    }
  },
};

function formatWelcomeMessage(template, member, guild) {
  return template
    .replace(/{user}/g, member.toString())
    .replace(/{username}/g, member.user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{membercount}/g, guild.memberCount.toString())
    .replace(/{tag}/g, member.user.tag);
}

module.exports.formatWelcomeMessage = formatWelcomeMessage;
