const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'badge',
    description: 'Add or remove badges from a user.',
    category: 'Owner',
    usage: 'badge <add|remove> <user> <badge_name>',
    example: 'badge add @user Staff',
    owner: true,

    async execute(message, args, client) {
        const prefix = client.prefix;
        const user = message.author;
        const validRanks = ['Owner', 'Developer', 'Manager', 'Admin', 'Staff', 'VIP'];

        if (!args[0] || !['add', 'remove', 'show', 'list'].includes(args[0].toLowerCase())) {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.info} Badge Command`));
            container.addSeparatorComponents(new SeparatorBuilder());

            const helpContent = `> ** \`${prefix}badge add <user> <name>\` **\n╰ Adds a badge or sets a primary rank.\n\n` +
                `> ** \`${prefix}badge remove <user> <name>\` **\n╰ Removes a badge or resets a primary rank.\n\n` +
                `> ** \`${prefix}badge show <user>\` **\n╰ Displays all badges and ranks for a user.\n\n` +
                `> ** \`${prefix}badge list\` **\n╰ Lists all users with any special status.`;

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(helpContent));
            container.addSeparatorComponents(new SeparatorBuilder());
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Requested by ${user.displayName || user.username}`));

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const action = args[0].toLowerCase();

        if (action === 'list') {
            const allProfiles = client.db.profiles.find();

            const customBadgesSet = new Set();
            allProfiles.forEach(p => {
                p.badges.forEach(b => customBadgesSet.add(b));
            });

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.info} Available Badges List`));
            container.addSeparatorComponents(new SeparatorBuilder());

            const systemBadges = ['Owner', 'Developer', 'Manager', 'Admin', 'Staff', 'VIP'];
            let badgeDisplay = '**System Badges:**\n';
            systemBadges.forEach(b => {
                const icon = emoji[b.toLowerCase()] || '';
                badgeDisplay += `${icon} \`${b}\`  `;
            });

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(badgeDisplay.trim()));
            container.addSeparatorComponents(new SeparatorBuilder());

            const customBadges = Array.from(customBadgesSet).filter(b => !systemBadges.some(sb => sb.toLowerCase() === b.toLowerCase()));

            if (customBadges.length > 0) {
                let customDisplay = '**Active Custom Badges:**\n';
                customBadges.forEach(b => {
                    const icon = emoji[b.toLowerCase()] || emoji.dot || '';
                    customDisplay += `${icon} \`${b}\`  `;
                });
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(customDisplay.trim()));
                container.addSeparatorComponents(new SeparatorBuilder());
            }

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Total Badges: ${systemBadges.length + customBadges.length} | Requested by ${user.displayName || user.username}`));

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const targetId = args[1]?.replace(/[<@!>]/g, '');
        if (!targetId) {
            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Please provide a user.`));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const targetUser = await client.users.fetch(targetId).catch(() => null);
        if (!targetUser) {
            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} User not found.`));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (action === 'show') {
            const profile = client.db.profiles.get(targetUser.id);
            const badges = profile?.badges || [];
            const rank = (profile?.rank && profile?.rank !== 'User') ? profile.rank : null;

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.info} Special Status for ${targetUser.username}`));
            container.addSeparatorComponents(new SeparatorBuilder());

            const displayList = [];
            if (rank) displayList.push(`**Rank:** ${rank}`);
            if (badges.length > 0) displayList.push(`**Badges:** ${badges.join(', ')}`);

            const content = displayList.length > 0 ? displayList.join('\n') : 'This user has no ranks or badges.';

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
            container.addSeparatorComponents(new SeparatorBuilder());
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Requested by ${user.displayName || user.username}`));

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const badgeName = args.slice(2).join(' ');
        if (!badgeName) {
            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Please provide a name.`));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const getBase = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchedRank = validRanks.find(r => getBase(r) === getBase(badgeName));

        let profile = client.db.profiles.get(targetUser.id);
        if (!profile) profile = { userId: targetUser.id, badges: [], rank: 'User' };

        if (action === 'add') {
            if (profile.badges.includes(badgeName)) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} **${targetUser.username}** already has the **${badgeName}** badge.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
            profile.badges.push(badgeName);
            client.db.profiles.set(targetUser.id, profile);
            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.check} Success! Added badge **${badgeName}** for **${targetUser.username}**.`));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } else if (action === 'remove') {
            const idx = profile.badges.indexOf(badgeName);
            if (idx === -1) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} **${targetUser.username}** does not have the **${badgeName}** badge.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            profile.badges.splice(idx, 1);
            client.db.profiles.set(targetUser.id, profile);
            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.check} Success! Removed badge **${badgeName}** from **${targetUser.username}**.`));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
