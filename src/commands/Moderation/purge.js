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
    name: 'purge',
    aliases: ['clear', 'c'],
    description: 'Purge messages from the channel with various filters',
    category: 'Moderation',
    usage: 'purge <amount | filter> [args]',
    example: 'purge 50 | all | bots | user @user | contain <text> | embed | emoji | files | image | mentions | reactions',
    slashOptions: [
        {
            name: 'all',
            description: 'Purge all messages',
            type: 1,
            options: [{ name: 'amount', description: 'Amount of messages to purge', type: 4, required: false, min_value: 1 }]
        },
        {
            name: 'bots',
            description: 'Purge messages sent by bots',
            type: 1,
            options: [{ name: 'amount', description: 'Amount of messages to purge', type: 4, required: false, min_value: 1 }]
        },
        {
            name: 'contain',
            description: 'Purge messages containing specific text',
            type: 1,
            options: [
                { name: 'text', description: 'Text to search for', type: 3, required: true },
                { name: 'amount', description: 'Amount of messages to purge', type: 4, required: false, min_value: 1 }
            ]
        },
        {
            name: 'embed',
            description: 'Purge messages containing embeds',
            type: 1,
            options: [{ name: 'amount', description: 'Amount of messages to purge', type: 4, required: false, min_value: 1 }]
        },
        {
            name: 'emoji',
            description: 'Purge messages containing only emojis',
            type: 1,
            options: [{ name: 'amount', description: 'Amount of messages to purge', type: 4, required: false, min_value: 1 }]
        },
        {
            name: 'files',
            description: 'Purge messages containing attachments',
            type: 1,
            options: [{ name: 'amount', description: 'Amount of messages to purge', type: 4, required: false, min_value: 1 }]
        },
        {
            name: 'image',
            description: 'Purge messages containing images',
            type: 1,
            options: [{ name: 'amount', description: 'Amount of messages to purge', type: 4, required: false, min_value: 1 }]
        },
        {
            name: 'mentions',
            description: 'Purge messages containing mentions',
            type: 1,
            options: [{ name: 'amount', description: 'Amount of messages to purge', type: 4, required: false, min_value: 1 }]
        },
        {
            name: 'reactions',
            description: 'Clear reactions from messages',
            type: 1,
            options: [{ name: 'amount', description: 'Number of messages to clear reactions from', type: 4, required: false, min_value: 1 }]
        },
        {
            name: 'user',
            description: 'Purge messages from a specific user',
            type: 1,
            options: [
                { name: 'user', description: 'The user to purge messages from', type: 6, required: true },
                { name: 'amount', description: 'Amount of messages to purge', type: 4, required: false, min_value: 1 }
            ]
        }
    ],
    userPerms: ['ManageMessages'],
    botPerms: ['ManageMessages'],

    async slashExecute(interaction, client) {
        const isOwner = client.owners.includes(interaction.user.id);
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) && !isOwner) {
            const display = new TextDisplayBuilder().setContent(client.t(interaction.guildId, "mod.needPermShort", { e: emoji.warn, permission: "Manage Messages" }));
            return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        const subcommand = interaction.options.getSubcommand();
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');
        const text = interaction.options.getString('text');

        const args = [subcommand];
        if (subcommand === 'user' && targetUser) args.push(targetUser.id);
        if (subcommand === 'contain' && text) args.push(text);
        if (amount !== null) args.push(amount.toString());

        return module.exports.runPurge(interaction, args, client, true);
    },

    async execute(message, args, client) {
        const isOwner = client.owners.includes(message.author.id);
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages) && !isOwner) {
            const display = new TextDisplayBuilder().setContent(client.t(message.guild.id, "mod.needPermShort", { e: emoji.warn, permission: "Manage Messages" }));
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        await message.delete().catch(() => { });

        if (args.length === 0) {
            return module.exports.sendHelpMenu(message, client);
        }

        return module.exports.runPurge(message, args, client, false);
    },

    async runPurge(context, args, client, isSlash) {
        const channel = context.channel;
        let filter = args[0]?.toLowerCase();
        let amount = null;
        let targetUser = null;
        let query = null;

        if (!isNaN(args[0])) {
            amount = parseInt(args[0]);
            filter = 'all';
        } else {
            switch (filter) {
                case 'all':
                    if (args[1] && !isNaN(args[1])) amount = parseInt(args[1]);
                    break;

                case 'user':
                    const userArg = args[1]?.replace(/[<@!>]/g, '');
                    targetUser = await client.users.fetch(userArg).catch(() => null);

                    if (!targetUser && args[1]) {
                        const search = args[1].toLowerCase();
                        const foundMember = context.guild.members.cache.find(m =>
                            m.user.username.toLowerCase() === search ||
                            m.displayName.toLowerCase() === search ||
                            m.user.tag.toLowerCase() === search
                        );
                        if (foundMember) targetUser = foundMember.user;
                    }

                    if (!targetUser) {
                        const display = new TextDisplayBuilder().setContent(client.t(context.guild.id, "mod.needUser", { e: emoji.warn }));
                        return isSlash ? context.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 }) : channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
                    }
                    if (args[2] && !isNaN(args[2])) amount = parseInt(args[2]);
                    break;

                case 'contain':
                    query = args[1];
                    if (!query) {
                        const display = new TextDisplayBuilder().setContent(client.t(context.guild.id, "mod.needSearchText", { e: emoji.warn }));
                        return isSlash ? context.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 }) : channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
                    }
                    if (args[2] && !isNaN(args[2])) amount = parseInt(args[2]);
                    break;

                case 'bots':
                case 'embed':
                case 'emoji':
                case 'files':
                case 'image':
                case 'mentions':
                case 'reactions':
                    if (args[1] && !isNaN(args[1])) amount = parseInt(args[1]);
                    break;

                default:
                    if (!isSlash) return module.exports.sendHelpMenu(context, client);
            }
        }

        if (isSlash && !context.replied && !context.deferred) await context.deferReply();

        try {
            let totalDeleted = 0;
            let lastMessageId = null;
            let targetAmount = amount === null ? Infinity : amount;
            let skippedOld = false;

            if (filter === 'reactions') {
                let reactCount = 0;
                while (reactCount < targetAmount) {
                    const fetchOptions = { limit: 100 };
                    if (lastMessageId) fetchOptions.before = lastMessageId;

                    const fetched = await channel.messages.fetch(fetchOptions);
                    if (fetched.size === 0) break;

                    const reactMsgs = fetched.filter(m => m.reactions.cache.size > 0);
                    if (reactMsgs.size === 0) {
                        lastMessageId = fetched.last().id;
                        continue;
                    }

                    for (const m of reactMsgs.values()) {
                        if (reactCount >= targetAmount) break;
                        await m.reactions.removeAll().catch(() => { });
                        reactCount++;
                    }

                    lastMessageId = fetched.last().id;
                    if (fetched.size < 100) break;
                }

                const reactDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "mod.purge.reactions", { e: emoji.check, count: reactCount }));
                const reply = isSlash ?
                    await context.editReply({ components: [new ContainerBuilder().addTextDisplayComponents(reactDisplay)], flags: MessageFlags.IsComponentsV2 }) :
                    await channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(reactDisplay)], flags: MessageFlags.IsComponentsV2 });

                setTimeout(() => {
                    if (isSlash) context.deleteReply().catch(() => { });
                    else reply.delete().catch(() => { });
                }, 5000);
                return;
            }

            while (totalDeleted < targetAmount) {
                const fetchOptions = { limit: 100 };
                if (lastMessageId) fetchOptions.before = lastMessageId;

                const fetched = await channel.messages.fetch(fetchOptions);
                if (fetched.size === 0) break;

                let messagesToDelete = [];
                const remaining = targetAmount - totalDeleted;

                switch (filter) {
                    case 'all':
                        messagesToDelete = fetched.first(remaining);
                        break;
                    case 'bots':
                        messagesToDelete = fetched.filter(m => m.author.bot).first(remaining);
                        break;
                    case 'contain':
                        messagesToDelete = fetched.filter(m => m.content.toLowerCase().includes(query.toLowerCase())).first(remaining);
                        break;
                    case 'embed':
                        messagesToDelete = fetched.filter(m => m.embeds.length > 0).first(remaining);
                        break;
                    case 'emoji':
                        const emojiRegex = /<a?:\w+:\d+>|[\u2700-\u27bf]|[\u1f300-\u1f64f]|[\u1f680-\u1f6ff]|[\u1f1e0-\u1f1ff]/g;
                        messagesToDelete = fetched.filter(m => !m.content.replace(emojiRegex, '').trim() && m.content.match(emojiRegex)).first(remaining);
                        break;
                    case 'files':
                        messagesToDelete = fetched.filter(m => m.attachments.size > 0).first(remaining);
                        break;
                    case 'image':
                        messagesToDelete = fetched.filter(m =>
                            m.attachments.some(a => a.contentType?.startsWith('image/')) ||
                            m.embeds.some(e => e.data.type === 'image' || e.data.image)
                        ).first(remaining);
                        break;
                    case 'mentions':
                        messagesToDelete = fetched.filter(m => m.mentions.users.size > 0 || m.mentions.roles.size > 0).first(remaining);
                        break;
                    case 'user':
                        messagesToDelete = fetched.filter(m => m.author.id === targetUser.id).first(remaining);
                        break;
                }

                if (messagesToDelete.length > 0) {
                    try {
                        const deleted = await channel.bulkDelete(messagesToDelete, true);
                        totalDeleted += deleted.size;

                        if (deleted.size < messagesToDelete.length) {
                            skippedOld = true;
                            break;
                        }
                    } catch (err) {
                        if (err.status === 429 || err.code === 429) {
                            const rateLimitDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "mod.purge.apiLimit", { e: emoji.warn, count: totalDeleted }));
                            const reply = isSlash ?
                                await context.editReply({ components: [new ContainerBuilder().addTextDisplayComponents(rateLimitDisplay)], flags: MessageFlags.IsComponentsV2 }) :
                                await channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(rateLimitDisplay)], flags: MessageFlags.IsComponentsV2 });

                            setTimeout(() => {
                                if (isSlash) context.deleteReply().catch(() => { });
                                else reply.delete().catch(() => { });
                            }, 5000);
                            return;
                        }
                        throw err;
                    }
                }

                lastMessageId = fetched.last().id;
                if (fetched.size < 100) break;

                await new Promise(resolve => setTimeout(resolve, 500));
            }

            if (totalDeleted === 0) {
                const content = skippedOld
                    ? client.t(context.guild.id, "mod.purge.tooOld", { e: emoji.warn })
                    : client.t(context.guild.id, "mod.purge.noMatch", { e: emoji.warn });
                const display = new TextDisplayBuilder().setContent(content);
                const reply = isSlash ?
                    await context.editReply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 }) :
                    await channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });

                setTimeout(() => {
                    if (isSlash) context.deleteReply().catch(() => { });
                    else reply.delete().catch(() => { });
                }, 5000);
                return;
            }

            let successMsg = client.t(context.guild.id, "mod.purge.done", { e: emoji.check, count: totalDeleted });
            if (skippedOld) successMsg += `\n-# ${emoji.arrowright} Cannot purge messages older than 14 days.`;
            const successDisplay = new TextDisplayBuilder().setContent(successMsg);

            const reply = isSlash ?
                await context.editReply({ components: [new ContainerBuilder().addTextDisplayComponents(successDisplay)], flags: MessageFlags.IsComponentsV2 }) :
                await channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(successDisplay)], flags: MessageFlags.IsComponentsV2 });

            setTimeout(() => {
                if (isSlash) context.deleteReply().catch(() => { });
                else reply.delete().catch(() => { });
            }, 5000);

        } catch (error) {
            console.error('Purge error:', error);
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "mod.failed.purge", { e: emoji.warn, message: error.message }));
            return isSlash ?
                context.editReply({ components: [new ContainerBuilder().addTextDisplayComponents(errorDisplay)], flags: MessageFlags.IsComponentsV2 }) :
                channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(errorDisplay)], flags: MessageFlags.IsComponentsV2 });
        }
    },

    async sendHelpMenu(message, client) {
        const pages = [
            {
                title: client.t(message.guild.id, "mod.purge.helpTitle", { page: 1 }),
                items: [
                    { cmd: 'clear all', desc: client.t(message.guild.id, "mod.purge.all") },
                    { cmd: 'clear bots', desc: client.t(message.guild.id, "mod.purge.bots") },
                    { cmd: 'clear contain', desc: client.t(message.guild.id, "mod.purge.contain") },
                    { cmd: 'clear embed', desc: client.t(message.guild.id, "mod.purge.embed") },
                    { cmd: 'clear emoji', desc: client.t(message.guild.id, "mod.purge.emoji") },
                    { cmd: 'clear files', desc: client.t(message.guild.id, "mod.purge.files") }
                ]
            },
            {
                title: client.t(message.guild.id, "mod.purge.helpTitle", { page: 2 }),
                items: [
                    { cmd: 'clear image', desc: client.t(message.guild.id, "mod.purge.image") },
                    { cmd: 'clear mentions', desc: client.t(message.guild.id, "mod.purge.mentions") },
                    { cmd: 'clear reactions', desc: client.t(message.guild.id, "mod.purge.reactions2") },
                    { cmd: 'clear user', desc: client.t(message.guild.id, "mod.purge.user") }
                ]
            }
        ];

        let currentPage = 0;

        const createContainer = (pageIdx) => {
            const page = pages[pageIdx];
            const container = new ContainerBuilder();

            const header = new TextDisplayBuilder()
                .setContent(`### ${emoji.info} ${page.title}\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

            container.addTextDisplayComponents(header);
            container.addSeparatorComponents(new SeparatorBuilder());

            const content = page.items.map(item =>
                `> ** \`${item.cmd}\` **\n${emoji.arrowright} ${item.desc}`
            ).join('\n\n');

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

            return container;
        };

        const getButtons = (pageIdx) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('home')
                    .setLabel(client.t(message.guild.id, "buttons.home"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIdx === 0),
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel(client.t(message.guild.id, "buttons.previous"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIdx === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel(client.t(message.guild.id, "buttons.next"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIdx === pages.length - 1),
                new ButtonBuilder()
                    .setCustomId('close')
                    .setLabel(client.t(message.guild.id, "buttons.close"))
                    .setStyle(ButtonStyle.Danger)
            );
        };

        const msg = await message.channel.send({
            components: [createContainer(currentPage), getButtons(currentPage)],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 60000,
            componentType: ComponentType.Button
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'close') {
                return interaction.message.delete().catch(() => { });
            }

            if (interaction.customId === 'home') currentPage = 0;
            if (interaction.customId === 'prev') currentPage = Math.max(0, currentPage - 1);
            if (interaction.customId === 'next') currentPage = Math.min(pages.length - 1, currentPage + 1);

            await interaction.update({
                components: [createContainer(currentPage), getButtons(currentPage)],
                flags: MessageFlags.IsComponentsV2
            });
        });

        collector.on('end', () => {
            msg.edit({ components: [createContainer(currentPage)] }).catch(() => { });
        });
    }
};
