const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');

async function endGiveaway(client, giveaway) {
    if (giveaway.ended) return;

    giveaway.ended = true;
    client.db.giveaways.set(giveaway.messageId, giveaway);

    const guild = client.guilds.cache.get(giveaway.guildId);
    if (!guild) return;

    const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) return;

    try {
        const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (!message) return;

        const winners = [];
        if (giveaway.participants.length > 0) {
            const validParticipants = giveaway.participants.filter(id => id !== giveaway.hostId);
            const participantsToUse = validParticipants.length > 0 ? validParticipants : giveaway.participants;

            const shuffled = [...participantsToUse].sort(() => 0.5 - Math.random());
            winners.push(...shuffled.slice(0, giveaway.winnerCount));
        }

        let winnerText = winners.length > 0
            ? `${winners.map(w => `<@${w}>`).join(', ')}`
            : 'No one entered the giveaway.';

        const endHeader = new TextDisplayBuilder()
            .setContent(`### ${client.emoji.gwy} Giveaway Ended`);

        const endSeparator = new SeparatorBuilder();

        const hostUser = await client.users.fetch(giveaway.hostId).catch(() => null);
        const hostDisplayName = hostUser.displayName;

        const endInfo = new TextDisplayBuilder()
            .setContent(
                `${client.emoji.wickarrow} **Prize:** \`${giveaway.prize}\`\n` +
                `${client.emoji.wickarrow} **Host:** <@${giveaway.hostId}>\n` +
                `${client.emoji.wickarrow} **Participants:** ${giveaway.participants.length}\n` +
                `${client.emoji.wickarrow} **Winners:** ${winnerText}`
            );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(endHeader)
            .addSeparatorComponents(endSeparator)
            .addTextDisplayComponents(endInfo);

        await message.edit({
            components: [container],
            embeds: [],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] }
        });

        await message.reactions.removeAll().catch(() => null);

        if (winners.length > 0) {
            channel.send({
                content: `${client.emoji.gwy} Congratulations ${winners.map(w => `<@${w}>`).join(', ')}, You won **\`${giveaway.prize}\`** hosted by ${hostUser}!`,
            });
        } else {
            channel.send({
                content: `The giveaway for **\`${giveaway.prize}\`** has ended, but no one joined.`,
            });
        }
    } catch (err) {
        console.error('Error ending giveaway:', err);
    }
}

async function rerollGiveaway(client, giveaway, channel) {
    if (!giveaway.ended) return "The giveaway hasn't ended yet!";
    if (giveaway.participants.length === 0) return "No one entered the giveaway!";

    const validParticipants = giveaway.participants.filter(id => id !== giveaway.hostId);
    const participantsToUse = validParticipants.length > 0 ? validParticipants : giveaway.participants;

    const winner = participantsToUse[Math.floor(Math.random() * participantsToUse.length)];

    channel.send({
        content: `${client.emoji.gwy} Congratulations <@${winner}>, You are the new winner of **\`${giveaway.prize}\`**!`,
    });

    return true;
}

async function recoverGiveaway(client, message) {
    try {
        const rawData = JSON.stringify(message.components);

        const prizeMatch = rawData.match(/\*\*Prize:\*\* `(.*?)`/);
        const winnersMatch = rawData.match(/\*\*Winners:\*\* `(\d+)`/);
        const hostMatch = rawData.match(/discord\.com\/users\/(\d+)/);
        const timeMatch = rawData.match(/<t:(\d+):R>/);

        if (!prizeMatch || !winnersMatch || !hostMatch || !timeMatch) return null;

        const prize = prizeMatch[1];
        const winnerCount = parseInt(winnersMatch[1]);
        const hostId = hostMatch[1];
        const endTime = parseInt(timeMatch[1]) * 1000;


        const emojiId = client.emoji.gwy.match(/:(\d+)>/)?.[1];
        if (!emojiId) return null;

        const reaction = message.reactions.cache.get(emojiId) ||
            message.reactions.cache.find(r => r.emoji.name === 'giveaway');

        let participants = [];
        if (reaction) {
            const users = await reaction.users.fetch();
            participants = users.filter(u => !u.bot).map(u => u.id);
        }

        const giveawayData = {
            guildId: message.guildId,
            channelId: message.channelId,
            messageId: message.id,
            hostId,
            prize,
            winnerCount,
            endTime,
            participants,
            ended: false
        };

        client.db.giveaways.set(message.id, giveawayData);
        return giveawayData;
    } catch (err) {
        console.error('Error recovering giveaway:', err);
        return null;
    }
}

async function syncGiveaways(client, guild) {
    const channels = guild.channels.cache.filter(c => c.isTextBased());
    for (const channel of channels.values()) {
        try {
            const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
            if (!messages) continue;

            for (const message of messages.values()) {
                if (message.author.id !== client.user.id) continue;

                const rawData = JSON.stringify(message.components);
                if (!rawData || !rawData.includes("Giveaway Started")) continue;

                const exists = client.db.giveaways.get(message.id);
                if (exists) continue;

                const recovered = await recoverGiveaway(client, message);
                if (recovered) {
                    console.log(`[Giveaway Sync] Recovered giveaway ${recovered.messageId} in ${guild.name}`);
                    if (recovered.endTime <= Date.now()) {
                        await endGiveaway(client, recovered);
                    }
                }
            }
        } catch (e) {
            console.error(`[Giveaway Sync] Error in channel ${channel.id}:`, e);
        }
    }
}

module.exports = {
    init: (client) => {
        setInterval(async () => {
            try {
                const now = Date.now();
                const activeGiveaways = client.db.giveaways.find({ ended: false }, { condition: 'endTime <= ?', params: [now] });

                for (const giveaway of activeGiveaways) {
                    await endGiveaway(client, giveaway);
                }
            } catch (err) {
                console.error('Check giveaway error:', err);
            }
        }, 10000);

        setInterval(async () => {
            try {
                const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
                const result = client.db.giveaways.deleteMany({ ended: true }, { condition: 'endTime < ?', params: [oneDayAgo] });

                if (result.changes > 0) {
                    console.log(`[Giveaway Cleanup] Deleted ${result.changes} old giveaway(s)`);
                }
            } catch (err) {
                console.error('Giveaway cleanup error:', err);
            }
        }, 3600000);
    },
    endGiveaway,
    rerollGiveaway,
    recoverGiveaway,
    syncGiveaways
};
