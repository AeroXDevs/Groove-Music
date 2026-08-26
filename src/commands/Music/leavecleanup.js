const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");
const { convertTime } = require("../../utils/convert.js");

module.exports = {
    name: "leavecleanup",
    aliases: ["lc"],
    category: "Music",
    description: "Removes absent user's songs from the queue",
    args: false,
    usage: "",
    userPerms: [],
    owner: false,
    player: true,
    inVoiceChannel: true,
    sameVoiceChannel: true,
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

        if (!player.queue.current) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.nothingPlaying", { e: client.emoji.cross }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const queue = player.queue;

        if (queue.length === 0) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.queueEmpty", { e: client.emoji.info }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.mustBeInVoice", { e: client.emoji.cross }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const voiceChannelMembers = voiceChannel.members.map(member => member.id);

        const removedTracks = [];
        const removedUsers = new Set();

        for (let i = queue.length - 1; i >= 0; i--) {
            const track = queue[i];

            if (track.requester && !voiceChannelMembers.includes(track.requester.id)) {
                removedTracks.push({
                    title: track.title,
                    uri: track.uri,
                    duration: track.length,
                    requester: track.requester
                });
                removedUsers.add(track.requester.id);
                queue.splice(i, 1);
            }
        }

        if (removedTracks.length === 0) {
            const infoDisplay = new TextDisplayBuilder()
                .setContent(client.t(message.guild.id, "music.cleanup.none", { e: client.emoji.info }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(infoDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const headerDisplay = new TextDisplayBuilder()
            .setContent(client.t(message.guild.id, "music.cleanup.done", { e: client.emoji.check }));

        const separator = new SeparatorBuilder();

        const statsDisplay = new TextDisplayBuilder()
            .setContent(
                `Removed \`${removedTracks.length}\` track${removedTracks.length !== 1 ? 's' : ''} of \`${removedUsers.size}\` user${removedUsers.size !== 1 ? 's' : ''}.`
            );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(headerDisplay)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(statsDisplay);

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
