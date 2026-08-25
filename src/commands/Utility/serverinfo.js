const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
    name: "serverinfo",
    category: "Utility",
    description: "Get detailed information about the server",
    aliases: ["si", "guildinfo", "guild"],
    args: false,
    usage: "serverinfo",
    permission: [],

    async slashExecute(interaction, client) {
        return module.exports.runInfo(interaction, client, true);
    },

    async execute(message, args, client) {
        return module.exports.runInfo(message, client, false);
    },

    async runInfo(context, client, isSlash) {
        const guild = context.guild;
        const author = isSlash ? context.user : context.author;

        if (isSlash && !context.deferred) await context.deferReply();

        try {
            const owner = await guild.fetchOwner().catch(() => null);
            const channels = guild.channels.cache;
            const roles = guild.roles.cache;
            const emojis = guild.emojis.cache;
            const stickers = guild.stickers.cache;

            let members;
            try {
                members = await guild.members.fetch();
            } catch {
                members = guild.members.cache;
            }

            const humans = members.filter(m => !m.user.bot).size;
            const bots = members.filter(m => m.user.bot).size;

            const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
            const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
            const categories = channels.filter(c => c.type === ChannelType.GuildCategory).size;
            const stageChannels = channels.filter(c => c.type === ChannelType.GuildStageVoice).size;

            const animatedEmojis = emojis.filter(e => e.animated).size;
            const staticEmojis = emojis.filter(e => !e.animated).size;

            const verificationLevels = {
                0: "None",
                1: "Low",
                2: "Medium",
                3: "High",
                4: "Very High"
            };

            const explicitContentFilter = {
                0: "Disabled",
                1: "Members without roles",
                2: "All members"
            };

            const boostLevel = guild.premiumTier || 0;
            const boostCount = guild.premiumSubscriptionCount || 0;
            const boosterRole = guild.roles.premiumSubscriberRole;
            const createdAt = Math.floor(guild.createdTimestamp / 1000);

            const getMainContainer = () => {
                const container = new ContainerBuilder();
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### \`${guild.name}'s\` Info\n-# Requested by ${author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`));
                container.addSeparatorComponents(new SeparatorBuilder());

                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.hastag} **__${client.t(context.guild.id, "ui.section.aboutServer")}__**\n` +
                    `> **${client.t(context.guild.id, "ui.label.name")} :** ${guild.name}\n` +
                    `> **Owner [ ${client.emoji.owner} ] :** ${owner ? `<@${owner.id}>` : "Unknown"}\n` +
                    `> **${client.t(context.guild.id, "ui.label.created")} :** <t:${createdAt}:R>\n` +
                    `> **${client.t(context.guild.id, "ui.label.id")} :** ${guild.id}\n` +
                    `> **${client.t(context.guild.id, "ui.label.totalMembers")} :** ${guild.memberCount}` +
                    (guild.vanityURLCode ? `\n> **${client.t(context.guild.id, "ui.label.vanity")} :** discord.gg/${guild.vanityURLCode}` : "")
                ));


                if (guild.description) {
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `${client.emoji.hastag} **__${client.t(context.guild.id, "ui.section.description")}__**\n` +
                        `> ${guild.description}`
                    ));
                }

                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.hastag} **__${client.t(context.guild.id, "ui.section.extras")}__**\n` +
                    `> **${client.t(context.guild.id, "ui.label.verificationLevel")} :** ${verificationLevels[guild.verificationLevel]}\n` +
                    `> **${client.t(context.guild.id, "ui.label.mfaLevel")} :** ${guild.mfaLevel === 1 ? 'Enabled' : 'Disabled'}\n` +
                    `> **${client.t(context.guild.id, "ui.label.contentFilter")} :** ${explicitContentFilter[guild.explicitContentFilter]}`
                ));

                const featuresText = guild.features.length > 0
                    ? guild.features.map(f => f.replace(/_/g, ' ')).join(', ').slice(0, 1000)
                    : 'No special features.';
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.hastag} **__${client.t(context.guild.id, "ui.section.features")}__**\n` +
                    `> ${featuresText}`
                ));

                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.hastag} **__${client.t(context.guild.id, "ui.section.members")}__**\n` +
                    `> **${client.t(context.guild.id, "ui.label.totalMembers")} :** ${guild.memberCount}\n` +
                    `> **${client.t(context.guild.id, "ui.label.humans")} :** ${humans}\n` +
                    `> **${client.t(context.guild.id, "ui.label.bots")} :** ${bots}`
                ));

                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.hastag} **__${client.t(context.guild.id, "ui.section.channels")}__**\n` +
                    `> **${client.t(context.guild.id, "ui.label.categories")} :** ${categories}\n` +
                    `> **${client.t(context.guild.id, "ui.label.textChannels")} :** ${textChannels}\n` +
                    `> **${client.t(context.guild.id, "ui.label.voiceChannels")} :** ${voiceChannels}\n` +
                    `> **${client.t(context.guild.id, "ui.label.stageChannels")} :** ${stageChannels}`
                ));

                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.hastag} **__${client.t(context.guild.id, "ui.section.emojis")}__**\n` +
                    `> **${client.t(context.guild.id, "ui.label.regularEmojis")} :** ${staticEmojis}\n` +
                    `> **${client.t(context.guild.id, "ui.label.animatedEmojis")} :** ${animatedEmojis}\n` +
                    `> **${client.t(context.guild.id, "ui.label.stickers")} :** ${stickers.size}\n` +
                    `> **${client.t(context.guild.id, "ui.label.total")} :** ${emojis.size + stickers.size}`
                ));

                const boostersCount = members.filter(m => m.premiumSince).size;
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.hastag} **__${client.t(context.guild.id, "ui.section.boosts")}__**\n` +
                    `> **${client.t(context.guild.id, "ui.label.boostLevel")} :** ${boostLevel} Level\n` +
                    `> **${client.t(context.guild.id, "ui.label.boostCount")} :** ${boostCount}\n` +
                    `> **${client.t(context.guild.id, "ui.label.boosters")} :** ${boostersCount}\n` +
                    `> **${client.t(context.guild.id, "ui.label.boosterRole")} :** ${boosterRole ? `<@&${boosterRole.id}>` : "None"}`
                ));

                const sortedRoles = roles.filter(r => r.name !== "@everyone").sort((a, b) => b.position - a.position);
                const rolesCount = sortedRoles.size;
                const rolesList = sortedRoles.map(r => `<@&${r.id}>`);
                let rolesDisplay = rolesList.slice(0, 15).join(', ');
                if (rolesCount > 15) rolesDisplay += ` \`and ${rolesCount - 15} more...\``;

                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.hastag} **__${client.t(context.guild.id, "ui.section.roles")}__**\n` +
                    `${rolesDisplay}`
                ));

                return container;
            };

            const getIconContainer = () => {
                const iconURL = guild.iconURL({ size: 256, extension: 'png' });
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${guild.name}'s Icon`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`[\`Download\`](${iconURL})`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(iconURL)));
                return container;
            };

            const getBannerContainer = () => {
                const bannerURL = guild.bannerURL({ size: 512, extension: 'png' });
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${guild.name}'s Banner`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`[\`Download\`](${bannerURL})`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(bannerURL)));
                return container;
            };

            const getButtons = (currentView) => {
                const row = new ActionRowBuilder();
                if (currentView === 'main') {
                    if (guild.iconURL()) row.addComponents(new ButtonBuilder().setCustomId('view_icon').setLabel('Server Icon').setStyle(ButtonStyle.Secondary));
                    if (guild.bannerURL()) row.addComponents(new ButtonBuilder().setCustomId('view_banner').setLabel('Server Banner').setStyle(ButtonStyle.Secondary));
                } else {
                    row.addComponents(new ButtonBuilder().setCustomId('back').setLabel('Back').setStyle(ButtonStyle.Primary));
                }
                return row.components.length > 0 ? row : null;
            };

            const initialComponents = [getMainContainer()];
            const initialRow = getButtons('main');
            if (initialRow) initialComponents.push(initialRow);

            const msg = isSlash
                ? await context.editReply({ components: initialComponents, flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } })
                : await context.reply({ components: initialComponents, flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

            const collector = msg.createMessageComponentCollector({
                filter: (i) => i.user.id === author.id,
                time: 60000,
                componentType: ComponentType.Button
            });

            collector.on('collect', async (interaction) => {
                let updatedContainer;
                let currentView;

                if (interaction.customId === 'view_icon') {
                    updatedContainer = getIconContainer();
                    currentView = 'icon';
                } else if (interaction.customId === 'view_banner') {
                    updatedContainer = getBannerContainer();
                    currentView = 'banner';
                } else if (interaction.customId === 'back') {
                    updatedContainer = getMainContainer();
                    currentView = 'main';
                }

                const updatedRow = getButtons(currentView);
                const finalComponents = [updatedContainer];
                if (updatedRow) finalComponents.push(updatedRow);

                await interaction.update({
                    components: finalComponents,
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
            });

            collector.on('end', () => {
                const disabledRow = getButtons('main');
                if (disabledRow) {
                    disabledRow.components.forEach(b => b.setDisabled(true));
                    msg.edit({
                        components: [getMainContainer(), disabledRow],
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { parse: [] }
                    }).catch(() => { });
                }
            });

        } catch (error) {
            console.error("Error in serverinfo command:", error);
            const errorDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.warn} An error occurred while fetching server information.**`);
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            if (isSlash) return context.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            else return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
