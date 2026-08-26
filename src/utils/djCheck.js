const { PermissionsBitField } = require("discord.js");

function hasDJPermission(member, client) {
  if (client.config.ownerID?.includes(member.id)) return true;
  if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return true;

  const djData = client.db.djrole.get(member.guild.id);
  if (!djData || !djData.roleId) return true;

  return member.roles.cache.has(djData.roleId);
}

module.exports = { hasDJPermission };
