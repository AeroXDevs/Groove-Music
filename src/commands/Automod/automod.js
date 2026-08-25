const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'automod',
    description: 'AutoMod configuration and management',
    category: 'Automod',
    aliases: ['am'],
    usage: 'automod <subcommand> [args]',
    example: 'automod enable | automod disable | automod punishment | automod logging',
    subCommands: ['enable', 'disable', 'whitelist', 'config', 'punishment', 'logging', 'heat', 'limits', 'reset'],
    slashOptions: [
        {
            name: 'enable',
            description: 'Enable and configure specific AutoMod modules',
            type: 1
        },
        {
            name: 'disable',
            description: 'Disable all AutoMod protections',
            type: 1
        },
        {
            name: 'whitelist',
            aliases: ['wl'],
            description: 'Manage whitelisted users, roles, and channels',
            type: 1,
            options: [
                { name: 'action', description: 'Action to perform (add/remove/show)', type: 3, required: false }
            ]
        },
        {
            name: 'config',
            description: 'View current AutoMod configuration settings',
            type: 1
        },
        {
            name: 'punishment',
            description: 'Configure punishment actions for different filters',
            type: 1
        },
        {
            name: 'logging',
            aliases: ['logs', 'log'],
            description: 'Set or disable the AutoMod logging channel',
            type: 1,
            options: [
                { name: 'channel', description: 'The channel to set for logs', type: 7, required: false }
            ]
        },
        {
            name: 'heat',
            description: 'Adjust anti-spam/heat sensitivity settings',
            type: 1
        },
        {
            name: 'limits',
            description: 'Configure mention and emoji limits',
            type: 1,
            options: [
                { name: 'type', description: 'Limit type (mention/emoji)', type: 3, required: false },
                { name: 'value', description: 'The limit value', type: 4, required: false }
            ]
        },
        {
            name: 'reset',
            description: 'Reset all AutoMod settings to default',
            type: 1
        }
    ],

    async execute(message, args, client, prefix) {
        if (!args.length) return this.sendHelpMenu(message, client, prefix);
        const subcommand = args[0].toLowerCase();
        return await this.handleAutomod(message, subcommand, args.slice(1), client, prefix);
    },

    async handleAutomod(context, subcommand, options, client, prefix) {
        const guild = context.guild;
        const member = context.member;
        const user = context.author || context.user;

        const isOwner = client.owners.includes(user.id);
        if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !isOwner) {
            return this.error(context, 'You need `Manage Server` permission to use this command.');
        }

        const realSub = subcommand;

        try {
            if (!client.automod) {
                console.error("[AutoMod Error] client.automod is undefined!");
                return this.error(context, "AutoMod system is not initialized. Please restart the bot or contact the developer.");
            }

            const settings = client.automod.getSettings(guild.id);
            const isEnabled = settings.antiLink || settings.antiInvite || settings.antiSpam ||
                settings.antiMention || settings.antiCaps || settings.antiEmoji ||
                settings.antiNsfw;

            switch (realSub) {
                case 'enable':
                    return this.enableMenu(context, client);
                case 'disable':
                    if (!isEnabled) return this.error(context, client.t(context.guild.id, "am.alreadyDisabled"));
                    return this.disableMenu(context, client);
                case 'whitelist':
                case 'wl':
                    if (!isEnabled) return this.error(context, 'Please enable AutoMod first using `automod enable`.');
                    return this.whitelistMenu(context, options, client, prefix);
                case 'punishment':
                case 'punish':
                case 'punishments':
                    if (!isEnabled) return this.error(context, 'Please enable AutoMod first using `automod enable`.');
                    return this.punishmentMenu(context, client);
                case 'logging':
                case 'logs':
                case 'log':
                    if (!isEnabled) return this.error(context, 'Please enable AutoMod first using `automod enable`.');
                    return this.loggingMenu(context, options, client);
                case 'heat':
                case 'heatsettings':
                case 'sensitivity':
                    if (!isEnabled) return this.error(context, 'Please enable AutoMod first using `automod enable`.');
                    return this.heatMenu(context, client);
                case 'config':
                case 'show':
                    return this.showConfig(context, client);
                case 'limits':
                case 'limit':
                case 'setting':
                case 'settings':
                    if (!isEnabled) return this.error(context, 'Please enable AutoMod first using `automod enable`.');
                    return this.limitsMenu(context, options, client);
                case 'reset':
                    client.automod.updateSettings(guild.id, {
                        antiLink: false, antiInvite: false, antiSpam: false,
                        antiMention: false, antiCaps: false, antiEmoji: false,
                        antiNsfw: false, whitelistRoles: [], whitelistChannels: [],
                        whitelistUsers: [], logChannel: null, action: 'delete',
                        punishments: {}, heatSettings: {}
                    });
                    return this.success(context, client.t(context.guild.id, "am.reset"));
                default:
                    return this.sendHelpMenu(context, client, prefix);
            }
        } catch (err) {
            console.error(err);
            return this.error(context, client.t(context.guild.id, "am.error", { message: err.message }));
        }
    },

    async punishmentMenu(context, client) {
        const guildId = context.guild.id;
        const user = context.author || context.user;
        const settings = client.automod.getSettings(guildId);

        const createMainEmbed = (selectedFilters = [], successMsg = null) => {
            const pun = settings.punishments || {};
            const format = (key) => {
                const p = pun[key] || settings.action || 'delete';
                let label = 'Escalating';
                if (p === 'mute') label = 'Mute';
                if (p === 'kick') label = 'Kick';
                if (p === 'ban') label = 'Ban';
                return `**__${label}__**`;
            };

            let content = `**AutoMod Punishments !**\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Spam: ${format('antiSpam')}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Caps: ${format('antiCaps')}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Link: ${format('antiLink')}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Invite: ${format('antiInvite')}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Mention: ${format('antiMention')}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Emoji: ${format('antiEmoji')}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-NSFW: ${format('antiNsfw')}\n\n`;

            if (successMsg) {
                content += `${successMsg}\n\n`;
            }

            content += `**Selected Filters :**\n` +
                `${selectedFilters.length ? selectedFilters.map(f => `╰ **${this.getFilterLabel(f)}**`).join('\n') : "╰ `None`"}`;

            return new TextDisplayBuilder().setContent(content);
        };

        const createComponents = (selectedFilters = []) => {
            const filterMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("am_punish_filter_select")
                    .setPlaceholder("Select filters")
                    .setMinValues(1).setMaxValues(7)
                    .addOptions([
                        { label: "Anti spam", value: "antiSpam" },
                        { label: "Anti caps", value: "antiCaps" },
                        { label: "Anti link", value: "antiLink" },
                        { label: "Anti invites", value: "antiInvite" },
                        { label: "Anti mention", value: "antiMention" },
                        { label: "Anti emoji", value: "antiEmoji" },
                        { label: "Anti NSFW", value: "antiNsfw" }
                    ])
            );

            const punishMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("am_punish_action_select")
                    .setPlaceholder("Select a punishment")
                    .addOptions([
                        { label: "Escalating", description: "Warn -> Mute -> Kick -> Ban (Dynamic Enforcement)", value: "delete" },
                        { label: "Mute", description: "Timeout a user for a specific duration.", value: "mute" },
                        { label: "Kick", description: "Kick a user from the server.", value: "kick" },
                        { label: "Ban", description: "Ban a user from the server.", value: "ban" }
                    ])
            );

            const controlRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("am_punish_done").setLabel("Done").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("am_punish_close").setLabel("Close").setStyle(ButtonStyle.Danger)
            );

            return [filterMenu, punishMenu, controlRow];
        };

        let selectedFilters = [];
        const msg = await context.reply({
            components: [new ContainerBuilder().addTextDisplayComponents(createMainEmbed(selectedFilters)), ...createComponents(selectedFilters)],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === user.id,
            time: 120000
        });

        collector.on("collect", async (i) => {
            if (i.customId === "am_punish_close") {
                return i.message.delete().catch(() => { });
            }

            if (i.customId === "am_punish_done") {
                await i.update({
                    components: [new ContainerBuilder().addTextDisplayComponents(createMainEmbed(selectedFilters))],
                    flags: MessageFlags.IsComponentsV2
                });
                return collector.stop();
            }

            if (i.customId === "am_punish_filter_select") {
                selectedFilters = i.values;
                await i.update({
                    components: [new ContainerBuilder().addTextDisplayComponents(createMainEmbed(selectedFilters)), ...createComponents(selectedFilters)],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (i.customId === "am_punish_action_select") {
                if (!selectedFilters.length) {
                    return i.reply({ content: client.t(context.guild.id, "am.selectFilterFirst", { e: emoji.warn }), flags: MessageFlags.Ephemeral });
                }

                const action = i.values[0];
                const updatedSettings = client.automod.getSettings(guildId);
                const currentPunStore = updatedSettings.punishments || {};
                selectedFilters.forEach(f => currentPunStore[f] = action);

                client.automod.updateSettings(guildId, { punishments: currentPunStore });

                const displayLabel = action === 'delete' ? 'ESCALATING' : action.toUpperCase();
                const successMsg = client.t(context.guild.id, "am.punishUpdated", { e: emoji.check, value: displayLabel });

                await i.update({
                    components: [new ContainerBuilder().addTextDisplayComponents(createMainEmbed(selectedFilters, successMsg)), ...createComponents(selectedFilters)],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        });
    },

    getFilterLabel(key) {
        const labels = {
            antiSpam: "Anti Spam",
            antiCaps: "Anti Caps",
            antiLink: "Anti Link",
            antiInvite: "Anti Invites",
            antiMention: "Anti Mention",
            antiEmoji: "Anti Emoji",
            antiNsfw: "Anti NSFW"
        };
        return labels[key] || key;
    },

    async loggingMenu(context, options, client) {
        const guildId = context.guild.id;
        const arg = options[0];
        const channel = context.mentions.channels.first() ||
            (arg ? context.guild.channels.cache.get(arg.replace(/[<#>]/g, '')) : null);

        if (channel) {
            if (![ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread].includes(channel.type)) {
                return this.error(context, "Please provide a valid text-based channel (Text, Announcement, or Thread).");
            }
            client.automod.updateSettings(guildId, { logChannel: channel.id });
            return this.success(context, client.t(context.guild.id, "am.logSetTo", { e: emoji.check, channel }));
        }

        const settings = client.automod.getSettings(guildId);
        const display = new TextDisplayBuilder()
            .setContent(
                `**AutoMod Logging !**\n` +
                `${emoji.blank}${emoji.wickarrow} Channel: **__${settings.logChannel ? `<#${settings.logChannel}>` : client.t(context.guild.id, "am.none")}__**\n\n` +
                client.t(context.guild.id, "am.channelHint")
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("am_log_disable").setLabel("Disable Logging").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("am_log_close").setLabel("Close").setStyle(ButtonStyle.Secondary)
        );

        const msg = await context.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display), row], flags: MessageFlags.IsComponentsV2 });

        const authorId = (context.author || context.user).id;
        const collector = msg.createMessageComponentCollector({ filter: (i) => i.user.id === authorId, time: 60000 });
        const msgCollector = context.channel.createMessageCollector({
            filter: (m) => m.author.id === authorId,
            time: 60000,
            max: 1
        });

        msgCollector.on("collect", async (m) => {
            const target = m.mentions.channels.first() || context.guild.channels.cache.get(m.content.trim().replace(/[<#>]/g, ''));
            if (target) {
                if (![ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread].includes(target.type)) {
                    const errorDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "am.needTextChannel", { e: emoji.warn }));
                    msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(errorDisplay)], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
                    return;
                }

                client.automod.updateSettings(guildId, { logChannel: target.id });
                collector.stop();
                msgCollector.stop();

                const successDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "am.logSetTo", { e: emoji.check, channel: target }));
                const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);

                if (msg.editable) {
                    await msg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
                }

                if (m.deletable) m.delete().catch(() => null);
            }
        });

        collector.on("collect", async (i) => {
            if (i.customId === "am_log_disable") {
                msgCollector.stop();
                client.automod.updateSettings(guildId, { logChannel: null });
                await i.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(context.guild.id, "am.logDisabled", { e: emoji.check })))], flags: MessageFlags.IsComponentsV2 });
                collector.stop();
            } else if (i.customId === "am_log_close") {
                msgCollector.stop();
                return i.message.delete().catch(() => { });
            }
        });
    },

    async success(context, msg) {
        const display = new TextDisplayBuilder().setContent(`${emoji.check} ${msg}`);
        const container = new ContainerBuilder().addTextDisplayComponents(display);
        try {
            return await context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (e) {
            return await context.channel?.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
        }
    },

    async error(context, msg) {
        const display = new TextDisplayBuilder().setContent(`${emoji.warn} ${msg}`);
        const container = new ContainerBuilder().addTextDisplayComponents(display);
        try {
            return await context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (e) {
            return await context.channel?.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
        }
    },

    async enableMenu(context, client) {
        const guildId = context.guild.id;
        const user = context.author || context.user;
        const settings = client.automod.getSettings(guildId);

        const isAnyEnabled = settings.antiSpam || settings.antiCaps || settings.antiLink ||
            settings.antiInvite || settings.antiMention || settings.antiEmoji ||
            settings.antiNsfw;

        const getDisplay = (s) => {
            const statusLabel = (val) => val ? emoji.check : emoji.cross;
            let content = `**AutoMod Modules !**\n`;

            if (isAnyEnabled) {
                content = client.t(context.guild.id, "am.enabled") +
                    `╰ *Use \`automod config\` to view full details or edit below.*\n\n`;
            }

            content += `${emoji.blank}${emoji.wickarrow} Anti-Spam: ${statusLabel(s.antiSpam)}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Caps: ${statusLabel(s.antiCaps)}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Link: ${statusLabel(s.antiLink)}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Invite: ${statusLabel(s.antiInvite)}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Mention: ${statusLabel(s.antiMention)}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Emoji: ${statusLabel(s.antiEmoji)}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-NSFW: ${statusLabel(s.antiNsfw)}`;

            return new TextDisplayBuilder().setContent(content);
        };

        const createSelectRow = (s) => {
            return new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("am_enable_select")
                    .setPlaceholder("Select modules to toggle...")
                    .setMinValues(1).setMaxValues(7)
                    .addOptions([
                        { label: `Anti spam`, value: "antiSpam", default: !!s.antiSpam },
                        { label: `Anti caps`, value: "antiCaps", default: !!s.antiCaps },
                        { label: `Anti link`, value: "antiLink", default: !!s.antiLink },
                        { label: `Anti invites`, value: "antiInvite", default: !!s.antiInvite },
                        { label: `Anti mention`, value: "antiMention", default: !!s.antiMention },
                        { label: `Anti emoji`, value: "antiEmoji", default: !!s.antiEmoji },
                        { label: `Anti NSFW`, value: "antiNsfw", default: !!s.antiNsfw }
                    ])
            );
        };

        const allEnabled = settings.antiSpam && settings.antiCaps && settings.antiLink &&
            settings.antiInvite && settings.antiMention && settings.antiEmoji &&
            settings.antiNsfw;

        const buttonRow = new ActionRowBuilder().addComponents(
            allEnabled ?
                new ButtonBuilder().setCustomId("am_disable_all_btn").setLabel("Disable All").setStyle(ButtonStyle.Danger) :
                new ButtonBuilder().setCustomId("am_enable_all").setLabel("Enable All").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("am_enable_done").setLabel("Done").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("am_enable_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
        );

        const msg = await context.reply({
            components: [new ContainerBuilder().addTextDisplayComponents(getDisplay(settings)), createSelectRow(settings), buttonRow],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = msg.createMessageComponentCollector({ filter: (i) => i.user.id === user.id, time: 120000 });

        collector.on("collect", async (i) => {
            let s = client.automod.getSettings(guildId);
            if (i.customId === "am_enable_select") {
                const values = i.values;
                const update = {
                    antiSpam: values.includes("antiSpam"),
                    antiCaps: values.includes("antiCaps"),
                    antiLink: values.includes("antiLink"),
                    antiInvite: values.includes("antiInvite"),
                    antiMention: values.includes("antiMention"),
                    antiEmoji: values.includes("antiEmoji"),
                    antiNsfw: values.includes("antiNsfw")
                };
                client.automod.updateSettings(guildId, update);
                s = client.automod.getSettings(guildId);
                await i.update({
                    components: [new ContainerBuilder().addTextDisplayComponents(getDisplay(s)), createSelectRow(s), buttonRow]
                });
            } else if (i.customId === "am_disable_all_btn") {
                const update = {
                    antiLink: false, antiInvite: false, antiSpam: false,
                    antiMention: false, antiCaps: false, antiEmoji: false, antiNsfw: false
                };
                client.automod.updateSettings(guildId, update);
                s = client.automod.getSettings(guildId);

                const newButtonRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("am_enable_all").setLabel("Enable All").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("am_enable_done").setLabel("Done").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("am_enable_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
                );

                await i.update({
                    components: [new ContainerBuilder().addTextDisplayComponents(getDisplay(s)), createSelectRow(s), newButtonRow]
                });
            } else if (i.customId === "am_enable_all") {
                const update = {
                    antiLink: true, antiInvite: true, antiSpam: true,
                    antiMention: true, antiCaps: true, antiEmoji: true, antiNsfw: true
                };
                client.automod.updateSettings(guildId, update);
                s = client.automod.getSettings(guildId);

                const newButtonRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("am_disable_all_btn").setLabel("Disable All").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId("am_enable_done").setLabel("Done").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("am_enable_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
                );

                await i.update({
                    components: [new ContainerBuilder().addTextDisplayComponents(getDisplay(s)), createSelectRow(s), newButtonRow]
                });
            } else if (i.customId === "am_enable_done") {
                await i.update({
                    components: [new ContainerBuilder().addTextDisplayComponents(getDisplay(s))],
                    flags: MessageFlags.IsComponentsV2
                });
                collector.stop();
            } else if (i.customId === "am_enable_cancel") {
                await i.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Configuration closed.`))], flags: MessageFlags.IsComponentsV2 });
                collector.stop();
            }
        });
    },

    async disableMenu(context, client) {
        const guildId = context.guild.id;
        const user = context.author || context.user;

        const display = new TextDisplayBuilder()
            .setContent(
                `**Disable AutoMod !**\n` +
                client.t(context.guild.id, "am.confirmDisableAll", { blank: emoji.blank, arrow: emoji.wickarrow })
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("am_disable_confirm").setLabel("Yes, Disable All").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("am_disable_cancel").setLabel("No, Keep Enabled").setStyle(ButtonStyle.Secondary)
        );

        const msg = await context.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display), row], flags: MessageFlags.IsComponentsV2 });
        const collector = msg.createMessageComponentCollector({ filter: (i) => i.user.id === user.id, time: 60000 });

        collector.on("collect", async (i) => {
            if (i.customId === "am_disable_confirm") {
                client.automod.updateSettings(guildId, {
                    antiLink: false, antiInvite: false, antiSpam: false,
                    antiMention: false, antiCaps: false, antiEmoji: false, antiNsfw: false
                });
                await i.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(context.guild.id, "am.allDisabled", { e: emoji.check })))], flags: MessageFlags.IsComponentsV2 });
                collector.stop();
            } else if (i.customId === "am_disable_cancel") {
                await i.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} AutoMod remains active.`))], flags: MessageFlags.IsComponentsV2 });
                collector.stop();
            }
        });
    },

    async whitelistMenu(context, args, client, prefix) {
        const guildId = context.guild.id;
        const authorId = (context.author || context.user).id;
        const subAction = args[0]?.toLowerCase();

        if (subAction === 'show' || subAction === 'list') {
            const s = client.automod.getSettings(guildId);
            const sections = [];

            if (s.whitelistUsers?.length > 0) {
                const userList = s.whitelistUsers.map((id, i) => `\`${(i + 1).toString().padStart(2, '0')}.\` : <@${id}>`).join('\n');
                sections.push(`${emoji.hastag} **__Users__**\n${userList}`);
            }

            if (s.whitelistRoles?.length > 0) {
                const roleList = s.whitelistRoles.map((id, i) => `\`${(i + 1).toString().padStart(2, '0')}.\` : <@&${id}>`).join('\n');
                sections.push(`${emoji.hastag} **__${client.t(context.guild.id, "ui.section.roles")}__**\n${roleList}`);
            }

            if (s.whitelistChannels?.length > 0) {
                const channelList = s.whitelistChannels.map((id, i) => `\`${(i + 1).toString().padStart(2, '0')}.\` : <#${id}>`).join('\n');
                sections.push(`${emoji.hastag} **__${client.t(context.guild.id, "ui.section.channels")}__**\n${channelList}`);
            }

            if (sections.length === 0) {
                const display = new TextDisplayBuilder().setContent(client.t(context.guild.id, "am.whitelistEmpty", { e: emoji.warn }));
                return context.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(display)],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const display = new TextDisplayBuilder()
                .setContent(`**AutoMod Whitelist !**\n\n` + sections.join('\n\n'));

            return context.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(display)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });
        }

        if (subAction === 'remove') {
            const arg = args[1];
            const target = context.mentions.roles.first() ||
                context.mentions.channels.first() ||
                context.mentions.users.first() ||
                (arg ? (context.guild.members.cache.get(arg.replace(/[<@!&>]/g, '')) ||
                    context.guild.roles.cache.get(arg.replace(/[<@!&>]/g, '')) ||
                    context.guild.channels.cache.get(arg.replace(/[<#>]/g, ''))) : null);

            if (!target) return this.error(context, `Please mention a role, channel, or user to remove from whitelist. Usage: \`${prefix}automod whitelist remove <@mention/id>\``);

            const s = client.automod.getSettings(guildId);
            s.whitelistRoles = s.whitelistRoles.filter(x => x !== target.id);
            s.whitelistChannels = s.whitelistChannels.filter(x => x !== target.id);
            s.whitelistUsers = s.whitelistUsers.filter(x => x !== target.id);

            client.automod.updateSettings(guildId, s);
            return this.success(context, `Removed **${target.name || target.user?.tag || target.tag || target.id}** from whitelist.`);
        }

        const initialArg = args[0];
        const initialTarget = context.mentions.roles.first() ||
            context.mentions.channels.first() ||
            context.mentions.users.first() ||
            (initialArg ? (context.guild.members.cache.get(initialArg.replace(/[<@!&>]/g, '')) ||
                context.guild.roles.cache.get(initialArg.replace(/[<@!&>]/g, '')) ||
                context.guild.channels.cache.get(initialArg.replace(/[<#>]/g, ''))) : null);

        if (initialTarget) {
            const s = client.automod.getSettings(guildId);
            const id = initialTarget.id;
            if ('color' in initialTarget && 'hoist' in initialTarget) s.whitelistRoles = [...new Set([...s.whitelistRoles, id])];
            else if (initialTarget.isTextBased && typeof initialTarget.isTextBased === 'function' && initialTarget.isTextBased()) s.whitelistChannels = [...new Set([...s.whitelistChannels, id])];
            else if ([ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread].includes(initialTarget.type)) s.whitelistChannels = [...new Set([...s.whitelistChannels, id])];
            else s.whitelistUsers = [...new Set([...s.whitelistUsers, id])];

            client.automod.updateSettings(guildId, s);
            return this.success(context, `Added **${initialTarget.name || initialTarget.user?.tag || initialTarget.tag || initialTarget.id}** to whitelist.`);
        }

        const display = new TextDisplayBuilder()
            .setContent(
                `**AutoMod Whitelist !**\n` +
                client.t(context.guild.id, "am.whitelistHint", { blank: emoji.blank, arrow: emoji.wickarrow }) +
                client.t(context.guild.id, "am.idHint")
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("am_wl_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
        );

        const msg = await context.reply({
            components: [new ContainerBuilder().addTextDisplayComponents(display), row],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = msg.createMessageComponentCollector({ filter: (i) => i.user.id === authorId, time: 60000 });
        const msgCollector = context.channel.createMessageCollector({
            filter: (m) => m.author.id === authorId,
            time: 60000,
            max: 1
        });

        msgCollector.on("collect", async (m) => {
            const resolved = m.mentions.roles.first() ||
                m.mentions.channels.first() ||
                m.mentions.users.first() ||
                (m.content.trim() ? (context.guild.members.cache.get(m.content.trim().replace(/[<@!&>]/g, '')) ||
                    context.guild.roles.cache.get(m.content.trim().replace(/[<@!&>]/g, '')) ||
                    context.guild.channels.cache.get(m.content.trim().replace(/[<#>]/g, ''))) : null);

            if (resolved) {
                if (m.deletable) m.delete().catch(() => null);
                collector.stop();
                msgCollector.stop();

                const s = client.automod.getSettings(guildId);
                const id = resolved.id;
                if ('color' in resolved && 'hoist' in resolved) s.whitelistRoles = [...new Set([...s.whitelistRoles, id])];
                else if (resolved.isTextBased && typeof resolved.isTextBased === 'function' && resolved.isTextBased()) s.whitelistChannels = [...new Set([...s.whitelistChannels, id])];
                else if ([ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread].includes(resolved.type)) s.whitelistChannels = [...new Set([...s.whitelistChannels, id])];
                else s.whitelistUsers = [...new Set([...s.whitelistUsers, id])];

                client.automod.updateSettings(guildId, s);

                const successDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "am.whitelistAdded", { e: emoji.check, value: resolved.name || resolved.user?.tag || resolved.tag || resolved.id }));
                await msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(successDisplay)], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
            }
        });

        collector.on("collect", async (i) => {
            if (i.customId === "am_wl_cancel") {
                msgCollector.stop();
                await i.update({
                    components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Whitelist configuration cancelled.`))],
                    flags: MessageFlags.IsComponentsV2
                });
                collector.stop();
            }
        });
    },

    async showConfig(context, client) {
        const s = client.automod.getSettings(context.guild.id);
        const status = (val) => val ? emoji.check : emoji.cross;

        const display = new TextDisplayBuilder()
            .setContent(
                `**AutoMod Configuration !**\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Spam: ${status(s.antiSpam)}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Link: ${status(s.antiLink)}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Invite: ${status(s.antiInvite)}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Mention: ${status(s.antiMention)} (Max: **__${s.maxMentions}__**)\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Caps: ${status(s.antiCaps)}\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-Emoji: ${status(s.antiEmoji)} (Max: **__${s.maxEmoji || 10}__**)\n` +
                `${emoji.blank}${emoji.wickarrow} Anti-NSFW: ${status(s.antiNsfw)}\n` +
                `${emoji.blank}${emoji.wickarrow} ${client.t(context.guild.id, "am.label.logChannel")}: **__${s.logChannel ? `<#${s.logChannel}>` : client.t(context.guild.id, "am.none")}__**\n` +
                `${emoji.blank}${emoji.wickarrow} ${client.t(context.guild.id, "am.label.globalAction")}: **__${s.action?.toUpperCase() || "DELETE"}__**`
            );
        return context.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    },

    async sendHelpMenu(message, client, prefix) {
        const usedPrefix = prefix || client.prefix;
        const author = message.author || message.user;

        const allItems = [
            { cmd: 'automod enable', desc: client.t(message.guild.id, "desc.configureEnableAutomodModules") },
            { cmd: 'automod disable', desc: client.t(message.guild.id, "desc.disableAutomodProtections") },
            { cmd: 'automod config', desc: client.t(message.guild.id, "desc.viewCurrentAutomodConfiguration") },
            { cmd: 'automod punishment', desc: client.t(message.guild.id, "desc.setupCustomPunishmentsFilters") },
            { cmd: 'automod logging', desc: client.t(message.guild.id, "desc.setDisableLoggingChannel") },
            { cmd: 'automod heat', desc: client.t(message.guild.id, "desc.adjustSensitivityheatEachFilter") },
            { cmd: 'automod limits', desc: client.t(message.guild.id, "desc.setMaxAllowedEmojismentions") },
            { cmd: 'automod whitelist <target>', desc: client.t(message.guild.id, "desc.whitelistRoleUserChannel") },
            { cmd: 'automod whitelist remove <target>', desc: client.t(message.guild.id, "desc.removeItemWhitelist") },
            { cmd: 'automod whitelist show', desc: client.t(message.guild.id, "desc.showWhitelistedUsersroleschannels") },
            { cmd: 'automod reset', desc: client.t(message.guild.id, "desc.resetAutomodSettingsDefault") }
        ];

        const pageSize = 5;
        const pageCount = Math.ceil(allItems.length / pageSize);

        const createContainer = (pageIdx) => {
            const start = pageIdx * pageSize;
            const end = start + pageSize;
            const items = allItems.slice(start, end);

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(message.guild.id, "am.helpTitle", { e: emoji.info, page: pageIdx + 1, total: pageCount })));
            container.addSeparatorComponents(new SeparatorBuilder());

            const content = items.map(item => `> ** \`${usedPrefix}${item.cmd}\` **\n╰ ${item.desc}`).join('\n\n');
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

            container.addSeparatorComponents(new SeparatorBuilder());
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`\n-# Requested by ${author.displayName}`));

            const row = new ActionRowBuilder();
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`am_help_home`)
                    .setLabel('Home')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIdx === 0),
                new ButtonBuilder()
                    .setCustomId(`am_help_prev_${pageIdx}`)
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIdx === 0),
                new ButtonBuilder()
                    .setCustomId(`am_help_next_${pageIdx}`)
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIdx === pageCount - 1),
                new ButtonBuilder()
                    .setCustomId("am_help_close")
                    .setLabel('Close')
                    .setStyle(ButtonStyle.Danger)
            );

            return { container, row };
        };

        const initial = createContainer(0);
        const msg = await message.reply({
            components: [initial.container, initial.row],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === author.id,
            time: 60000
        });

        collector.on("collect", async (i) => {
            if (i.customId === "am_help_close") {
                return i.message.delete().catch(() => { });
            }

            if (i.customId === "am_help_home") {
                const { container, row } = createContainer(0);
                return await i.update({
                    components: [container, row],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const isNext = i.customId.startsWith("am_help_next_");
            const isPrev = i.customId.startsWith("am_help_prev_");

            if (isNext || isPrev) {
                const currentPage = parseInt(i.customId.split("_").pop());
                const newPage = isNext ? currentPage + 1 : currentPage - 1;
                const { container, row } = createContainer(newPage);

                await i.update({
                    components: [container, row],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        });
    },
    async heatMenu(context, client) {
        const guildId = context.guild.id;
        const user = context.author || context.user;

        const getSettings = () => client.automod.getSettings(guildId);

        const createHeatEmbed = (s) => {
            const hs = s.heatSettings || {};
            return new TextDisplayBuilder()
                .setContent(
                    `**Heat & Sensitivity !**\n` +
                    `${emoji.blank}${emoji.wickarrow} ${client.t(context.guild.id, "am.label.messages")}: **__${hs.msg || 15}%__**\n` +
                    `${emoji.blank}${emoji.wickarrow} ${client.t(context.guild.id, "am.label.links")}: **__${hs.link || 60}%__**\n` +
                    `${emoji.blank}${emoji.wickarrow} ${client.t(context.guild.id, "am.label.invites")}: **__${hs.invite || 70}%__**\n` +
                    `${emoji.blank}${emoji.wickarrow} ${client.t(context.guild.id, "am.label.mentions")}: **__${hs.mention || 25}%__**\n` +
                    `${emoji.blank}${emoji.wickarrow} NSFW: **__${hs.nsfw || 100}%__**\n` +
                    `${emoji.blank}${emoji.wickarrow} ${client.t(context.guild.id, "am.label.capsEmoji")}: **__${hs.caps || 35}%__**`
                );
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("am_heat_edit").setLabel("Edit Heat Values").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("am_heat_close").setLabel("Close").setStyle(ButtonStyle.Danger)
        );

        const msg = await context.reply({
            components: [new ContainerBuilder().addTextDisplayComponents(createHeatEmbed(getSettings())), row],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = msg.createMessageComponentCollector({ filter: (i) => i.user.id === user.id, time: 300000 });

        collector.on("collect", async (i) => {
            if (i.customId === "am_heat_close") return i.message.delete().catch(() => { });

            if (i.customId === "am_heat_edit") {
                const s = getSettings();
                const hs = s.heatSettings || {};

                const modal = new ModalBuilder()
                    .setCustomId("am_heat_modal")
                    .setTitle("Adjust Heat Sensitivity (%)");

                const inputs = [
                    new TextInputBuilder().setCustomId("msg").setLabel("Message Heat (Default: 15)").setValue((hs.msg || 15).toString()).setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(3).setRequired(true),
                    new TextInputBuilder().setCustomId("link").setLabel("Link Heat (Default: 60)").setValue((hs.link || 60).toString()).setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(3).setRequired(true),
                    new TextInputBuilder().setCustomId("invite").setLabel("Invite Heat (Default: 70)").setValue((hs.invite || 70).toString()).setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(3).setRequired(true),
                    new TextInputBuilder().setCustomId("mention").setLabel("Mention Heat (Default: 25)").setValue((hs.mention || 25).toString()).setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(3).setRequired(true),
                    new TextInputBuilder().setCustomId("caps").setLabel("Caps/Emoji Heat (Default: 35)").setValue((hs.caps || 35).toString()).setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(3).setRequired(true)
                ];

                modal.addComponents(inputs.map(input => new ActionRowBuilder().addComponents(input)));

                await i.showModal(modal);

                const submitted = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);

                if (submitted) {
                    const newHS = {
                        msg: parseInt(submitted.fields.getTextInputValue("msg")),
                        link: parseInt(submitted.fields.getTextInputValue("link")),
                        invite: parseInt(submitted.fields.getTextInputValue("invite")),
                        mention: parseInt(submitted.fields.getTextInputValue("mention")),
                        caps: parseInt(submitted.fields.getTextInputValue("caps")),
                        nsfw: hs.nsfw || 100
                    };

                    Object.keys(newHS).forEach(key => {
                        if (isNaN(newHS[key])) newHS[key] = hs[key] || 15;
                        if (newHS[key] < 0) newHS[key] = 0;
                        if (newHS[key] > 100) newHS[key] = 100;
                    });

                    client.automod.updateSettings(guildId, { heatSettings: newHS });

                    await submitted.update({
                        components: [new ContainerBuilder().addTextDisplayComponents(createHeatEmbed(getSettings())), row],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            }
        });
    },

    async limitsMenu(context, options, client) {
        const guildId = context.guild.id;
        const user = context.author || context.user;
        const s = client.automod.getSettings(guildId);

        if (options[0]) {
            const type = options[0].toLowerCase();
            const val = parseInt(options[1]);
            if (!['emoji', 'mention', 'mentions'].includes(type) || isNaN(val)) {
                return this.error(context, "Usage: `automod limits <emoji/mention> <number>`");
            }

            const update = {};
            if (type === 'emoji') update.maxEmoji = val;
            else update.maxMentions = val;

            client.automod.updateSettings(guildId, update);
            return this.success(context, client.t(context.guild.id, "am.maxSet", { type, value: val }));
        }

        const display = new TextDisplayBuilder()
            .setContent(
                `**AutoMod Limits !**\n` +
                `${emoji.blank}${emoji.wickarrow} ${client.t(context.guild.id, "am.label.maxMentions")}: **__${s.maxMentions}__**\n` +
                `${emoji.blank}${emoji.wickarrow} ${client.t(context.guild.id, "am.label.maxEmojis")}: **__${s.maxEmoji || 10}__**`
            );

        return context.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }
};
