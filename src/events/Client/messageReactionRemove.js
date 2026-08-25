const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageReactionRemove,
    run: async (client, reaction, user) => {
        if (user.bot) return;
        if (reaction.emoji.id !== '1462009113079971962') return;

        const giveaway = client.db.giveaways.get(reaction.message.id);
        if (!giveaway || giveaway.ended) return;

        if (giveaway.participants.includes(user.id)) {
            giveaway.participants = giveaway.participants.filter(id => id !== user.id);
            client.db.giveaways.set(reaction.message.id, giveaway);
        }
    }
};
