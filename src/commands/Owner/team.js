const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'team',
    description: 'Manage the bot team and their ranks.',
    category: 'Owner',
    usage: 'team <add|remove|deny|allow|show|clear> [user/rank] [rank/command]',
    example: 'team add @user Manager | team clear all',
    owner: true,

    async execute(message, args, client) {
        const prefix = client.prefix;
        const user = message.author;
        const validRanks = ['Owner', 'Developer', 'Manager', 'Admin', 'Staff', 'VIP'];

        const getBaseName = (str) => {
            if (!str) return '';
            let name = str;
            if (str.includes(':')) {
                const parts = str.split(':');
                if (parts.length >= 2) name = parts[1];
            }
            return name.toLowerCase().replace(/[^a-z0-9]/g, '');
        };

        if (!args[0]) {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.info} Team Command [7]`));
            container.addSeparatorComponents(new SeparatorBuilder());

            const helpContent = `> ** \`${prefix}team show\` **\n╰ Shows all current team members and their ranks.\n\n` +
                `> ** \`${prefix}team add <user> <rank>\` **\n╰ Sets a user's primary rank.\n\n` +
                `> ** \`${prefix}team remove <user> [rank]\` **\n╰ Removes a user from the team or a specific rank.\n\n` +
                `> ** \`${prefix}team deny <user/rank> <command/badge>\` **\n╰ Denies a command or removes a rank badge.\n\n` +
                `> ** \`${prefix}team allow <user/rank> <command/badge>\` **\n╰ Allows a command or adds a rank badge.\n\n` +
                `> ** \`${prefix}team clear [all]\` **\n╰ Resets team data [all: wipes profiles too].`;

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(helpContent));
            container.addSeparatorComponents(new SeparatorBuilder());
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Requested by ${user.displayName || user.username}`));

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const action = args[0].toLowerCase();

        if (action === 'clear') {
            const mode = args[1]?.toLowerCase();
            if (mode === 'all') {
                client.db.profiles.deleteMany();
                client.db.rankPermissions.deleteMany();
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.check} **Database Wiped**: All user profiles and team settings have been deleted.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            } else {
                client.db.profiles.deleteMany("UPDATE profiles SET rank = 'User', badges = '[]', allowedCommands = '[]', deniedCommands = '[]'");
                client.db.rankPermissions.deleteMany();
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.check} **Team Reset**: All team ranks, badges, and permissions have been cleared across all users.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
        }

        if (action === 'show') {
            const teamProfiles = client.db.profiles.find();

            const rankGroups = {};
            validRanks.forEach(r => rankGroups[r] = []);

            for (const p of teamProfiles) {
                const userObj = await client.users.fetch(p.userId).catch(() => null);
                if (!userObj) continue;

                const data = {
                    id: userObj.id,
                    name: userObj.displayName || userObj.username,
                    profile: `https://discord.com/users/${userObj.id}`
                };

                const userRanks = new Set();
                const primaryRankHash = getBaseName(p.rank);
                const matchedPrimary = validRanks.find(r => getBaseName(r) === primaryRankHash);
                if (matchedPrimary && matchedPrimary !== 'User') userRanks.add(matchedPrimary);

                if (p.badges && Array.isArray(p.badges)) {
                    p.badges.forEach(b => {
                        const badgeHash = getBaseName(b);
                        const matchedBadge = validRanks.find(vr => getBaseName(vr) === badgeHash);
                        if (matchedBadge) userRanks.add(matchedBadge);
                    });
                }

                userRanks.forEach(rank => {
                    if (rankGroups[rank]) {
                        rankGroups[rank].push(data);
                    }
                });
            }

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Bot Team Members`));
            container.addSeparatorComponents(new SeparatorBuilder());

            let fullContent = '';
            for (const rank of validRanks) {
                const members = rankGroups[rank];
                if (members.length > 0) {
                    fullContent += `__**${rank}**__\n`;
                    members.forEach((m, i) => {
                        fullContent += `**\`${String(i + 1).padStart(2, '0')}.\`** : [${m.name}](${m.profile}) - \`${m.id}\`\n`;
                    });
                    fullContent += '\n';
                }
            }

            if (!fullContent) {
                const errContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} No team members found.`));
                return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
            }

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(fullContent.trim()));
            container.addSeparatorComponents(new SeparatorBuilder());
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Requested by ${user.displayName || user.username}`));

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const getUserId = (str) => str?.replace(/[<@!>]/g, '');
        const getRankName = (str) => validRanks.find(r => getBaseName(r) === getBaseName(str));

        let targetType = 'user';
        let targetId = getUserId(args[1]);
        let targetUser = targetId ? await client.users.fetch(targetId).catch(() => null) : null;
        let targetRank = getRankName(args[1]);

        if (targetRank) targetType = 'rank';
        else if (!targetUser) {
            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Please provide a valid User or Rank.`));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (action === 'add') {
            if (targetType === 'rank') {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Use \`team add <user> <rank>\`.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
            const rankName = getRankName(args[2]);
            if (!rankName) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Please specify a valid rank: ${validRanks.join(', ')}`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
            if (rankName === 'Owner' && !client.config?.ownerID?.includes(targetUser.id)) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Only hardcoded owners (from config.json) can hold the **Owner** rank.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            let profile = client.db.profiles.get(targetUser.id);
            if (!profile) profile = { userId: targetUser.id, badges: [], rank: 'User', allowedCommands: [], deniedCommands: [] };

            const oldRank = profile.rank;
            const specialRanks = ['Owner', 'Developer'];

            if (specialRanks.includes(rankName) && specialRanks.includes(oldRank) && rankName !== oldRank) {
                if (!profile.badges.some(b => getBaseName(b) === getBaseName(oldRank))) {
                    profile.badges.push(oldRank);
                }
            }

            profile.rank = rankName;
            client.db.profiles.set(targetUser.id, profile);

            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.check} Success! **${targetUser.username}** rank set to **${rankName}**.`));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } else if (action === 'remove') {
            if (targetType === 'rank') {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Ranks cannot be removed, only users.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const itemToRemove = args[2];
            const itemHash = getBaseName(itemToRemove);

            let profile = client.db.profiles.get(targetUser.id);

            if (!itemToRemove) {
                client.db.profiles.set(targetUser.id, { rank: 'User', badges: [], deniedCommands: [], allowedCommands: [] });
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.check} Success! **${targetUser.username}** removed from the team.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            if (!profile) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} This user has no team data.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            let changed = false;
            if (getBaseName(profile.rank) === itemHash) {
                profile.rank = 'User';
                changed = true;
            }

            const originalLength = profile.badges.length;
            profile.badges = profile.badges.filter(b => getBaseName(b) !== itemHash);
            if (profile.badges.length !== originalLength) changed = true;

            if (!changed) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} **${targetUser.username}** does not hold the **${itemToRemove}** rank/badge.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            client.db.profiles.set(targetUser.id, profile);
            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.check} Success! Removed **${itemToRemove}** from **${targetUser.username}**.`));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } else if (action === 'allow') {
            const item = args[2];
            if (!item) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Specify a command or rank badge to allow.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const itemHash = getBaseName(item);

            if (targetType === 'user') {
                let profile = client.db.profiles.get(targetUser.id);
                if (!profile) profile = { userId: targetUser.id, badges: [], rank: 'User', allowedCommands: [], deniedCommands: [] };

                const rankBadge = getRankName(item);
                if (rankBadge) {
                    if (!profile.badges.some(b => getBaseName(b) === itemHash)) {
                        profile.badges.push(rankBadge);
                    }
                } else {
                    profile.deniedCommands = profile.deniedCommands.filter(c => c.toLowerCase() !== item.toLowerCase());
                    if (!profile.allowedCommands.some(c => c.toLowerCase() === item.toLowerCase())) {
                        profile.allowedCommands.push(item.toLowerCase());
                    }
                }
                client.db.profiles.set(targetUser.id, profile);
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.check} Allowed **${item}** for **${targetUser.username}**.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            } else {
                const rankPerm = client.db.rankPermissions.get(targetRank);
                rankPerm.deniedCommands = rankPerm.deniedCommands.filter(c => c.toLowerCase() !== item.toLowerCase());
                if (!rankPerm.allowedCommands.some(c => c.toLowerCase() === item.toLowerCase())) {
                    rankPerm.allowedCommands.push(item.toLowerCase());
                }
                client.db.rankPermissions.set(targetRank, rankPerm);
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.check} Allowed **${item}** for all **${targetRank}** members.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

        } else if (action === 'deny') {
            const item = args[2];
            if (!item) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Specify a command or rank badge to deny.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const itemHash = getBaseName(item);

            if (targetType === 'user') {
                let profile = client.db.profiles.get(targetUser.id);
                if (!profile) profile = { userId: targetUser.id, badges: [], rank: 'User', allowedCommands: [], deniedCommands: [] };

                const rankBadge = getRankName(item);
                if (rankBadge) {
                    profile.badges = profile.badges.filter(b => getBaseName(b) !== itemHash);
                } else {
                    profile.allowedCommands = profile.allowedCommands.filter(c => c.toLowerCase() !== item.toLowerCase());
                    if (!profile.deniedCommands.some(c => c.toLowerCase() === item.toLowerCase())) {
                        profile.deniedCommands.push(item.toLowerCase());
                    }
                }
                client.db.profiles.set(targetUser.id, profile);
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.check} Denied **${item}** for **${targetUser.username}**.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            } else {
                const rankPerm = client.db.rankPermissions.get(targetRank);
                rankPerm.allowedCommands = rankPerm.allowedCommands.filter(c => c.toLowerCase() !== item.toLowerCase());
                if (!rankPerm.deniedCommands.some(c => c.toLowerCase() === item.toLowerCase())) {
                    rankPerm.deniedCommands.push(item.toLowerCase());
                }
                client.db.rankPermissions.set(targetRank, rankPerm);
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.check} Denied **${item}** for all **${targetRank}** members.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
        }
    }
};
