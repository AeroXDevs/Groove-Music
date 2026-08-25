const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'invitecodes',
    aliases: ['invitecode', 'ic'],
    description: "Show all invite codes created by a user with their usage counts",
    category: 'Tracker',
    usage: 'invitecodes [@user]',
    slashOptions: [
        {
            name: 'user',
            description: 'The user to check invite codes for',
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
        const user = interaction.options.getUser('user');
        if (user) {
            args.push(`<@${user.id}>`);
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
                        .setContent(client.t(message.guild.id, "trk.userNotFound", { e: client.emoji.warn }));

                    return message.reply({
                        components: [new ContainerBuilder().addTextDisplayComponents(display)],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            }

            if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
                const display = new TextDisplayBuilder()
                    .setContent(`${client.emoji.warn} **I need the \`Manage Server\` permission to view invite codes.**`);

                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(display)],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const invites = await message.guild.invites.fetch().catch(() => null);
            if (!invites) {
                const display = new TextDisplayBuilder()
                    .setContent(client.t(message.guild.id, "trk.errCodesPerms", { e: client.emoji.warn }));

                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(display)],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const userInvites = invites.filter(invite => invite.inviter?.id === targetUser.id);

            if (userInvites.size === 0) {
                const display = new TextDisplayBuilder()
                    .setContent(client.t(message.guild.id, "trk.noActiveCodes", { e: client.emoji.warn, user: targetUser.displayName, id: targetUser.id }));

                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(display)],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const headerDisplay = new TextDisplayBuilder()
                .setContent(`**Invite codes of [${targetUser.displayName}](https://discord.com/users/${targetUser.id})**`);

            const separator = new SeparatorBuilder();

            let inviteList = '';
            const sortedInvites = Array.from(userInvites.values())
                .sort((a, b) => b.uses - a.uses);

            sortedInvites.forEach(invite => {
                const uses = invite.uses || 0;
                const maxUses = invite.maxUses || '∞';

                inviteList += `${client.emoji.arrowright} \`${invite.code}\` : \`${uses}\` Uses`;

                if (invite.maxUses > 0) {
                    inviteList += ` / \`${maxUses}\` Max`;
                }

                inviteList += `\n`;
            });

            const invitesDisplay = new TextDisplayBuilder()
                .setContent(inviteList.trim());

            const container = new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator)
                .addTextDisplayComponents(invitesDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error in invitecodes command:', error);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "trk.errCodes", { e: client.emoji.warn }));

            return message.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(errorDisplay)],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
