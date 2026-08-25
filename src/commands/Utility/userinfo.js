const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    PermissionFlagsBits
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
    name: "userinfo",
    category: "Utility",
    description: "Get detailed information about a user",
    aliases: ["ui", "whois", "user"],
    args: false,
    usage: "userinfo [user]",
    permission: [],
    slashOptions: [
        {
            name: 'user',
            description: 'The user to get information about',
            type: 6,
            required: false
        }
    ],

    async slashExecute(interaction, client) {
        return module.exports.runInfo(interaction, client, true);
    },

    async execute(message, args, client) {
        return module.exports.runInfo(message, client, false, args);
    },

    async runInfo(context, client, isSlash, args = []) {
        const guild = context.guild;
        const author = isSlash ? context.user : context.author;

        if (isSlash && !context.deferred) await context.deferReply();

        let target;
        if (isSlash) {
            target = context.options.getUser("user") || author;
        } else {
            target = context.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : author);
        }

        if (!target) {
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "ui.userNotFound", { e: emoji.cross }));
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            const options = { components: [container], flags: MessageFlags.IsComponentsV2 };
            return isSlash ? context.editReply(options) : context.reply(options);
        }

        const member = await guild.members.fetch(target.id).catch(() => null);

        try {
            const createdAt = Math.floor(target.createdTimestamp / 1000);
            const joinedAt = member ? Math.floor(member.joinedTimestamp / 1000) : null;

            const getMainContainer = () => {
                const container = new ContainerBuilder();
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### \`${target.username}'s\` Info\n-# Requested by ${author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`));
                container.addSeparatorComponents(new SeparatorBuilder());


                const generalSection = new SectionBuilder();
                generalSection.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${emoji.hastag} **__${client.t(context.guild.id, "ui.section.general")}__**\n` +
                    `> **${client.t(context.guild.id, "ui.label.name")} :** ${target.displayName}\n` +
                    `> **${client.t(context.guild.id, "ui.label.username")} :** ${target.username}\n` +
                    `> **${client.t(context.guild.id, "ui.label.id")} :** ${target.id}\n` +
                    `> **${client.t(context.guild.id, "ui.label.nickname")} :** ${member?.nickname || "None"}\n` +
                    `> **${client.t(context.guild.id, "ui.label.isBot")} :** ${target.bot ? "Yes" : "No"}\n` +
                    `> **${client.t(context.guild.id, "ui.label.accountCreated")} :** <t:${createdAt}:R>\n` +
                    (joinedAt ? `> **${client.t(context.guild.id, "ui.label.serverJoined")} :** <t:${joinedAt}:R>` : "")
                ));

                generalSection.setThumbnailAccessory((thumbnail) =>
                    thumbnail.setURL(target.displayAvatarURL({ size: 256, dynamic: true }))
                );

                container.addSectionComponents(generalSection);

                if (member) {
                    const roles = member.roles.cache
                        .filter(r => r.name !== "@everyone")
                        .sort((a, b) => b.position - a.position);

                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `${emoji.hastag} **__${client.t(context.guild.id, "ui.section.roles")}__**\n` +
                        `> **${client.t(context.guild.id, "ui.label.topRole")} :** ${member.roles.highest.id === guild.id ? "@everyone" : `<@&${member.roles.highest.id}>`}\n` +
                        `> **${client.t(context.guild.id, "ui.label.totalRoles")} :** ${roles.size}`
                    ));
                }

                if (member) {
                    const customStatus = member.presence?.activities.find(a => a.type === 4);
                    const customText = customStatus ?
                        `${customStatus.emoji ? customStatus.emoji.toString() + " " : ""}${customStatus.state || ""}` :
                        "None";

                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `${emoji.hastag} **__${client.t(context.guild.id, "ui.section.presence")}__**\n` +
                        `> **${client.t(context.guild.id, "ui.label.status")} :** ${member.presence?.status ? member.presence.status.charAt(0).toUpperCase() + member.presence.status.slice(1) : "Offline"}\n` +
                        `> **${client.t(context.guild.id, "ui.label.custom")} :** ${customText}\n` +
                        `> **${client.t(context.guild.id, "ui.label.device")} :** ${member.presence?.clientStatus ? Object.keys(member.presence.clientStatus).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ") : "None"}`
                    ));

                    const voiceChannel = member.voice.channel;
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `${emoji.hastag} **__${client.t(context.guild.id, "ui.section.extras")}__**\n` +
                        `> **${client.t(context.guild.id, "ui.label.boosting")} :** ${member.premiumSince ? "Yes" : "No"}\n` +
                        `> **${client.t(context.guild.id, "ui.label.inVc")} :** ${voiceChannel ? voiceChannel.name : "No"}`
                    ));
                }

                if (member) {
                    const keyPermissions = [
                        { flag: PermissionFlagsBits.Administrator, name: "Administrator" },
                        { flag: PermissionFlagsBits.ManageGuild, name: "Manage Guild" },
                        { flag: PermissionFlagsBits.ManageRoles, name: "Manage Roles" },
                        { flag: PermissionFlagsBits.ManageChannels, name: "Manage Channels" },
                        { flag: PermissionFlagsBits.ManageMessages, name: "Manage Messages" },
                        { flag: PermissionFlagsBits.ManageWebhooks, name: "Manage Webhooks" },
                        { flag: PermissionFlagsBits.ManageNicknames, name: "Manage Nicknames" },
                        { flag: PermissionFlagsBits.ManageEmojisAndStickers, name: "Manage Emojis" },
                        { flag: PermissionFlagsBits.KickMembers, name: "Kick Members" },
                        { flag: PermissionFlagsBits.BanMembers, name: "Ban Members" },
                        { flag: PermissionFlagsBits.MentionEveryone, name: "Mention Everyone" }
                    ];

                    const userPerms = keyPermissions
                        .filter(p => member.permissions.has(p.flag))
                        .map(p => p.name);

                    if (userPerms.length > 0) {
                        const permsDisplay = userPerms.map(p => `**${p}**`).join(", ");
                        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `${emoji.hastag} **__${client.t(context.guild.id, "ui.section.keyPerms")}__**\n` +
                            `> ${permsDisplay}`
                        ));
                    }
                }

                if (member) {
                    let acknowledgment = "Member";
                    if (guild.ownerId === target.id) acknowledgment = "Server Owner";
                    else if (member.permissions.has(PermissionFlagsBits.Administrator)) acknowledgment = "Server Admin";
                    else if (member.permissions.has(PermissionFlagsBits.ManageMessages)) acknowledgment = "Server Moderator";

                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `${emoji.hastag} **__${client.t(context.guild.id, "ui.section.acknowledgement")}__**\n` +
                        `> **${acknowledgment}**`
                    ));
                }

                return container;
            };

            const getAvatarContainer = () => {
                const avatarURL = target.displayAvatarURL({ size: 1024, dynamic: true });
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${target.username}'s Avatar`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`[\`Download\`](${avatarURL})`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(avatarURL)));
                return container;
            };

            const getBannerContainer = async () => {
                const user = await client.users.fetch(target.id, { force: true });
                const bannerURL = user.bannerURL({ size: 1024, extension: 'png' }) || "No Banner";
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${target.username}'s Banner`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`[\`Download\`](${bannerURL})`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(bannerURL)));
                return container;
            };

            const getButtons = async (currentView) => {
                const row = new ActionRowBuilder();
                if (currentView === 'main') {
                    row.addComponents(new ButtonBuilder().setCustomId('view_avatar').setLabel('Avatar').setStyle(ButtonStyle.Secondary));
                    const user = await client.users.fetch(target.id, { force: true });
                    if (user.bannerURL()) row.addComponents(new ButtonBuilder().setCustomId('view_banner').setLabel('Banner').setStyle(ButtonStyle.Secondary));
                } else {
                    row.addComponents(new ButtonBuilder().setCustomId('back').setLabel('Back').setStyle(ButtonStyle.Primary));
                }
                return row.components.length > 0 ? row : null;
            };

            const initialComponents = [getMainContainer()];
            const initialRow = await getButtons('main');
            if (initialRow) initialComponents.push(initialRow);

            const options = {
                components: initialComponents,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            };

            const msg = isSlash ? await context.editReply(options) : await context.reply(options);

            const collector = msg.createMessageComponentCollector({
                filter: (i) => i.user.id === author.id,
                time: 60000,
                componentType: ComponentType.Button
            });

            collector.on('collect', async (interaction) => {
                let updatedContainer;
                let currentView;

                if (interaction.customId === 'view_avatar') {
                    updatedContainer = getAvatarContainer();
                    currentView = 'avatar';
                } else if (interaction.customId === 'view_banner') {
                    updatedContainer = await getBannerContainer();
                    currentView = 'banner';
                } else if (interaction.customId === 'back') {
                    updatedContainer = getMainContainer();
                    currentView = 'main';
                }

                const updatedRow = await getButtons(currentView);
                const finalComponents = [updatedContainer];
                if (updatedRow) finalComponents.push(updatedRow);

                await interaction.update({
                    components: finalComponents,
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
            });

            collector.on('end', async () => {
                const disabledRow = await getButtons('main');
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
            console.error("Error in userinfo command:", error);
            const errorDisplay = new TextDisplayBuilder().setContent(`${emoji.warn} An error occurred while fetching user information.`);
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            const errOptions = { components: [container], flags: MessageFlags.IsComponentsV2 };
            if (isSlash) return context.editReply(errOptions);
            else return context.reply(errOptions);
        }
    }
};
