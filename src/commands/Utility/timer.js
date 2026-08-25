const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
} = require('discord.js');

module.exports = {
    name: 'timer',
    description: 'Set a timer for a specific duration.',
    category: 'Utility',
    usage: 'timer <duration> [label]',
    example: 'timer 10m Take out the trash',
    aliases: ['remindme', 'tm'],

    async execute(message, args, client) {
        const durationStr = args[0];
        const label = args.slice(1).join(' ') || 'Timer';

        if (!durationStr) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} Please provide a duration! Format: \`.timer <duration> [label]\``);
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        const durationMs = parseDuration(durationStr);

        if (!durationMs) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} Invalid duration format! Use \`s\`, \`m\`, \`h\`, or \`d\`.`);
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        if (durationMs > 86400000) {
            const display = new TextDisplayBuilder().setContent(client.t(message.guild.id, "ui.timer.max", { e: client.emoji.warn }));
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        const endTime = Date.now() + durationMs;
        const endTimeUnix = Math.floor(endTime / 1000);


        const info = new TextDisplayBuilder()
            .setContent(
                `**Timer Ending!**\n` +
                `${client.emoji.blank}${client.emoji.wickarrow} <t:${endTimeUnix}:R>`
            );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(info);

        const reply = await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

        setTimeout(async () => {
            try {
                const endInfo = new TextDisplayBuilder()
                    .setContent(
                        `**Timer Ended!**\n` +
                        `${client.emoji.blank}${client.emoji.wickarrow} <t:${endTimeUnix}:R>`
                    );

                const endContainer = new ContainerBuilder()
                    .addTextDisplayComponents(endInfo);

                await reply.edit({
                    components: [endContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (err) {
            }
        }, durationMs);
    }
};

function parseDuration(str) {
    const units = { 's': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000 };
    const match = str.toLowerCase().match(/^(\d+)([smhd])$/);
    return match ? parseInt(match[1]) * units[match[2]] : null;
}
