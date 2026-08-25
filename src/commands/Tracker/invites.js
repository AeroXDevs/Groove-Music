const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
async function getInviteStats(client, guildId, userId) {
    try {
        const invites = client.db.invite_logs.find({
            guildId: guildId,
            inviterId: userId,
            cleared: { $ne: true }
        });

        const stats = {
            total: 0,
            joins: 0,
            left: 0,
            fake: 0,
            rejoins: 0
        };

        invites.forEach(invite => {
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

        stats.total = stats.joins - stats.rejoins - stats.left - stats.fake;

        if (stats.total < 0) stats.total = 0;

        return stats;

    } catch (error) {
        console.error('Error fetching invite stats:', error);
        return {
            total: 0,
            joins: 0,
            left: 0,
            fake: 0,
            rejoins: 0
        };
    }
}

module.exports = {
    name: 'invites',
    aliases: ['i'],
    description: "Displays the invite statistics of a member including total invites, joins, left, fake, and rejoins.",
    category: 'Tracker',
    botPerms: ['ManageGuild'],
    slashOptions: [
        {
            name: 'user',
            description: 'The user to check invite stats for',
            type: 6,
            required: false
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

        const args = [];
        if (interaction.options) {
            const userOption = interaction.options.getUser('user');
            if (userOption) {
                args.push(`<@${userOption.id}>`);
            }
        }

        const prefix = client.prefix;
        return this.execute(interactionWrapper, args, client, prefix);
    },

    async execute(message, args, client) {
        try {

            let targetUser = message.author;

            if (args.length > 0) {
                const userMention = args[0].replace(/[<@!>]/g, '');
                try {
                    targetUser = await message.guild.members.fetch(userMention).then(m => m.user);
                } catch (error) {
                    const display = new TextDisplayBuilder()
                        .setContent(`${client.emoji.warn} Could not find that user. Please mention a valid user or use their ID.`);

                    return message.reply({
                        components: [new ContainerBuilder().addTextDisplayComponents(display)],
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { parse: [] }
                    });
                }
            }

            if (targetUser.bot) {
                const display = new TextDisplayBuilder()
                    .setContent(`${client.emoji.warn} Bots cannot have invite statistics.`);

                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(display)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
            }

            const stats = await getInviteStats(client, message.guild.id, targetUser.id);

            const header = new TextDisplayBuilder()
                .setContent(`### [${targetUser.displayName}](https://discord.com/users/${targetUser.id}) Invite Statistics\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

            const separator = new SeparatorBuilder();

            const statsContent = new TextDisplayBuilder()
                .setContent(
                    `${client.emoji.wickarrow} **__Total Invites__ : \`${stats.total}\`**\n\n` +
                    `> - **Joins : \`${stats.joins}\`**\n` +
                    `> - **Left : \`${stats.left}\`**\n` +
                    `> - **Fake : \`${stats.fake}\`**\n` +
                    `> - **Rejoins : \`${stats.rejoins}\`**\n`
                );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(header)
                .addSeparatorComponents(separator)
                .addTextDisplayComponents(statsContent);

            await message.reply({
                content: '',
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });

        } catch (error) {
            console.error('Error in invites command:', error);

            const display = new TextDisplayBuilder()
                .setContent(`${client.emoji.warn} An error occurred while fetching invite statistics.`);

            return message.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(display)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });
        }
    }
};
