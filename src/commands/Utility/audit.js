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
    PermissionFlagsBits,
    AuditLogEvent
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
    name: "audit",
    category: "Utility",
    description: "View recent server audit logs",
    aliases: [],
    usage: "audit",
    userPerms: [PermissionFlagsBits.ViewAuditLog],
    slashOptions: [],

    async slashExecute(interaction, client) {
        if (!interaction.deferred) await interaction.deferReply();
        return module.exports.runAudit(interaction, client, true);
    },

    async execute(message, args, client) {
        return module.exports.runAudit(message, client, false);
    },

    async runAudit(context, client, isSlash) {
        const guild = context.guild;
        const author = isSlash ? context.user : context.author;

        if (!guild.members.me.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
            const display = new TextDisplayBuilder().setContent(`${emoji.cross} **I do not have the \`View Audit Log\` permission.**`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return (isSlash ? context.editReply : context.reply).call(context, { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
        }

        try {
            const auditLogs = await guild.fetchAuditLogs({ limit: 25 });
            const entries = Array.from(auditLogs.entries.values());

            if (entries.length === 0) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} Recent Audit Logs\n> ${emoji.cross} No audit logs found.`));
                return (isSlash ? context.editReply : context.reply).call(context, { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
            }

            let page = 0;
            const maxPages = Math.ceil(entries.length / 5);

            const getEmbed = (p) => {
                const container = new ContainerBuilder();
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} Recent Audit Logs`));
                container.addSeparatorComponents(new SeparatorBuilder());

                const start = p * 5;
                const currentEntries = entries.slice(start, start + 5);

                currentEntries.forEach((entry) => {
                    const createdAt = Math.floor(entry.createdTimestamp / 1000);
                    const executor = entry.executor ? `<@${entry.executor.id}>` : "**Unknown**";
                    let targetName = null;

                    if (entry.target) {
                        const targetType = entry.target.constructor.name;
                        if (targetType.includes('Channel') || targetType === 'GuildChannel') {
                            targetName = `<#${entry.target.id}>`;
                        } else if (targetType === 'Role') {
                            targetName = `<@&${entry.target.id}>`;
                        } else if (targetType === 'User') {
                            targetName = `<@${entry.target.id}>`;
                        } else if (targetType === 'Guild') {
                            targetName = `**${entry.target.name}**`;
                        } else if (targetType === 'Webhook') {
                            targetName = `**${entry.target.name}**`;
                        } else if (targetType === 'Integration') {
                            targetName = `**${entry.target.name}**`;
                        } else if (targetType.includes('Emoji')) {
                            targetName = entry.target.name ? `**:${entry.target.name}:**` : `**emoji**`;
                        } else if (targetType.includes('Sticker')) {
                            targetName = entry.target.name ? `**${entry.target.name}**` : `**sticker**`;
                        } else if (targetType === 'AutoModerationRule') {
                            targetName = entry.target.name ? `**${entry.target.name}**` : `**automod rule**`;
                        } else if (entry.target.name) {
                            targetName = `**${entry.target.name}**`;
                        } else if (entry.target.id) {
                            const tid = entry.target.id;
                            const memberActions = [AuditLogEvent.MemberKick, AuditLogEvent.MemberBanAdd, AuditLogEvent.MemberBanRemove, AuditLogEvent.MemberUpdate, AuditLogEvent.MemberRoleUpdate, AuditLogEvent.MemberAdd, AuditLogEvent.BotAdd];
                            const channelActions = [AuditLogEvent.ChannelCreate, AuditLogEvent.ChannelUpdate, AuditLogEvent.ChannelDelete, AuditLogEvent.ThreadCreate, AuditLogEvent.ThreadUpdate, AuditLogEvent.ThreadDelete, AuditLogEvent.ChannelOverwriteCreate, AuditLogEvent.ChannelOverwriteUpdate, AuditLogEvent.ChannelOverwriteDelete, 192, 193, AuditLogEvent.VoiceChannelStatusUpdate, AuditLogEvent.VoiceChannelStatusDelete];
                            const roleActions = [AuditLogEvent.RoleCreate, AuditLogEvent.RoleUpdate, AuditLogEvent.RoleDelete];

                            if (memberActions.includes(entry.action)) {
                                targetName = `<@${tid}>`;
                            } else if (channelActions.includes(entry.action)) {
                                targetName = `<#${tid}>`;
                            } else if (roleActions.includes(entry.action)) {
                                targetName = `<@&${tid}>`;
                            } else {
                                targetName = `**ID: ${tid}**`;
                            }
                        }
                    } else if (entry.targetId) {
                        const tid = entry.targetId;
                        if (entry.targetType === 'Channel') {
                            targetName = `<#${tid}>`;
                        } else if (entry.targetType === 'Role') {
                            targetName = `<@&${tid}>`;
                        } else if (entry.targetType === 'User') {
                            targetName = `<@${tid}>`;
                        } else {
                            const memberActions = [
                                AuditLogEvent.MemberKick,
                                AuditLogEvent.MemberBanAdd,
                                AuditLogEvent.MemberBanRemove,
                                AuditLogEvent.MemberUpdate,
                                AuditLogEvent.MemberRoleUpdate,
                                AuditLogEvent.MemberAdd,
                                AuditLogEvent.MessageDelete,
                                AuditLogEvent.MessageBulkDelete,
                                AuditLogEvent.MessagePin,
                                AuditLogEvent.MessageUnpin,
                                AuditLogEvent.BotAdd,
                                AuditLogEvent.AutoModerationUserCommunicationDisabled,
                                AuditLogEvent.MemberPrune,
                                AuditLogEvent.MemberMove,
                                AuditLogEvent.MemberDisconnect
                            ];
                            const channelActions = [
                                AuditLogEvent.ChannelCreate,
                                AuditLogEvent.ChannelUpdate,
                                AuditLogEvent.ChannelDelete,
                                AuditLogEvent.ThreadCreate,
                                AuditLogEvent.ThreadUpdate,
                                AuditLogEvent.ThreadDelete,
                                AuditLogEvent.ChannelOverwriteCreate,
                                AuditLogEvent.ChannelOverwriteUpdate,
                                AuditLogEvent.ChannelOverwriteDelete,
                                192,
                                193,
                                AuditLogEvent.VoiceChannelStatusUpdate,
                                AuditLogEvent.VoiceChannelStatusDelete
                            ];
                            const roleActions = [
                                AuditLogEvent.RoleCreate,
                                AuditLogEvent.RoleUpdate,
                                AuditLogEvent.RoleDelete
                            ];

                            if (memberActions.includes(entry.action)) {
                                targetName = `<@${tid}>`;
                            } else if (channelActions.includes(entry.action)) {
                                targetName = `<#${tid}>`;
                            } else if (roleActions.includes(entry.action)) {
                                targetName = `<@&${tid}>`;
                            } else {
                                targetName = `**ID: ${tid}**`;
                            }
                        }
                    }

                    let description = "";
                    switch (entry.action) {
                        case AuditLogEvent.GuildUpdate: description = `${executor} updated server settings`; break;
                        case AuditLogEvent.ChannelCreate: description = `${executor} created channel ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.ChannelUpdate: description = `${executor} updated channel ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.ChannelDelete: description = `${executor} removed ${targetName || '**a channel**'}`; break;
                        case AuditLogEvent.ChannelOverwriteCreate: description = `${executor} created permissions for ${targetName || '**a channel**'}`; break;
                        case AuditLogEvent.ChannelOverwriteUpdate: description = `${executor} updated permissions for ${targetName || '**a channel**'}`; break;
                        case AuditLogEvent.ChannelOverwriteDelete: description = `${executor} deleted permissions for ${targetName || '**a channel**'}`; break;
                        case AuditLogEvent.MemberKick: description = `${executor} kicked ${targetName || '**a member**'}`; break;
                        case AuditLogEvent.MemberBanAdd: description = `${executor} banned ${targetName || '**a user**'}`; break;
                        case AuditLogEvent.MemberBanRemove: description = `${executor} unbanned ${targetName || '**a user**'}`; break;
                        case AuditLogEvent.MemberUpdate: description = `${executor} updated ${targetName || '**a member**'}`; break;
                        case AuditLogEvent.MemberRoleUpdate: description = `${executor} updated roles for ${targetName || '**a member**'}`; break;
                        case AuditLogEvent.MemberAdd: description = `${executor} added ${targetName || '**a member**'} to the server`; break;
                        case AuditLogEvent.RoleCreate: description = `${executor} created role ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.RoleUpdate: description = `${executor} updated role ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.RoleDelete: description = `${executor} deleted role ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.InviteCreate: description = `${executor} created an invite`; break;
                        case AuditLogEvent.InviteUpdate: description = `${executor} updated an invite`; break;
                        case AuditLogEvent.InviteDelete: description = `${executor} deleted an invite`; break;
                        case AuditLogEvent.WebhookCreate: description = `${executor} created webhook ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.WebhookUpdate: description = `${executor} updated webhook ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.WebhookDelete: description = `${executor} deleted webhook ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.EmojiCreate: description = `${executor} created emoji ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.EmojiUpdate: description = `${executor} updated emoji ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.EmojiDelete: description = `${executor} deleted emoji ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.MessageDelete: description = `${executor} deleted a message${targetName ? ` by ${targetName}` : ''}`; break;
                        case AuditLogEvent.MessageBulkDelete: description = `${executor} bulk deleted messages`; break;
                        case AuditLogEvent.MessagePin: description = `${executor} pinned a message`; break;
                        case AuditLogEvent.MessageUnpin: description = `${executor} unpinned a message`; break;
                        case AuditLogEvent.IntegrationCreate: description = `${executor} added integration ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.IntegrationUpdate: description = `${executor} updated integration ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.IntegrationDelete: description = `${executor} removed integration ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.StageInstanceCreate: description = `${executor} started a stage`; break;
                        case AuditLogEvent.StageInstanceUpdate: description = `${executor} updated a stage`; break;
                        case AuditLogEvent.StageInstanceDelete: description = `${executor} ended a stage`; break;
                        case AuditLogEvent.StickerCreate: description = `${executor} created sticker ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.StickerUpdate: description = `${executor} updated sticker ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.StickerDelete: description = `${executor} deleted sticker ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.ThreadCreate: description = `${executor} created thread ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.ThreadUpdate: description = `${executor} updated thread ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.ThreadDelete: description = `${executor} deleted thread ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.AutoModerationRuleCreate: description = `${executor} created automod rule ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.AutoModerationRuleUpdate: description = `${executor} updated automod rule ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.AutoModerationRuleDelete: description = `${executor} deleted automod rule ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.AutoModerationBlockMessage: description = `${executor}'s automod blocked a message`; break;
                        case AuditLogEvent.AutoModerationFlagToChannel: description = `${executor}'s automod flagged a message`; break;
                        case AuditLogEvent.AutoModerationUserCommunicationDisabled: description = `${executor}'s automod timed out ${targetName || '**a user**'}`; break;
                        case AuditLogEvent.CreatorMonetizationRequestCreated: description = `${executor} requested creator monetization`; break;
                        case AuditLogEvent.CreatorMonetizationTermsAccepted: description = `${executor} accepted creator monetization terms`; break;
                        case AuditLogEvent.GuildScheduledEventCreate: description = `${executor} created event ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.GuildScheduledEventUpdate: description = `${executor} updated event ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.GuildScheduledEventDelete: description = `${executor} deleted event ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.ApplicationCommandPermissionUpdate: description = `${executor} updated command permissions`; break;
                        case AuditLogEvent.BotAdd: description = `${executor} added a bot ${targetName || '**unknown**'}`; break;
                        case AuditLogEvent.MemberPrune: description = `${executor} pruned members`; break;
                        case AuditLogEvent.MemberMove: description = `${executor} moved members`; break;
                        case AuditLogEvent.MemberDisconnect: description = `${executor} disconnected members`; break;
                        case 192: description = `${executor} set voice channel status for ${targetName || '**a channel**'}`; break;
                        case 193: description = `${executor} cleared voice channel status for ${targetName || '**a channel**'}`; break;
                        case AuditLogEvent.VoiceChannelStatusUpdate: description = `${executor} updated voice channel status`; break;
                        case AuditLogEvent.VoiceChannelStatusDelete: description = `${executor} deleted voice channel status`; break;
                        case AuditLogEvent.OnboardingPromptCreate: description = `${executor} created onboarding prompt`; break;
                        case AuditLogEvent.OnboardingPromptUpdate: description = `${executor} updated onboarding prompt`; break;
                        case AuditLogEvent.OnboardingPromptDelete: description = `${executor} deleted onboarding prompt`; break;
                        case AuditLogEvent.OnboardingCreate: description = `${executor} created onboarding`; break;
                        case AuditLogEvent.OnboardingUpdate: description = `${executor} updated onboarding`; break;
                        case AuditLogEvent.HomeSettingsCreate: description = `${executor} created home settings`; break;
                        case AuditLogEvent.HomeSettingsUpdate: description = `${executor} updated home settings`; break;
                        default: description = targetName ? `${executor} performed action [${entry.action}] on ${targetName}` : `${executor} performed action [${entry.action}]`; break;
                    }


                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} ${description} <t:${createdAt}:R>`));
                });
                container.addSeparatorComponents(new SeparatorBuilder());

                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Page ${p + 1}/${maxPages} | Requested by ${author.displayName}`));

                return container;
            };

            const getButtons = (p) => {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('home').setLabel('Home').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
                    new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
                    new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(p === maxPages - 1),
                    new ButtonBuilder().setCustomId('close').setLabel('Close').setStyle(ButtonStyle.Danger)
                );
                return row;
            };

            const options = {
                components: [getEmbed(page), getButtons(page)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            };

            const msg = isSlash ? await context.editReply(options) : await context.reply(options);
            const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === author.id, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'close') {
                    collector.stop();
                    return await i.message.delete().catch(() => { });
                } else if (i.customId === 'home') {
                    page = 0;
                } else if (i.customId === 'prev') {
                    page = (page - 1 + maxPages) % maxPages;
                } else if (i.customId === 'next') {
                    page = (page + 1) % maxPages;
                }

                await i.update({ components: [getEmbed(page), getButtons(page)], allowedMentions: { parse: [] } });
            });

            collector.on('end', () => {
                if (!msg.deleted) {
                    msg.edit({ components: [getEmbed(page)], allowedMentions: { parse: [] } }).catch(() => { });
                }
            });

        } catch (error) {
            const display = new TextDisplayBuilder().setContent(client.t(context.guild.id, "ui.auditFailed", { e: emoji.cross }));
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return (isSlash ? context.editReply : context.reply).call(context, { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
        }
    }
};
