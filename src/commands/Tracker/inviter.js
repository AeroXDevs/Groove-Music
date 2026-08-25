const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    name: 'inviter',
    aliases: ['whoinvited', 'invitedby'],
    description: "Shows who invited you or another user to the server",
    category: 'Tracker',
    botPerms: ['ManageGuild'],
    slashOptions: [
        {
            name: 'user',
            description: 'The user to check the inviter for',
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
                        .setContent(`${client.emoji.warn} **Could not find that user.**`);

                    return message.reply({
                        components: [new ContainerBuilder().addTextDisplayComponents(display)],
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { parse: [] }
                    });
                }
            }

            if (targetUser.bot) {
                const display = new TextDisplayBuilder()
                    .setContent(`${client.emoji.warn} Bots don't have inviters.`);

                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(display)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
            }

            const inviteRecord = client.db.invite_logs.get(message.guild.id, targetUser.id);

            if (!inviteRecord || !inviteRecord.inviterId || inviteRecord.isLeft === 1) {
                const display = new TextDisplayBuilder()
                    .setContent(`${client.emoji.warn} **No invite record found for ${targetUser.tag}.**`);

                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(display)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
            }

            let inviter;
            try {
                inviter = await client.users.fetch(inviteRecord.inviterId);
            } catch (error) {
                const display = new TextDisplayBuilder()
                    .setContent(`${client.emoji.warn} **Could not fetch inviter information.**`);

                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(display)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
            }

            const joinedTimestamp = Math.floor(new Date(inviteRecord.joinedAt).getTime() / 1000);

            const header = new TextDisplayBuilder()
                .setContent(`### [${targetUser.displayName}'s](https://discord.com/users/${targetUser.id}) Inviter\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

            const separator = new SeparatorBuilder();

            const inviterContent = new TextDisplayBuilder()
                .setContent(
                    `${client.emoji.wickarrow} **Invited by:** [${inviter.displayName}](https://discord.com/users/${inviter.id})\n` +
                    `${client.emoji.wickarrow} **Invite Code:** \`${inviteRecord.inviteCode || 'Unknown'}\`\n` +
                    `${client.emoji.wickarrow} **Joined:** <t:${joinedTimestamp}:R>\n` +
                    `${client.emoji.wickarrow} **Fake:** \`${inviteRecord.isFake ? 'Yes' : 'No'}\`\n` +
                    `${client.emoji.wickarrow} **Rejoin:** \`${inviteRecord.isRejoin ? 'Yes' : 'No'}\``
                );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(header)
                .addSeparatorComponents(separator)
                .addTextDisplayComponents(inviterContent);

            await message.reply({
                content: '',
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });

        } catch (error) {
            console.error('Error in inviter command:', error);

            const display = new TextDisplayBuilder()
                .setContent(`${client.emoji.warn} **An error occurred while fetching inviter information.**`);

            return message.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(display)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });
        }
    }
};
