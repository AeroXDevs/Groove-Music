const {
  WebhookClient,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
  AuditLogEvent
} = require("discord.js");
const config = require("../../config.js");
const {
  Webhooks: { guild_leave },
  links: { support }
} = config;

const moment = require("moment");
const { t } = require("../../utils/i18n");

module.exports = {
  name: "guildDelete",
  run: async (client, guild) => {
    // Resolve the language before the cleanup below deletes the guild's row.
    const lang = client.getLang(guild.id);
    const web = new WebhookClient({ url: guild_leave });
    const own = await guild.fetchOwner().catch(() => null);

    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setThumbnail(guild.iconURL({ size: 1024 }))
      .setDescription(
        `**${client.emoji.cross} Left a Guild**\n\n` +
        `**${client.emoji.dot} Server Name:** \`${guild.name}\` \n` +
        `**${client.emoji.dot} Server ID:** \`${guild.id}\` \n` +
        `**${client.emoji.dot} Server Owner:** \`${own?.user?.username || "Unknown"}\` (${own?.id || "N/A"}) \n` +
        `**${client.emoji.dot} Member Count:** \`${guild.memberCount}\` Members \n` +
        `**${client.emoji.dot} Creation Date:** \`${moment.utc(guild.createdAt).format("DD/MMM/YYYY")}\` \n` +
        `**${client.emoji.dot} Total Servers:** \`${client.guilds.cache.size}\``
      )
      .setFooter({
        text: `Total Server Count [ ${client.guilds.cache.size} ]`,
        iconURL: client.user.displayAvatarURL(),
      })
      .setTimestamp();

    web.send({ embeds: [embed] }).catch(() => { });

    try {
      client.db.prefixes.delete(guild.id);
      client.db.guildlang.delete(guild.id);
      client.langCache.delete(guild.id);
      client.db.twofourseven.delete(guild.id);
      client.db.setup.delete(guild.id);
      client.db.autorole.delete(guild.id);
      client.db.ignorechannels.deleteForGuild(guild.id);
      client.db.invitetracking.delete(guild.id);
      client.db.invite_logs.deleteMany({ guildId: guild.id });
      client.db.vcstatus.delete(guild.id);
      client.db.voicerole.delete(guild.id);

      console.log(`[Database] Cleared data for guild: ${guild.name} (${guild.id})`);
    } catch (dbError) {
      console.error(`[Database Error] Failed to clear data for guild ${guild.id}:`, dbError);
    }

    try {
      if (client.manager) {
        if (client.manager.players.has(guild.id)) {
          const player = client.manager.players.get(guild.id);
          player.destroy().catch(() => {
            client.manager.players.delete(guild.id);
            if (client.manager.shoukaku) {
              client.manager.shoukaku.leaveVoiceChannel(guild.id).catch(() => null);
            }
          });
        } else if (client.manager.shoukaku) {
          client.manager.shoukaku.leaveVoiceChannel(guild.id).catch(() => null);
        }
      }
    } catch (playerError) {
      console.error(`[Player Error] Failed to cleanup player for guild ${guild.id}:`, playerError);
    }

    try {
      if (own && own.user) {
        const recipient = own.user;

        const goodbyeHeader = new TextDisplayBuilder()
          .setContent(t(lang, "evt.goodbyeHeader", { e: client.emoji.cross, bot: client.user.username }));

        const separator1 = new SeparatorBuilder();

        const infoDisplay = new TextDisplayBuilder()
          .setContent(
t(lang, "evt.removedFrom", { bot: client.user.username, guild: guild.name, support })
          );

        const separator2 = new SeparatorBuilder();

        const supportButton = new ButtonBuilder()
          .setLabel(t(lang, "welcome.supportButton"))
          .setStyle(ButtonStyle.Link)
          .setURL(support);

        const addBackButton = new ButtonBuilder()
          .setLabel('Invite Me')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`);

        const buttonRow = new ActionRowBuilder()
          .addComponents(supportButton, addBackButton);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(goodbyeHeader)
          .addSeparatorComponents(separator1)
          .addTextDisplayComponents(infoDisplay)
          .addSeparatorComponents(separator2)
          .addActionRowComponents(buttonRow);

        await recipient.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        }).catch((err) => {
          console.log(`Could not send goodbye DM to ${recipient.username}: ${err.message}`);
        });
      }
    } catch (error) {
      console.error('Error sending goodbye DM:', error);
    }
  },
};
