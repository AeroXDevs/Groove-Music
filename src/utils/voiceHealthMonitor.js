class VoiceHealthMonitor {
    constructor(client) {
        this.client = client;
        this.healthChecks = new Map();
        this.CHECK_INTERVAL = 3 * 60 * 1000;
        this.IDLE_THRESHOLD = 10 * 60 * 1000;
    }

    startMonitoring(player) {
        if (!player || !player.guildId) return;

        if (this.healthChecks.has(player.guildId)) {
            return;
        }

        const interval = setInterval(async () => {
            await this.performHealthCheck(player);
        }, this.CHECK_INTERVAL);

        this.healthChecks.set(player.guildId, interval);

        if (!player.data) {
            player.data = new Map();
        }
        player.data.set('monitorStartTime', Date.now());
    }

    stopMonitoring(guildId) {
        const interval = this.healthChecks.get(guildId);
        if (interval) {
            clearInterval(interval);
            this.healthChecks.delete(guildId);

            const player = this.client.manager?.players.get(guildId);
            if (player?.data) {
                const reconnectTimeout = player.data.get('reconnectTimeout');
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                    player.data.delete('reconnectTimeout');
                    player.data.delete('reconnectAttempts');
                }
            }

            this.client.logger?.log(
                `[VoiceHealth] Stopped monitoring for guild ${guildId}`,
                'debug'
            );
        }
    }

    async performHealthCheck(player) {
        try {
            const currentPlayer = this.client.manager?.players.get(player.guildId);
            if (!currentPlayer) {
                this.stopMonitoring(player.guildId);
                return;
            }

            const guild = this.client.guilds.cache.get(player.guildId);
            if (!guild) {
                this.stopMonitoring(player.guildId);
                return;
            }

            const voiceChannel = guild.channels.cache.get(player.voiceId);
            if (!voiceChannel) {
                this.stopMonitoring(player.guildId);
                return;
            }

            const botMember = guild.members.cache.get(this.client.user.id);
            if (!botMember?.voice?.channelId) {
                const twoFourSeven = this.client.db.twofourseven.get(player.guildId);

                if (twoFourSeven) {
                    this.client.logger?.log(
                        `[VoiceHealth] Bot not in VC but 247 enabled for guild ${player.guildId}, attempting reconnect`,
                        'log'
                    );

                    try {

                        await player.setVoiceChannel(twoFourSeven.voiceId);


                        if (player.state === "DISCONNECTED" || player.state === "DESTROYED") {
                            await player.connect();
                        }

                        this.client.logger?.log(
                            `[VoiceHealth] Successfully reconnected 247 player for guild ${player.guildId}`,
                            'log'
                        );

                        if (player.data) {
                            player.data.delete('reconnectAttempts');
                            player.data.delete('reconnectTimeout');
                        }

                        return;
                    } catch (reconnectError) {

                        if (reconnectError.message?.includes('already connected')) {
                            this.client.logger?.log(
                                `[VoiceHealth] Player already connected for guild ${player.guildId}`,
                                'debug'
                            );
                            return;
                        }

                        const attempts = (player.data?.get('reconnectAttempts') || 0) + 1;
                        player.data?.set('reconnectAttempts', attempts);

                        this.client.logger?.log(
                            `[VoiceHealth] Failed to reconnect 247 player (attempt ${attempts}): ${reconnectError.message}. Retrying in 15s...`,
                            'error'
                        );

                        const existingTimeout = player.data?.get('reconnectTimeout');
                        if (existingTimeout) {
                            clearTimeout(existingTimeout);
                        }

                        const retryTimeout = setTimeout(async () => {
                            this.client.logger?.log(
                                `[VoiceHealth] Retrying 247 reconnection for guild ${player.guildId}`,
                                'log'
                            );
                            await this.performHealthCheck(player);
                        }, 15000);

                        player.data?.set('reconnectTimeout', retryTimeout);

                        return;
                    }
                }

                this.client.logger?.log(
                    `[VoiceHealth] Bot not in VC for guild ${player.guildId}, stopping monitor`,
                    'debug'
                );
                this.stopMonitoring(player.guildId);
                return;
            }


            if (botMember.voice.channelId !== player.voiceId) {
                const twoFourSeven = this.client.db.twofourseven.get(player.guildId);

                if (twoFourSeven && twoFourSeven.voiceId === player.voiceId) {
                    this.client.logger?.log(
                        `[VoiceHealth] Bot in different VC but 247 enabled, updating player for guild ${player.guildId}`,
                        'log'
                    );

                    try {
                        player.setVoiceChannel(twoFourSeven.voiceId);
                        this.client.logger?.log(
                            `[VoiceHealth] Updated player voice channel for guild ${player.guildId}`,
                            'log'
                        );
                        return;
                    } catch (updateError) {
                        this.client.logger?.log(
                            `[VoiceHealth] Failed to update player voice channel: ${updateError.message}`,
                            'error'
                        );
                    }
                }

                this.client.logger?.log(
                    `[VoiceHealth] Bot in different VC for guild ${player.guildId}, stopping monitor`,
                    'debug'
                );
                this.stopMonitoring(player.guildId);
                return;
            }

            const isIdle = !player.playing && !player.paused;
            const lastActivity = player.data?.get('lastActivityTime') || player.data?.get('monitorStartTime') || Date.now();
            const idleDuration = Date.now() - lastActivity;

            if (isIdle && idleDuration > this.IDLE_THRESHOLD) {
                this.client.logger?.log(
                    `[VoiceHealth] Player idle for ${Math.floor(idleDuration / 1000)}s in guild ${player.guildId}, refreshing connection`,
                    'log'
                );
                await this.refreshConnection(player, guild, voiceChannel);
            }

            if (isIdle) {
                const guildPrefix = this.client.db.prefixes.get(player.guildId);
                const prefix = guildPrefix?.prefix || this.client.prefix;
                await this.client.rest
                    .put(`/channels/${player.voiceId}/voice-status`, {
                        body: { status: `use **${prefix}play** to add songs` },
                    })
                    .catch(() => null);
            }

            if (player.playing && player.queue?.current) {
                if (!player.paused) {
                    const currentPos = player.position || 0;
                    const lastPos = player.data?.get('lastPosition');
                    const lastPosUpdate = player.data?.get('lastPositionUpdate') || player.data?.get('monitorStartTime') || Date.now();

                    if (lastPos !== undefined && lastPos === currentPos && currentPos > 0) {
                        const stalledDuration = Date.now() - lastPosUpdate;
                        if (stalledDuration > this.CHECK_INTERVAL * 0.8) {
                            this.client.logger?.log(
                                `[VoiceHealth] Player in guild ${player.guildId} seems stalled (pos: ${currentPos}ms), refreshing connection...`,
                                'warn'
                            );
                            await this.refreshConnection(player, guild, voiceChannel);
                            player.pause(true);
                            setTimeout(() => player.pause(false), 1000);
                        }
                    } else {
                        player.data?.set('lastPosition', currentPos);
                        player.data?.set('lastPositionUpdate', Date.now());
                    }
                }

                await this.updateVoiceState(player, player.queue.current);
            }

        } catch (error) {
            this.client.logger?.log(
                `[VoiceHealth] Error during health check for guild ${player.guildId}: ${error.message}`,
                'error'
            );
        }
    }

    async refreshConnection(player, guild, voiceChannel) {
        try {
            this.client.logger?.log(
                `[VoiceHealth] Refreshing voice connection for guild ${guild.id}`,
                'log'
            );

            if (player && player.voiceId) {
                try {
                    player.data?.set('lastActivityTime', Date.now());

                    await player.setVoiceChannel(voiceChannel.id);

                    try {
                        await player.connect();

                        if (!player.playing && !player.paused) {
                            const guildPrefix = this.client.db.prefixes.get(guild.id);
                            const prefix = guildPrefix?.prefix || this.client.prefix;
                            await this.client.rest
                                .put(`/channels/${player.voiceId}/voice-status`, {
                                    body: { status: `use **${prefix}play** to add songs` },
                                })
                                .catch(() => null);
                        }
                    } catch (connectError) {
                        const errorMsg = connectError.message || connectError.toString() || "";
                        if (!errorMsg.toLowerCase().includes('already connected')) {
                            throw connectError;
                        }
                        this.client.logger?.log(
                            `[VoiceHealth] Player in guild ${guild.id} already connected, skipping gateway reconnection`,
                            'debug'
                        );
                    }

                    this.client.logger?.log(
                        `[VoiceHealth] Successfully refreshed connection for guild ${guild.id}`,
                        'log'
                    );

                    player.data?.delete('lastPosition');
                    player.data?.delete('lastPositionUpdate');

                } catch (rejoinError) {
                    if (rejoinError.status === 404 || rejoinError.message?.includes('Session not found')) {
                        this.client.logger?.log(
                            `[VoiceHealth] Player session expired for guild ${guild.id}, cleaning up`,
                            'debug'
                        );
                        this.stopMonitoring(guild.id);
                        try {
                            const { safeDestroyPlayer } = require('./playerUtils');
                            await safeDestroyPlayer(player);
                        } catch {
                            try { await player.destroy(); } catch { }
                        }
                    } else {
                        this.client.logger?.log(
                            `[VoiceHealth] Failed to refresh connection for guild ${guild.id}: ${rejoinError.message}`,
                            'error'
                        );
                    }
                }
            } else {
                this.client.logger?.log(
                    `[VoiceHealth] Player no longer exists for guild ${guild.id}, stopping monitor`,
                    'debug'
                );
                this.stopMonitoring(guild.id);
            }

        } catch (error) {
            this.client.logger?.log(
                `[VoiceHealth] Error refreshing connection: ${error.message}`,
                'error'
            );
        }
    }

    async updateVoiceState(player, track) {
        try {
            await this.client.rest
                .put(`/channels/${player.voiceId}/voice-status`, {
                    body: { status: `${this.client.emoji.dance} Playing **${track.title}**` },
                })
                .catch(() => null);
        } catch (error) {
        }
    }

    updateActivity(guildId) {
        const player = this.client.manager?.players.get(guildId);
        if (player?.data) {
            player.data.set('lastActivityTime', Date.now());
        }
    }

    stopAll() {
        for (const [guildId, interval] of this.healthChecks) {
            clearInterval(interval);
        }
        this.healthChecks.clear();
        this.client.logger?.log('[VoiceHealth] Stopped all monitors', 'log');
    }
}

module.exports = VoiceHealthMonitor;
