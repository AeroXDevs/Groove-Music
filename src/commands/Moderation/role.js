const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const emoji = require('../../emojis');

const activeTasks = new Map();

module.exports = {
    name: 'role',
    description: 'Manage roles for users or the server.',
    category: 'Moderation',
    subCommands: [
        'add', 'remove', 'all', 'bots', 'humans', 'create',
        'delete', 'rename', 'colour', 'icon', 'temp', 'taskcancel', 'edit'
    ],

    async execute(message, args, client, prefix) {
        const usedPrefix = prefix || client.prefix;
        if (!args.length) return this.sendHelpMenu(message, client, usedPrefix);

        const subcommand = args[0].toLowerCase();
        const subArgs = args.slice(1);
        const guild = message.guild;
        const author = message.author || message.user;

        const getMember = async (arg) => {
            if (!arg) return null;
            const id = arg.replace(/[<@!>]/g, '');
            let target = await guild.members.fetch(id).catch(() => null);

            if (!target) {
                const search = arg.toLowerCase();
                target = guild.members.cache.find(m =>
                    m.user.username.toLowerCase() === search ||
                    m.displayName.toLowerCase() === search ||
                    m.user.tag.toLowerCase() === search
                );
            }
            return target;
        };

        const getRole = (arg) => {
            if (!arg) return null;
            const id = arg.replace(/[<@&>]/g, '');
            let role = guild.roles.cache.get(id);

            if (!role) {
                const search = arg.toLowerCase().replace(/^@/, '');
                role = guild.roles.cache.find(r => r.name.toLowerCase() === search || r.name.toLowerCase() === arg.toLowerCase());
            }
            return role;
        };

        const success = (msg) => {
            const display = new TextDisplayBuilder().setContent(`${emoji.check} ${msg}`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
        };

        const error = (msg) => {
            const display = new TextDisplayBuilder().setContent(`${emoji.cross} ${msg}`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
        };

        const usage = (cmd, use, desc, aliases) => {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(message.guild.id, "role.argHint")));
            container.addSeparatorComponents(new SeparatorBuilder());

            const content = `> **\`${usedPrefix}role ${cmd} ${use}\`**\n\n` +
                `${emoji.arrowright} ${desc}\n` +
                (aliases && aliases.toLowerCase() !== 'none' ? `${emoji.arrowright} **Aliases :** \`${aliases}\` \n` : '');

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
            container.addSeparatorComponents(new SeparatorBuilder());
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(message.guild.id, "role.requestedBy", { user: author.displayName })));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        };

        switch (subcommand) {
            case 'add': {
                const target = await getMember(subArgs[0]);
                const role = getRole(subArgs.slice(1).join(' '));
                if (!target || !role) return usage('add', '<user> <role>', client.t(message.guild.id, "role.rAddsARoleTo"), 'None');

                if (target.roles.cache.has(role.id)) return error(client.t(message.guild.id, "role.rUserAlreadyHasThis"));
                if (role.position >= message.member.roles.highest.position && message.author.id !== guild.ownerId) return error(client.t(message.guild.id, "role.rYouCannotManageThis"));
                if (role.position >= guild.members.me.roles.highest.position) return error(client.t(message.guild.id, "role.rICannotManageThis"));

                await target.roles.add(role).catch(err => {
                    return error(client.t(message.guild.id, "role.addFailed", { message: err.message }));
                });
                return success(client.t(message.guild.id, "role.added", { role, target }));
            }
            case 'remove': {
                const target = await getMember(subArgs[0]);
                const role = getRole(subArgs.slice(1).join(' '));
                if (!target || !role) return usage('remove', '<user> <role>', client.t(message.guild.id, "role.rRemovesARoleFrom"), 'None');

                if (!target.roles.cache.has(role.id)) return error(client.t(message.guild.id, "role.rUserDoesNotHave"));
                if (role.position >= message.member.roles.highest.position && message.author.id !== guild.ownerId) return error(client.t(message.guild.id, "role.rYouCannotManageThis"));
                if (role.position >= guild.members.me.roles.highest.position) return error(client.t(message.guild.id, "role.rICannotManageThis"));

                await target.roles.remove(role).catch(err => {
                    return error(client.t(message.guild.id, "role.removeFailed", { message: err.message }));
                });
                return success(client.t(message.guild.id, "role.removed", { role, target }));
            }
            case 'all':
            case 'bots':
            case 'humans': {
                const role = getRole(subArgs.join(' '));
                if (!role) return usage(subcommand, '<role>', `Adds a role to all ${subcommand === 'all' ? 'members' : subcommand}.`, 'None');
                if (activeTasks.has(guild.id)) return error(client.t(message.guild.id, "role.rAnActiveRoleTask"));
                if (role.position >= message.member.roles.highest.position && message.author.id !== guild.ownerId) return error(client.t(message.guild.id, "role.rYouCannotManageThis"));
                if (role.position >= guild.members.me.roles.highest.position) return error(client.t(message.guild.id, "role.rICannotManageThis"));

                const members = (await guild.members.fetch()).filter(m => {
                    if (subcommand === 'bots') return m.user.bot;
                    if (subcommand === 'humans') return !m.user.bot;
                    return true;
                }).filter(m => !m.roles.cache.has(role.id));

                if (members.size === 0) return error(client.t(message.guild.id, "role.rNoMembersFoundTo"));

                const estimatedTime = members.size * 1;
                const confirmContainer = new ContainerBuilder();
                confirmContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.role.continue")));
                confirmContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `~ \` ${members.size} Users \` in \` ${estimatedTime}s \``
                ));

                const confirmButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('confirm_yes').setLabel(client.t(message.guild.id, "buttons.yes")).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('confirm_no').setLabel('No').setStyle(ButtonStyle.Danger)
                );

                const confirmMsg = await message.reply({
                    content: '',
                    components: [confirmContainer, confirmButtons],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });

                const collector = confirmMsg.createMessageComponentCollector({
                    filter: (i) => i.user.id === author.id,
                    time: 30000,
                    componentType: ComponentType.Button
                });

                collector.on('collect', async (int) => {
                    if (int.customId === 'confirm_no') {
                        const cancelDisplay = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.operationCancelled", { e: emoji.cross }));
                        const cancelContainer = new ContainerBuilder().addTextDisplayComponents(cancelDisplay);
                        return int.update({
                            components: [cancelContainer],
                            flags: MessageFlags.IsComponentsV2,
                            allowedMentions: { parse: [] }
                        }).catch(() => { });
                    }

                    if (int.customId === 'confirm_yes') {
                        try {
                            activeTasks.set(guild.id, true);

                            const progressDisplay = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.role.adding", { e: emoji.load, role, count: members.size }));
                            const progressContainer = new ContainerBuilder().addTextDisplayComponents(progressDisplay);

                            await int.update({
                                components: [progressContainer],
                                flags: MessageFlags.IsComponentsV2,
                                allowedMentions: { parse: [] }
                            }).catch(() => { });

                            const startTime = Date.now();
                            let successCount = 0;
                            let failCount = 0;

                            for (const [, m] of members) {
                                if (!activeTasks.has(guild.id)) break;
                                try {
                                    await m.roles.add(role);
                                    successCount++;
                                } catch {
                                    failCount++;
                                }
                                await new Promise(r => setTimeout(r, 1000));
                            }

                            activeTasks.delete(guild.id);
                            const endTime = Date.now();
                            const timeTaken = ((endTime - startTime) / 1000).toFixed(2);

                            const endContainer = new ContainerBuilder();
                            endContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.role.massTitle")));
                            endContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                client.t(message.guild.id, "mod.role.massBody", { role, time: timeTaken, check: emoji.check, cross: emoji.cross, ok: successCount, fail: failCount })
                            ));

                            return int.editReply({
                                components: [endContainer],
                                flags: MessageFlags.IsComponentsV2,
                                allowedMentions: { parse: [] }
                            }).catch(() => { });
                        } catch (err) {
                            activeTasks.delete(guild.id);
                            const errorDisplay = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.error", { e: emoji.cross, message: err.message }));
                            const errorContainer = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
                            return int.editReply({
                                components: [errorContainer],
                                flags: MessageFlags.IsComponentsV2,
                                allowedMentions: { parse: [] }
                            }).catch(() => { });
                        }
                    }
                });

                collector.on('end', (collected, reason) => {
                    if (reason === 'time' && !activeTasks.has(guild.id)) {
                        confirmMsg.edit({ content: client.t(message.guild.id, "mod.taskTimedOut", { e: emoji.cross }), components: [] }).catch(() => { });
                    }
                });
                return;
            }
            case 'taskcancel': {
                if (!activeTasks.has(guild.id)) return error(client.t(message.guild.id, "role.rNoActiveRoleTask"));
                activeTasks.delete(guild.id);
                return success(client.t(message.guild.id, "mod.role.cancelled"));
            }
            case 'create': {
                let name = subArgs.join(' ') || 'New Role';
                let color = '#000000';
                let hoist = false;
                let mentionable = false;
                let selectedPerms = [];

                const permsList = [
                    { label: 'Read Messages', value: 'ViewChannel', desc: client.t(message.guild.id, "desc.basicAccessRead") },
                    { label: 'Send Messages', value: 'SendMessages', desc: client.t(message.guild.id, "desc.allowChattingChannels") },
                    { label: 'Embed Links', value: 'EmbedLinks', desc: client.t(message.guild.id, "desc.allowSendingEmbeds") },
                    { label: 'Attach Files', value: 'AttachFiles', desc: client.t(message.guild.id, "desc.allowUploadingFiles") },
                    { label: 'Add Reactions', value: 'AddReactions', desc: client.t(message.guild.id, "desc.allowReactingEmojis") },
                    { label: 'Use External Emojis', value: 'UseExternalEmojis', desc: client.t(message.guild.id, "desc.useEmojisOtherServers") },
                    { label: 'Connect (Voice)', value: 'Connect', desc: client.t(message.guild.id, "desc.joinVoiceChannels") },
                    { label: 'Speak (Voice)', value: 'Speak', desc: client.t(message.guild.id, "desc.speakVoiceChannels") },
                    { label: 'Administrator', value: 'Administrator', desc: client.t(message.guild.id, "desc.fullControlDangerous") },
                    { label: 'Manage Server', value: 'ManageGuild', desc: client.t(message.guild.id, "desc.editGuildSettingsemojis") },
                    { label: 'Manage Roles', value: 'ManageRoles', desc: client.t(message.guild.id, "desc.editCreateRoles") },
                    { label: 'Manage Messages', value: 'ManageMessages', desc: 'Delete anyone\'s messages.' },
                    { label: 'Kick Members', value: 'KickMembers', desc: client.t(message.guild.id, "desc.kickBadMembers") },
                    { label: 'Ban Members', value: 'BanMembers', desc: client.t(message.guild.id, "desc.banBadMembers") },
                    { label: 'Mute Members', value: 'MuteMembers', desc: client.t(message.guild.id, "desc.mutePeopleVoice") },
                    { label: 'Move Members', value: 'MoveMembers', desc: client.t(message.guild.id, "desc.movePeopleVoice") }
                ];

                const createSetupUI = () => {
                    const container = new ContainerBuilder();
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(message.guild.id, "role.createWizard", { e: emoji.info })));
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        client.t(message.guild.id, "role.wiz.name") + `\` ${name} \` \n` +
                        client.t(message.guild.id, "role.wiz.color") + `\` ${color === '#000000' || !color ? client.t(message.guild.id, "role.rColourless") : color.toUpperCase()} \` \n` +
                        client.t(message.guild.id, "role.wiz.hoisted") + `\` ${hoist ? client.t(message.guild.id, "buttons.yes") : 'No'} \` \n` +
                        client.t(message.guild.id, "role.wiz.mentionable") + `\` ${mentionable ? client.t(message.guild.id, "buttons.yes") : 'No'} \` \n` +
                        client.t(message.guild.id, "role.wiz.permissions") + `${selectedPerms.length > 0 ? selectedPerms.map(p => `\` ${p} \``).join(', ') : '\` Default \`'}`
                    ));

                    const buttons = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('edit_form').setLabel(client.t(message.guild.id, "role.rEditRoleForm")).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('confirm_create').setLabel(client.t(message.guild.id, "role.rFinishCreate")).setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('cancel_create').setLabel(client.t(message.guild.id, "buttons.cancel")).setStyle(ButtonStyle.Danger)
                    );

                    const select = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('select_perms')
                            .setPlaceholder(client.t(message.guild.id, "mod.role.permPlaceholder"))
                            .setMinValues(0)
                            .setMaxValues(permsList.length)
                            .addOptions(permsList.map(p => ({
                                label: p.label,
                                value: p.value,
                                description: p.desc,
                                default: selectedPerms.includes(p.value)
                            })))
                    );

                    return { components: [container, buttons, select], flags: MessageFlags.IsComponentsV2 };
                };

                const msg = await message.reply(createSetupUI());

                const collector = msg.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 300000
                });

                collector.on('collect', async i => {
                    if (i.customId === 'edit_form') {
                        const modal = new ModalBuilder()
                            .setCustomId('role_modal')
                            .setTitle(client.t(message.guild.id, "role.rRoleDetailsForm"));

                        const nameInput = new TextInputBuilder()
                            .setCustomId('role_form_name')
                            .setLabel(client.t(message.guild.id, "role.rRoleName"))
                            .setStyle(TextInputStyle.Short)
                            .setValue(name)
                            .setRequired(true);

                        const colorInput = new TextInputBuilder()
                            .setCustomId('role_form_color')
                            .setLabel(client.t(message.guild.id, "role.rHexColorEmptyFor"))
                            .setStyle(TextInputStyle.Short)
                            .setValue(color === '#000000' ? '' : color)
                            .setPlaceholder('e.g. #ff0000')
                            .setRequired(false);

                        const hoistInput = new TextInputBuilder()
                            .setCustomId('role_form_hoist')
                            .setLabel(client.t(message.guild.id, "mod.role.hoisted"))
                            .setStyle(TextInputStyle.Short)
                            .setValue(hoist ? client.t(message.guild.id, "buttons.yes") : 'No')
                            .setPlaceholder('e.g. Yes')
                            .setRequired(true);

                        const mentionInput = new TextInputBuilder()
                            .setCustomId('role_form_mention')
                            .setLabel(client.t(message.guild.id, "mod.role.mentionable"))
                            .setStyle(TextInputStyle.Short)
                            .setValue(mentionable ? client.t(message.guild.id, "buttons.yes") : 'No')
                            .setPlaceholder('e.g. No')
                            .setRequired(true);

                        modal.addComponents(
                            new ActionRowBuilder().addComponents(nameInput),
                            new ActionRowBuilder().addComponents(colorInput),
                            new ActionRowBuilder().addComponents(hoistInput),
                            new ActionRowBuilder().addComponents(mentionInput)
                        );

                        await i.showModal(modal);

                        const submitted = await i.awaitModalSubmit({
                            filter: (mi) => mi.customId === 'role_modal' && mi.user.id === message.author.id,
                            time: 120000
                        }).catch(() => null);

                        if (submitted) {
                            name = submitted.fields.getTextInputValue('role_form_name') || 'New Role';

                            let colorVal = submitted.fields.getTextInputValue('role_form_color').trim();
                            if (colorVal && !colorVal.startsWith('#')) colorVal = `#${colorVal}`;
                            color = colorVal || '#000000';

                            const hStr = submitted.fields.getTextInputValue('role_form_hoist').toLowerCase();
                            const mStr = submitted.fields.getTextInputValue('role_form_mention').toLowerCase();

                            hoist = (hStr === 'yes' || hStr === 'y' || hStr === 'true');
                            mentionable = (mStr === 'yes' || mStr === 'y' || mStr === 'true');

                            await submitted.update(createSetupUI()).catch(() => { });
                        }
                        return;
                    }

                    if (i.customId === 'cancel_create') {
                        collector.stop();
                        const cancelDisplay = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.role.creationCancelled", { e: emoji.cross }));
                        return i.update({
                            components: [new ContainerBuilder().addTextDisplayComponents(cancelDisplay)],
                            flags: MessageFlags.IsComponentsV2,
                            allowedMentions: { parse: [] }
                        }).catch(() => { });
                    }

                    if (i.customId === 'select_perms') {
                        selectedPerms = i.values;
                        return i.update(createSetupUI()).catch(() => { });
                    }

                    if (i.customId === 'confirm_create') {
                        collector.stop();
                        try {
                            const permsBitfield = selectedPerms.map(p => PermissionFlagsBits[p]).filter(p => p !== undefined);
                            const newRole = await guild.roles.create({
                                name,
                                colors: color === '#000000' || !color ? 0 : color,
                                hoist,
                                mentionable,
                                permissions: permsBitfield,
                                reason: client.t(message.guild.id, "role.auditCreate", { user: message.author.tag })
                            });

                            const successDisplay = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.role.created", { e: emoji.check, role: newRole }));
                            const summary = new TextDisplayBuilder().setContent(
                                client.t(message.guild.id, "role.wiz.name") + `${newRole.name}\n` +
                                client.t(message.guild.id, "role.wiz.permissions") + `\` ${selectedPerms.length} assigned \` \n` +
                                client.t(message.guild.id, "role.wiz.hoisted") + `\` ${hoist ? client.t(message.guild.id, "buttons.yes") : 'No'} \` \n` +
                                client.t(message.guild.id, "role.wiz.mentionable") + `\` ${mentionable ? client.t(message.guild.id, "buttons.yes") : 'No'} \``
                            );

                            return i.update({
                                components: [new ContainerBuilder().addTextDisplayComponents(successDisplay).addTextDisplayComponents(summary)],
                                flags: MessageFlags.IsComponentsV2,
                                allowedMentions: { parse: [] }
                            }).catch(() => { });
                        } catch (err) {
                            return i.update({
                                components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.error", { e: emoji.cross, message: err.message })))],
                                flags: MessageFlags.IsComponentsV2
                            }).catch(() => { });
                        }
                    }
                });

                collector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.sessionTimedOut", { e: emoji.cross })))], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
                    }
                });
                return;
            }
            case 'edit': {
                const targetRole = getRole(subArgs.join(' '));
                if (!targetRole) return usage('edit', '<role>', client.t(message.guild.id, "role.rEditsAnExistingRole"), 'None');

                if (targetRole.position >= message.member.roles.highest.position && message.author.id !== guild.ownerId) return error(client.t(message.guild.id, "role.rYouCannotManageThis"));
                if (targetRole.position >= guild.members.me.roles.highest.position) return error(client.t(message.guild.id, "role.rICannotManageThis"));

                let name = targetRole.name;
                let color = targetRole.hexColor === '#000000' ? '#000000' : targetRole.hexColor;
                let hoist = targetRole.hoist;
                let mentionable = targetRole.mentionable;


                const permsList = [
                    { label: 'Read Messages', value: 'ViewChannel', desc: client.t(message.guild.id, "desc.basicAccessRead") },
                    { label: 'Send Messages', value: 'SendMessages', desc: client.t(message.guild.id, "desc.allowChattingChannels") },
                    { label: 'Embed Links', value: 'EmbedLinks', desc: client.t(message.guild.id, "desc.allowSendingEmbeds") },
                    { label: 'Attach Files', value: 'AttachFiles', desc: client.t(message.guild.id, "desc.allowUploadingFiles") },
                    { label: 'Add Reactions', value: 'AddReactions', desc: client.t(message.guild.id, "desc.allowReactingEmojis") },
                    { label: 'Use External Emojis', value: 'UseExternalEmojis', desc: client.t(message.guild.id, "desc.useEmojisOtherServers") },
                    { label: 'Connect (Voice)', value: 'Connect', desc: client.t(message.guild.id, "desc.joinVoiceChannels") },
                    { label: 'Speak (Voice)', value: 'Speak', desc: client.t(message.guild.id, "desc.speakVoiceChannels") },
                    { label: 'Administrator', value: 'Administrator', desc: client.t(message.guild.id, "desc.fullControlDangerous") },
                    { label: 'Manage Server', value: 'ManageGuild', desc: client.t(message.guild.id, "desc.editGuildSettingsemojis") },
                    { label: 'Manage Roles', value: 'ManageRoles', desc: client.t(message.guild.id, "desc.editCreateRoles") },
                    { label: 'Manage Messages', value: 'ManageMessages', desc: 'Delete anyone\'s messages.' },
                    { label: 'Kick Members', value: 'KickMembers', desc: client.t(message.guild.id, "desc.kickBadMembers") },
                    { label: 'Ban Members', value: 'BanMembers', desc: client.t(message.guild.id, "desc.banBadMembers") },
                    { label: 'Mute Members', value: 'MuteMembers', desc: client.t(message.guild.id, "desc.mutePeopleVoice") },
                    { label: 'Move Members', value: 'MoveMembers', desc: client.t(message.guild.id, "desc.movePeopleVoice") }
                ];

                let selectedPerms = permsList
                    .filter(p => targetRole.permissions.has(PermissionFlagsBits[p.value]))
                    .map(p => p.value);

                const editSetupUI = () => {
                    const container = new ContainerBuilder();
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(message.guild.id, "role.editWizard", { e: emoji.info, name: targetRole.name })));
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        client.t(message.guild.id, "role.wiz.name") + `\` ${name} \` \n` +
                        client.t(message.guild.id, "role.wiz.color") + `\` ${color === '#000000' || !color ? client.t(message.guild.id, "role.rDefaultColourless") : color.toUpperCase()} \` \n` +
                        client.t(message.guild.id, "role.wiz.hoisted") + `\` ${hoist ? client.t(message.guild.id, "buttons.yes") : 'No'} \` \n` +
                        client.t(message.guild.id, "role.wiz.mentionable") + `\` ${mentionable ? client.t(message.guild.id, "buttons.yes") : 'No'} \` \n` +
                        client.t(message.guild.id, "role.wiz.permissions") + `${selectedPerms.length > 0 ? selectedPerms.map(p => `\` ${p} \``).join(', ') : '\` Default \`'}`
                    ));

                    const buttons = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('edit_form').setLabel(client.t(message.guild.id, "role.rEditDetails")).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('confirm_edit').setLabel(client.t(message.guild.id, "role.rSaveChanges")).setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('cancel_edit').setLabel(client.t(message.guild.id, "buttons.cancel")).setStyle(ButtonStyle.Danger)
                    );

                    const select = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('select_perms')
                            .setPlaceholder(client.t(message.guild.id, "role.rModifyPermissions"))
                            .setMinValues(0)
                            .setMaxValues(permsList.length)
                            .addOptions(permsList.map(p => ({
                                label: p.label,
                                value: p.value,
                                description: p.desc,
                                default: selectedPerms.includes(p.value)
                            })))
                    );

                    return { components: [container, buttons, select], flags: MessageFlags.IsComponentsV2 };
                };

                const msg = await message.reply(editSetupUI());

                const collector = msg.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 300000
                });

                collector.on('collect', async i => {
                    if (i.customId === 'edit_form') {
                        const modal = new ModalBuilder()
                            .setCustomId('role_edit_modal')
                            .setTitle(client.t(message.guild.id, "role.rEditRoleDetails"));

                        const nameInput = new TextInputBuilder()
                            .setCustomId('role_form_name')
                            .setLabel(client.t(message.guild.id, "role.rRoleName"))
                            .setStyle(TextInputStyle.Short)
                            .setValue(name)
                            .setRequired(true);

                        const colorInput = new TextInputBuilder()
                            .setCustomId('role_form_color')
                            .setLabel(client.t(message.guild.id, "role.rHexColorEmptyFor"))
                            .setStyle(TextInputStyle.Short)
                            .setValue(color === '#000000' ? '' : color)
                            .setPlaceholder('e.g. #ff0000')
                            .setRequired(false);

                        const hoistInput = new TextInputBuilder()
                            .setCustomId('role_form_hoist')
                            .setLabel(client.t(message.guild.id, "mod.role.hoisted"))
                            .setStyle(TextInputStyle.Short)
                            .setValue(hoist ? client.t(message.guild.id, "buttons.yes") : 'No')
                            .setRequired(true);

                        const mentionInput = new TextInputBuilder()
                            .setCustomId('role_form_mention')
                            .setLabel(client.t(message.guild.id, "mod.role.mentionable"))
                            .setStyle(TextInputStyle.Short)
                            .setValue(mentionable ? client.t(message.guild.id, "buttons.yes") : 'No')
                            .setRequired(true);

                        modal.addComponents(
                            new ActionRowBuilder().addComponents(nameInput),
                            new ActionRowBuilder().addComponents(colorInput),
                            new ActionRowBuilder().addComponents(hoistInput),
                            new ActionRowBuilder().addComponents(mentionInput)
                        );

                        await i.showModal(modal);

                        const submitted = await i.awaitModalSubmit({
                            filter: (mi) => mi.customId === 'role_edit_modal' && mi.user.id === message.author.id,
                            time: 120000
                        }).catch(() => null);

                        if (submitted) {
                            name = submitted.fields.getTextInputValue('role_form_name') || name;
                            let colorVal = submitted.fields.getTextInputValue('role_form_color').trim();
                            if (colorVal && !colorVal.startsWith('#')) colorVal = `#${colorVal}`;
                            color = colorVal || '#000000';

                            const hStr = submitted.fields.getTextInputValue('role_form_hoist').toLowerCase();
                            const mStr = submitted.fields.getTextInputValue('role_form_mention').toLowerCase();

                            hoist = (hStr === 'yes' || hStr === 'y' || hStr === 'true');
                            mentionable = (mStr === 'yes' || mStr === 'y' || mStr === 'true');

                            await submitted.update(editSetupUI()).catch(() => { });
                        }
                        return;
                    }

                    if (i.customId === 'cancel_edit') {
                        collector.stop();
                        const cancelDisplay = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.role.editCancelled", { e: emoji.cross }));
                        return i.update({
                            components: [new ContainerBuilder().addTextDisplayComponents(cancelDisplay)],
                            flags: MessageFlags.IsComponentsV2,
                            allowedMentions: { parse: [] }
                        }).catch(() => { });
                    }

                    if (i.customId === 'select_perms') {
                        selectedPerms = i.values;
                        return i.update(editSetupUI()).catch(() => { });
                    }

                    if (i.customId === 'confirm_edit') {
                        collector.stop();
                        try {
                            const permsBitfield = selectedPerms.map(p => PermissionFlagsBits[p]).filter(p => p !== undefined);
                            await targetRole.edit({
                                name,
                                colors: color === '#000000' || !color ? 0 : color,
                                hoist,
                                mentionable,
                                permissions: permsBitfield,
                                reason: client.t(message.guild.id, "role.auditEdit", { user: message.author.tag })
                            });

                            const successDisplay = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.role.updated", { e: emoji.check, role: targetRole }));
                            return i.update({
                                components: [new ContainerBuilder().addTextDisplayComponents(successDisplay)],
                                flags: MessageFlags.IsComponentsV2,
                                allowedMentions: { parse: [] }
                            }).catch(() => { });
                        } catch (err) {
                            return i.update({
                                components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.error", { e: emoji.cross, message: err.message })))],
                                flags: MessageFlags.IsComponentsV2
                            }).catch(() => { });
                        }
                    }
                });

                collector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.sessionTimedOut", { e: emoji.cross })))], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
                    }
                });
                return;
            }
            case 'delete': {
                const role = getRole(subArgs.join(' '));
                if (!role) return usage('delete', '<role>', client.t(message.guild.id, "role.rDeletesARole"), 'None');
                if (role.position >= message.member.roles.highest.position && message.author.id !== guild.ownerId) return error(client.t(message.guild.id, "role.rYouCannotManageThis"));
                if (role.position >= guild.members.me.roles.highest.position) return error(client.t(message.guild.id, "role.rICannotManageThis"));

                await role.delete(client.t(message.guild.id, "role.auditDelete", { user: message.author.tag })).catch(err => {
                    return error(client.t(message.guild.id, "role.deleteFailed", { message: err.message }));
                });
                return success(client.t(message.guild.id, "role.deleted", { name: role.name }));
            }
            case 'rename': {
                const role = getRole(subArgs[0]);
                const newName = subArgs.slice(1).join(' ');
                if (!role || !newName) return usage('rename', '<role> <new name>', client.t(message.guild.id, "role.rRenamesARole"), 'None');
                if (role.position >= message.member.roles.highest.position && message.author.id !== guild.ownerId) return error(client.t(message.guild.id, "role.rYouCannotManageThis"));
                if (role.position >= guild.members.me.roles.highest.position) return error(client.t(message.guild.id, "role.rICannotManageThis"));

                await role.setName(newName).catch(err => {
                    return error(client.t(message.guild.id, "role.renameFailed", { message: err.message }));
                });
                return success(client.t(message.guild.id, "role.renamed", { name: newName }));
            }
            case 'colour':
            case 'color': {
                if (subArgs.length < 2) return usage('colour', '<role> <hex>', client.t(message.guild.id, "role.rChangesTheColorOf"), 'color');

                const colorArg = subArgs[subArgs.length - 1];
                const roleArg = subArgs.slice(0, subArgs.length - 1).join(' ');
                const role = getRole(roleArg);

                if (!role) return error(client.t(message.guild.id, "role.rPleaseProvideAValid"));
                if (role.position >= message.member.roles.highest.position && message.author.id !== guild.ownerId) return error(client.t(message.guild.id, "role.rYouCannotManageThis"));
                if (role.position >= guild.members.me.roles.highest.position) return error(client.t(message.guild.id, "role.rICannotManageThis"));

                let finalColor = colorArg;
                if (!finalColor.startsWith('#')) finalColor = `#${finalColor}`;

                const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                if (!hexRegex.test(finalColor)) {
                    return error(client.t(message.guild.id, "role.rPleaseProvideAValid"));
                }

                await role.edit({ colors: finalColor }).catch(err => {
                    return error(client.t(message.guild.id, "role.colorFailed", { message: err.message }));
                });
                return success(client.t(message.guild.id, "role.colorChangedTo", { role, color: finalColor }));
            }
            case 'icon': {
                if (guild.premiumTier < 2) return error(client.t(message.guild.id, "role.rThisServerNeedsTo"));

                if (subArgs.length < 2) return usage('icon', '<role> <emoji/url>', client.t(message.guild.id, "role.rSetsAnIconFor"), 'None');

                const icon = subArgs[subArgs.length - 1];
                const roleArg = subArgs.slice(0, -1).join(' ');
                const role = getRole(roleArg);

                if (!role) return error(client.t(message.guild.id, "role.rPleaseProvideAValid"));
                if (role.position >= message.member.roles.highest.position && message.author.id !== guild.ownerId) return error(client.t(message.guild.id, "role.rYouCannotManageThis"));
                if (role.position >= guild.members.me.roles.highest.position) return error(client.t(message.guild.id, "role.rICannotManageThis"));

                let finalIcon = icon;
                const customEmoji = icon.match(/<?(?:a)?:(?:\w+):(\d+)>?/);

                if (customEmoji) {
                    finalIcon = `https://cdn.discordapp.com/emojis/${customEmoji[1]}.png`;
                } else if (!icon.startsWith('http')) {
                    return error('Please provide a valid **custom emoji** or an **image URL**. Standard emojis or text names like `:emoji:` are not supported for role icons.');
                }

                await role.setIcon(finalIcon).catch(err => {
                    return error(client.t(message.guild.id, "role.iconFailed", { message: err.message }));
                });
                return success(client.t(message.guild.id, "role.iconSet", { role }));
            }
            case 'temp': {
                const target = await getMember(subArgs[0]);
                const durationStr = subArgs[1];
                const role = getRole(subArgs.slice(2).join(' '));
                if (!target || !durationStr || !role) return usage('temp', '<user> <duration> <role>', client.t(message.guild.id, "role.rGivesATemporaryRole"), 'None');

                const ms = parseDuration(durationStr);
                if (!ms) return error('Invalid duration format! Use \`s, m, h, d\`.');
                if (ms > 86400000) return error(client.t(message.guild.id, "role.rICanOnlySet"));

                if (target.roles.cache.has(role.id)) return error(client.t(message.guild.id, "role.rUserAlreadyHasThis"));
                if (role.position >= message.member.roles.highest.position && message.author.id !== guild.ownerId) return error(client.t(message.guild.id, "role.rYouCannotManageThis"));
                if (role.position >= guild.members.me.roles.highest.position) return error(client.t(message.guild.id, "role.rICannotManageThis"));

                await target.roles.add(role).catch(err => {
                    return error(client.t(message.guild.id, "role.addFailed", { message: err.message }));
                });

                success(`Gave ${role} to ${target} for **${durationStr}**.`);

                setTimeout(async () => {
                    if (target.roles.cache.has(role.id)) {
                        await target.roles.remove(role).catch(() => { });
                    }
                }, ms);
                return;
            }
            default:
                return this.sendHelpMenu(message, client, prefix);
        }
    },

    async sendHelpMenu(message, client, prefix) {
        const usedPrefix = prefix || client.prefix;
        const author = message.author || message.user;

        const pages = [
            {
                items: [
                    { cmd: 'role add', desc: client.t(message.guild.id, "role.rAddsARoleTo") },
                    { cmd: 'role all', desc: client.t(message.guild.id, "role.rGiveTheRoleTo") },
                    { cmd: 'role bots', desc: client.t(message.guild.id, "role.rGiveTheRoleTo") },
                    { cmd: 'role colour', desc: client.t(message.guild.id, "role.rChangesTheColorOf") },
                    { cmd: 'role create', desc: client.t(message.guild.id, "role.rCreatesANewRole") },
                    { cmd: 'role humans', desc: client.t(message.guild.id, "role.rGiveTheRoleTo") }
                ]
            },
            {
                items: [
                    { cmd: 'role delete', desc: client.t(message.guild.id, "role.rDeletesARole") },
                    { cmd: 'role icon', desc: client.t(message.guild.id, "role.rSetsAnIconFor") },
                    { cmd: 'role remove', desc: client.t(message.guild.id, "role.rRemovesARoleFrom") },
                    { cmd: 'role rename', desc: client.t(message.guild.id, "role.rRenamesARole") },
                    { cmd: 'role edit', desc: client.t(message.guild.id, "role.rEditAnExistingRole") },
                    { cmd: 'role taskcancel', desc: client.t(message.guild.id, "role.rCancelTheActiveRole") },
                    { cmd: 'role temp', desc: client.t(message.guild.id, "role.rGivesATemporaryRole") }
                ]
            }
        ];

        let currentPage = 0;
        const totalCommands = pages.reduce((acc, p) => acc + p.items.length, 0);

        const createContainer = (pageIdx) => {
            const page = pages[pageIdx];
            const container = new ContainerBuilder();

            const header = new TextDisplayBuilder().setContent(client.t(message.guild.id, "role.cmdTitle", { e: emoji.info, count: totalCommands }));
            container.addTextDisplayComponents(header);
            container.addSeparatorComponents(new SeparatorBuilder());

            const content = page.items.map(item => `> ** \`${usedPrefix}${item.cmd}\` **\n╰ ${item.desc}`).join('\n\n');
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
            container.addSeparatorComponents(new SeparatorBuilder());

            const footer = new TextDisplayBuilder().setContent(client.t(message.guild.id, "role.pageFooter", { page: pageIdx + 1, total: pages.length, user: author.displayName }));
            container.addTextDisplayComponents(footer);

            return container;
        };

        const getButtons = () => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('home').setLabel(client.t(message.guild.id, "buttons.home")).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('prev').setLabel(client.t(message.guild.id, "buttons.previous")).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('next').setLabel(client.t(message.guild.id, "buttons.next")).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('close').setLabel(client.t(message.guild.id, "buttons.close")).setStyle(ButtonStyle.Danger)
            );
        };

        const buttonRow = getButtons();
        const components = [createContainer(currentPage)];
        if (pages.length > 1) components.push(buttonRow);

        const msg = await message.reply({
            content: '',
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] }
        });

        if (pages.length <= 1) return;

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === author.id,
            time: 60000,
            componentType: ComponentType.Button
        });

        collector.on('collect', async (int) => {
            if (int.customId === 'close') {
                return int.message.delete().catch(() => { });
            }

            if (int.customId === 'home') currentPage = 0;
            if (int.customId === 'prev') currentPage = (currentPage - 1 + pages.length) % pages.length;
            if (int.customId === 'next') currentPage = (currentPage + 1) % pages.length;

            const updatedComponents = [createContainer(currentPage)];
            if (pages.length > 1) updatedComponents.push(buttonRow);

            await int.update({
                components: updatedComponents,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            }).catch(() => { });
        });

        collector.on('end', () => {
            msg.edit({
                components: [createContainer(currentPage)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            }).catch(() => { });
        });
    }
};

function parseDuration(str) {
    const units = { 's': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000 };
    const match = str.toLowerCase().match(/^(\d+)([smhd])$/);
    return match ? parseInt(match[1]) * units[match[2]] : null;
}
