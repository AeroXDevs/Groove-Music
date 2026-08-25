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
    ChannelType
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'voice',
    description: 'Voice moderation commands',
    category: 'Voice',
    aliases: ['vc'],
    usage: 'voice <subcommand> [args]',
    example: 'voice kick @user | voice muteall | voice lock',
    subCommands: [
        'kick', 'kickall', 'mute', 'unmute', 'muteall', 'unmuteall',
        'deafen', 'undeafen', 'deafenall', 'undeafenall',
        'move', 'moveall', 'pull', 'pullall', 'lock', 'unlock',
        'private', 'unprivate'
    ],

    async execute(message, args, client, prefix) {
        if (!args.length) return this.sendHelpMenu(message, client, prefix);
        const subcommand = args[0].toLowerCase();
        return await this.handleVoice(message, subcommand, args.slice(1), client, prefix);
    },

    async handleVoice(context, subcommand, options, client, prefix) {
        const guild = context.guild;
        const member = context.member;
        const user = context.author || context.user;

        const isOwner = client.owners.includes(user.id);
        const voiceChannel = member.voice.channel;
        const getTarget = async (arg) => {
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

        const getChannel = async (arg) => {
            if (!arg) return null;
            const id = arg.replace(/[<#>]/g, '');
            let channel = guild.channels.cache.get(id);

            if (!channel) {
                const search = arg.toLowerCase();
                channel = guild.channels.cache.find(c =>
                    c.name.toLowerCase() === search && (c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice)
                );
            }
            return channel;
        };

        const success = (msg) => {
            const display = new TextDisplayBuilder().setContent(`${emoji.check} ${msg}`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        };

        const error = (msg) => {
            const display = new TextDisplayBuilder().setContent(`${emoji.warn} ${msg}`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        };

        const usage = (cmd, use, desc, aliases) => {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`\`\`\` <> : Required | [] : Optional\`\`\``));
            container.addSeparatorComponents(new SeparatorBuilder());

            const content = `> **\`${prefix}voice ${cmd} ${use}\`**\n\n` +
                `${emoji.arrowright} ${desc}\n` +
                (aliases && aliases.toLowerCase() !== 'none' ? `${emoji.arrowright} **Aliases :** \`${aliases}\` \n` : '');

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
            container.addSeparatorComponents(new SeparatorBuilder());
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Requested by ${user.displayName}`));
            return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        };

        const subAliases = {
            k: 'kick', ka: 'kickall', kall: 'kickall',
            m: 'mute', um: 'unmute',
            ma: 'muteall', mall: 'muteall',
            uma: 'unmuteall', umall: 'unmuteall',
            d: 'deafen', ud: 'undeafen',
            da: 'deafenall', dall: 'deafenall',
            uda: 'undeafenall', udall: 'undeafenall',
            mv: 'move', mva: 'moveall', mvall: 'moveall',
            p: 'pull', pa: 'pullall', pall: 'pullall',
            l: 'lock', ul: 'unlock',
            pr: 'private', upr: 'unprivate'
        };

        const realSub = subAliases[subcommand] || subcommand;

        const botPerms = {
            kick: PermissionFlagsBits.MoveMembers,
            kickall: PermissionFlagsBits.MoveMembers,
            mute: PermissionFlagsBits.MuteMembers,
            unmute: PermissionFlagsBits.MuteMembers,
            muteall: PermissionFlagsBits.MuteMembers,
            unmuteall: PermissionFlagsBits.MuteMembers,
            deafen: PermissionFlagsBits.DeafenMembers,
            undeafen: PermissionFlagsBits.DeafenMembers,
            deafenall: PermissionFlagsBits.DeafenMembers,
            undeafenall: PermissionFlagsBits.DeafenMembers,
            move: PermissionFlagsBits.MoveMembers,
            moveall: PermissionFlagsBits.MoveMembers,
            pull: PermissionFlagsBits.MoveMembers,
            pullall: PermissionFlagsBits.MoveMembers,
            lock: PermissionFlagsBits.ManageChannels,
            unlock: PermissionFlagsBits.ManageChannels,
            private: PermissionFlagsBits.ManageChannels,
            unprivate: PermissionFlagsBits.ManageChannels
        };

        const requiredPerm = botPerms[realSub];
        if (requiredPerm && !guild.members.me.permissions.has(requiredPerm)) {
            return error(`I need \`${realSub.includes('mute') ? 'Mute Members' : realSub.includes('deafen') ? 'Deafen Members' : realSub.includes('kick') || realSub.includes('move') || realSub.includes('pull') ? 'Move Members' : 'Manage Channels'}\` permission to perform this action.`);
        }

        try {
            switch (realSub) {
                case 'kick': {
                    if (!member.permissions.has(PermissionFlagsBits.MoveMembers) && !isOwner) return error('You need `Move Members` permission.');
                    if (!options[0]) return usage('kick', '<user>', 'Kicks a user from their voice channel.', 'k');
                    const target = await getTarget(options[0]);
                    if (!target || !target.voice.channel) return error('User is not in a voice channel.');
                    const targetChannel = target.voice.channel;
                    await target.voice.disconnect();
                    return success(`Kicked ${target} from ${targetChannel}.`);
                }
                case 'kickall': {
                    if (!member.permissions.has(PermissionFlagsBits.MoveMembers) && !isOwner) return error('You need `Move Members` permission.');
                    if (!voiceChannel) return error('You must be in a voice channel.');
                    const members = voiceChannel.members.filter(m => !m.user.bot);
                    for (const [, m] of members) await m.voice.disconnect();
                    return success(`Kicked all users from ${voiceChannel}.`);
                }
                case 'mute': {
                    if (!member.permissions.has(PermissionFlagsBits.MuteMembers) && !isOwner) return error('You need `Mute Members` permission.');
                    if (!options[0]) return usage('mute', '<user>', 'Mutes a user in their voice channel.', 'm');
                    const target = await getTarget(options[0]);
                    if (!target || !target.voice.channel) return error('User is not in a voice channel.');
                    if (target.voice.mute) return error(`${target} is already muted.`);
                    await target.voice.setMute(true);
                    return success(`Muted ${target}.`);
                }
                case 'unmute': {
                    if (!member.permissions.has(PermissionFlagsBits.MuteMembers) && !isOwner) return error('You need `Mute Members` permission.');
                    if (!options[0]) return usage('unmute', '<user>', 'Unmutes a user in their voice channel.', 'um');
                    const target = await getTarget(options[0]);
                    if (!target || !target.voice.channel) return error('User is not in a voice channel.');
                    if (!target.voice.mute) return error(`${target} is not muted.`);
                    await target.voice.setMute(false);
                    return success(`Unmuted ${target}.`);
                }
                case 'muteall': {
                    if (!member.permissions.has(PermissionFlagsBits.MuteMembers) && !isOwner) return error('You need `Mute Members` permission.');
                    if (!voiceChannel) return error('You must be in a voice channel.');
                    const members = voiceChannel.members.filter(m => !m.user.bot && !m.voice.mute);
                    if (members.size === 0) return error('Everyone is already muted.');
                    for (const [, m] of members) await m.voice.setMute(true);
                    return success(`Muted everyone.`);
                }
                case 'unmuteall': {
                    if (!member.permissions.has(PermissionFlagsBits.MuteMembers) && !isOwner) return error('You need `Mute Members` permission.');
                    if (!voiceChannel) return error('You must be in a voice channel.');
                    const members = voiceChannel.members.filter(m => !m.user.bot && m.voice.mute);
                    if (members.size === 0) return error('No one is muted.');
                    for (const [, m] of members) await m.voice.setMute(false);
                    return success(`Unmuted everyone.`);
                }
                case 'deafen': {
                    if (!member.permissions.has(PermissionFlagsBits.DeafenMembers) && !isOwner) return error('You need `Deafen Members` permission.');
                    if (!options[0]) return usage('deafen', '<user>', 'Deafens a user in their voice channel.', 'd');
                    const target = await getTarget(options[0]);
                    if (!target || !target.voice.channel) return error('User is not in a voice channel.');
                    if (target.voice.deaf) return error(`${target} is already deafened.`);
                    const targetChannel = target.voice.channel;
                    await target.voice.setDeaf(true);
                    return success(`Deafened ${target} in ${targetChannel}.`);
                }
                case 'undeafen': {
                    if (!member.permissions.has(PermissionFlagsBits.DeafenMembers) && !isOwner) return error('You need `Deafen Members` permission.');
                    if (!options[0]) return usage('undeafen', '<user>', 'Undeafens a user in their voice channel.', 'ud');
                    const target = await getTarget(options[0]);
                    if (!target || !target.voice.channel) return error('User is not in a voice channel.');
                    if (!target.voice.deaf) return error(`${target} is not deafened.`);
                    const targetChannel = target.voice.channel;
                    await target.voice.setDeaf(false);
                    return success(`Undeafened ${target} in ${targetChannel}.`);
                }
                case 'deafenall': {
                    if (!member.permissions.has(PermissionFlagsBits.DeafenMembers) && !isOwner) return error('You need `Deafen Members` permission.');
                    if (!voiceChannel) return error('You must be in a voice channel.');
                    const members = voiceChannel.members.filter(m => !m.user.bot && !m.voice.deaf);
                    if (members.size === 0) return error('Everyone is already deafened.');
                    for (const [, m] of members) await m.voice.setDeaf(true);
                    return success(`Deafened everyone in ${voiceChannel}.`);
                }
                case 'undeafenall': {
                    if (!member.permissions.has(PermissionFlagsBits.DeafenMembers) && !isOwner) return error('You need `Deafen Members` permission.');
                    if (!voiceChannel) return error('You must be in a voice channel.');
                    const members = voiceChannel.members.filter(m => !m.user.bot && m.voice.deaf);
                    if (members.size === 0) return error('No one is deafened.');
                    for (const [, m] of members) await m.voice.setDeaf(false);
                    return success(`Undeafened everyone in ${voiceChannel}.`);
                }
                case 'move': {
                    if (!member.permissions.has(PermissionFlagsBits.MoveMembers) && !isOwner) return error('You need `Move Members` permission.');
                    if (!options[0]) return usage('move', '<user> <channel>', 'Moves a specific user to another voice channel.', 'mv');
                    if (!options[1]) return usage('move', '<user> <channel>', 'Provide the destination channel.', 'mv');
                    const target = await getTarget(options[0]);
                    const dest = await getChannel(options[1]);
                    if (!target || !target.voice.channel) return error('User is not in a voice channel.');
                    if (!dest || dest.type !== ChannelType.GuildVoice) return error('Provide a valid voice channel.');
                    await target.voice.setChannel(dest);
                    return success(`Moved ${target} to ${dest}.`);
                }
                case 'moveall': {
                    if (!member.permissions.has(PermissionFlagsBits.MoveMembers) && !isOwner) return error('You need `Move Members` permission.');
                    if (!voiceChannel) return error('You must be in a voice channel.');
                    if (!options[0]) return usage('moveall', '<channel>', 'Moves users from the current channel to another.', 'mva, mvall');
                    const dest = await getChannel(options[0]);
                    if (!dest || dest.type !== ChannelType.GuildVoice) return error('Provide a valid voice channel.');
                    const members = voiceChannel.members.filter(m => !m.user.bot);
                    for (const [, m] of members) await m.voice.setChannel(dest);
                    return success(`Moved everyone from ${voiceChannel} to ${dest}.`);
                }
                case 'pull': {
                    if (!member.permissions.has(PermissionFlagsBits.MoveMembers) && !isOwner) return error('You need `Move Members` permission.');
                    if (!voiceChannel) return error('You must be in a voice channel.');
                    if (!options[0]) return usage('pull', '<user>', 'Pulls a user into your current voice channel.', 'p');
                    const target = await getTarget(options[0]);
                    if (!target || !target.voice.channel) return error('User is not in a voice channel.');
                    await target.voice.setChannel(voiceChannel);
                    return success(`Pulled ${target} into ${voiceChannel}.`);
                }
                case 'pullall': {
                    if (!member.permissions.has(PermissionFlagsBits.MoveMembers) && !isOwner) return error('You need `Move Members` permission.');
                    if (!voiceChannel) return error('You must be in a voice channel.');
                    if (!options[0]) return usage('pullall', '<channel>', 'Pulls all users from a specified voice channel into yours.', 'pa, pall');
                    const source = await getChannel(options[0]);
                    if (!source || source.type !== ChannelType.GuildVoice) return error('Provide a valid voice channel.');
                    const members = source.members.filter(m => !m.user.bot);
                    for (const [, m] of members) await m.voice.setChannel(voiceChannel);
                    return success(`Pulled everyone from ${source} into ${voiceChannel}.`);
                }
                case 'lock': {
                    if (!member.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) return error('You need `Manage Channels` permission.');
                    if (!voiceChannel) return error('You must be in a voice channel.');
                    await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
                    return success(`Locked ${voiceChannel}.`);
                }
                case 'unlock': {
                    if (!member.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) return error('You need `Manage Channels` permission.');
                    if (!voiceChannel) return error('You must be in a voice channel.');
                    await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { Connect: true });
                    return success(`Unlocked ${voiceChannel}.`);
                }
                case 'private': {
                    if (!member.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) return error('You need `Manage Channels` permission.');
                    if (!voiceChannel) return error('You must be in a voice channel.');
                    await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
                    return success(`Made ${voiceChannel} private.`);
                }
                case 'unprivate': {
                    if (!member.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) return error('You need `Manage Channels` permission.');
                    if (!voiceChannel) return error('You must be in a voice channel.');
                    await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true });
                    return success(`Made ${voiceChannel} public.`);
                }
                default:
                    return this.sendHelpMenu(context, client, prefix);
            }
        } catch (err) {
            console.error(err);
            return error(`An error occurred: ${err.message}`);
        }
    },

    async sendHelpMenu(message, client, prefix) {
        const usedPrefix = prefix || client.prefix;
        const pages = [
            {
                items: [
                    { cmd: 'voice deafen', desc: 'Deafens a user in their voice channel.' },
                    { cmd: 'voice deafenall', desc: 'Deafens all users in your current voice channel.' },
                    { cmd: 'voice kick', desc: 'Kicks a user from their voice channel.' },
                    { cmd: 'voice kickall', desc: 'Kicks all users from the current voice channel.' },
                    { cmd: 'voice lock', desc: 'Locks the current voice channel.' },
                    { cmd: 'voice move', desc: 'Moves a specific user to another voice channel.' },
                    { cmd: 'voice moveall', desc: 'Moves users from the current channel to another.' }
                ]
            },
            {
                items: [
                    { cmd: 'voice mute', desc: 'Mutes a user in their voice channel.' },
                    { cmd: 'voice muteall', desc: 'Mutes all users in your current voice channel.' },
                    { cmd: 'voice private', desc: 'Makes the current voice channel private.' },
                    { cmd: 'voice pull', desc: 'Pulls a user into your current voice channel.' },
                    { cmd: 'voice pullall', desc: 'Pulls all users from a specified voice channel.' },
                    { cmd: 'voice undeafen', desc: 'Undeafens a user in their voice channel.' },
                    { cmd: 'voice undeafenall', desc: 'Undeafens all users in your current voice channel.' }
                ]
            },
            {
                items: [
                    { cmd: 'voice unlock', desc: 'Unlocks the current voice channel.' },
                    { cmd: 'voice unmute', desc: 'Unmutes a user in their voice channel.' },
                    { cmd: 'voice unmuteall', desc: 'Unmutes all users in your current voice channel.' },
                    { cmd: 'voice unprivate', desc: 'Makes the current voice channel public.' }
                ]
            }
        ];

        let currentPage = 0;
        const author = message.author || message.user;

        const totalCommands = pages.reduce((acc, p) => acc + p.items.length, 0);

        const createContainer = (pageIdx) => {
            const page = pages[pageIdx];
            const container = new ContainerBuilder();
            const header = new TextDisplayBuilder().setContent(`### ${emoji.info} Voice Command [${totalCommands}]`);
            container.addTextDisplayComponents(header);
            container.addSeparatorComponents(new SeparatorBuilder());

            const content = page.items.map(item => `> ** \`${usedPrefix}${item.cmd}\` **\n╰ ${item.desc}`).join('\n\n');
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
            container.addSeparatorComponents(new SeparatorBuilder());

            const footer = new TextDisplayBuilder().setContent(`\n-# Page ${pageIdx + 1}/${pages.length} | Requested by ${author.displayName}`);
            container.addTextDisplayComponents(footer);

            return container;
        };

        const getButtons = () => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('home').setLabel('Home').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('close').setLabel('Close').setStyle(ButtonStyle.Danger)
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

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'close') {
                return interaction.message.delete().catch(() => { });
            }

            if (interaction.customId === 'home') currentPage = 0;
            if (interaction.customId === 'prev') currentPage = (currentPage - 1 + pages.length) % pages.length;
            if (interaction.customId === 'next') currentPage = (currentPage + 1) % pages.length;

            const updatedComponents = [createContainer(currentPage)];
            if (pages.length > 1) updatedComponents.push(buttonRow);

            await interaction.update({
                components: updatedComponents,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });
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
