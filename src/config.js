const path = require('path');

const jsonConfig = path.join(__dirname, 'config.json');

let config;
try {
  config = require(jsonConfig);
} catch (err) {
  console.error("❌ config.json not found or is invalid!", err.message);
  process.exit(1);
}

function parseBoolean(value) {
  if (typeof value === "string") {
    value = value.trim().toLowerCase();
  }
  switch (value) {
    case true:
    case "true":
      return true;
    default:
      return false;
  }
}

config.parseBoolean = parseBoolean;

// Secrets prefer the environment so they never have to live in config.json,
// which is tracked by git. Anything unset here falls back to the file, so
// existing setups keep working unchanged.
const fromEnv = {
  token: process.env.DISCORD_TOKEN,
  SpotifyID: process.env.SPOTIFY_ID,
  SpotifySecret: process.env.SPOTIFY_SECRET,
  LastFmKey: process.env.LASTFM_KEY,
  LastFmSecret: process.env.LASTFM_SECRET,
  prefix: process.env.BOT_PREFIX
};

for (const [key, value] of Object.entries(fromEnv)) {
  if (value) config[key] = value;
}

if (process.env.OWNER_IDS) {
  config.ownerID = process.env.OWNER_IDS.split(",").map((id) => id.trim()).filter(Boolean);
}

module.exports = config;
