const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');

module.exports = {
    name: 'resetmyinvites',
    aliases: ['rmi', 'clearmyinvites'],
    description: "Reset your own invite statistics in this server",
    category: 'Tracker',
    botPerms: ['ManageGuild'],
    slashOptions: [],

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
        const prefix = client.prefix;
        return this.execute(interactionWrapper, args, client, prefix);
    },

    async execute(message, args, client) {
        try {

            const inviterCount = client.db.invite_logs.count({
                guildId: message.guild.id,
                inviterId: message.author.id
            });

            const invitedCount = client.db.invite_logs.count({
                guildId: message.guild.id,
                userId: message.author.id
            });

            if (inviterCount === 0 && invitedCount === 0) {
                const display = new TextDisplayBuilder()
                    .setContent(`${client.emoji.warn} **You don't have any invite records in this server.**`);

                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(display)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
            }

            client.db.invite_logs.updateMany(
                {
                    guildId: message.guild.id,
                    inviterId: message.author.id
                },
                {
                    cleared: 1,
                    clearedAt: new Date().toISOString()
                }
            );

            client.db.invite_logs.updateMany(
                {
                    guildId: message.guild.id,
                    userId: message.author.id
                },
                {
                    cleared: 1,
                    clearedAt: new Date().toISOString()
                }
            );

            const successDisplay = new TextDisplayBuilder()
                .setContent(`${client.emoji.check} **Successfully reset your invite statistics!`);

            return message.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(successDisplay)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });

        } catch (error) {
            console.error('Error in resetmyinvites command:', error);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(`${client.emoji.warn} **An error occurred while resetting your invite statistics.**`);

            return message.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(errorDisplay)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });
        }
    }
};
