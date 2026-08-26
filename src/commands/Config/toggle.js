const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "toggle",
  aliases: ["cmd", "command"],
  category: "Config",
  cooldown: 5,
  description: "Enable or disable commands per server.",
  userPerms: ["ManageGuild"],
  slashOptions: [
    {
      name: "action",
      description: "Enable, disable, or list toggled commands",
      type: 3,
      required: true,
      choices: [
        { name: "Enable", value: "enable" },
        { name: "Disable", value: "disable" },
        { name: "List", value: "list" }
      ]
    },
    {
      name: "command",
      description: "The command name to toggle",
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
      reply: async (options) => {
        if (interaction.deferred) return await interaction.editReply(options);
        else if (interaction.replied) return await interaction.followUp(options);
        else return await interaction.reply(options);
      },
    };

    const action = interaction.options.getString("action");
    const command = interaction.options.getString("command");
    const args = [action];
    if (command) args.push(command);
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

    if (!action || !["enable", "disable", "list"].includes(action)) {
      return reply(client.t(guildId, "toggle.usage", { e: client.emoji.info, prefix }));
    }

    const existing = client.db.toggles.get(guildId);
    const disabled = existing ? JSON.parse(existing.commands || "[]") : [];

    if (action === "list") {
      if (disabled.length === 0) {
        return reply(client.t(guildId, "toggle.noneDisabled", { e: client.emoji.info }));
      }
      return reply(client.t(guildId, "toggle.list", { e: client.emoji.info, commands: disabled.map(c => `\`${c}\``).join(", ") }));
    }

    const cmdName = args[1]?.toLowerCase();
    if (!cmdName) {
      return reply(client.t(guildId, "toggle.noCommand", { e: client.emoji.cross }));
    }

    const protectedCommands = ["toggle", "help", "setprefix", "language"];
    if (protectedCommands.includes(cmdName)) {
      return reply(client.t(guildId, "toggle.protected", { e: client.emoji.cross, command: cmdName }));
    }

    const cmd = client.commands.get(cmdName) || client.commands.find(c => Array.isArray(c.aliases) ? c.aliases.includes(cmdName) : c.aliases === cmdName);
    if (!cmd) {
      return reply(client.t(guildId, "toggle.notFound", { e: client.emoji.cross, command: cmdName }));
    }

    if (action === "disable") {
      if (disabled.includes(cmd.name)) {
        return reply(client.t(guildId, "toggle.alreadyDisabled", { e: client.emoji.cross, command: cmd.name }));
      }
      disabled.push(cmd.name);
      client.db.toggles.set(guildId, { commands: JSON.stringify(disabled) });
      return reply(client.t(guildId, "toggle.disabled", { e: client.emoji.check, command: cmd.name }));
    }

    if (action === "enable") {
      const idx = disabled.indexOf(cmd.name);
      if (idx === -1) {
        return reply(client.t(guildId, "toggle.alreadyEnabled", { e: client.emoji.cross, command: cmd.name }));
      }
      disabled.splice(idx, 1);
      client.db.toggles.set(guildId, { commands: JSON.stringify(disabled) });
      return reply(client.t(guildId, "toggle.enabled", { e: client.emoji.check, command: cmd.name }));
    }
  },
};
