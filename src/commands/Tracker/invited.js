const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
module.exports = {
    name: 'invited',
    aliases: ['myinvited', 'invitedlist'],
    description: "Shows all the people you invited to the server",
    category: 'Tracker',
    botPerms: ['ManageGuild'],
    slashOptions: [
        {
            name: 'user',
            description: 'The user to check invited members for',
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


            const invitedMembers = client.db.invite_logs.find({
                guildId: message.guild.id,
                inviterId: targetUser.id,
                isLeft: 0,
                cleared: { $ne: true }
            }).sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());

            const uniqueMembers = [];
            const seenUserIds = new Set();

            for (const record of invitedMembers) {
                if (!seenUserIds.has(record.userId)) {
                    uniqueMembers.push(record);
                    seenUserIds.add(record.userId);
                }
            }

            if (!uniqueMembers || uniqueMembers.length === 0) {
                const infoDisplay = new TextDisplayBuilder()
                    .setContent(`${client.emoji.info} **${targetUser.displayName} hasn't invited anyone yet!**`);

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(infoDisplay);

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
            }

            const membersPerPage = 10;
            const pages = Math.ceil(uniqueMembers.length / membersPerPage);
            let currentPage = 0;

            const createContainer = (page) => {
                const start = page * membersPerPage;
                const end = start + membersPerPage;
                const currentMembers = uniqueMembers.slice(start, end);

                const headerDisplay = new TextDisplayBuilder()
                    .setContent(`**${client.emoji.check} Members invited by [${targetUser.displayName}](https://discord.com/users/${targetUser.id}):**`);

                const separator = new SeparatorBuilder();

                const membersDisplay = new TextDisplayBuilder()
                    .setContent(
                        currentMembers.map((invite, i) => {
                            const flags = [];
                            if (invite.isFake) flags.push('FAKE');
                            if (invite.isRejoin) flags.push('REJOIN');
                            const flagStr = flags.length > 0 ? ` \`[${flags.join(', ')}]\`` : '';

                            const joinedTimestamp = Math.floor(new Date(invite.joinedAt).getTime() / 1000);
                            return `** \`${start + i + 1}\` | <@${invite.userId}>** - <t:${joinedTimestamp}:R>${flagStr}`;
                        }).join('\n')
                    );


                return new ContainerBuilder()
                    .addTextDisplayComponents(headerDisplay)
                    .addSeparatorComponents(separator)
                    .addTextDisplayComponents(membersDisplay);
            };

            const components = [createContainer(currentPage)];
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

                    const updatedComponents = [createContainer(currentPage)];
                    if (pages > 1) {
                        updatedComponents.push(components[1]);
                    }

                    await interaction.update({
                        components: updatedComponents,
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { parse: [] }
                    });
                });

                collector.on('end', () => {
                    msg.edit({ components: [createContainer(currentPage)], allowedMentions: { parse: [] } }).catch(() => { });
                });
            }

        } catch (error) {
            console.error('Error in invited command:', error);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(`${client.emoji.cross} **An error occurred while fetching invited members.**`);

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
