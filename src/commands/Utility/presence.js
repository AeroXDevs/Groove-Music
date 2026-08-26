const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    SeparatorBuilder,
    ActivityType
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'presence',
    description: "Shows a user's current status and activity",
    category: 'Utility',
    usage: 'presence [user]',
    example: 'presence @user | presence 123456789',
    aliases: ['activity', 'status'],

    async execute(message, args, client) {
        const userMention = args[0];
        let targetMember;

        if (!userMention) {
            targetMember = message.member;
        } else if (message.mentions.members.size > 0) {
            targetMember = message.mentions.members.first();
        } else {
            const userId = userMention.replace(/[<@!>]/g, '');
            targetMember = await message.guild.members.fetch(userId).catch(() => null);

            if (!targetMember) {
                const search = userMention.toLowerCase();
                targetMember = message.guild.members.cache.find(m =>
                    m.user.username.toLowerCase() === search ||
                    m.displayName.toLowerCase() === search ||
                    m.user.tag.toLowerCase() === search
                );
            }
        }

        if (!targetMember) {
            const display = new TextDisplayBuilder().setContent(client.t(message.guild.id, "ui.userNotInGuild", { e: emoji.warn }));
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        const presence = targetMember.presence;
        const statusMap = {
            online: 'Online',
            idle: 'Idle',
            dnd: 'Do Not Disturb',
            offline: 'Offline'
        };

        const statusEmojiMap = {
            online: '🟢',
            idle: '🟡',
            dnd: '🔴',
            offline: '⚫'
        };

        const status = presence ? statusMap[presence.status] : statusMap['offline'];
        const sEmoji = presence ? statusEmojiMap[presence.status] : statusEmojiMap['offline'];
        const activities = presence?.activities || [];

        const clientStatus = presence?.clientStatus;
        const devices = [];
        if (clientStatus) {
            if (clientStatus.desktop) devices.push('Desktop');
            if (clientStatus.mobile) devices.push('Mobile');
            if (clientStatus.web) devices.push('Web');
        }
        const deviceText = devices.length > 0 ? devices.join(', ') : 'Hidden/Offline';

        const customActivity = activities.find(a => a.type === ActivityType.Custom);
        const customStatusText = customActivity ?
            `${customActivity.emoji ? customActivity.emoji.toString() + ' ' : ''}${customActivity.state || ''}` :
            "None";

        let mainContent = `${emoji.hastag} **__${client.t(message.guild.id, "ui.section.userStatus")}__**\n` +
            `> **${client.t(message.guild.id, "ui.label.target")}:** [\`${targetMember.user.displayName}\`](https://discord.com/users/${targetMember.user.id})\n` +
            `> **${client.t(message.guild.id, "ui.label.status")}:** \` ${sEmoji} ${status} \`\n` +
            `> **${client.t(message.guild.id, "ui.label.device")}:** \` ${deviceText} \`\n` +
            `> **${client.t(message.guild.id, "ui.label.custom")}:** \` ${customStatusText} \``;

        const filteredActivities = activities.filter(act => act.type !== ActivityType.Custom);

        if (filteredActivities.length > 0) {
            mainContent += `\n\n${emoji.hastag} **__${client.t(message.guild.id, "ui.section.activities")}__**`;
            filteredActivities.forEach(act => {
                if (act.name === 'Spotify') {
                    mainContent += `\n> Listening to **Spotify** - **${act.details}** (${act.state})`;
                } else {
                    let typePrefix = '';
                    switch (act.type) {
                        case ActivityType.Playing: typePrefix = 'Playing'; break;
                        case ActivityType.Streaming: typePrefix = 'Streaming'; break;
                        case ActivityType.Listening: typePrefix = 'Listening to'; break;
                        case ActivityType.Watching: typePrefix = 'Watching'; break;
                        case ActivityType.Competing: typePrefix = 'Competing in'; break;
                    }

                    const details = act.details ? ` - \`${act.details}\`` : '';
                    const state = act.state ? ` (\`${act.state}\`)` : '';
                    mainContent += `\n> ${typePrefix} **${act.name}**${details}${state}`;
                }
            });
        } else if (presence && presence.status !== 'offline') {
            mainContent += `\n\n ${emoji.hastag} **__${client.t(message.guild.id, "ui.section.activities")}__**\n${emoji.blank}${emoji.wickarrow} \`No current activity\``;
        }

        const section = new SectionBuilder();
        section.addTextDisplayComponents(new TextDisplayBuilder().setContent(mainContent));
        section.setThumbnailAccessory((thumbnail) =>
            thumbnail.setURL(targetMember.user.displayAvatarURL({ size: 256, dynamic: true }))
        );

        const footer = new TextDisplayBuilder()
            .setContent(`\n-# Requested by ${message.author.displayName}`);

        const container = new ContainerBuilder()
            .addSectionComponents(section)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(footer);

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
