const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    ComponentType
} = require('discord.js');

module.exports = {
    name: 'branding',
    aliases: ['setprofile', 'botprofile', 'customize'],
    description: "Customize the bot's server profile (avatar, banner, bio, nickname).",
    category: 'Owner',
    slashOptions: [],
    args: false,
    usage: "",
    userPerms: [],
    owner: true,

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
        const customizeButton = new ButtonBuilder()
            .setCustomId('open_branding_form')
            .setLabel('Customize Bot Profile')
            .setStyle(ButtonStyle.Primary);

        const resetButton = new ButtonBuilder()
            .setCustomId('reset_branding')
            .setLabel('Reset to Default')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(customizeButton, resetButton);

        const header = new TextDisplayBuilder()
            .setContent(`### Bot Branding\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

        const separator1 = new SeparatorBuilder();

        const info = new TextDisplayBuilder()
            .setContent(
                client.t(message.guild.id, "brand.openFormLine") +
                client.t(message.guild.id, "brand.canSet") +
                `• Avatar\n` +
                `• Banner\n` +
                `• Bio\n` +
                `• Nickname\n\n` +
                `Or click **Reset to Default** to remove all customizations.`
            );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addSeparatorComponents(separator1)
            .addTextDisplayComponents(info);

        const msg = await message.reply({
            content: '',
            components: [container, row],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(client.t(message.guild.id, "brand.onlyUser", { e: client.emoji?.cross, user: message.author.username }));

                const errorContainer = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return interaction.reply({
                    content: '',
                    components: [errorContainer],
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                });
            }

            if (interaction.customId === 'open_branding_form') {
                const modal = new ModalBuilder()
                    .setCustomId('branding_modal')
                    .setTitle('Bot Profile Customization');

                const avatarInput = new TextInputBuilder()
                    .setCustomId('avatar_url')
                    .setLabel('Avatar URL')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setPlaceholder('');

                const bannerInput = new TextInputBuilder()
                    .setCustomId('banner_url')
                    .setLabel('Banner URL')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setPlaceholder('');

                const bioInput = new TextInputBuilder()
                    .setCustomId('bio_text')
                    .setLabel('Bio | About Me')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setMaxLength(190)
                    .setPlaceholder('');

                const nicknameInput = new TextInputBuilder()
                    .setCustomId('nickname_text')
                    .setLabel('Nickname')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(32)
                    .setPlaceholder('');

                const row1 = new ActionRowBuilder().addComponents(avatarInput);
                const row2 = new ActionRowBuilder().addComponents(bannerInput);
                const row3 = new ActionRowBuilder().addComponents(bioInput);
                const row4 = new ActionRowBuilder().addComponents(nicknameInput);

                modal.addComponents(row1, row2, row3, row4);

                await interaction.showModal(modal);

                try {
                    const modalSubmit = await interaction.awaitModalSubmit({
                        time: 300000,
                        filter: (i) => i.customId === 'branding_modal' && i.user.id === message.author.id
                    });

                    const avatarUrl = modalSubmit.fields.getTextInputValue('avatar_url') || null;
                    const bannerUrl = modalSubmit.fields.getTextInputValue('banner_url') || null;
                    const bio = modalSubmit.fields.getTextInputValue('bio_text') || null;
                    const nickname = modalSubmit.fields.getTextInputValue('nickname_text') || null;

                    if (!avatarUrl && !bannerUrl && !bio && !nickname) {
                        const errorDisplay = new TextDisplayBuilder()
                            .setContent(client.t(message.guild.id, "brand.fillOne", { e: client.emoji?.cross }));

                        const errorContainer = new ContainerBuilder()
                            .addTextDisplayComponents(errorDisplay);

                        return modalSubmit.reply({
                            content: '',
                            components: [errorContainer],
                            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                        });
                    }

                    const previewHeader = new TextDisplayBuilder()
                        .setContent(`### Confirm Changes\n-# Review the changes before applying`);

                    const previewSeparator = new SeparatorBuilder();

                    let previewText = '**Changes to apply:**\n\n';
                    if (nickname) previewText += `**${client.t(message.guild.id, "ui.label.nickname")}:** ${nickname}\n`;
                    if (bio) previewText += `**Bio:** ${bio}\n`;
                    if (avatarUrl) previewText += `**Avatar:** ${avatarUrl}\n`;
                    if (bannerUrl) previewText += `**Banner:** ${bannerUrl}\n`;

                    const previewDisplay = new TextDisplayBuilder()
                        .setContent(previewText);

                    const confirmButton = new ButtonBuilder()
                        .setCustomId('confirm_branding')
                        .setLabel('Confirm')
                        .setStyle(ButtonStyle.Success);

                    const cancelButton = new ButtonBuilder()
                        .setCustomId('cancel_branding')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger);

                    const actionRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

                    const previewContainer = new ContainerBuilder()
                        .addTextDisplayComponents(previewHeader)
                        .addSeparatorComponents(previewSeparator)
                        .addTextDisplayComponents(previewDisplay);

                    await modalSubmit.deferUpdate();

                    await msg.edit({
                        content: '',
                        components: [previewContainer, actionRow],
                        flags: MessageFlags.IsComponentsV2
                    });

                    const modalData = { avatarUrl, bannerUrl, bio, nickname };

                    const confirmCollector = msg.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        time: 60000,
                        filter: (i) => i.user.id === message.author.id && (i.customId === 'confirm_branding' || i.customId === 'cancel_branding')
                    });

                    confirmCollector.on('collect', async (btnInteraction) => {
                        if (btnInteraction.customId === 'confirm_branding') {
                            try {
                                const guild = message.guild;
                                const botMember = guild.members.me;

                                let successText = '**Applied changes:**\n\n';

                                if (modalData.nickname) {
                                    await botMember.setNickname(modalData.nickname);
                                    successText += `${client.emoji?.check} Nickname set to: **${modalData.nickname}**\n`;
                                }

                                if (modalData.avatarUrl || modalData.bannerUrl || modalData.bio) {
                                    try {
                                        const { Routes } = require('discord.js');
                                        const axios = require('axios');
                                        const patchData = {};

                                        if (modalData.avatarUrl) {
                                            const response = await axios.get(modalData.avatarUrl, { responseType: 'arraybuffer' });
                                            const base64 = Buffer.from(response.data, 'binary').toString('base64');
                                            const mimeType = response.headers['content-type'] || 'image/png';
                                            patchData.avatar = `data:${mimeType};base64,${base64}`;
                                        }

                                        if (modalData.bannerUrl) {
                                            const response = await axios.get(modalData.bannerUrl, { responseType: 'arraybuffer' });
                                            const base64 = Buffer.from(response.data, 'binary').toString('base64');
                                            const mimeType = response.headers['content-type'] || 'image/png';
                                            patchData.banner = `data:${mimeType};base64,${base64}`;
                                        }

                                        if (modalData.bio) patchData.bio = modalData.bio;

                                        await client.rest.patch(
                                            Routes.guildMember(guild.id, '@me'),
                                            { body: patchData }
                                        );

                                        if (modalData.avatarUrl) successText += `${client.emoji?.check} Avatar updated\n`;
                                        if (modalData.bannerUrl) successText += `${client.emoji?.check} Banner updated\n`;
                                        if (modalData.bio) successText += `${client.emoji?.check} Bio updated\n`;
                                    } catch (apiError) {
                                        successText += client.t(message.guild.id, "brand.apiError", { e: client.emoji?.warn, message: apiError.message });
                                    }
                                }

                                const successHeader = new TextDisplayBuilder()
                                    .setContent(`### ${client.emoji?.check} Success!`);

                                const successSeparator = new SeparatorBuilder();

                                const successDisplay = new TextDisplayBuilder()
                                    .setContent(successText);

                                const successContainer = new ContainerBuilder()
                                    .addTextDisplayComponents(successHeader)
                                    .addSeparatorComponents(successSeparator)
                                    .addTextDisplayComponents(successDisplay);

                                await btnInteraction.update({
                                    content: '',
                                    components: [successContainer],
                                    flags: MessageFlags.IsComponentsV2
                                });

                                collector.stop();
                                confirmCollector.stop();

                            } catch (error) {
                                const errorHeader = new TextDisplayBuilder()
                                    .setContent(`### ${client.emoji?.cross} Error`);

                                const errorSeparator = new SeparatorBuilder();

                                const errorDisplay = new TextDisplayBuilder()
                                    .setContent(client.t(message.guild.id, "brand.applyFail", { message: error.message }));

                                const errorContainer = new ContainerBuilder()
                                    .addTextDisplayComponents(errorHeader)
                                    .addSeparatorComponents(errorSeparator)
                                    .addTextDisplayComponents(errorDisplay);

                                await btnInteraction.update({
                                    content: '',
                                    components: [errorContainer],
                                    flags: MessageFlags.IsComponentsV2
                                });
                            }
                        } else if (btnInteraction.customId === 'cancel_branding') {
                            const cancelHeader = new TextDisplayBuilder()
                                .setContent(`### ${client.emoji?.cross} Cancelled`);

                            const cancelSeparator = new SeparatorBuilder();

                            const cancelDisplay = new TextDisplayBuilder()
                                .setContent('Branding changes cancelled.');

                            const cancelContainer = new ContainerBuilder()
                                .addTextDisplayComponents(cancelHeader)
                                .addSeparatorComponents(cancelSeparator)
                                .addTextDisplayComponents(cancelDisplay);

                            await btnInteraction.update({
                                content: '',
                                components: [cancelContainer],
                                flags: MessageFlags.IsComponentsV2
                            });

                            collector.stop();
                            confirmCollector.stop();
                        }
                    });

                } catch (error) {
                    console.error('Modal timeout or error:', error);
                }
            } else if (interaction.customId === 'reset_branding') {
                try {
                    const guild = message.guild;
                    const botMember = guild.members.me;

                    let resetText = '**Reset changes:**\n\n';

                    await botMember.setNickname(null);
                    resetText += `${client.emoji?.check} Nickname reset to default\n`;

                    try {
                        const { Routes } = require('discord.js');

                        await client.rest.patch(
                            Routes.guildMember(guild.id, '@me'),
                            {
                                body: {
                                    avatar: null,
                                    banner: null,
                                    bio: null
                                }
                            }
                        );
                        resetText += `${client.emoji?.check} Avatar reset to default\n`;
                        resetText += `${client.emoji?.check} Banner reset to default\n`;
                        resetText += `${client.emoji?.check} Bio reset to default\n`;
                    } catch (err) {
                        resetText += client.t(message.guild.id, "brand.resetFail", { e: client.emoji?.warn, message: err.message });
                    }

                    const resetHeader = new TextDisplayBuilder()
                        .setContent(`### ${client.emoji?.check} Reset Complete!`);

                    const resetSeparator = new SeparatorBuilder();

                    const resetDisplay = new TextDisplayBuilder()
                        .setContent(resetText);

                    const resetContainer = new ContainerBuilder()
                        .addTextDisplayComponents(resetHeader)
                        .addSeparatorComponents(resetSeparator)
                        .addTextDisplayComponents(resetDisplay);

                    await interaction.update({
                        content: '',
                        components: [resetContainer],
                        flags: MessageFlags.IsComponentsV2
                    });

                    collector.stop();

                } catch (error) {
                    const errorHeader = new TextDisplayBuilder()
                        .setContent(`### ${client.emoji?.cross} Error`);

                    const errorSeparator = new SeparatorBuilder();

                    const errorDisplay = new TextDisplayBuilder()
                        .setContent(client.t(message.guild.id, "brand.resetFail2", { message: error.message }));

                    const errorContainer = new ContainerBuilder()
                        .addTextDisplayComponents(errorHeader)
                        .addSeparatorComponents(errorSeparator)
                        .addTextDisplayComponents(errorDisplay);

                    await interaction.update({
                        content: '',
                        components: [errorContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            }
        });

        collector.on('end', () => {
            msg.edit({ components: [] }).catch(() => { });
        });
    }
};
