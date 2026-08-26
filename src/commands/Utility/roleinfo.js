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
    name: "roleinfo",
    category: "Utility",
    description: "Get detailed information about a role",
    aliases: ["ri", "role"],
    args: false,
    usage: "roleinfo [role]",
    permission: [],
    slashOptions: [
        {
            name: 'role',
            description: 'The role to get information about',
            type: 8,
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

        let role;
        if (isSlash) {
            role = context.options.getRole("role") || context.member.roles.highest;
        } else {
            role = context.mentions.roles.first() ||
                guild.roles.cache.get(args[0]) ||
                guild.roles.cache.find(r => r.name.toLowerCase() === args.slice(0).join(" ").toLowerCase());
        }

        if (!role) {
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "ui.roleNotFound", { e: emoji.cross }));
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            const options = { components: [container], flags: MessageFlags.IsComponentsV2 };
            return isSlash ? context.editReply(options) : context.reply(options);
        }

        try {
            const createdAt = Math.floor(role.createdTimestamp / 1000);

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### <@&${role.id}>'s Info\n-# Requested by ${author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`));
            container.addSeparatorComponents(new SeparatorBuilder());

            const generalContent =
                `${emoji.hastag} **__${client.t(context.guild.id, "ui.section.general")}__**\n` +
                `> **${client.t(context.guild.id, "ui.label.name")} :** ${role.name}\n` +
                `> **${client.t(context.guild.id, "ui.label.id")} :** ${role.id}\n` +
                `> **${client.t(context.guild.id, "ui.label.color")} :**  ${role.hexColor.toUpperCase()}\n` +
                `> **${client.t(context.guild.id, "ui.label.position")} :** ${role.position}\n` +
                `> **${client.t(context.guild.id, "ui.label.created")} :** <t:${createdAt}:R>`;

            const roleIcon = role.iconURL({ size: 256 });
            if (roleIcon) {
                const section = new SectionBuilder();
                section.addTextDisplayComponents(new TextDisplayBuilder().setContent(generalContent));
                section.setThumbnailAccessory((thumb) => thumb.setURL(roleIcon));
                container.addSectionComponents(section);
            } else {
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(generalContent));
            }

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `${emoji.hastag} **__${client.t(context.guild.id, "ui.section.settings")}__**\n` +
                `> **${client.t(context.guild.id, "ui.label.hoisted")} :** ${role.hoist ? "Yes" : "No"}\n` +
                `> **${client.t(context.guild.id, "ui.label.mentionable")} :** ${role.mentionable ? "Yes" : "No"}\n` +
                `> **${client.t(context.guild.id, "ui.label.managed")} :** ${role.managed ? "Yes" : "No"}\n` +
                `> **${client.t(context.guild.id, "ui.label.members")} :** ${role.members.size}`
            ));

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

            const rolePerms = keyPermissions
                .filter(p => role.permissions.has(p.flag))
                .map(p => p.name);

            if (rolePerms.length > 0) {
                const permsDisplay = rolePerms.map(p => `**${p}**`).join(", ");
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${emoji.hastag} **__${client.t(context.guild.id, "ui.section.keyPerms")}__**\n` +
                    `> ${permsDisplay}`
                ));
            }

            const options = {
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            };

            if (isSlash) return context.editReply(options);
            else return context.reply(options);

        } catch (error) {
            console.error("Error in roleinfo command:", error);
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "ui.roleError", { e: emoji.warn }));
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            const errOptions = { components: [container], flags: MessageFlags.IsComponentsV2 };
            if (isSlash) return context.editReply(errOptions);
            else return context.reply(errOptions);
        }
    }
};
