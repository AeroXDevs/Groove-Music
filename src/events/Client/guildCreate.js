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
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  AuditLogEvent
} = require("discord.js");
const { t, languages, DEFAULT_LANG } = require("../../utils/i18n");
const config = require("../../config.js");
const {
  Webhooks: { guild_join },
  links: { support }
} = config;

const moment = require("moment");

module.exports = {
  name: "guildCreate",
  run: async (client, guild) => {
    const web = new WebhookClient({ url: guild_join });
    const own = await guild.fetchOwner().catch(() => null);

    const vanity = guild.vanityURLCode
      ? `[**Invite Link**](https://discord.gg/${guild.vanityURLCode})`
      : `\`No vanity URL\``;

    const embed = new EmbedBuilder()
      .setColor(client.color)
      .setThumbnail(guild.iconURL({ size: 1024 }))
      .setDescription(
        `**${client.emoji.check} Joined a Guild**\n\n` +
        `**${client.emoji.dot} Server Name:** \`${guild.name}\` \n` +
        `**${client.emoji.dot} Server ID:** \`${guild.id}\` \n` +
        `**${client.emoji.dot} Server Owner:** \`${own?.user?.username || "Unknown"}\` (${own?.id || "N/A"}) \n` +
        `**${client.emoji.dot} Member Count:** \`${guild.memberCount}\` Members \n` +
        `**${client.emoji.dot} Creation Date:** \`${moment.utc(guild.createdAt).format("DD/MMM/YYYY")}\` \n` +
        `**${client.emoji.dot} Guild Invite:** ${vanity} \n` +
        `**${client.emoji.dot} Total Servers:** \`${client.guilds.cache.size}\``
      )
      .setFooter({
        text: `Total Server Count [ ${client.guilds.cache.size} ]`,
        iconURL: client.user.displayAvatarURL(),
      })
      .setTimestamp();

    web.send({ embeds: [embed] }).catch(() => { });

    const giveawayManager = require("../../utils/giveawayManager");
    await giveawayManager.syncGiveaways(client, guild);

    try {
      if (own && own.user) {
        const recipient = own.user;
        const lang = client.getLang(guild.id);

        const buildWelcome = (language) => {
          const vars = {
            check: client.emoji.check,
            bot: client.user.username,
            guild: guild.name,
            support
          };

          const menu = new StringSelectMenuBuilder()
            .setCustomId(`language:${recipient.id}`)
            .setPlaceholder(t(language, "language.placeholder"))
            .addOptions(
              languages().map((code) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(t(code, "meta.name"))
                  .setValue(code)
                  .setEmoji(t(code, "meta.flag"))
                  .setDefault(code === language)
              )
            );

          return new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(t(language, "welcome.header", vars))
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(t(language, "welcome.body", vars))
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(t(language, "welcome.languagePrompt", vars))
            )
            .addActionRowComponents(new ActionRowBuilder().addComponents(menu))
            .addActionRowComponents(
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setLabel(t(language, "welcome.supportButton"))
                  .setStyle(ButtonStyle.Link)
                  .setURL(support)
              )
            );
        };

        const sent = await recipient.send({
          components: [buildWelcome(lang)],
          flags: MessageFlags.IsComponentsV2
        }).catch((err) => {
          console.log(`Could not send welcome DM to ${recipient.username}: ${err.message}`);
          return null;
        });

        if (sent) {
          const collector = sent.createMessageComponentCollector({ time: 10 * 60 * 1000 });

          collector.on("collect", async (interaction) => {
            if (interaction.user.id !== recipient.id) return;

            const chosen = interaction.values[0];
            try {
              client.setLang(guild.id, chosen);
            } catch (err) {
              console.error(`[i18n] Could not set language for ${guild.id}: ${err.message}`);
              return;
            }

            await interaction.update({
              components: [buildWelcome(chosen)],
              flags: MessageFlags.IsComponentsV2
            }).catch(() => { });
          });
        }
      }
    } catch (error) {
      console.error('Error sending welcome DM:', error);
    }
  },
};
