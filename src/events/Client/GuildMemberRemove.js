module.exports = {
    name: "guildMemberRemove",
    run: async (client, member) => {
        if (!member || !member.guild) return;

        try {
            const trackingEnabled = client.db.invitetracking.get(member.guild.id);

            if (!trackingEnabled || trackingEnabled.status !== 1) return;

            const joinRecord = client.db.invite_logs.get(member.guild.id, member.user.id);

            if (joinRecord && joinRecord.isLeft === 0) {
                client.db.invite_logs.update(member.guild.id, member.user.id, {
                    isLeft: 1,
                    leftAt: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error("Error in guildMemberRemove event:", error);
        }
    },
};
