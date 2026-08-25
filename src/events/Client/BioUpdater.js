const { Routes } = require('discord.js');

module.exports = {
    name: "clientReady",
    run: async (client) => {
        const updateBio = async () => {
            try {
                const totalUsers = client.users.cache.size;
                const totalCommands = client.commands.size;

                const formatK = (n) => {
                    if (n >= 1000) return `${Math.floor(n / 1000)}K+`;
                    return n.toString();
                };

                const bio = `**@ groove • ${formatK(totalUsers)}** __users__ **• ${totalCommands}+** __commands__\n\n` +
                    `**•** __High-Quality__ & __Lag-Free__ Music\n` +
                    `**•** Supports __Spotify__, __Apple Music__ & more\n` +
                    `**•** __Moderation__, __Utility__ & much more!`;

                await client.application.edit({
                    description: bio
                });

                client.logger.log(`Bot bio updated: ${totalUsers} users, ${totalCommands} commands.`, "ready");
            } catch (error) {
                client.logger.log(`Failed to update bot bio: ${error.message}`, "error");
            }
        };

        await updateBio();

        setInterval(updateBio, 60 * 60 * 1000);
    },
};
