const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
async function getInviteLeaderboard(client, guildId) {
    const invites = client.db.invite_logs.find({
        guildId: guildId,
        cleared: { $ne: true }
    });

    const userStats = new Map();

    invites.forEach(invite => {
        if (!invite.inviterId) return;

        if (!userStats.has(invite.inviterId)) {
            userStats.set(invite.inviterId, {
                joins: 0,
                left: 0,
                fake: 0,
                rejoins: 0,
                total: 0
            });
        }

        const stats = userStats.get(invite.inviterId);

        stats.joins++;

        if (invite.isLeft) {
            stats.left++;
        }

        if (invite.isFake) {
            stats.fake++;
        }

        if (invite.isRejoin) {
            stats.rejoins++;
        }
    });

    userStats.forEach((stats, userId) => {
        stats.total = stats.joins - stats.rejoins - stats.left - stats.fake;
        if (stats.total < 0) stats.total = 0;
    });

    const leaderboard = Array.from(userStats.entries())
        .map(([userId, stats]) => ({ userId, ...stats }))
        .filter(entry => entry.total > 0)
        .sort((a, b) => b.total - a.total);

    return leaderboard;
}

module.exports = {
    name: 'lbinvites',
    aliases: ['lbinv', 'lbi', 'inviteleaderboard'],
    description: "Shows the invite leaderboard for this server",
    category: 'Tracker',
    botPerms: ['ManageGuild'],
    usage: 'lbinvites',
    slashOptions: [
        {
            name: 'type',
            description: 'Type of leaderboard',
            type: 3,
            required: true,
            choices: [
                { name: "Invites", value: "invites" }
            ]
        }
    ],

    async slashExecute(interaction, client) {
        const interactionWrapper = {
            guild: interaction.guild,
            channel: interaction.channel,
            author: interaction.user,
            member: interaction.member,
            createdTimestamp: interaction.createdTimestamp,
            reply: async (options) => {
                if (interaction.deferred) {
                    return await interaction.editReply(options);
                } else if (interaction.replied) {
                    return await interaction.followUp(options);
                } else {
                    return await interaction.reply(options);
                }
            },
        };

        const type = interaction.options.getString('type');
        const args = [type];
        const prefix = client.prefix;
        return this.execute(interactionWrapper, args, client, prefix);
    },

    async execute(message, args, client) {
        try {


            const leaderboard = await getInviteLeaderboard(client, message.guild.id);

            if (!leaderboard || leaderboard.length === 0) {
                const infoDisplay = new TextDisplayBuilder()
                    .setContent(`${client.emoji.info} **No invite data found for this server!**`);

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(infoDisplay);

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
            }

            const usersPerPage = 10;
            const pages = Math.ceil(leaderboard.length / usersPerPage);
            let currentPage = 0;

            const createContainer = async (page) => {
                const start = page * usersPerPage;
                const end = start + usersPerPage;
                const currentUsers = leaderboard.slice(start, end);

                const headerDisplay = new TextDisplayBuilder()
                    .setContent(`**${client.emoji.check} Invite Leaderboard:**`);

                const separator = new SeparatorBuilder();

                const leaderboardText = await Promise.all(
                    currentUsers.map(async (entry, i) => {
                        const rank = start + i + 1;
                        let medal = '';
                        if (rank === 1) medal = '🥇';
                        else if (rank === 2) medal = '🥈';
                        else if (rank === 3) medal = '🥉';
                        else medal = `\`${rank}\``;

                        let user;
                        try {
                            user = await client.users.fetch(entry.userId);
                        } catch {
                            return `** \`${medal}\` | Unknown User - \`${entry.total}\` invites**`;
                        }

                        return `** \`${medal}\` | <@${user.id}> - \`${entry.total}\` invites**`;
                    })
                );

                const leaderboardDisplay = new TextDisplayBuilder()
                    .setContent(leaderboardText.join('\n'));

                return new ContainerBuilder()
                    .addTextDisplayComponents(headerDisplay)
                    .addSeparatorComponents(separator)
                    .addTextDisplayComponents(leaderboardDisplay);
            };

            const components = [await createContainer(currentPage)];
            if (pages > 1) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('home')
                        .setLabel('Home')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('close')
                        .setLabel('Close')
                        .setStyle(ButtonStyle.Danger)
                );
                components.push(row);
            }

            const msg = await message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });

            if (pages > 1) {
                const collector = msg.createMessageComponentCollector({
                    filter: (i) => i.user.id === message.author.id,
                    time: 60000
                });

                collector.on('collect', async (interaction) => {
                    if (interaction.customId === 'close') {
                        collector.stop();
                        return await interaction.message.delete().catch(() => { });
                    } else if (interaction.customId === 'home') {
                        currentPage = 0;
                    } else if (interaction.customId === 'prev') {
                        currentPage = (currentPage - 1 + pages) % pages;
                    } else if (interaction.customId === 'next') {
                        currentPage = (currentPage + 1) % pages;
                    }

                    const updatedComponents = [await createContainer(currentPage)];
                    if (pages > 1) {
                        updatedComponents.push(components[1]);
                    }

                    await interaction.update({
                        components: updatedComponents,
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { parse: [] }
                    });
                });

                collector.on('end', async () => {
                    msg.edit({ components: [await createContainer(currentPage)], allowedMentions: { parse: [] } }).catch(() => { });
                });
            }

        } catch (error) {
            console.error('Error in leaderboard command:', error);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(`${client.emoji.cross} **An error occurred while fetching the leaderboard.**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });
        }
    }
};
