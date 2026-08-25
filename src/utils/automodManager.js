const { EmbedBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');

class AutomodManager {
    constructor(client) {
        this.client = client;

        this.settingsCache = new Map();
        this.heatCache = new Map();
        this.escalationCache = new Map();
        this.lockCache = new Set();

        this.inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
        this.urlRegex = /(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,63})/gi;
        this.fileExtensions = new Set(['json', 'js', 'py', 'ts', 'cpp', 'h', 'c', 'java', 'rb', 'php', 'html', 'htm', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'mp3', 'mp4', 'wav', 'zip', 'rar', '7z', 'exe', 'pdf', 'txt', 'log', 'bat', 'sh']);
        this.nsfwRegex = /(pornhub|redtube|xvideos|xnxx|xhamster|sextube|youporn|brazzers|nhentai|hentai|rule34)\.(com|net|org|tv|me)/i;
        this.emojiRegex = /<a?:.+?:\d+>|[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f3fb}-\u{1f3ff}\u{200d}]/gu;

        setInterval(() => this.cleanup(), 30000);
    }

    getSettings(guildId) {
        let settings = this.settingsCache.get(guildId);

        if (!settings) {
            settings = this.client.db.automod.get(guildId);
            if (!settings) {
                settings = {
                    guildId,
                    antiLink: false,
                    antiInvite: false,
                    antiSpam: false,
                    antiMention: false,
                    antiCaps: false,
                    antiEmoji: false,
                    antiNsfw: false,
                    maxMentions: 5,
                    maxEmoji: 10,
                    action: 'delete',
                    logChannel: null,
                    whitelistRoles: [],
                    whitelistChannels: [],
                    whitelistUsers: [],
                    punishments: {},
                    heatSettings: {}
                };
            }
            this.settingsCache.set(guildId, settings);
        }
        return settings;
    }

    updateSettings(guildId, data) {
        this.client.db.automod.set(guildId, data);
        const fresh = this.client.db.automod.get(guildId);
        if (fresh) {
            this.settingsCache.set(guildId, fresh);
            this.syncNativeRules(guildId, fresh);
        } else {
            this.settingsCache.delete(guildId);
        }
    }

    async syncNativeRules(guildId, settings) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return;
            const me = guild.members.me;
            if (!me || !me.permissions.has(PermissionFlagsBits.ManageGuild)) return;
            const rules = await guild.autoModerationRules.fetch().catch(() => null);
            if (!rules) return;
            const nsfwRuleName = "Groove Safety: NSFW Filter";
            const existingNsfw = rules.find(r => r.name === nsfwRuleName);
            if (settings.antiNsfw && !existingNsfw) {
                await guild.autoModerationRules.create({
                    name: nsfwRuleName,
                    eventType: 1,
                    triggerType: 4,
                    triggerMetadata: {
                        presets: [2]
                    },
                    actions: [{
                        type: 1,
                        metadata: { customMessage: "This message was blocked by Groove's NSFW Filter." }
                    }],
                    enabled: true,
                    reason: "Enabled Anti-NSFW"
                }).catch(() => null);
            } else if (!settings.antiNsfw && existingNsfw) {
                await existingNsfw.delete().catch(() => null);
            }
        } catch (error) { }
    }

    isWhitelisted(member, channel, settings) {
        if (!member || !settings) return false;
        if (member.id === member.guild.ownerId) return true;
        if (this.client.owners?.includes(member.id)) return true;

        if (settings.whitelistUsers?.includes(member.id)) return true;
        if (settings.whitelistChannels?.includes(channel.id)) return true;
        if (settings.whitelistRoles?.length > 0) {
            if (member.roles.cache.some(role => settings.whitelistRoles.includes(role.id))) return true;
        }
        return false;
    }

    async handleMessage(message) {
        if (!message.guild || message.author.bot) return;

        const settings = this.getSettings(message.guild.id);
        if (this.isWhitelisted(message.member, message.channel, settings)) return;

        const key = `${message.guild.id}:${message.author.id}`;
        const prevData = this.heatCache.get(key) || { heat: 0, lastUpdate: Date.now(), lastContent: '' };

        let currentHeat = this.updateHeat(message.guild.id, message.author.id, 0);
        let heatToAdd = 0;
        let topViolation = null;
        let shouldDelete = false;

        const addViolation = (type, heat, key, priority) => {
            heatToAdd += heat;
            shouldDelete = true;
            if (!topViolation || priority > topViolation.priority) {
                topViolation = { type, key, priority };
            }
        };


        if (settings.antiSpam) {
            const timeDiff = Date.now() - prevData.lastUpdate;
            const burst = timeDiff < 800 ? 3.0 : (timeDiff < 2000 ? 1.5 : 1.0);
            const baseHeat = settings.heatSettings?.msg || 15;

            heatToAdd += (baseHeat * burst);

            if (message.content && message.content.length > 1 && message.content === prevData.lastContent) {
                heatToAdd += 40;
                shouldDelete = true;
            } else if (currentHeat + heatToAdd >= 50) {
                shouldDelete = true;
            }
        }


        if (settings.antiNsfw && this.nsfwRegex.test(message.content)) {
            addViolation('Anti-NSFW Link', 100, 'antiNsfw', 10);
        }
        if (settings.antiInvite && this.inviteRegex.test(message.content)) {
            addViolation('Anti-Invite', 50, 'antiInvite', 9);
        }

        if (settings.antiLink) {
            const matches = message.content.matchAll(this.urlRegex);
            const rawContent = message.content.toLowerCase();

            for (const match of matches) {
                const fullMatch = match[0].toLowerCase();
                const parts = fullMatch.split('.');
                const extension = parts[parts.length - 1];

                const isProtocol = rawContent.includes(`http://${fullMatch}`) ||
                    rawContent.includes(`https://${fullMatch}`) ||
                    fullMatch.startsWith('www.');

                if (isProtocol) {
                    addViolation('Anti-Link', 40, 'antiLink', 8);
                    break;
                }

                if (!this.fileExtensions.has(extension)) {
                    addViolation('Anti-Link', 40, 'antiLink', 8);
                    break;
                }
            }
        }

        if (settings.antiMention) {
            if (message.mentions.everyone) {
                addViolation('Everyone/Here Mention', 100, 'antiMention', 8);
            } else {
                const mentions = (message.mentions.users.size || 0) + (message.mentions.roles.size || 0);
                if (mentions > settings.maxMentions) {
                    addViolation('Mass Mention', 60 + (mentions * 5), 'antiMention', 7);
                }
            }
        }

        if (settings.antiCaps && message.content.length >= 8) {
            const alphaOnly = message.content.replace(/[^a-zA-Z]/g, "");
            if (alphaOnly.length >= 5) {
                const capsMatch = alphaOnly.replace(/[^A-Z]/g, "").length;
                if ((capsMatch / alphaOnly.length) > 0.7) {
                    addViolation('Excessive Caps', 45, 'antiCaps', 5);
                }
            }
        }

        if (settings.antiEmoji) {
            const emojis = message.content.match(this.emojiRegex);
            const limit = settings.maxEmoji || 10;
            if (emojis && emojis.length > limit) {
                const cleanLen = message.content.replace(this.emojiRegex, "E").length;
                const ratio = emojis.length / cleanLen;
                if (ratio > 0.4 || emojis.length > limit * 1.2) {
                    addViolation('Emoji Spam', 50 + ((emojis.length - limit) * 3), 'antiEmoji', 4);
                }
            }
        }

        const totalHeat = currentHeat + heatToAdd;
        this.updateHeat(message.guild.id, message.author.id, totalHeat, true, message.content);

        if (shouldDelete) {
            message.delete().catch(() => null);

            if (totalHeat > 80 && !this.lockCache.has(`purge:${key}`)) {
                this.lockCache.add(`purge:${key}`);
                setTimeout(() => this.lockCache.delete(`purge:${key}`), 2000);
                this.purgeUserMessages(message).catch(() => null);
            }
        }

        if (totalHeat >= 100) {
            if (this.lockCache.has(key)) return;
            this.lockCache.add(key);
            setTimeout(() => this.lockCache.delete(key), 3000);

            const finalViolation = topViolation || { type: 'Spamming', key: 'antiSpam' };
            const punishment = settings.punishments?.[finalViolation.key] || settings.action;

            if (finalViolation.key === 'antiSpam' || totalHeat > 150) {
                if (!this.lockCache.has(`purge:${key}`)) {
                    this.purgeUserMessages(message).catch(() => null);
                }
            }

            this.takeAction(message, finalViolation.type, settings, punishment);
        } else if (shouldDelete) {
            const finalViolation = topViolation || { type: 'Spamming', key: 'antiSpam' };
            this.logViolation(message, finalViolation.type, settings, 'DELETED').catch(() => null);
        }
    }

    updateHeat(guildId, userId, setHeat, isFinal = false, content = '') {
        const key = `${guildId}:${userId}`;
        const now = Date.now();
        let data = this.heatCache.get(key) || { heat: 0, lastUpdate: now, lastContent: '' };

        const elapsed = (now - data.lastUpdate) / 1000;
        data.heat = Math.max(0, data.heat - (elapsed * 15));

        if (isFinal) {
            data.heat = setHeat;
            data.lastUpdate = now;
            data.lastContent = content;
            this.heatCache.set(key, data);
        }
        return data.heat;
    }

    async purgeUserMessages(message) {
        const messages = await message.channel.messages.fetch({ limit: 50 }).catch(() => null);
        if (!messages) return;
        const toDelete = messages.filter(m => m.author.id === message.author.id && (Date.now() - m.createdTimestamp) < 15000).first(10);
        if (toDelete.length > 0) {
            await message.channel.bulkDelete(toDelete, true).catch(() => null);
        }
    }

    async takeAction(message, reason, settings, action) {

        const myPerms = message.channel.permissionsFor(message.guild.members.me);
        const canDelete = myPerms?.has(PermissionFlagsBits.ManageMessages);

        if (canDelete) {
            await message.delete().catch(() => null);
        }

        let escType = action;
        let duration = 600000;
        let label = '10 minutes';

        if (action === 'delete') {
            const esc = this.getEscalationAction(message.guild.id, message.author.id);
            escType = esc.type;
            duration = esc.duration;
            label = esc.label;
        }

        if (escType === 'mute') {
            if (message.member?.moderatable && myPerms?.has(PermissionFlagsBits.ModerateMembers)) {
                await message.member.timeout(duration, `AutoMod: ${reason}`).catch(() => null);
            }
        } else if (escType === 'kick') {
            if (message.member?.kickable && message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
                await message.member.kick(`AutoMod: ${reason}`).catch(() => null);
            }
        } else if (escType === 'ban') {
            if (message.member?.bannable && message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
                await message.member.ban({ reason: `AutoMod: ${reason}` }).catch(() => null);
            }
        }

        const actionLabel = escType === 'warn' ? 'Warn' : escType.toUpperCase();
        const emoji = this.client.emoji;

        const display = new TextDisplayBuilder()
            .setContent(
                client.t(message.guild.id, "amm.actionTitle") +
                client.t(message.guild.id, "amm.row.user", { blank: emoji.blank, arrow: emoji.wickarrow, value: message.author }) +
                `${emoji.blank}${emoji.wickarrow} Action: **${actionLabel}** ${escType === 'mute' ? `(**__${label}__**)` : ''}\n` +
                client.t(message.guild.id, "amm.row.reason", { blank: emoji.blank, arrow: emoji.wickarrow, value: reason })
            );

        const container = new ContainerBuilder().addTextDisplayComponents(display);

        const responseMsg = await message.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        }).catch(() => null);

        const dmDisplay = new TextDisplayBuilder()
            .setContent(
                client.t(message.guild.id, "amm.notifyTitle") +
                `${emoji.blank}${emoji.wickarrow} Guild: **\`${message.guild.name}\`**\n` +
                `${emoji.blank}${emoji.wickarrow} Action: **\`${actionLabel}\`** ${escType === 'mute' ? `(**__${label}__**)` : ''}\n` +
                `${emoji.blank}${emoji.wickarrow} Reason: **\`${reason}\`**\n\n` +
                client.t(message.guild.id, "amm.yourMessage") +
                `\`\`\`\n${message.content ? (message.content.length > 500 ? message.content.slice(0, 500) + '...' : message.content) : client.t(message.guild.id, "amm.noContent")}\n\`\`\``
            );

        const dmContainer = new ContainerBuilder().addTextDisplayComponents(dmDisplay);

        const dmed = await message.author.send({
            components: [dmContainer],
            flags: MessageFlags.IsComponentsV2
        }).then(() => true).catch(() => false);

        this.logViolation(message, reason, settings, escType, dmed).catch(err => console.error(`[AutoMod] Log Error: ${err.message}`));

        if (responseMsg && (escType === 'warn' || escType === 'mute')) {
            setTimeout(() => responseMsg.delete().catch(() => null), 8000);
        }
    }

    async logViolation(message, reason, settings, action, dmed = false) {
        if (!settings.logChannel || typeof settings.logChannel !== 'string') return;
        let channel = message.guild.channels.cache.get(settings.logChannel);
        if (!channel) channel = await message.guild.channels.fetch(settings.logChannel).catch(() => null);
        if (!channel) return;

        const emoji = this.client.emoji;

        const info = new TextDisplayBuilder().setContent(
            client.t(message.guild.id, "amm.violationTitle") +
            `${emoji.blank}${emoji.wickarrow} User: **${message.author.tag}** (\`${message.author.id}\`)\n` +
            `${emoji.blank}${emoji.wickarrow} Channel: ${message.channel} (\`${message.channel.id}\`)\n` +
            `${emoji.blank}${emoji.wickarrow} Reason: **${reason}**\n` +
            `${emoji.blank}${emoji.wickarrow} Action: **${action.toUpperCase()}**\n` +
            `${emoji.blank}${emoji.wickarrow} DMed: **${dmed ? emoji.check : emoji.cross}**\n\n` +
            client.t(message.guild.id, "amm.content") +
            `\`\`\`\n${message.content ? message.content.slice(0, 1000) : client.t(message.guild.id, "amm.noContent")}\n\`\`\``
        );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(info);

        channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        }).catch(() => null);
    }

    getEscalationAction(guildId, userId) {
        const key = `${guildId}:${userId}`;
        let data = this.escalationCache.get(key) || { count: 0, lastViolation: 0 };
        data.count++;
        data.lastViolation = Date.now();
        this.escalationCache.set(key, data);

        const count = data.count;
        if (count === 1) return { type: 'warn' };
        if (count === 2) return { type: 'mute', duration: 600000, label: '10 minutes' };
        if (count === 3) return { type: 'mute', duration: 3600000, label: '1 hour' };
        if (count === 4) return { type: 'mute', duration: 86400000, label: '24 hours' };
        if (count === 5) return { type: 'kick' };
        return { type: 'ban' };
    }

    cleanup() {
        const now = Date.now();
        for (const [key, data] of this.heatCache.entries()) {
            if (now - data.lastUpdate > 300000) this.heatCache.delete(key);
        }
        for (const [key, data] of this.escalationCache.entries()) {
            if (now - data.lastViolation > 86400000) this.escalationCache.delete(key);
        }
    }
}

module.exports = AutomodManager;
