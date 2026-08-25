const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {
    name: "mutual",
    aliases: ["mutualservers", "sharedservers"],
    category: "Owner",
    description: "Show mutual servers between the bot and a user|bot",
    args: true,
    usage: "<user ID or @mention>",
    owner: true,

    slashOptions: [
        {
            name: "user",
            description: "User to check mutual servers with",
            type: 6,
            required: true
        }
    ],

    async slashExecute(interaction, client) {
        if (!client.owners.includes(interaction.user.id)) {
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        const user = interaction.options.getUser("user");

        const interactionWrapper = {
            guild: interaction.guild,
            channel: interaction.channel,
            author: interaction.user,
            member: interaction.member,
            createdTimestamp: interaction.createdTimestamp,
            reply: async (options) => {
                return await interaction.editReply(options);
            },
        };

        const args = [user.id];
        const prefix = client.prefix;
        return this.execute(interactionWrapper, args, client, prefix);
    },

    async execute(message, args, client, prefix) {
        if (!client.owners.includes(message.author.id)) {
            return;
        }

        if (!args[0]) {
            const helpDisplay = new TextDisplayBuilder()
                .setContent(
                    `**Usage:**\n` +
                    `\`${prefix}mutual <user ID or @mention>\`\n\n` +
                    `**Example:**\n` +
                    `\`${prefix}mutual @user\`\n` +
                    `\`${prefix}mutual 123456789012345678\``
                );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(helpDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const userId = args[0].replace(/[<@!>]/g, '');
        let user;

        try {
            user = await client.users.fetch(userId);
        } catch (error) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.cross} Could not find user with ID: \`${userId}\`**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const mutualGuilds = [];

        for (const [guildId, guild] of client.guilds.cache) {
            try {
                const member = await guild.members.fetch(userId).catch(() => null);
                if (member) {
                    mutualGuilds.push({
                        id: guildId,
                        name: guild.name,
                        memberCount: guild.memberCount,
                        ownerId: guild.ownerId
                    });
                }
            } catch (error) {
                continue;
            }
        }

        if (mutualGuilds.length === 0) {
            const infoDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.info} No mutual servers found with ${user.tag} (\`${user.id}\`)**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(infoDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const serversPerPage = 5;
        const pages = Math.ceil(mutualGuilds.length / serversPerPage);
        let currentPage = 0;

        const createContainer = (page) => {
            const start = page * serversPerPage;
            const end = start + serversPerPage;
            const currentServers = mutualGuilds.slice(start, end);

            const headerDisplay = new TextDisplayBuilder()
                .setContent(`**Mutual Servers [${mutualGuilds.length}]**`);

            const separator1 = new SeparatorBuilder();

            const serverList = currentServers.map((guild, i) => {
                const position = start + i + 1;
                const ownerTag = guild.ownerId === user.id ? ` [ ${client.emoji.owner} ]` : '';
                return `**\`${position}.\`** \`${guild.name}\`${ownerTag}\n╰ ID: \`${guild.id}\` - Members: \`${guild.memberCount}\` \n`;
            }).join('\n');

            const serversDisplay = new TextDisplayBuilder()
                .setContent(serverList);

            const separator2 = new SeparatorBuilder();

            const footerDisplay = new TextDisplayBuilder()
                .setContent(`-# Page ${page + 1}/${pages} | Requested by ${message.author.displayName}`);

            return new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator1)
                .addTextDisplayComponents(serversDisplay)
                .addSeparatorComponents(separator2)
                .addTextDisplayComponents(footerDisplay);
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
            flags: MessageFlags.IsComponentsV2
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
                    flags: MessageFlags.IsComponentsV2
                });
            });

            collector.on('end', () => {
                const finalComponents = [createContainer(currentPage)];
                msg.edit({ components: finalComponents }).catch(() => { });
            });
        }
    },
};
