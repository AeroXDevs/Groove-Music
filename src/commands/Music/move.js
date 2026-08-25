const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionsBitField
} = require("discord.js");

module.exports = {
    name: "move",
    aliases: ["mv"],
    category: "Music",
    description: "Move the bot to your current voice channel",
    args: false,
    usage: "",
    userPrams: [],
    botPrams: ["EmbedLinks"],
    owner: false,
    player: false,
    inVoiceChannel: true,
    sameVoiceChannel: false,
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

    async execute(message, args, client, prefix) {
        const player = client.manager.players.get(message.guild.id);
        const { channel } = message.member.voice;


        if (!player) {

            if (
                !message.guild.members.me.permissions.has(
                    PermissionsBitField.resolve(["Speak", "Connect"]),
                )
            ) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(
                        client.t(message.guild.id, "music.noConnectPerms", { e: client.emoji.warn })
                    );

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            try {

                await client.manager.createPlayer({
                    guildId: message.guild.id,
                    voiceId: channel.id,
                    textId: message.channel.id,
                    volume: 100,
                    deaf: true,
                    mute: false,
                });

                const successDisplay = new TextDisplayBuilder()
                    .setContent(
                        client.t(message.guild.id, "music.joinedAndBound", { e: client.emoji.check, voice: channel.id, text: message.channel.id })
                    );

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(successDisplay);

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                console.error(error);

                const errorDisplay = new TextDisplayBuilder()
                    .setContent(client.t(message.guild.id, "music.joinError", { e: client.emoji.warn }));

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        if (player.voiceId === channel.id) {
            const warnDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.alreadyInVoice", { e: client.emoji.warn }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(warnDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        try {
            player.setVoiceChannel(channel.id);

            const twoFourSeven = client.db.twofourseven.get(message.guild.id);
            let is247Updated = false;

            if (twoFourSeven) {
                client.db.twofourseven.set(message.guild.id, { voiceId: channel.id, textId: message.channel.id });
                is247Updated = true;
            }

            const description = is247Updated
                ? client.t(message.guild.id, "music.moved247", { e: client.emoji.check, i: client.emoji.info, channel: channel.id })
                : client.t(message.guild.id, "music.moved", { e: client.emoji.check, channel: channel.id });

            const successDisplay = new TextDisplayBuilder()
                .setContent(description);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(successDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error(error);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.moveError", { e: client.emoji.warn }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};

