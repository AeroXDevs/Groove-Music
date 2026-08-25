const {
    MessageFlags,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
} = require("discord.js");

module.exports = {
    name: "active",
    category: "Owner",
    description: "Display currently active music players",
    aliases: ["playing", "act"],
    owner: true,

    async execute(message, args, client, prefix) {
        if (!client.owners.includes(message.author.id)) return;

        const players = Array.from(client.manager.players.values()).filter(p => p.playing || p.paused);

        if (players.length === 0) {
            const infoDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.info} No active music players found.**`);
            const container = new ContainerBuilder().addTextDisplayComponents(infoDisplay);
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const playersPerPage = 5;
        const pages = Math.ceil(players.length / playersPerPage);
        let currentPage = 0;

        const createContainer = (page) => {
            const start = page * playersPerPage;
            const end = start + playersPerPage;
            const currentPlayers = players.slice(start, end);

            const list = currentPlayers.map((player, i) => {
                const guild = client.guilds.cache.get(player.guildId);
                const track = player.queue.current;
                const members = guild?.members.me.voice.channel?.members.filter(m => !m.user.bot).size || 0;

                return `**\`${start + i + 1}\` : ${guild?.name || "Unknown"}**\n` +
                    `> **Track:** ${track ? `[${track.title.substring(0, 30)}](${track.uri})` : "None"}\n` +
                    `> **Listeners:** \` ${members} \`\n> **${client.t(message.guild.id, "ui.label.id")}:** \` ${player.guildId} \``;
            });

            const headerDisplay = new TextDisplayBuilder()
                .setContent(`### ${client.emoji.dance} **Active Players (${players.length})**`);

            const listDisplay = new TextDisplayBuilder()
                .setContent(list.join('\n\n'));

            const footerDisplay = new TextDisplayBuilder()
                .setContent(`-# Page ${page + 1}/${pages}`);

            return new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(listDisplay)
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(footerDisplay);
        };

        const createButtons = () => {
            if (pages <= 1) return [];
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('Back').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
                new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === pages - 1),
                new ButtonBuilder().setCustomId('close').setLabel('Close').setStyle(ButtonStyle.Danger)
            );
        };

        const msg = await message.reply({
            components: pages > 1 ? [createContainer(currentPage), createButtons()] : [createContainer(currentPage)],
            flags: MessageFlags.IsComponentsV2
        });

        if (pages > 1) {
            const collector = msg.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 300000
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'close') {
                    collector.stop();
                    return await i.message.delete().catch(() => { });
                }

                if (i.customId === 'prev') currentPage--;
                if (i.customId === 'next') currentPage++;

                await i.update({
                    components: [createContainer(currentPage), createButtons()],
                    flags: MessageFlags.IsComponentsV2
                });
            });

            collector.on('end', () => {
                msg.edit({ components: [createContainer(currentPage)] }).catch(() => { });
            });
        }
    }
};
