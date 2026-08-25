const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    name: 'ping',
    aliases: ['latency', 'pong'],
    description: "Displays the bot's various latencies.",
    category: 'Information',
    slashOptions: [],

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

        const esc = "\u001b";
        const yellow = `${esc}[1;33m`;
        const gray = `${esc}[1;30m`;
        const blue = `${esc}[1;34m`;
        const white = `${esc}[1;37m`;
        const reset = `${esc}[0m`;

        const startHeader = new TextDisplayBuilder()
            .setContent(`### ${client.user.username}'s Latency\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:R>`);

        const loadingBlock = new TextDisplayBuilder()
            .setContent(`\`\`\`ansi\n ${yellow}• ${reset} ${yellow}Status ${reset}      ${blue}:: ${reset} ${white}Pinging... ${reset}\n\`\`\``);

        const loadingContainer = new ContainerBuilder()
            .addTextDisplayComponents(startHeader)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(loadingBlock);

        const msg = await message.reply({
            components: [loadingContainer],
            flags: MessageFlags.IsComponentsV2
        });

        const api_latency = client.ws.ping;
        const response_time = msg.createdTimestamp - message.createdTimestamp;

        const [db_latency, lavalink_latency] = await Promise.all([
            (async () => {
                const db_start = performance.now();
                try {
                    client.db.db.prepare('SELECT 1').get();
                    const elapsed = performance.now() - db_start;
                    return elapsed < 1 ? `${elapsed.toFixed(3)}ms` : `${Math.round(elapsed)}ms`;
                } catch {
                    return 'Error';
                }
            })(),

            (async () => {
                try {
                    const nodes = client.manager?.shoukaku?.nodes;
                    if (nodes && nodes.size > 0) {
                        const node = Array.from(nodes.values())[0];
                        if (node && node.state === 1) {
                            const start = Date.now();
                            try {
                                await node.rest.resolve('ytsearch:test');
                                return `${Date.now() - start}ms`;
                            } catch {
                                return 'Connected';
                            }
                        }
                    }
                    return 'Disconnected';
                } catch {
                    return 'Error';
                }
            })()
        ]);

        const finalHeader = new TextDisplayBuilder()
            .setContent(`### ${client.user.username}'s Latency\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:R>`);

        const latencyBlock = new TextDisplayBuilder()
            .setContent(`\`\`\`ansi\n` +
                ` ${yellow}• ${reset} ${yellow}Core Latency ${reset}   ${blue}::\n` +
                `   ${gray}L ${reset} ${gray}Websocket ${reset}     ${blue}: ${reset} ${white}${api_latency}ms ${reset}\n` +
                `   ${gray}L ${reset} ${gray}Response ${reset}      ${blue}: ${reset} ${white}${response_time}ms ${reset}\n` +
                ` ${yellow}• ${reset} ${yellow}Infrastructure ${reset} ${blue}::\n` +
                `   ${gray}L ${reset} ${gray}Database ${reset}      ${blue}: ${reset} ${white}${db_latency} ${reset}\n` +
                `   ${gray}L ${reset} ${gray}Lavalink ${reset}      ${blue}: ${reset} ${white}${lavalink_latency} ${reset}\n` +
                `\`\`\``);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(finalHeader)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(latencyBlock);

        try {
            await msg.edit({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Error editing ping message:', error);
            }
        }
    },
};
