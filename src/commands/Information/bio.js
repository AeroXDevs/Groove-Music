const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'bio',
    description: "Manage your profile bio.",
    category: 'Information',
    subCommands: ['set', 'clear'],

    async execute(message, args, client) {
        const prefix = client.prefix;
        const sub = args[0]?.toLowerCase();
        const user = message.author;

        if (sub === 'set') {
            const bioText = args.slice(1).join(' ');
            if (!bioText) {
                const container = new ContainerBuilder();
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`\`\`\` <> : Required | [] : Optional\`\`\``));
                container.addSeparatorComponents(new SeparatorBuilder());
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`> **\`${prefix}bio set <text>\`**\n\n${emoji.arrowright} Sets your profile bio.`));
                container.addSeparatorComponents(new SeparatorBuilder());
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Requested by ${user.displayName || user.username}`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
            if (bioText.length > 100) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Bio cannot exceed 100 characters.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
            const profile = client.db.profiles.get(user.id) || {};
            profile.bio = bioText;
            client.db.profiles.set(user.id, profile);
            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.check} Your bio has been set to \`${bioText}\``));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === 'clear') {
            const profile = client.db.profiles.get(user.id) || {};
            profile.bio = "No bio is set.";
            client.db.profiles.set(user.id, profile);
            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.check} Your bio has been cleared.`));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.info} Bio Command [2]`));
        container.addSeparatorComponents(new SeparatorBuilder());

        const helpContent = `> ** \`${prefix}bio set <text>\` **\n╰ Sets your profile bio.\n\n` +
            `> ** \`${prefix}bio clear\` **\n╰ Clears your profile bio.`;

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(helpContent));
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Requested by ${user.displayName || user.username}`));

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
