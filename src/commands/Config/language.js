const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags
} = require("discord.js");
const { t, isSupported, languages } = require("../../utils/i18n");

const langMeta = (lang) => ({
  code: lang,
  name: t(lang, "meta.name"),
  flag: t(lang, "meta.flag")
});

module.exports = {
  name: "language",
  category: "Config",
  description: "Change the bot's language for this server.",
  args: false,
  usage: "[en/tr]",
  aliases: ["lang", "dil"],
  botPerms: ["EmbedLinks"],
  userPerms: ["ManageGuild"],
  owner: false,
  cooldown: 3,
  slashOptions: [
    {
      name: "language",
      description: "The language to use",
      type: 3,
      required: false,
      choices: languages().map((lang) => ({
        name: `${t(lang, "meta.flag")} ${t(lang, "meta.name")}`,
        value: lang
      }))
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
        if (interaction.deferred) return interaction.editReply(options);
        if (interaction.replied) return interaction.followUp(options);
        return interaction.reply(options);
      }
    };

    const args = [];
    for (const option of interaction.options?.data || []) {
      if (option.value !== undefined) args.push(option.value.toString());
    }

    return this.execute(interactionWrapper, args, client, client.prefix);
  },

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const current = client.getLang(guildId);
    const emoji = client.emoji;

    const requested = args[0]?.toLowerCase();

    // Direct form: `language tr` — set it straight away.
    if (requested) {
      if (!isSupported(requested)) {
        return message.reply({
          components: [
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                client.t(guildId, "language.unsupported", {
                  cross: emoji.cross,
                  lang: requested,
                  available: languages().map((l) => `\`${l}\``).join(", ")
                })
              )
            )
          ],
          flags: MessageFlags.IsComponentsV2
        });
      }

      return message.reply({
        components: [
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(applyLanguage(client, guildId, requested, current))
          )
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }

    // No argument: show a picker.
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`language:${message.author.id}`)
      .setPlaceholder(client.t(guildId, "language.placeholder"))
      .addOptions(
        languages().map((lang) => {
          const meta = langMeta(lang);
          return new StringSelectMenuOptionBuilder()
            .setLabel(meta.name)
            .setValue(meta.code)
            .setEmoji(meta.flag)
            .setDefault(meta.code === current);
        })
      );

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(client.t(guildId, "language.title", { info: emoji.info }))
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          client.t(guildId, "language.body", { current: langMeta(current).name })
        )
      )
      .addActionRowComponents(new ActionRowBuilder().addComponents(menu));

    const sent = await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    const collector = sent.createMessageComponentCollector({ time: 60_000 });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: client.t(guildId, "language.onlyInvoker", { cross: emoji.cross }),
          flags: MessageFlags.Ephemeral
        });
      }

      const chosen = interaction.values[0];
      const previous = client.getLang(guildId);
      const content = applyLanguage(client, guildId, chosen, previous);

      await interaction.update({
        components: [
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(content)
          )
        ],
        flags: MessageFlags.IsComponentsV2
      });

      collector.stop();
    });

    collector.on("end", (_collected, reason) => {
      if (reason === "time") sent.edit({ components: container.components }).catch(() => {});
    });
  }
};

/** Persist the language and build the confirmation text in the *new* language. */
function applyLanguage(client, guildId, lang, previous) {
  const meta = langMeta(lang);
  const label = `${meta.flag} ${meta.name}`;

  if (lang === previous) {
    return t(lang, "language.unchanged", { info: client.emoji.info, language: label });
  }

  client.setLang(guildId, lang);
  return t(lang, "language.changed", { check: client.emoji.check, language: label });
}
