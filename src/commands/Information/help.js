const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ComponentType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
const config = require('../../config.js');
const fs = require('fs');
const path = require('path');
const emoji = require("../../emojis");
const { parseEmoji } = require('../../utils/emojiParser.js');

const categoryInfo = {
    'Information': {
        emoji: '<:icon_2:1490275264263880734>',
        description: 'Shows information commands'
    },
    'Music': {
        emoji: '<:muscik:1490275609975328779>',
        description: 'Shows music commands'
    },
    'Favourite': {
        emoji: '<:icon_11:1490275358443044924>',
        description: 'Shows favourite commands'
    },
    'Config': {
        emoji: '<:geea:1490275618406006866>',
        description: 'Shows configuration commands'
    },
    'Utility': {
        emoji: '<:bosz:1490275627406725252>',
        description: 'Shows utility commands'
    },
    'Giveaway': {
        emoji: '<:icon_17:1490275459831697419>',
        description: 'Shows giveaway commands'
    },
    'Filters': {
        emoji: '<:floil:1490275636823195718>',
        description: 'Shows filter commands'
    },
    'Tracker': {
        emoji: '<:tradu:1490275644960018435>',
        description: 'Shows invite tracking commands'
    },
    'Moderation': {
        emoji: '<:icon_20:1490275548990279790>',
        description: 'Shows moderation commands'
    },
    'Automod': {
        emoji: '<:autoss:1490299455293882454>',
        description: 'Shows automod commands'
    },
    'Voice': {
        emoji: `${emoji.volup}`,
        description: 'Shows voice commands'
    }
};

const categoryOrder = ['Information', 'Music', 'Favourite', 'Config', 'Moderation', 'Automod', 'Voice', 'Utility', 'Giveaway', 'Filters', 'Tracker'];

