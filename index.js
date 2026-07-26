require('dotenv').config();
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

// Undici Timings für stabile Lavalink/HTTP-Verbindungen
const { setGlobalDispatcher, Agent } = require("undici");
setGlobalDispatcher(new Agent({
  connect: { timeout: 60_000 },
  headersTimeout: 60_000,
  bodyTimeout: 60_000,
  pipelining: 1
}));

const MusicBot = require("./src/structures/MusicClient");
const initializeCleanup = require("./src/events/Client/PremiumChecks");
const emojis = require("./src/emojis");
const config = require("./src/config");

// Tokens aus config oder .env laden (unterstützt ein einzelnes Token oder ein Array aus Tokens)
const tokenList = config.tokens || [process.env.DISCORD_TOKEN];
const tokens = Array.isArray(tokenList) ? tokenList : [tokenList];

// Speichert alle laufenden Bot-Instanzen
const clients = [];

// Startet für jedes Token im Array einen eigenen Musik-Bot
tokens.forEach((token, index) => {
  if (!token) return;

  const client = new MusicBot();
  client.emoji = emojis;

  // Cleanup Event für Premium/Voice-Status initialisieren
  initializeCleanup(client);

  // Verbindet den Bot
  client.connect(token);
  clients.push(client);

  console.log(`[System] Bot #${index + 1} gestartet.`);
});

module.exports = clients;

// -------------------------------------------------------------
// Fehlerbehandlung & Absturzsicherung
// -------------------------------------------------------------

process.on("unhandledRejection", (reason) => {
  if (reason && (reason.code === 'UND_ERR_CONNECT_TIMEOUT' || (reason.message && reason.message.includes('fetch failed')))) {
    return console.log("[Lavalink Error] Verbindungs-Timeout – Lavalink Node eventuell offline.");
  }

  // Session-Cleanup bei Lavalink-Fehlern für alle aktiven Bots durchführen
  if (reason && reason.message && reason.message.includes('Session not found')) {
    const guildIdMatch = reason.path?.match(/\/players\/(\d+)/);
    if (guildIdMatch?.[1]) {
      const guildId = guildIdMatch[1];

      clients.forEach(client => {
        if (client.manager?.players.has(guildId)) {
          client.manager.players.delete(guildId);
        }
        if (client.voiceHealthMonitor) {
          client.voiceHealthMonitor.stopMonitoring(guildId);
        }
      });
    }
    return;
  }

  console.error("[Unhandled Rejection]", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[Uncaught Exception]", err);
});
