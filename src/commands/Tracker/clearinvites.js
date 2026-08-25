const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');

module.exports = {
    name: 'clearinvites',
    aliases: ['resetinvites', 'wipeinvites'],
    description: "Clear invite tracking data for this server or a specific member",
    category: 'Tracker',
    userPerms: ['ManageGuild'],
    usage: 'clearinvites <all | @member>',
    slashOptions: [
        {
            name: 'target',
            description: 'Clear all invites or for a specific member',
            type: 3,
            required: true,
            choices: [
                { name: "All", value: "all" }
            ]
        },
        {
            name: 'member',
            description: 'The member to clear invite data for',
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
        const target = interaction.options.getString('target');
        const member = interaction.options.getUser('member');

        if (target === 'all') {
            args.push('all');
        } else if (member) {
            args.push(`<@${member.id}>`);
        }

        const prefix = client.prefix;
        return this.execute(interactionWrapper, args, client, prefix);
    },

    async execute(message, args, client) {
        try {
            if (!args[0]) {
                const display = new TextDisplayBuilder()
                    .setContent(
                        `${client.emoji.warn} **Invalid usage!**\n\n` +
                        `**Usage:**\n` +
                        `\`${client.prefix}clearinvites all\` - Clear all invite data\n` +
                        `\`${client.prefix}clearinvites @member\` - Clear data for a specific member`
                    );

                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(display)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
            }

            if (args[0].toLowerCase() === 'all') {
                const count = client.db.invite_logs.count({ guildId: message.guild.id });

                if (count === 0) {
                    const display = new TextDisplayBuilder()
                        .setContent(`${client.emoji.warn} **No invite records found in this server.**`);

                    return message.reply({
                        components: [new ContainerBuilder().addTextDisplayComponents(display)],
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { parse: [] }
                    });
                }

                const result = client.db.invite_logs.updateMany(
                    { guildId: message.guild.id },
                    {
                        cleared: 1,
                        clearedAt: new Date().toISOString()
                    }
                );

                const successDisplay = new TextDisplayBuilder()
                    .setContent(`${client.emoji.check} **Successfully cleared \`${result.changes}\` invite records from this server.**`);

                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(successDisplay)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });

            } else {
                const userMention = args[0].replace(/[<@!>]/g, '');
                let targetUser;

                try {
                    targetUser = await message.guild.members.fetch(userMention).then(m => m.user);
                } catch (error) {
                    const display = new TextDisplayBuilder()
                        .setContent(`${client.emoji.warn} **Could not find that user.**`);

                    return message.reply({
                        components: [new ContainerBuilder().addTextDisplayComponents(display)],
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { parse: [] }
                    });
                }

                const inviterCount = client.db.invite_logs.count({
                    guildId: message.guild.id,
                    inviterId: targetUser.id
                });

                const invitedCount = client.db.invite_logs.count({
                    guildId: message.guild.id,
                    userId: targetUser.id
                });

                if (inviterCount === 0 && invitedCount === 0) {
                    const display = new TextDisplayBuilder()
                        .setContent(`${client.emoji.warn} **No invite records found for [${targetUser.displayName}](https://discord.com/users/${targetUser.id}).**`);

                    return message.reply({
                        components: [new ContainerBuilder().addTextDisplayComponents(display)],
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { parse: [] }
                    });
                }

                const inviterResult = client.db.invite_logs.updateMany(
                    {
                        guildId: message.guild.id,
                        inviterId: targetUser.id
                    },
                    {
                        cleared: 1,
                        clearedAt: new Date().toISOString()
                    }
                );

                const invitedResult = client.db.invite_logs.updateMany(
                    {
                        guildId: message.guild.id,
                        userId: targetUser.id
                    },
                    {
                        cleared: 1,
                        clearedAt: new Date().toISOString()
                    }
                );

                const totalCleared = inviterResult.changes + invitedResult.changes;

                const successDisplay = new TextDisplayBuilder()
                    .setContent(
                        `${client.emoji.check} **Successfully cleared invite data for [${targetUser.displayName}](https://discord.com/users/${targetUser.id}).**`
                    );

                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(successDisplay)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
            }

        } catch (error) {
            console.error('Error in clearinvites command:', error);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(`${client.emoji.warn} **An error occurred while clearing invite data.**`);

            return message.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(errorDisplay)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });
        }
    }
};
