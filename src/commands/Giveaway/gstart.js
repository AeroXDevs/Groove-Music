const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    ComponentType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    PermissionFlagsBits
} = require('discord.js');

module.exports = {
    name: 'gstart',
    aliases: ['giveawaystart', 'gcreate'],
    description: "Start a giveaway.",
    category: 'Giveaway',
    usage: 'gstart <duration> <winners> <prize>',
    example: 'gstart 10m 1 Nitro',
    slashOptions: [
        {
            name: 'prize',
            description: 'The prize for the giveaway',
            type: 3,
            required: true
        },
        {
            name: 'duration',
            description: 'The duration (e.g. 10m, 2h, 3d)',
            type: 3,
            required: true
        },
        {
            name: 'winners',
            description: 'The number of winners',
            type: 4,
            required: true
        }
    ],
    userPerms: ['ManageChannels'],
    botPerms: ['EmbedLinks', 'SendMessages', 'AddReactions'],

    async slashExecute(interaction, client) {
        const isOwner = client.owners.includes(interaction.user.id);
        if (!interaction.member.permissions.has('ManageChannels') && !isOwner) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} You need \`Manage Channels\` permissions to use this command.`);
            return interaction.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(display)],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const prize = interaction.options.getString('prize');
        const winners = interaction.options.getInteger('winners');
        const durationStr = interaction.options.getString('duration');

        if (prize && winners && durationStr) {
            const durationMs = parseDuration(durationStr);
            if (!durationMs) {
                const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} Invalid duration suffix! Use s, m, h, or d.`);
                return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
            }
            if (winners < 1) {
                const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} Winners must be at least 1.`);
                return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
            }

            const endTime = Date.now() + durationMs;
            const endTimeUnix = Math.floor(endTime / 1000);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${client.emoji.gwy} Giveaway Started`))
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.wickarrow} **Prize:** \`${prize}\`\n` +
                    `${client.emoji.wickarrow} **Winners:** \`${winners}\`\n` +
                    `${client.emoji.wickarrow} **Host:** <@${interaction.user.id}>\n` +
                    `${client.emoji.wickarrow} **Ends:** <t:${endTimeUnix}:R> [<t:${endTimeUnix}:f>]\n\n` +
                    `-# React with ${client.emoji.gwy} to enter!`
                ));

            const giveawayMsg = await interaction.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });
            await giveawayMsg.react(`${client.emoji.gwy}`);

            client.db.giveaways.set(giveawayMsg.id, {
                guildId: interaction.guild.id,
                channelId: interaction.channel.id,
                messageId: giveawayMsg.id,
                hostId: interaction.user.id,
                prize: prize,
                winnerCount: winners,
                endTime: endTime,
                participants: [],
                ended: false
            });

            const successDisplay = new TextDisplayBuilder().setContent(`${client.emoji.check} Giveaway started!`);
            return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(successDisplay)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
    },

    async execute(message, args, client) {
        const userId = message.author?.id || message.user?.id;
        const isOwner = client.owners.includes(userId);

        if (!message.member.permissions.has('ManageChannels') && !isOwner) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} You need \`Manage Channels\` permissions to use this command.`);
            return message.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(display)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (args.length >= 3) {
            const durationStr = args[0];
            const winnersCount = parseInt(args[1]);
            const prize = args.slice(2).join(' ');
            const durationMs = parseDuration(durationStr);

            if (!durationMs || isNaN(winnersCount) || winnersCount < 1) {
                const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} Invalid arguments! Format: \`.gstart <duration> <winners> <prize>\``);
                return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
            }

            const endTime = Date.now() + durationMs;
            const endTimeUnix = Math.floor(endTime / 1000);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${client.emoji.gwy} Giveaway Started`))
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.wickarrow} **Prize:** \`${prize}\`\n` +
                    `${client.emoji.wickarrow} **Winners:** \`${winnersCount}\`\n` +
                    `${client.emoji.wickarrow} **Host:** <@${message.author.id}>\n` +
                    `${client.emoji.wickarrow} **Ends:** <t:${endTimeUnix}:R> [<t:${endTimeUnix}:f>]\n\n` +
                    `-# React with ${client.emoji.gwy} to enter!`
                ));

            const channel = message.guild.channels.cache.get(message.channel.id);
            const giveawayMsg = await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });
            await giveawayMsg.react(`${client.emoji.gwy}`);

            client.db.giveaways.set(giveawayMsg.id, {
                guildId: message.guild.id,
                channelId: message.channel.id,
                messageId: giveawayMsg.id,
                hostId: message.author.id,
                prize: prize,
                winnerCount: winnersCount,
                endTime: endTime,
                participants: [],
                ended: false
            });

            return;
        }

        const startButton = new ButtonBuilder().setCustomId('gstart_launch').setLabel('Launch Giveaway').setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder().addComponents(startButton);

        const header = new TextDisplayBuilder().setContent(`### Giveaway System\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);
        const separator = new SeparatorBuilder();
        const info = new TextDisplayBuilder().setContent(`Click the button below to open the giveaway setup form.`);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(info);

        await message.reply({
            components: [container, row],
            flags: MessageFlags.IsComponentsV2
        });
    },

    async componentsV2(interaction, client) {
        const isOwner = client.owners.includes(interaction.user.id);
        if (!interaction.member.permissions.has('ManageChannels') && !isOwner) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} You need \`Manage Channels\` permissions to use this.`);
            return interaction.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(display)],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (interaction.customId === 'gstart_launch') {
            const modal = new ModalBuilder().setCustomId('giveaway_modal').setTitle('Create Giveaway');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('giveaway_prize').setLabel('Prize').setPlaceholder('Enter the prize').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('giveaway_duration').setLabel('Duration').setPlaceholder('e.g. 10m, 2h, 3d').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('giveaway_winners').setLabel('Winner Count').setPlaceholder('Number of winners').setStyle(TextInputStyle.Short).setValue('1').setRequired(true))
            );

            await interaction.showModal(modal);
            try {
                const modalSubmit = await interaction.awaitModalSubmit({ time: 60000, filter: (i) => i.customId === 'giveaway_modal' && i.user.id === interaction.user.id });
                const prize = modalSubmit.fields.getTextInputValue('giveaway_prize');
                const durationStr = modalSubmit.fields.getTextInputValue('giveaway_duration');
                const winnersStr = modalSubmit.fields.getTextInputValue('giveaway_winners');
                const durationMs = parseDuration(durationStr);
                const winnerCount = parseInt(winnersStr);

                if (!durationMs || isNaN(winnerCount) || winnerCount < 1) {
                    const errorDisplay = new TextDisplayBuilder().setContent(`${client.emoji.cross} Invalid input provided.`);
                    return modalSubmit.reply({
                        components: [new ContainerBuilder().addTextDisplayComponents(errorDisplay)],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                    });
                }

                await modalSubmit.deferUpdate();
                const endTime = Date.now() + durationMs;
                const endTimeUnix = Math.floor(endTime / 1000);

                const gContainer = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${client.emoji.gwy} Giveaway Started`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `${client.emoji.wickarrow} **Prize:** \`${prize}\`\n` +
                        `${client.emoji.wickarrow} **Winners:** \`${winnerCount}\`\n` +
                        `${client.emoji.wickarrow} **Host:** <@${interaction.user.id}>\n` +
                        `${client.emoji.wickarrow} **Ends:** <t:${endTimeUnix}:R> [<t:${endTimeUnix}:f>]\n\n` +
                        `-# React with ${client.emoji.gwy} to enter!`
                    ));

                const gMsg = await interaction.channel.send({
                    components: [gContainer],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
                await gMsg.react(`${client.emoji.gwy}`);

                client.db.giveaways.set(gMsg.id, {
                    guildId: interaction.guild.id,
                    channelId: interaction.channel.id,
                    messageId: gMsg.id,
                    hostId: interaction.user.id,
                    prize: prize,
                    winnerCount: winnerCount,
                    endTime: endTime,
                    participants: [],
                    ended: false
                });

                try { await interaction.message.delete(); } catch (e) { }
            } catch (err) { }
        }
    }
};

function parseDuration(str) {
    const units = { 's': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000, 'w': 604800000 };
    const match = str.toLowerCase().match(/^(\d+)([smhdw])$/);
    return match ? parseInt(match[1]) * units[match[2]] : null;
}
