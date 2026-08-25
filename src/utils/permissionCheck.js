
async function checkBotRank(userId, requiredRank, client, commandName = null) {
    const hierarchy = ['User', 'VIP', 'Staff', 'Admin', 'Manager', 'Developer', 'Owner'];
    const isBotOwner = client.config?.ownerID?.includes(userId);

    if (isBotOwner) return true;

    const profile = client.db.profiles.get(userId);

    let userRank = (profile?.rank === 'Owner' && !isBotOwner) ? 'User' : (profile?.rank || 'User');
    let highestIndex = hierarchy.indexOf(userRank);

    if (profile?.badges && Array.isArray(profile.badges)) {
        profile.badges.forEach(badge => {
            const badgeName = badge.includes(':') ? badge.split(':')[1].replace(/[^a-z0-9]/gi, '') : badge.replace(/[^a-z0-9]/gi, '');
            const matchedRank = hierarchy.find(r => r.toLowerCase() === badgeName.toLowerCase());
            if (matchedRank) {
                const rankIndex = hierarchy.indexOf(matchedRank);
                if (rankIndex > highestIndex) {
                    highestIndex = rankIndex;
                    userRank = matchedRank;
                }
            }
        });
    }

    if (commandName) {
        const cmd = commandName.toLowerCase();
        if (profile?.deniedCommands?.includes(cmd)) return false;
        if (profile?.allowedCommands?.includes(cmd)) return true;

        const rankPerm = client.db.rankPermissions.get(userRank);
        if (rankPerm?.deniedCommands?.includes(cmd)) return false;
        if (rankPerm?.allowedCommands?.includes(cmd)) return true;
    }

    const requiredIndex = hierarchy.indexOf(requiredRank);
    return highestIndex >= requiredIndex;
}

module.exports = { checkBotRank };
