async function safeDestroyPlayer(player) {
    if (!player) return;

    try {
        await player.destroy();
    } catch (error) {
        if (error.status === 404) {
            console.log(`Player already destroyed or session not found for guild ${player.guildId}`);
        } else {
            console.error(`Error destroying player for guild ${player.guildId}:`, error);
        }
    }
}

async function handleSessionError(error, player, client) {
    if (error.status === 404 && error.message && error.message.includes('Session not found')) {
        console.log(`Session lost for guild ${player.guildId}, cleaning up...`);

        try {
            if (client.manager.players.has(player.guildId)) {
                client.manager.players.delete(player.guildId);
            }
            if (client.manager.shoukaku) {
                await client.manager.shoukaku.leaveVoiceChannel(player.guildId).catch(() => null);
            }
        } catch (cleanupError) {
            console.error(`Error during session cleanup:`, cleanupError);
        }

        return true;
    }
    return false;
}

async function recreatePlayer(client, guildId, voiceId, textId) {
    try {
        if (client.manager.players.has(guildId)) {
            const oldPlayer = client.manager.players.get(guildId);
            try {
                await oldPlayer.destroy();
            } catch (e) {
                client.manager.players.delete(guildId);
            }
        }

        if (client.manager.shoukaku.players.has(guildId)) {
            try {
                await client.manager.shoukaku.leaveVoiceChannel(guildId);
            } catch (e) {
                console.log(`Failed to leave voice channel via Shoukaku for guild ${guildId}`);
            }
        }

        const guild = client.guilds.cache.get(guildId);
        if (guild?.members?.me?.voice?.channel) {
            try {
                await guild.members.me.voice.setChannel(null);
            } catch (e) {
                console.log(`Failed to forcibly clear voice channel for guild ${guildId}`);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 1500));

        const newPlayer = await client.manager.createPlayer({
            guildId: guildId,
            voiceId: voiceId,
            textId: textId,
            volume: 80,
            deaf: true,
        });

        if (!newPlayer) {
            throw new Error("Kazagumo failed to create a new player object");
        }

        return newPlayer;
    } catch (error) {
        console.error(`Error recreating player:`, error);

        const isFetchError = error.message?.includes('fetch failed') ||
            error.code === 'UND_ERR_HEADERS_TIMEOUT' ||
            error.code === 'UND_ERR_CONNECT_TIMEOUT';

        if (isFetchError) {
            console.log(`[Music] Fetch error in recreatePlayer, retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                return await client.manager.createPlayer({
                    guildId: guildId,
                    voiceId: voiceId,
                    textId: textId,
                    volume: 80,
                    deaf: true,
                });
            } catch (retryError) {
                console.error(`[Music] Retry in recreatePlayer failed:`, retryError);
                throw retryError;
            }
        }
        throw error;
    }
}

async function forceCleanup(client, guildId) {
    try {
        if (client.manager.players.has(guildId)) {
            const player = client.manager.players.get(guildId);
            try {
                await player.destroy();
            } catch (e) {
                client.manager.players.delete(guildId);
            }
        }
        if (client.manager.shoukaku) {
            await client.manager.shoukaku.leaveVoiceChannel(guildId).catch(() => null);
        }
        if (client.voiceHealthMonitor) {
            client.voiceHealthMonitor.stopMonitoring(guildId);
        }
    } catch (err) {
        console.error(`Error forcing cleanup for guild ${guildId}:`, err);
    }
}

module.exports = { safeDestroyPlayer, handleSessionError, recreatePlayer, forceCleanup };
