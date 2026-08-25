const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'boostcount',
    description: 'Shows the total number of boosts in the server',
    category: 'Utility',
    usage: 'boostcount',
    example: 'boostcount',
    aliases: ['boosts', 'bc'],

    async execute(message, args, client) {
        const guild = message.guild;
        const boostCount = guild.premiumSubscriptionCount || 0;
        const tier = guild.premiumTier;

        const display = new TextDisplayBuilder()
            .setContent(`**Boost Count !**\n${emoji.blank}${emoji.wickarrow} This server is at **\` Level ${tier} \`** with **\` ${boostCount} Boosts \`**`);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(display);

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