module.exports = {
    name: 'help',
    category: 'Information',
    aliases: ['h'],
    description: 'Shows all commands with categories',
    slashOptions: [
        {
            name: 'command',
            description: 'Shows about a specific command',
            type: 3,
            required: false,
            autocomplete: true
        }
    ],

    autocomplete: async (interaction, client) => {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const commandsPath = path.join(__dirname, '..', '..', 'commands');

        const allCommands = [];
        const categories = fs.readdirSync(commandsPath)
            .filter(file => fs.statSync(path.join(commandsPath, file)).isDirectory())
            .filter(folder => folder.toLowerCase() !== 'owner');

        for (const category of categories) {
            const categoryPath = path.join(commandsPath, category);
            const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(categoryPath, file);
                try {
                    const command = require(filePath);
                    if (command.name) {
                        allCommands.push({
                            name: command.name,
                            category: category
                        });
                    }
                } catch (error) {
                    console.error(`Error loading command at ${filePath}:`, error);
                }
            }
        }

        const filtered = allCommands
            .filter(cmd => cmd.name.toLowerCase().includes(focusedValue))
            .slice(0, 25)
            .map(cmd => ({
                name: `${cmd.name}`,
                value: cmd.name
            }));

        await interaction.respond(filtered).catch(() => { });
    },

    async slashExecute(interaction, client) {
        const commandName = interaction.options.getString('command');
        const commandsPath = path.join(__dirname, '..', '..', 'commands');


        if (commandName) {
            const allCategories = fs.readdirSync(commandsPath)
                .filter(file => fs.statSync(path.join(commandsPath, file)).isDirectory())
                .filter(folder => folder.toLowerCase() !== 'owner');

            let foundCommand = null;
            let commandCategory = null;

            for (const category of allCategories) {
                const categoryPath = path.join(commandsPath, category);
                const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

                for (const file of commandFiles) {
                    const filePath = path.join(categoryPath, file);
                    try {
                        const command = require(filePath);
                        const search = commandName.trim().toLowerCase().split(/\s+/)[0];
                        if (command.name && (command.name.toLowerCase() === search || (command.aliases && command.aliases.includes(search)))) {
                            foundCommand = command;
                            commandCategory = category;
                            break;
                        }
                    } catch (error) {
                        console.error(`Error loading command at ${filePath}:`, error);
                    }
                }
                if (foundCommand) break;
            }

            if (!foundCommand) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(`**${emoji.cross} Command \`${commandName}\` not found.**`);

                const errorContainer = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return interaction.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const parts = commandName.trim().split(/\s+/);
            const subSearch = parts[1]?.toLowerCase();

            if ((foundCommand.name === 'voice' || foundCommand.name === 'role' || foundCommand.name === 'bio') && foundCommand.execute) {
                return foundCommand.execute(interaction, parts.slice(1), client, '/');
            }

            let displayDescription = foundCommand.description || 'No description available';
            let displayName = foundCommand.name;
            let displayUsage = foundCommand.usage;
            let displayExample = foundCommand.example;
            let displayAliases = foundCommand.aliases;

            if (subSearch && foundCommand.slashOptions) {
                const sub = foundCommand.slashOptions.find(opt =>
                    opt.type === 1 &&
                    (opt.name.toLowerCase() === subSearch || (opt.aliases && opt.aliases.includes(subSearch)))
                );
                if (sub) {
                    displayName = `${foundCommand.name} ${sub.name}`;
                    displayDescription = sub.description;
                    displayAliases = sub.aliases || [];

                    displayUsage = `${foundCommand.name} ${sub.name}`;
                    if (sub.options) {
                        sub.options.forEach(o => {
                            displayUsage += o.required ? ` <${o.name}>` : ` [${o.name}]`;
                        });
                    }

                    displayExample = `${foundCommand.name} ${sub.name}`;
                    if (sub.options && sub.options.length > 0) {
                        const o = sub.options[0];
                        if (o.type === 8) displayExample += " @Role";
                        else if (o.type === 6) displayExample += " @User";
                        else if (['song', 'query'].includes(o.name)) displayExample += " imagine dragons believer";
                        else displayExample += ` ${o.name}`;
                    }
                }
            }

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`\`\`\` <> : Required | [] : Optional\`\`\``));
            container.addSeparatorComponents(new SeparatorBuilder());

            let usageStr = `/${displayName}`;
            if (displayUsage) {
                usageStr = `/${displayUsage}`;
            } else if (foundCommand.slashOptions && foundCommand.slashOptions.length > 0 && !subSearch) {
                foundCommand.slashOptions.forEach(opt => {
                    usageStr += opt.required ? ` <${opt.name}>` : ` [${opt.name}]`;
                });
            }

            let exampleStr = `/${displayName}`;
            if (displayExample) {
                exampleStr = `/${displayExample}`;
            } else if (foundCommand.slashOptions && foundCommand.slashOptions.length > 0 && !subSearch) {
                const opt = foundCommand.slashOptions[0];
                if (['song', 'query'].includes(opt.name)) exampleStr += ' imagine dragons believer';
                else if (opt.name === 'user') exampleStr += ' @user';
                else exampleStr += ` ${opt.name}`;
            }

            const aliases = (displayAliases && displayAliases.length > 0) ? displayAliases.map(a => `\`${a}\``).join(' , ') : 'None';

            const content = `> **\`${usageStr}\`**\n\n` +
                `${client.emoji.arrowright} ${displayDescription}\n` +
                `${client.emoji.arrowright} **${client.t(interaction.guildId, "ui.label.category")} :** ${commandCategory}\n` +
                (aliases !== 'None' ? `${client.emoji.arrowright} **Aliases :** ${aliases}\n` : '') +
                `${client.emoji.arrowright} **Example :** \`${exampleStr}\``;

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
            container.addSeparatorComponents(new SeparatorBuilder());

            return interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }


        const categories = fs.readdirSync(commandsPath)
            .filter(file => fs.statSync(path.join(commandsPath, file)).isDirectory())
            .filter(folder => folder.toLowerCase() !== 'owner');

        const categoryData = {};
        for (const category of categories) {
            const categoryPath = path.join(commandsPath, category);
            const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

            categoryData[category] = [];
            for (const file of commandFiles) {
                const filePath = path.join(categoryPath, file);
                try {
                    const command = require(filePath);
                    if (command.name && command.description) {
                        categoryData[category].push({
                            name: command.name,
                            description: command.description,
                            emoji: command.emoji
                        });

                        if (command.subCommands && Array.isArray(command.subCommands)) {
                            command.subCommands.forEach(sub => {
                                categoryData[category].push({
                                    name: `${command.name} ${sub}`,
                                    isSub: true
                                });
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error loading command at ${filePath}:`, error);
                }
            }
        }

        const botName = client.user.username;
        const headerDisplay = new TextDisplayBuilder()
            .setContent(`### ${client.emoji.check} Help Menu\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`);

        const separator = new SeparatorBuilder();

        const descriptionText = `**${botName}** is your ultimate multi-purpose companion, offering high-fidelity music from **YT Music**,**Spotify**,**Apple Music** and more. Featuring advanced **Moderation**, **Utility**, **Invites**, and more—all designed to elevate your server experience to the next level.`;

        const descriptionDisplay = new TextDisplayBuilder()
            .setContent(descriptionText);

        const separator2 = new SeparatorBuilder();


        const sortedCategories = categories.sort((a, b) => {
            const indexA = categoryOrder.indexOf(a);
            const indexB = categoryOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        const categoryOptions = sortedCategories.map(cat => {
            const info = categoryInfo[cat] || { emoji: '📁', description: `${cat.toLowerCase()} commands` };
            return {
                label: cat,
                value: cat,
                description: info.description,
                emoji: parseEmoji(info.emoji)
            };
        });

        categoryOptions.unshift({
            label: 'Home',
            value: 'home',
            description: 'Go back to homepage',
            emoji: parseEmoji('<:home:1490275655336857661>')
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('Select a category...')
            .addOptions(categoryOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const helpContainer = new ContainerBuilder()
            .addTextDisplayComponents(headerDisplay)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(descriptionDisplay)
            .addSeparatorComponents(separator2)
            .addActionRowComponents(row);

        const sentMessage = await interaction.reply({
            components: [helpContainer],
            flags: MessageFlags.IsComponentsV2
        });

        let lastActiveContainer = helpContainer;

        const collector = sentMessage.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 120000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(`**${emoji.cross} You can't use this menu.**`);

                const errorContainer = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return i.reply({
                    components: [errorContainer],
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                });
            }

            const selectedValue = i.values[0];

            if (selectedValue === 'home') {
                lastActiveContainer = helpContainer;
                await i.update({
                    components: [helpContainer],
                    flags: MessageFlags.IsComponentsV2
                });
                return;
            }

            const selectedCategory = selectedValue;
            const commandsList = categoryData[selectedCategory];

            const categoryHeader = new TextDisplayBuilder()
                .setContent(`### ${client.emoji.check} ${selectedCategory} Commands [${commandsList.length}]\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`);

            const catSeparator = new SeparatorBuilder();

            const commandsText = commandsList.length > 0
                ? commandsList.map(cmd => `\`${cmd.name}\``).join(' , ')
                : 'No commands found';

            const commandsDisplay = new TextDisplayBuilder()
                .setContent(commandsText);

            const catSeparator2 = new SeparatorBuilder();

            let serverPrefix = config.prefix || '.';
            try {
                const prefixData = client.db.prefixes.get(interaction.guild.id);
                if (prefixData && prefixData.prefix) {
                    serverPrefix = prefixData.prefix;
                }
            } catch (err) {
            }

            const tipText = `-# use \`${serverPrefix}help <cmd name>\` to get more details`;
            const tipDisplay = new TextDisplayBuilder()
                .setContent(tipText);

            const categoryContainer = new ContainerBuilder()
                .addTextDisplayComponents(categoryHeader)
                .addSeparatorComponents(catSeparator)
                .addTextDisplayComponents(commandsDisplay)
                .addSeparatorComponents(catSeparator2)
                .addTextDisplayComponents(tipDisplay)
                .addActionRowComponents(row);

            lastActiveContainer = categoryContainer;
            await i.update({
                components: [categoryContainer],
                flags: MessageFlags.IsComponentsV2
            });
        });

        collector.on('end', () => {
            selectMenu.setDisabled(true);
            selectMenu.setPlaceholder('Help Menu timed out');
            sentMessage.edit({ components: [lastActiveContainer] }).catch(() => { });
        });
    },

    async execute(message, args) {
        const client = message.client;
        const commandName = args[0];
        const commandsPath = path.join(__dirname, '..', '..', 'commands');

        if (commandName) {
            const allCategories = fs.readdirSync(commandsPath)
                .filter(file => fs.statSync(path.join(commandsPath, file)).isDirectory())
                .filter(folder => folder.toLowerCase() !== 'owner');

            let foundCommand = null;
            let commandCategory = null;

            for (const category of allCategories) {
                const categoryPath = path.join(commandsPath, category);
                const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

                for (const file of commandFiles) {
                    const filePath = path.join(categoryPath, file);
                    try {
                        const command = require(filePath);
                        const search = commandName.trim().toLowerCase().split(/\s+/)[0];
                        if (command.name && (command.name.toLowerCase() === search || (command.aliases && command.aliases.includes(search)))) {
                            foundCommand = command;
                            commandCategory = category;
                            break;
                        }
                    } catch (error) {
                        console.error(`Error loading command at ${filePath}:`, error);
                    }
                }
                if (foundCommand) break;
            }

            if (!foundCommand) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(`**${emoji.cross} Command \`${commandName}\` not found.**`);

                const errorContainer = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return message.channel.send({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            let serverPrefix = '.';
            try {
                const prefixData = client.db.prefixes.get(message.guild.id);
                if (prefixData && prefixData.prefix) {
                    serverPrefix = prefixData.prefix;
                }
            } catch (err) {
            }

            const subSearch = args[1]?.toLowerCase();

            if ((foundCommand.name === 'voice' || foundCommand.name === 'role' || foundCommand.name === 'bio') && foundCommand.execute) {
                return foundCommand.execute(message, args.slice(1), message.client, serverPrefix);
            }

            let displayDescription = foundCommand.description || 'No description available';
            let displayName = foundCommand.name;
            let displayUsage = foundCommand.usage;
            let displayExample = foundCommand.example;
            let displayAliases = foundCommand.aliases;

            if (subSearch && foundCommand.slashOptions) {
                const sub = foundCommand.slashOptions.find(opt =>
                    opt.type === 1 &&
                    (opt.name.toLowerCase() === subSearch || (opt.aliases && opt.aliases.includes(subSearch)))
                );
                if (sub) {
                    displayName = `${foundCommand.name} ${sub.name}`;
                    displayDescription = sub.description;
                    displayAliases = sub.aliases || [];

                    displayUsage = `${foundCommand.name} ${sub.name}`;
                    if (sub.options) {
                        sub.options.forEach(o => {
                            displayUsage += o.required ? ` <${o.name}>` : ` [${o.name}]`;
                        });
                    }

                    displayExample = `${foundCommand.name} ${sub.name}`;
                    if (sub.options && sub.options.length > 0) {
                        const o = sub.options[0];
                        if (o.type === 8) displayExample += " @Role";
                        else if (o.type === 6) displayExample += " @User";
                        else if (['song', 'query'].includes(o.name)) displayExample += " imagine dragons believer";
                        else displayExample += ` ${o.name}`;
                    }
                }
            }

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`\`\`\` <> : Required | [] : Optional\`\`\``));
            container.addSeparatorComponents(new SeparatorBuilder());

            let usageStr = `${serverPrefix}${displayName}`;
            if (displayUsage) {
                usageStr = `${serverPrefix}${displayUsage}`;
            } else if (foundCommand.slashOptions && foundCommand.slashOptions.length > 0 && !subSearch) {
                foundCommand.slashOptions.forEach(opt => {
                    usageStr += opt.required ? ` <${opt.name}>` : ` [${opt.name}]`;
                });
            }

            let exampleStr = `${serverPrefix}${displayName}`;
            if (displayExample) {
                exampleStr = `${serverPrefix}${displayExample}`;
            } else if (foundCommand.slashOptions && foundCommand.slashOptions.length > 0 && !subSearch) {
                const opt = foundCommand.slashOptions[0];
                if (['song', 'query'].includes(opt.name)) exampleStr += ' imagine dragons believer';
                else if (opt.name === 'user') exampleStr += ' @user';
                else exampleStr += ` ${opt.name}`;
            }

            const aliases = (displayAliases && displayAliases.length > 0) ? displayAliases.map(a => `\`${a}\``).join(' , ') : 'None';

            const content = `> **\`${usageStr}\`**\n\n` +
                `${emoji.arrowright} ${displayDescription}\n` +
                `${emoji.arrowright} **${client.t(message.guild.id, "ui.label.category")} :** ${commandCategory}\n` +
                (aliases !== 'None' ? `${emoji.arrowright} **Aliases :** ${aliases}\n` : '') +
                `${emoji.arrowright} **Example :** \`${exampleStr}\``;

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
            container.addSeparatorComponents(new SeparatorBuilder());

            return message.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const categories = fs.readdirSync(commandsPath)
            .filter(file => fs.statSync(path.join(commandsPath, file)).isDirectory())
            .filter(folder => folder.toLowerCase() !== 'owner');

        const categoryData = {};
        for (const category of categories) {
            const categoryPath = path.join(commandsPath, category);
            const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

            categoryData[category] = [];
            for (const file of commandFiles) {
                const filePath = path.join(categoryPath, file);
                try {
                    const command = require(filePath);
                    if (command.name && command.description) {
                        categoryData[category].push({
                            name: command.name,
                            description: command.description,
                            emoji: command.emoji
                        });

                        if (command.subCommands && Array.isArray(command.subCommands)) {
                            command.subCommands.forEach(sub => {
                                categoryData[category].push({
                                    name: `${command.name} ${sub}`,
                                    isSub: true
                                });
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error loading command at ${filePath}:`, error);
                }
            }
        }

        const botName = message.client.user.username;
        const headerDisplay = new TextDisplayBuilder()
            .setContent(`### ${emoji.check} Help Menu\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`);

        const separator = new SeparatorBuilder();

        const descriptionText = `**${botName}** is your ultimate multi-purpose companion, offering high-fidelity music from **YT Music**,**Spotify**,**Apple Music** and more. Featuring advanced **Moderation**, **Utility**, **Invites**, and more—all designed to elevate your server experience to the next level.`;

        const descriptionDisplay = new TextDisplayBuilder()
            .setContent(descriptionText);

        const separator2 = new SeparatorBuilder();


        const sortedCategories = categories.sort((a, b) => {
            const indexA = categoryOrder.indexOf(a);
            const indexB = categoryOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        const categoryOptions = sortedCategories.map(cat => {
            const info = categoryInfo[cat] || { emoji: '📁', description: `${cat.toLowerCase()} commands` };
            return {
                label: cat,
                value: cat,
                description: info.description,
                emoji: parseEmoji(info.emoji)
            };
        });

        categoryOptions.unshift({
            label: 'Home',
            value: 'home',
            description: 'Go back to homepage',
            emoji: parseEmoji('<:home:1490275655336857661>')
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('Select a category...')
            .addOptions(categoryOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const helpContainer = new ContainerBuilder()
            .addTextDisplayComponents(headerDisplay)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(descriptionDisplay)
            .addSeparatorComponents(separator2)
            .addActionRowComponents(row);

        const sentMessage = await message.channel.send({
            components: [helpContainer],
            flags: MessageFlags.IsComponentsV2
        });

        let lastActiveContainer = helpContainer;

        const collector = sentMessage.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 120000 });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(`**${emoji.cross} You can't use this menu.**`);

                const errorContainer = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return interaction.reply({
                    components: [errorContainer],
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                });
            }

            const selectedValue = interaction.values[0];

            if (selectedValue === 'home') {
                lastActiveContainer = helpContainer;
                await interaction.update({
                    components: [helpContainer],
                    flags: MessageFlags.IsComponentsV2
                });
                return;
            }

            const selectedCategory = selectedValue;
            const commandsList = categoryData[selectedCategory];

            const categoryHeader = new TextDisplayBuilder()
                .setContent(`### ${emoji.check} ${selectedCategory} Commands [${commandsList.length}]\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`);

            const catSeparator = new SeparatorBuilder();

            const commandsText = commandsList.length > 0
                ? commandsList.map(cmd => `\`${cmd.name}\``).join(' , ')
                : 'No commands found';

            const commandsDisplay = new TextDisplayBuilder()
                .setContent(commandsText);

            const catSeparator2 = new SeparatorBuilder();

            let serverPrefix = config.prefix || '.';
            try {
                const prefixData = client.db.prefixes.get(message.guild.id);
                if (prefixData && prefixData.prefix) {
                    serverPrefix = prefixData.prefix;
                }
            } catch (err) {
            }
            const tipText = `-# use \`${serverPrefix}help <cmd name>\` to get more details`;
            const tipDisplay = new TextDisplayBuilder()
                .setContent(tipText);

            const categoryContainer = new ContainerBuilder()
                .addTextDisplayComponents(categoryHeader)
                .addSeparatorComponents(catSeparator)
                .addTextDisplayComponents(commandsDisplay)
                .addSeparatorComponents(catSeparator2)
                .addTextDisplayComponents(tipDisplay)
                .addActionRowComponents(row);

            lastActiveContainer = categoryContainer;
            await interaction.update({
                components: [categoryContainer],
                flags: MessageFlags.IsComponentsV2
            });
        });

        collector.on('end', () => {
            selectMenu.setDisabled(true);
            selectMenu.setPlaceholder('Help Menu timed out');
            sentMessage.edit({ components: [lastActiveContainer] }).catch(() => { });
        });
    }
};
