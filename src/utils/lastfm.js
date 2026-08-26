const axios = require('axios');

class LastFM {
    constructor(client) {
        this.client = client;
        this.apiKey = client.config.LastFmKey;
        this.baseUrl = 'http://ws.audioscrobbler.com/2.0/';
    }

    async getSimilarTracks(artist, track, limit = 5) {
        if (!this.apiKey) return [];
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'track.getsimilar',
                    artist: artist,
                    track: track,
                    api_key: this.apiKey,
                    format: 'json',
                    limit: limit
                }
            });

            if (response.data && response.data.similartracks && response.data.similartracks.track) {
                const tracks = response.data.similartracks.track;
                return tracks.map(t => ({
                    title: t.name,
                    author: t.artist.name
                }));
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async getSimilarArtists(artist, limit = 5) {
        if (!this.apiKey) return [];
        try {
            const searchRes = await this.searchArtist(artist);
            const targetArtist = searchRes ? searchRes.name : artist;

            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'artist.getsimilar',
                    artist: targetArtist,
                    api_key: this.apiKey,
                    format: 'json',
                    limit: limit,
                    autocorrect: 1
                }
            });

            if (response.data && response.data.similarartists && response.data.similarartists.artist) {
                const artists = response.data.similarartists.artist;
                if (Array.isArray(artists)) return artists.map(a => a.name);
                return [artists.name];
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async getTopTracks(artist, limit = 5) {
        if (!this.apiKey) return [];
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'artist.gettoptracks',
                    artist: artist,
                    api_key: this.apiKey,
                    format: 'json',
                    limit: limit,
                    autocorrect: 1
                }
            });

            if (response.data && response.data.toptracks && response.data.toptracks.track) {
                const tracks = response.data.toptracks.track;
                if (Array.isArray(tracks)) {
                    return tracks.map(t => ({
                        title: t.name,
                        author: t.artist.name
                    }));
                }
                return [{ title: tracks.name, author: tracks.artist.name }];
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async getTopTracksByTag(tag, limit = 10) {
        if (!this.apiKey) return [];
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'tag.gettoptracks',
                    tag: tag,
                    api_key: this.apiKey,
                    format: 'json',
                    limit: limit
                }
            });

            if (response.data && response.data.tracks && response.data.tracks.track) {
                const tracks = response.data.tracks.track;
                return tracks.map(t => ({
                    title: t.name,
                    author: t.artist.name
                }));
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async searchArtist(artist) {
        if (!this.apiKey) return null;
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'artist.search',
                    artist: artist,
                    api_key: this.apiKey,
                    format: 'json',
                    limit: 1
                }
            });

            if (response.data && response.data.results && response.data.results.artistmatches && response.data.results.artistmatches.artist) {
                const matches = response.data.results.artistmatches.artist;
                return Array.isArray(matches) ? matches[0] : matches;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
}

module.exports = LastFM;
