const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    SeparatorBuilder
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
    name: "checkvanity",
    category: "Utility",
    description: "Check if a vanity URL is available or taken",
    aliases: ["cv", "vanitycheck"],
    args: true,
    usage: "checkvanity <code>",
    permission: [],
    slashOptions: [
        {
            name: 'code',
            description: 'The vanity code to check (e.g. "groove")',
            type: 3,
            required: true
        }
    ],

    async slashExecute(interaction, client) {
        return module.exports.run(interaction, client, true);
    },

    async execute(message, args, client) {
        return module.exports.run(message, client, false, args);
    },

    async run(context, client, isSlash, args = []) {
        const author = isSlash ? context.user : context.author;
        let userInput = isSlash ? context.options.getString("code") : args[0];

        if (!userInput) {
            const noCode = new TextDisplayBuilder().setContent(client.t(context.guild.id, "ui.needVanity", { e: emoji.cross }));
            const container = new ContainerBuilder().addTextDisplayComponents(noCode);
            const options = { components: [container], flags: MessageFlags.IsComponentsV2 };
            return isSlash ? context.reply(options) : context.reply(options);
        }

        const inviteRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/([a-z0-9-]+)|(?:\.gg\/([a-z0-9-]+))/i;
        const match = userInput.match(inviteRegex);
        const vanityCode = match ? (match[1] || match[2]) : userInput;

        if (isSlash && !context.deferred) await context.deferReply();


        try {
            const response = await fetch(`https://discord.com/api/v10/invites/${vanityCode}?with_counts=true`);
            const data = await response.json();

            const container = new ContainerBuilder();

            if (response.status === 200) {
                const guildName = data.guild?.name || "Unknown Server";
                const guildId = data.guild?.id || "N/A";
                const memberCount = data.approximate_member_count || "Unknown";
                const iconHash = data.guild?.icon;

                const infoContent =
                    `${emoji.cross} **The vanity URL \` discord.gg/${vanityCode} \` is \` TAKEN \`.**\n\n` +
                    `${emoji.hastag} **__${client.t(context.guild.id, "ui.section.serverInfo")}__**\n` +
                    `> **${client.t(context.guild.id, "ui.label.name")} :** **\` ${guildName} \`**\n` +
                    `> **${client.t(context.guild.id, "ui.label.id")} :** **\` ${guildId} \`**\n` +
                    `> **${client.t(context.guild.id, "ui.label.members")} :** **\` ${memberCount.toLocaleString()} \`**`;

                if (iconHash) {
                    const iconURL = `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png?size=256`;
                    const section = new SectionBuilder();
                    section.addTextDisplayComponents(new TextDisplayBuilder().setContent(infoContent));
                    section.setThumbnailAccessory((thumb) => thumb.setURL(iconURL));
                    container.addSectionComponents(section);
                } else {
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(infoContent));
                }
            } else if (response.status === 404) {

                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${emoji.check} **The vanity URL \` discord.gg/${vanityCode} \` is \` AVAILABLE \`.**`
                ));
            } else {
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} **Discord API returned an unexpected status: \` ${response.status} \`**`));
            }

            const options = { components: [container], flags: MessageFlags.IsComponentsV2 };
            return isSlash ? context.editReply(options) : context.reply(options);

        } catch (error) {
            console.error("Error in checkvanity command:", error);
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "ui.vanityError", { e: emoji.warn }));
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            if (isSlash) return context.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            else return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
