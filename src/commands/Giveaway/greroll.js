const {
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ComponentType,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    PermissionFlagsBits
} = require('discord.js');
const giveawayManager = require('../../utils/giveawayManager');

module.exports = {
    name: 'greroll',
    aliases: ['giveawayreroll'],
    description: "Reroll a winner for an ended giveaway.",
    category: 'Giveaway',
    slashOptions: [
        {
            name: 'giveaway',
            description: 'Select the giveaway to reroll',
            type: 3,
            required: true,
            autocomplete: true
        }
    ],
    userPerms: ['ManageChannels'],
    botPerms: ['EmbedLinks', 'SendMessages'],

    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const endedGiveaways = client.db.giveaways.getEndedForChannel(interaction.channel.id);

        const filtered = endedGiveaways.filter(g => g.prize.toLowerCase().includes(focusedValue.toLowerCase()));
        await interaction.respond(
            filtered.slice(0, 25).map(g => ({ name: g.prize.substring(0, 50) + ` (${g.messageId})`, value: g.messageId }))
        );
    },

    async slashExecute(interaction, client) {
        const isOwner = client.owners.includes(interaction.user.id);
        if (!interaction.member.permissions.has('ManageChannels') && !isOwner) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} You need \`Manage Channels\` permissions.`);
            return interaction.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(display)],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const selectedId = interaction.options.getString('giveaway');
        const interactionWrapper = {
            guild: interaction.guild,
            channel: interaction.channel,
            author: interaction.user,
            member: interaction.member,
            reply: async (options) => {
                if (interaction.deferred) return await interaction.editReply(options);
                if (interaction.replied) return await interaction.followUp(options);
                return await interaction.reply(options);
            }
        };
        return this.execute(interactionWrapper, selectedId ? [selectedId] : [], client);
    },

    async execute(message, args, client) {
        const isOwner = client.owners.includes(message.author?.id || message.user?.id);
        if (!message.member.permissions.has('ManageChannels') && !isOwner) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} You need \`Manage Channels\` permissions.`);
            return message.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(display)],
                flags: MessageFlags.IsComponentsV2 | (message.user ? MessageFlags.Ephemeral : 0)
            });
        }

        const selectedId = args[0];
        if (selectedId) {
            const gwy = client.db.giveaways.get(selectedId);
            if (!gwy || !gwy.ended) {
                const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} Ended giveaway not found with that ID.`);
                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(display)],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            const result = await giveawayManager.rerollGiveaway(client, gwy, message.channel);
            if (result === true) {
                return;
            } else {
                const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} ${result}`);
                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(display)],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        const giveaways = client.db.giveaways.getEndedForChannel(message.channel.id);
        if (giveaways.length === 0) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} No ended giveaways found in this channel.`);
            return message.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(display)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (giveaways.length === 1) {
            const result = await giveawayManager.rerollGiveaway(client, giveaways[0], message.channel);
            if (result === true) {
                return;
            } else {
                const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} ${result}`);
                return message.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(display)],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('greroll_select')
            .setPlaceholder('Select a giveaway to reroll')
            .addOptions(giveaways.map(g => new StringSelectMenuOptionBuilder().setLabel(g.prize.substring(0, 100)).setDescription(`Message ID: ${g.messageId}`).setValue(g.messageId)));

        const chooseDisplay = new TextDisplayBuilder().setContent(`${client.emoji.gwy} Multiple ended giveaways found. Please select one:`);
        const msg = await message.reply({
            components: [new ContainerBuilder().addTextDisplayComponents(chooseDisplay), new ActionRowBuilder().addComponents(selectMenu)],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 30000, filter: i => i.user.id === (message.author?.id || message.user?.id) });
        collector.on('collect', async i => {
            const gwy = giveaways.find(g => g.messageId === i.values[0]);
            await i.deferUpdate();
            const result = await giveawayManager.rerollGiveaway(client, gwy, message.channel);
            if (result === true) {
                await i.deleteReply().catch(() => { });
            } else {
                const errorDisplay = new TextDisplayBuilder().setContent(`${client.emoji.cross} ${result}`);
                await i.editReply({
                    components: [new ContainerBuilder().addTextDisplayComponents(errorDisplay)],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            collector.stop();
        });
    }
};

