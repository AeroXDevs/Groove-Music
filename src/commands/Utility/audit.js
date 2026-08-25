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
            const display = new TextDisplayBuilder().setContent(client.t(context.guild.id, "aud.noPerm", { e: emoji.cross }));
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
                        case AuditLogEvent.GuildUpdate: description = client.t(context.guild.id, "aud.updatedServerSettings", { executor }); break;
                        case AuditLogEvent.ChannelCreate: description = client.t(context.guild.id, "aud.createdChannelT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.ChannelUpdate: description = client.t(context.guild.id, "aud.updatedChannelT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.ChannelDelete: description = client.t(context.guild.id, "aud.removedT", { executor, t: targetName || '**a channel**' }); break;
                        case AuditLogEvent.ChannelOverwriteCreate: description = client.t(context.guild.id, "aud.createdPermissionsForT", { executor, t: targetName || '**a channel**' }); break;
                        case AuditLogEvent.ChannelOverwriteUpdate: description = client.t(context.guild.id, "aud.updatedPermissionsForT", { executor, t: targetName || '**a channel**' }); break;
                        case AuditLogEvent.ChannelOverwriteDelete: description = client.t(context.guild.id, "aud.deletedPermissionsForT", { executor, t: targetName || '**a channel**' }); break;
                        case AuditLogEvent.MemberKick: description = client.t(context.guild.id, "aud.kickedT", { executor, t: targetName || '**a member**' }); break;
                        case AuditLogEvent.MemberBanAdd: description = client.t(context.guild.id, "aud.bannedT", { executor, t: targetName || '**a user**' }); break;
                        case AuditLogEvent.MemberBanRemove: description = client.t(context.guild.id, "aud.unbannedT", { executor, t: targetName || '**a user**' }); break;
                        case AuditLogEvent.MemberUpdate: description = client.t(context.guild.id, "aud.updatedT", { executor, t: targetName || '**a member**' }); break;
                        case AuditLogEvent.MemberRoleUpdate: description = client.t(context.guild.id, "aud.updatedRolesForT", { executor, t: targetName || '**a member**' }); break;
                        case AuditLogEvent.MemberAdd: description = client.t(context.guild.id, "aud.addedTToTheServer", { executor, t: targetName || '**a member**' }); break;
                        case AuditLogEvent.RoleCreate: description = client.t(context.guild.id, "aud.createdRoleT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.RoleUpdate: description = client.t(context.guild.id, "aud.updatedRoleT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.RoleDelete: description = client.t(context.guild.id, "aud.deletedRoleT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.InviteCreate: description = client.t(context.guild.id, "aud.createdAnInvite", { executor }); break;
                        case AuditLogEvent.InviteUpdate: description = client.t(context.guild.id, "aud.updatedAnInvite", { executor }); break;
                        case AuditLogEvent.InviteDelete: description = client.t(context.guild.id, "aud.deletedAnInvite", { executor }); break;
                        case AuditLogEvent.WebhookCreate: description = client.t(context.guild.id, "aud.createdWebhookT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.WebhookUpdate: description = client.t(context.guild.id, "aud.updatedWebhookT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.WebhookDelete: description = client.t(context.guild.id, "aud.deletedWebhookT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.EmojiCreate: description = client.t(context.guild.id, "aud.createdEmojiT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.EmojiUpdate: description = client.t(context.guild.id, "aud.updatedEmojiT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.EmojiDelete: description = client.t(context.guild.id, "aud.deletedEmojiT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.MessageDelete: description = `${executor} deleted a message${targetName ? ` by ${targetName}` : ''}`; break;
                        case AuditLogEvent.MessageBulkDelete: description = client.t(context.guild.id, "aud.bulkDeletedMessages", { executor }); break;
                        case AuditLogEvent.MessagePin: description = client.t(context.guild.id, "aud.pinnedAMessage", { executor }); break;
                        case AuditLogEvent.MessageUnpin: description = client.t(context.guild.id, "aud.unpinnedAMessage", { executor }); break;
                        case AuditLogEvent.IntegrationCreate: description = client.t(context.guild.id, "aud.addedIntegrationT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.IntegrationUpdate: description = client.t(context.guild.id, "aud.updatedIntegrationT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.IntegrationDelete: description = client.t(context.guild.id, "aud.removedIntegrationT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.StageInstanceCreate: description = client.t(context.guild.id, "aud.startedAStage", { executor }); break;
                        case AuditLogEvent.StageInstanceUpdate: description = client.t(context.guild.id, "aud.updatedAStage", { executor }); break;
                        case AuditLogEvent.StageInstanceDelete: description = client.t(context.guild.id, "aud.endedAStage", { executor }); break;
                        case AuditLogEvent.StickerCreate: description = client.t(context.guild.id, "aud.createdStickerT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.StickerUpdate: description = client.t(context.guild.id, "aud.updatedStickerT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.StickerDelete: description = client.t(context.guild.id, "aud.deletedStickerT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.ThreadCreate: description = client.t(context.guild.id, "aud.createdThreadT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.ThreadUpdate: description = client.t(context.guild.id, "aud.updatedThreadT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.ThreadDelete: description = client.t(context.guild.id, "aud.deletedThreadT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.AutoModerationRuleCreate: description = client.t(context.guild.id, "aud.createdAutomodRuleT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.AutoModerationRuleUpdate: description = client.t(context.guild.id, "aud.updatedAutomodRuleT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.AutoModerationRuleDelete: description = client.t(context.guild.id, "aud.deletedAutomodRuleT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.AutoModerationBlockMessage: description = client.t(context.guild.id, "aud.automodBlocked", { executor }); break;
                        case AuditLogEvent.AutoModerationFlagToChannel: description = client.t(context.guild.id, "aud.automodFlagged", { executor }); break;
                        case AuditLogEvent.AutoModerationUserCommunicationDisabled: description = client.t(context.guild.id, "aud.automodTimedOut", { executor, t: targetName || '**a user**' }); break;
                        case AuditLogEvent.CreatorMonetizationRequestCreated: description = client.t(context.guild.id, "aud.requestedCreatorMonetization", { executor }); break;
                        case AuditLogEvent.CreatorMonetizationTermsAccepted: description = client.t(context.guild.id, "aud.acceptedCreatorMonetizationTerms", { executor }); break;
                        case AuditLogEvent.GuildScheduledEventCreate: description = client.t(context.guild.id, "aud.createdEventT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.GuildScheduledEventUpdate: description = client.t(context.guild.id, "aud.updatedEventT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.GuildScheduledEventDelete: description = client.t(context.guild.id, "aud.deletedEventT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.ApplicationCommandPermissionUpdate: description = client.t(context.guild.id, "aud.updatedCommandPermissions", { executor }); break;
                        case AuditLogEvent.BotAdd: description = client.t(context.guild.id, "aud.addedABotT", { executor, t: targetName || '**unknown**' }); break;
                        case AuditLogEvent.MemberPrune: description = client.t(context.guild.id, "aud.prunedMembers", { executor }); break;
                        case AuditLogEvent.MemberMove: description = client.t(context.guild.id, "aud.movedMembers", { executor }); break;
                        case AuditLogEvent.MemberDisconnect: description = client.t(context.guild.id, "aud.disconnectedMembers", { executor }); break;
                        case 192: description = client.t(context.guild.id, "aud.setVoiceChannelStatusForT", { executor, t: targetName || '**a channel**' }); break;
                        case 193: description = client.t(context.guild.id, "aud.clearedVoiceChannelStatusForT", { executor, t: targetName || '**a channel**' }); break;
                        case AuditLogEvent.VoiceChannelStatusUpdate: description = client.t(context.guild.id, "aud.updatedVoiceChannelStatus", { executor }); break;
                        case AuditLogEvent.VoiceChannelStatusDelete: description = client.t(context.guild.id, "aud.deletedVoiceChannelStatus", { executor }); break;
                        case AuditLogEvent.OnboardingPromptCreate: description = client.t(context.guild.id, "aud.createdOnboardingPrompt", { executor }); break;
                        case AuditLogEvent.OnboardingPromptUpdate: description = client.t(context.guild.id, "aud.updatedOnboardingPrompt", { executor }); break;
                        case AuditLogEvent.OnboardingPromptDelete: description = client.t(context.guild.id, "aud.deletedOnboardingPrompt", { executor }); break;
                        case AuditLogEvent.OnboardingCreate: description = client.t(context.guild.id, "aud.createdOnboarding", { executor }); break;
                        case AuditLogEvent.OnboardingUpdate: description = client.t(context.guild.id, "aud.updatedOnboarding", { executor }); break;
                        case AuditLogEvent.HomeSettingsCreate: description = client.t(context.guild.id, "aud.createdHomeSettings", { executor }); break;
                        case AuditLogEvent.HomeSettingsUpdate: description = client.t(context.guild.id, "aud.updatedHomeSettings", { executor }); break;
                        default: description = targetName ? `${executor} performed action [${entry.action}] on ${targetName}` : `${executor} performed action [${entry.action}]`; break;
                    }


                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} ${description} <t:${createdAt}:R>`));
                });
                container.addSeparatorComponents(new SeparatorBuilder());

                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(context.guild.id, "own.pageFooter", { page: p + 1, total: maxPages, user: author.displayName })));

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
