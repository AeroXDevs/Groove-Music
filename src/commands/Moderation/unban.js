const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ComponentType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    PermissionFlagsBits
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'unban',
    description: 'Unban a user from the server',
    category: 'Moderation',
    usage: 'unban <user/all> [reason]',
    example: 'unban @user Appeal accepted | unban all Mistake',
    slashOptions: [
        {
            name: 'user',
            description: 'The user ID or tag to unban (or "all")',
            type: 3,
            required: true
        },
        {
            name: 'reason',
            description: 'Reason for unbanning',
            type: 3,
            required: false
        }
    ],
    userPerms: ['BanMembers'],
    botPerms: ['BanMembers'],

    async slashExecute(interaction, client) {
        const isOwner = client.owners.includes(interaction.user.id);
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers) && !isOwner) {
            const display = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "mod.needPerm", { e: emoji.warn, permission: "Ban Members" }));
            return interaction.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(display)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const input = interaction.options.getString('user');
        const reason = interaction.options.getString('reason');

        if (input.toLowerCase() === 'all') {
            return this.unbanAll(interaction, reason);
        }

        const bans = await interaction.guild.bans.fetch();
        const ban = bans.find(b => b.user.id === input || b.user.tag === input || b.user.username === input);

        if (!ban) {
            const display = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "mod.userNotBanned", { e: emoji.warn }));
            return interaction.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(display)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        let dmSent = false;
        try {
            const invite = await interaction.guild.invites.create(interaction.channelId, { maxAge: 0 }).catch(() => null);
            const section = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `${emoji.blank}${emoji.wickarrow} **${client.t(interaction.guildId, "mod.label.server")}:** \` ${interaction.guild.name} \` \n` +
                        `${emoji.blank}${emoji.wickarrow} **${client.t(interaction.guildId, "mod.label.moderator")}:** [\`${interaction.user.displayName}\`](https://discord.com/users/${interaction.user.id})` +
                        (reason ? `\n${emoji.blank}${emoji.wickarrow} **${client.t(interaction.guildId, "mod.label.reason")}:** \`${reason}\`` : '')
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(ban.user.displayAvatarURL({ extension: 'png', size: 512 })));

            const dmContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(interaction.guildId, "mod.dm.unbanned", { e: emoji.check })))
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(section);

            const components = [dmContainer];
            if (invite) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel(client.t(interaction.guildId, "buttons.serverLink")).setStyle(ButtonStyle.Link).setURL(invite.url)
                );
                components.push(row);
            }

            await ban.user.send({ components, flags: MessageFlags.IsComponentsV2 }).catch(() => null);
            dmSent = true;
        } catch { }

        try {
            await interaction.guild.members.unban(ban.user.id, reason);
            const section = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `${emoji.blank}${emoji.wickarrow} **${client.t(interaction.guildId, "mod.label.target")}:** [\`${ban.user.username}\`](https://discord.com/users/${ban.user.id})\n` +
                        `${emoji.blank}${emoji.wickarrow} **${client.t(interaction.guildId, "mod.label.moderator")}:** [\`${interaction.user.displayName}\`](https://discord.com/users/${interaction.user.id})` +
                        (reason ? `\n${emoji.blank}${emoji.wickarrow} **${client.t(interaction.guildId, "mod.label.reason")}:** \`${reason}\`` : '') +
                        `\n${emoji.blank}${emoji.wickarrow} **DMed:** ${dmSent ? emoji.check : emoji.cross}`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(ban.user.displayAvatarURL({ extension: 'png', size: 512 })));

            const successContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(interaction.guildId, "mod.unbanned", { e: emoji.check })))
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(section);

            return interaction.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            return interaction.reply({ content: client.t(interaction.guildId, "mod.failed.unban", { e: emoji.warn, message: error.message }), components: [] });
        }
    },

    async execute(message, args, client) {
        const userId = message.author?.id || message.user?.id;
        const isOwner = client.owners.includes(userId);

        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers) && !isOwner) {
            const display = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.needPerm", { e: emoji.warn, permission: "Ban Members" }));
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        if (args.length === 0) {
            const header = new TextDisplayBuilder().setContent(`${emoji.info} **Unban Command !**\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);
            const usage = new TextDisplayBuilder().setContent(`${emoji.blank}${emoji.wickarrow} **${client.t(message.guild.id, "mod.label.usage")}:** \`unban <user/all> [reason]\`\n${emoji.blank}${emoji.wickarrow} **${client.t(message.guild.id, "mod.label.example")}:** \`unban 123456789 Appeal\``);
            const container = new ContainerBuilder().addTextDisplayComponents(header).addSeparatorComponents(new SeparatorBuilder()).addTextDisplayComponents(usage);
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const input = args[0];
        const reason = args.slice(1).join(' ');

        if (input.toLowerCase() === 'all') {
            return this.unbanAll(message, reason);
        }

        const bans = await message.guild.bans.fetch();
        const ban = bans.find(b => b.user.id === input || b.user.tag === input || b.user.username === input);

        if (!ban) {
            const display = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.userNotBanned", { e: emoji.warn }));
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        let dmSent = false;
        try {
            const invite = await message.guild.invites.create(message.channelId, { maxAge: 0 }).catch(() => null);
            const section = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `${emoji.blank}${emoji.wickarrow} **${client.t(message.guild.id, "mod.label.server")}:** \` ${message.guild.name} \` \n` +
                        `${emoji.blank}${emoji.wickarrow} **${client.t(message.guild.id, "mod.label.moderator")}:** [\`${message.author.displayName}\`](https://discord.com/users/${message.author.id})` +
                        (reason ? `\n${emoji.blank}${emoji.wickarrow} **${client.t(message.guild.id, "mod.label.reason")}:** \`${reason}\`` : '')
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(ban.user.displayAvatarURL({ extension: 'png', size: 512 })));

            const dmContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.dm.unbanned", { e: emoji.check })))
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(section);

            const components = [dmContainer];
            if (invite) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel(client.t(message.guild.id, "buttons.serverLink")).setStyle(ButtonStyle.Link).setURL(invite.url)
                );
                components.push(row);
            }

            await ban.user.send({ components, flags: MessageFlags.IsComponentsV2 }).catch(() => null);
            dmSent = true;
        } catch { }

        try {
            await message.guild.members.unban(ban.user.id, reason);
            const section = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `${emoji.blank}${emoji.wickarrow} **${client.t(message.guild.id, "mod.label.target")}:** [\`${ban.user.username}\`](https://discord.com/users/${ban.user.id})\n` +
                        `${emoji.blank}${emoji.wickarrow} **${client.t(message.guild.id, "mod.label.moderator")}:** [\`${message.author.displayName}\`](https://discord.com/users/${message.author.id})` +
                        (reason ? `\n${emoji.blank}${emoji.wickarrow} **${client.t(message.guild.id, "mod.label.reason")}:** \`${reason}\`` : '') +
                        `\n${emoji.blank}${emoji.wickarrow} **DMed:** ${dmSent ? emoji.check : emoji.cross}`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(ban.user.displayAvatarURL({ extension: 'png', size: 512 })));

            const successContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.unbanned", { e: emoji.check })))
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(section);

            return message.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            return message.reply({ content: client.t(message.guild.id, "mod.failed.unban", { e: emoji.warn, message: error.message }), components: [] });
        }
    },

    async unbanAll(context, reason) {
        const bans = await context.guild.bans.fetch();
        if (bans.size === 0) {
            const display = new TextDisplayBuilder().setContent(client.t(context.guild.id, "mod.noBans", { e: emoji.warn }));
            return context.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        const confirmId = `unban_all_confirm_${Date.now()}`;
        const cancelId = `unban_all_cancel_${Date.now()}`;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(confirmId).setLabel(client.t(context.guild.id, "buttons.confirm")).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(cancelId).setLabel(client.t(context.guild.id, "buttons.cancel")).setStyle(ButtonStyle.Secondary)
        );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(context.guild.id, "mod.unbanAllConfirm", { e: emoji.warn })))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `${emoji.blank}${emoji.wickarrow} **${client.t(context.guild.id, "mod.label.totalBans")}:** \`${bans.size}\`\n` +
                `${emoji.blank}${emoji.wickarrow} **${client.t(context.guild.id, "mod.label.moderator")}:** [\`${(context.author || context.user).username}\`](https://discord.com/users/${(context.author || context.user).id})\n\n` +
                client.t(context.guild.id, "mod.unbanAllBody")
            ));

        const response = await context.reply({ components: [container, row], flags: MessageFlags.IsComponentsV2, withResponse: true });
        const collector = (response.createMessageComponentCollector || context.channel.createMessageComponentCollector).call(response, {
            filter: (i) => i.user.id === (context.author?.id || context.user?.id),
            time: 30000
        });

        collector.on('collect', async (i) => {
            if (i.customId === cancelId) {
                collector.stop();
                return i.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(context.guild.id, "mod.unbanAllCancelled", { e: emoji.cross })))], flags: MessageFlags.IsComponentsV2 });
            }

            if (i.customId === confirmId) {
                collector.stop();
                await i.deferUpdate();
                let count = 0;
                for (const ban of bans.values()) {
                    await context.guild.members.unban(ban.user.id, reason).catch(() => null);
                    count++;
                }
                const success = new TextDisplayBuilder().setContent(client.t(context.guild.id, "mod.unbannedCount", { e: emoji.check, count }));
                return i.editReply({ components: [new ContainerBuilder().addTextDisplayComponents(success)], flags: MessageFlags.IsComponentsV2 });
            }
        });
    }
};
