const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    name: 'membercount',
    aliases: ['members', 'mc', 'memberinfo', 'memberstats'],
    description: "Displays detailed server member statistics.",
    category: 'Utility',
    slashOptions: [],
    args: false,
    usage: "",
    userPerms: [],
    owner: false,

    async slashExecute(interaction, client) {
        await interaction.deferReply();

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
        if (interaction.options) {
            const options = interaction.options.data;
            for (const option of options) {
                if (option.value !== undefined) {
                    args.push(option.value.toString());
                }
            }
        }

        const prefix = client.prefix;
        return this.execute(interactionWrapper, args, client, prefix);
    },

    async execute(message, args, client) {
        const guild = message.guild;

        await guild.members.fetch();

        const totalMembers = guild.memberCount;
        const members = guild.members.cache;

        const humans = members.filter(m => !m.user.bot).size;
        const bots = members.filter(m => m.user.bot).size;
        const online = members.filter(m => m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd').size;

        const humanPercent = ((humans / totalMembers) * 100).toFixed(1);
        const botPercent = ((bots / totalMembers) * 100).toFixed(1);

        const numb = (n) => client.numb ? client.numb(n) : n.toLocaleString();

        const esc = "\u001b";
        const yellow = `${esc}[1;33m`;
        const gray = `${esc}[1;30m`;
        const blue = `${esc}[1;34m`;
        const white = `${esc}[1;37m`;
        const reset = `${esc}[0m`;

        const pad = (str, n) => str + " ".repeat(Math.max(0, n - str.length));

        const header = new TextDisplayBuilder()
            .setContent(`### ${client.emoji.check} Member Statistics\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

        const separator1 = new SeparatorBuilder();

        const statsBlock = new TextDisplayBuilder()
            .setContent(`\`\`\`ansi\n` +
                ` ${yellow}• ${reset} ${yellow}${pad("Statistics", 11)} ${reset} ${blue}::\n` +
                `   ${gray}L ${reset} ${gray}${pad("Total", 9)} ${reset} ${blue}: ${reset} ${white}${numb(totalMembers)} ${reset}\n` +
                `   ${gray}L ${reset} ${gray}${pad("Humans", 9)} ${reset} ${blue}: ${reset} ${white}${numb(humans)} ${gray}(${humanPercent}%)${reset}\n` +
                `   ${gray}L ${reset} ${gray}${pad("Bots", 9)} ${reset} ${blue}: ${reset} ${white}${numb(bots)} ${gray}(${botPercent}%)${reset}\n` +
                `   ${gray}L ${reset} ${gray}${pad("Online", 9)} ${reset} ${blue}: ${reset} ${white}${numb(online)} ${reset}\n` +
                `\`\`\``);

        const separator2 = new SeparatorBuilder();

        const container = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addSeparatorComponents(separator1)
            .addTextDisplayComponents(statsBlock);

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        }).catch(() => null);
    }
};
