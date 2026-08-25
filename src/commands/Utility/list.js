const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    PermissionFlagsBits
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'list',
    description: 'Lists various members or items in the server',
    category: 'Utility',
    usage: 'list <subcommand> [args]',
    example: 'list users | list admins | list bots | list inrole @Role',
    subCommands: [
        'activedeveloper', 'admins', 'bans', 'boosters', 'bots',
        'createdat', 'early', 'emojis', 'inrole', 'invoice',
        'joinedat', 'mods', 'roles', 'users'
    ],
    slashOptions: [
        {
            name: 'activedeveloper',
            description: 'Lists members with the active developer badge',
            type: 1
        },
        {
            name: 'admins',
            description: 'Lists administrators in the server',
            type: 1
        },
        {
            name: 'bans',
            description: 'Lists banned users in the server',
            type: 1
        },
        {
            name: 'boosters',
            description: 'Lists server boosters',
            type: 1
        },
        {
            name: 'bots',
            description: 'Lists bots in the server',
            type: 1
        },
        {
            name: 'createdat',
            description: 'Lists members by their account creation date',
            type: 1
        },
        {
            name: 'early',
            description: 'Lists members with the early supporter badge',
            type: 1
        },
        {
            name: 'emojis',
            description: 'Lists server emojis',
            type: 1
        },
        {
            name: 'inrole',
            description: 'Lists members with a specific role',
            type: 1,
            options: [{ name: 'role', description: 'The role to list members from', type: 8, required: true }]
        },
        {
            name: 'invoice',
            description: 'Lists members in a voice channel',
            type: 1
        },
        {
            name: 'joinedat',
            description: 'Lists members by their join date',
            type: 1
        },
        {
            name: 'mods',
            description: 'Lists moderators',
            type: 1
        },
        {
            name: 'roles',
            description: 'Lists all roles in the server',
            type: 1
        },
        {
            name: 'users',
            description: 'Lists all users in the server',
            type: 1
        }
    ],

    async slashExecute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const args = [subcommand];

        if (subcommand === 'inrole') {
            const role = interaction.options.getRole('role');
            args.push(role.id);
        }

        return module.exports.runList(interaction, args, client, true);
    },

    async execute(message, args, client, prefix) {
        if (args.length === 0) {
            return module.exports.sendHelpMenu(message, client, prefix);
        }
        return module.exports.runList(message, args, client, false, prefix);
    },

    async runList(context, args, client, isSlash, prefix) {
        const subcommand = args[0].toLowerCase();
        const guild = context.guild;
        const author = isSlash ? context.user : context.author;

        if (isSlash && !context.deferred) await context.deferReply();

        let items = [];
        let title = '';
        let icon = emoji.check;

        try {
            switch (subcommand) {
                case 'activedeveloper':
                    title = 'Active Developer';
                    const membersDev = guild.members.cache;
                    items = membersDev.filter(m => m.user.flags?.has('ActiveDeveloper')).map(m => ` <@${m.id}>`);
                    break;

                case 'admins':
                    title = 'Admins';
                    const membersAdmin = guild.members.cache;
                    items = membersAdmin.filter(m => m.permissions.has(PermissionFlagsBits.Administrator)).map(m => ` <@${m.id}>`);
                    break;

                case 'bans':
                    title = 'Bans';
                    const bans = await guild.bans.fetch();
                    items = bans.map(b => ` [\`${b.user.displayName}\`](https://discord.com/users/${b.user.id}) - \`${b.user.id}\``);
                    break;

                case 'boosters':
                    title = 'Boosters';
                    const membersBooster = guild.members.cache;
                    items = membersBooster.filter(m => m.premiumSince).map(m => ` <@${m.id}>`);
                    break;

                case 'bots':
                    title = 'Bots';
                    const membersBot = guild.members.cache;
                    items = membersBot.filter(m => m.user.bot).map(m => ` <@${m.id}> - \`${m.user.displayName}\``);
                    break;

                case 'createdat':
                    title = 'Created At';
                    const membersCreated = guild.members.cache;
                    items = Array.from(membersCreated.values())
                        .sort((a, b) => a.user.createdTimestamp - b.user.createdTimestamp)
                        .map(m => ` <@${m.id}> - <t:${Math.floor(m.user.createdTimestamp / 1000)}:D>`);
                    break;

                case 'early':
                    title = 'Early Supporter';
                    const membersEarly = guild.members.cache;
                    items = membersEarly.filter(m => m.user.flags?.has('PremiumEarlySupporter')).map(m => ` <@${m.id}>`);
                    break;

                case 'emojis':
                    title = 'Emojis';
                    items = guild.emojis.cache.map(e => `${e} - \`<:${e.name}:${e.id}>\``);
                    break;

                case 'inrole':
                    const roleId = isSlash ? args[1] : args[1]?.replace(/[<@&>]/g, '');
                    const role = guild.roles.cache.get(roleId);
                    if (!role) {
                        const display = new TextDisplayBuilder().setContent(client.t(context.guild.id, "ui.needRole", { e: emoji.warn }));
                        const container = new ContainerBuilder().addTextDisplayComponents(display);
                        if (isSlash) return context.editReply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
                        else return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
                    }
                    title = `In Role: ${role.name}`;
                    const membersRole = guild.members.cache;
                    items = membersRole.filter(m => m.roles.cache.has(role.id)).map(m => ` <@${m.id}>`);
                    break;

                case 'invoice':
                    title = 'In Voice';
                    const membersVoice = guild.members.cache;
                    items = membersVoice.filter(m => m.voice.channelId).map(m => ` <@${m.id}>`);
                    break;

                case 'joinedat':
                    title = 'Joined At';
                    const membersJoined = guild.members.cache;
                    items = Array.from(membersJoined.values())
                        .sort((a, b) => (a.joinedTimestamp || 0) - (b.joinedTimestamp || 0))
                        .map(m => ` <@${m.id}> - <t:${Math.floor(m.joinedTimestamp / 1000)}:D>`);
                    break;

                case 'mods':
                    title = 'Mods';
                    const membersMod = guild.members.cache;
                    items = membersMod.filter(m =>
                        m.permissions.has(PermissionFlagsBits.ManageMessages) ||
                        m.permissions.has(PermissionFlagsBits.ManageChannels) ||
                        m.permissions.has(PermissionFlagsBits.KickMembers) ||
                        m.permissions.has(PermissionFlagsBits.BanMembers)
                    ).map(m => ` <@${m.id}>`);
                    break;

                case 'roles':
                    title = 'Roles';
                    items = Array.from(guild.roles.cache.values())
                        .sort((a, b) => b.position - a.position)
                        .map(r => `${r} - \`${r.id}\``);
                    break;

                case 'users':
                    title = 'Users';
                    const membersUsers = guild.members.cache;
                    items = membersUsers.map(m => ` <@${m.id}>`);
                    break;

                default:
                    if (!isSlash) return module.exports.sendHelpMenu(context, client, prefix);
                    break;
            }

            if (items.length === 0) {
                const display = new TextDisplayBuilder().setContent(client.t(context.guild.id, "ui.listEmpty", { e: emoji.warn }));
                const container = new ContainerBuilder().addTextDisplayComponents(display);
                if (isSlash) return context.editReply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
                else return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
            }

            const itemsPerPage = 10;
            const totalPages = Math.ceil(items.length / itemsPerPage);
            let currentPage = 0;

            const createContainer = (page) => {
                const start = page * itemsPerPage;
                const end = start + itemsPerPage;
                const currentItems = items.slice(start, end);
                const container = new ContainerBuilder();

                const header = new TextDisplayBuilder().setContent(`### ${icon} ${title} list [${items.length}]`);
                container.addTextDisplayComponents(header);
                container.addSeparatorComponents(new SeparatorBuilder());

                const content = currentItems.map((item, i) => `**\`${String(start + i + 1).padStart(2, '0')}.\`** : ${item}`).join('\n');
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
                container.addSeparatorComponents(new SeparatorBuilder());

                const footer = new TextDisplayBuilder().setContent(`\n-# Page ${page + 1}/${totalPages} | Requested by ${author.displayName}`);
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
            if (totalPages > 1) components.push(buttonRow);

            const msg = isSlash
                ? await context.editReply({ components, flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } })
                : await context.reply({ components, flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

            if (totalPages <= 1) return;

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
                if (interaction.customId === 'prev') currentPage = (currentPage - 1 + totalPages) % totalPages;
                if (interaction.customId === 'next') currentPage = (currentPage + 1) % totalPages;

                const updatedComponents = [createContainer(currentPage)];
                if (totalPages > 1) updatedComponents.push(buttonRow);

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

        } catch (error) {
            console.error('List error:', error);
            const errorDisplay = new TextDisplayBuilder().setContent(client.t(context.guild.id, "ui.listError", { e: emoji.warn }));
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            if (isSlash) return context.editReply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
            else return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
        }
    },

    async sendHelpMenu(message, client, prefix) {
        const usedPrefix = prefix || client.prefix;
        const pages = [
            {
                title: 'List Command',
                items: [
                    { cmd: 'list activedeveloper', desc: 'Lists members with the active developer badge.' },
                    { cmd: 'list admins', desc: 'Lists administrators in the server.' },
                    { cmd: 'list bans', desc: 'Lists banned users in the server.' },
                    { cmd: 'list boosters', desc: 'Lists server boosters.' },
                    { cmd: 'list bots', desc: 'Lists bots in the server.' },
                    { cmd: 'list createdat', desc: 'Lists members by their account creation date.' }
                ]
            },
            {
                title: 'List Command',
                items: [
                    { cmd: 'list early', desc: 'Lists members with the early supporter badge.' },
                    { cmd: 'list emojis', desc: 'Lists server emojis.' },
                    { cmd: 'list inrole', desc: 'Lists members with a specific role.' },
                    { cmd: 'list invoice', desc: 'Lists members in a voice channel.' },
                    { cmd: 'list joinedat', desc: 'Lists members by their join date.' },
                    { cmd: 'list mods', desc: 'Lists moderators.' },
                    { cmd: 'list roles', desc: 'Lists all roles in the server.' }
                ]
            },
            {
                title: 'List Command',
                items: [
                    { cmd: 'list users', desc: 'Lists all users in the server.' }
                ]
            }
        ];

        let currentPage = 0;

        const totalCommands = pages.reduce((acc, p) => acc + p.items.length, 0);

        const createContainer = (pageIdx) => {
            const page = pages[pageIdx];
            const container = new ContainerBuilder();
            const header = new TextDisplayBuilder().setContent(`### ${emoji.info} List Command [${totalCommands}]`);
            container.addTextDisplayComponents(header);
            container.addSeparatorComponents(new SeparatorBuilder());

            const content = page.items.map(item => `> ** \`${usedPrefix}${item.cmd}\` **\n╰ ${item.desc}`).join('\n\n');
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
            container.addSeparatorComponents(new SeparatorBuilder());

            const footer = new TextDisplayBuilder().setContent(`\n-# Page ${pageIdx + 1}/${pages.length} | Requested by ${message.author.displayName}`);
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

        const msg = await message.channel.send({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] }
        });

        if (pages.length <= 1) return;

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
