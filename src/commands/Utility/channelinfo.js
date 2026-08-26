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
    ChannelType,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    PermissionFlagsBits
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
    name: "channelinfo",
    category: "Utility",
    description: "Get detailed information about a channel",
    aliases: ["ci", "channel"],
    args: false,
    usage: "channelinfo [channel]",
    permission: [],
    slashOptions: [
        {
            name: 'channel',
            description: 'The channel to get information about',
            type: 7,
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

        let channel;
        if (isSlash) {
            channel = context.options.getChannel("channel") || context.channel;
        } else {
            channel = context.mentions.channels.first() ||
                guild.channels.cache.get(args[0]) ||
                guild.channels.cache.find(c => c.name.toLowerCase() === args.slice(0).join(" ").toLowerCase()) ||
                context.channel;
        }

        if (!channel) {
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "ui.channelNotFound", { e: emoji.cross }));
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            const options = { components: [container], flags: MessageFlags.IsComponentsV2 };
            return isSlash ? context.editReply(options) : context.reply(options);
        }

        try {
            const createdAt = Math.floor(channel.createdTimestamp / 1000);
            const channelTypes = {
                0: "Text Channel",
                1: "DM",
                2: "Voice Channel",
                3: "Group DM",
                4: "Category",
                5: "Announcement Channel",
                10: "Announcement Thread",
                11: "Public Thread",
                12: "Private Thread",
                13: "Stage Channel",
                14: "Directory",
                15: "Forum Channel",
                16: "Media Channel"
            };

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### <#${channel.id}>'s Info\n-# Requested by ${author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`));
            container.addSeparatorComponents(new SeparatorBuilder());


            let generalContent =
                `${emoji.hastag} **__${client.t(context.guild.id, "ui.section.general")}__**\n` +
                `> **${client.t(context.guild.id, "ui.label.name")} :** ${channel.name}\n` +
                `> **${client.t(context.guild.id, "ui.label.id")} :** ${channel.id}\n` +
                `> **${client.t(context.guild.id, "ui.label.mention")} :** <#${channel.id}>\n` +
                `> **${client.t(context.guild.id, "ui.label.type")} :** ${channelTypes[channel.type] || "Unknown"}\n` +
                `> **${client.t(context.guild.id, "ui.label.category")} :** ${channel.parent ? channel.parent.name : "None"}\n` +
                `> **${client.t(context.guild.id, "ui.label.created")} :** <t:${createdAt}:R>\n` +
                `> **${client.t(context.guild.id, "ui.label.position")} :** ${channel.position}`;

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(generalContent));

            let settingsContent =
                `${emoji.hastag} **__${client.t(context.guild.id, "ui.section.settings")}__**\n` +
                `> **${client.t(context.guild.id, "ui.label.nsfw")} :** ${channel.nsfw ? "Yes" : "No"}`;

            if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
                settingsContent += `\n> **${client.t(context.guild.id, "ui.label.topic")} :** ${channel.topic || "None"}`;
                settingsContent += `\n> **${client.t(context.guild.id, "ui.label.slowmode")} :** ${channel.rateLimitPerUser ? `${channel.rateLimitPerUser}s` : "None"}`;
            }

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(settingsContent));

            if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
                let voiceContent =
                    `${emoji.hastag} **__${client.t(context.guild.id, "ui.section.voiceSettings")}__**\n` +
                    `> **${client.t(context.guild.id, "ui.label.bitrate")} :** ${channel.bitrate / 1000}kbps\n` +
                    `> **${client.t(context.guild.id, "ui.label.userLimit")} :** ${channel.userLimit === 0 ? "Unlimited" : channel.userLimit}\n` +
                    `> **${client.t(context.guild.id, "ui.label.region")} :** ${channel.rtcRegion || "Auto"}\n` +
                    `> **${client.t(context.guild.id, "ui.label.connected")} :** ${channel.members.size} Users`;

                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(voiceContent));
            }

            const options = {
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            };

            if (isSlash) return context.editReply(options);
            else return context.reply(options);

        } catch (error) {
            console.error("Error in channelinfo command:", error);
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "ui.channelError", { e: emoji.warn }));
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            const errOptions = { components: [container], flags: MessageFlags.IsComponentsV2 };
            if (isSlash) return context.editReply(errOptions);
            else return context.reply(errOptions);
        }
    }
};
