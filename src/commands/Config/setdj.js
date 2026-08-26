const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "setdj",
  aliases: ["djrole", "dj"],
  category: "Config",
  cooldown: 5,
  description: "Set or remove the DJ role for music commands.",
  userPerms: ["ManageGuild"],
  slashOptions: [
    {
      name: "action",
      description: "Set or remove the DJ role",
      type: 3,
      required: true,
      choices: [
        { name: "Set", value: "set" },
        { name: "Remove", value: "remove" },
        { name: "Status", value: "status" }
      ]
    },
    {
      name: "role",
      description: "The role to set as DJ",
      type: 8,
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
      mentions: { roles: interaction.options.getRole("role") ? new Map([[interaction.options.getRole("role").id, interaction.options.getRole("role")]]) : new Map() },
      reply: async (options) => {
        if (interaction.deferred) return await interaction.editReply(options);
        else if (interaction.replied) return await interaction.followUp(options);
        else return await interaction.reply(options);
      },
    };

    const action = interaction.options.getString("action");
    const role = interaction.options.getRole("role");
    const args = [action];
    if (role) args.push(role.id);
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

    if (!action || !["set", "remove", "status"].includes(action)) {
      return reply(client.t(guildId, "setdj.usage", { e: client.emoji.info, prefix }));
    }

    const existing = client.db.djrole.get(guildId);

    if (action === "status") {
      if (!existing || !existing.roleId) {
        return reply(client.t(guildId, "setdj.notSet", { e: client.emoji.info }));
      }
      return reply(client.t(guildId, "setdj.currentRole", { e: client.emoji.info, role: existing.roleId }));
    }

    if (action === "remove") {
      if (!existing || !existing.roleId) {
        return reply(client.t(guildId, "setdj.notSet", { e: client.emoji.info }));
      }
      client.db.djrole.delete(guildId);
      return reply(client.t(guildId, "setdj.removed", { e: client.emoji.check }));
    }

    const roleArg = args[1];
    if (!roleArg) {
      return reply(client.t(guildId, "setdj.noRole", { e: client.emoji.cross }));
    }

    const roleId = roleArg.replace(/[<@&>]/g, "");
    const role = message.guild.roles.cache.get(roleId);
    if (!role) {
      return reply(client.t(guildId, "setdj.invalidRole", { e: client.emoji.cross }));
    }

    client.db.djrole.set(guildId, { roleId: role.id });
    return reply(client.t(guildId, "setdj.set", { e: client.emoji.check, role: role.id }));
  },
};
