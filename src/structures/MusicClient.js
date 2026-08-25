const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { Kazagumo, Plugins } = require("kazagumo");
const { readdirSync, existsSync } = require("fs");
const { Connectors } = require("shoukaku");
const Spotify = require("kazagumo-spotify");
const { ClusterClient, getInfo } = require("discord-hybrid-sharding");
const loadPlayerManager = require("../loaders/loadPlayerManager");
const permissionHandler = require("../events/Client/PremiumChecks");
const VoiceHealthMonitor = require("../utils/voiceHealthMonitor");
const AutomodManager = require("../utils/automodManager");
const { t, isSupported, DEFAULT_LANG } = require("../utils/i18n");

class MusicBot extends Client {
  constructor() {
    super({
      intents: 34803,
      partials: ["MESSAGE", "CHANNEL", "REACTION"],
      properties: {
        browser: "Discord Android",
      },
      allowedMentions: {
        parse: ["roles", "users", "everyone"],
        repliedUser: false,
      },
      shards: getInfo().SHARD_LIST,
      shardCount: getInfo().TOTAL_SHARDS,
    });

    this.commands = new Collection();
    this.slashCommands = new Collection();
    this.config = require("../config.js");
    this.owners = this.config.ownerID;
    this.prefix = this.config.prefix;
    this.color = this.config.color;
    this.embedColor = this.config.color;
    this.button = require("../custom/button.js");
    this.embed = require("../custom/embed.js")(this.color);
    require("../custom/numformat")(this);
    this.aliases = new Collection();
    this.logger = require("../utils/logger.js");
    this.emoji = require("../emojis.js");
    this.cluster = new ClusterClient(this);
    if (!this.token) this.token = this.config.token;
    this.manager = null;
    this.spamMap = new Map();
    this.cooldowns = new Collection();
    this.db = require("./Database");
    this.logger.log("[DB] Local SQLite Database Initialized", "ready");
    this.langCache = new Map();

    try {
      this.automod = new AutomodManager(this);
      this.logger.log("[AutoMod] Static Manager Initialized Successfully", "ready");
    } catch (err) {
      this.logger.log(`[AutoMod] Failed to initialize: ${err.message}`, "error");
      console.error(err);
    }

    try {
      this.voiceHealthMonitor = new VoiceHealthMonitor(this);
      this.logger.log("[VoiceHealth] Monitor Initialized Successfully", "ready");
    } catch (err) {
      this.logger.log(`[VoiceHealth] Failed to initialize: ${err.message}`, "error");
      console.error(err);
    }

    permissionHandler(this);
    loadPlayerManager(this);
    [
      "loadClients",
      "loadCommands",
      "loadNodes",
      "loadPlayers",
    ].forEach((handler) => {
      require(`../loaders/${handler}`)(this);
    });
  }

  /**
   * Resolve a guild's configured language, falling back to the default.
   * Cached in memory because this is hit on every message and interaction.
   */
  getLang(guildId) {
    if (!guildId) return DEFAULT_LANG;
    if (this.langCache.has(guildId)) return this.langCache.get(guildId);

    let lang = DEFAULT_LANG;
    try {
      const stored = this.db.guildlang.get(guildId);
      if (stored && isSupported(stored)) lang = stored;
    } catch (err) {
      this.logger.log(`[i18n] Could not read language for ${guildId}: ${err.message}`, "error");
    }

    this.langCache.set(guildId, lang);
    return lang;
  }

  setLang(guildId, lang) {
    if (!isSupported(lang)) throw new Error(`Unsupported language: ${lang}`);
    this.db.guildlang.set(guildId, lang);
    this.langCache.set(guildId, lang);
  }

  /** Translate a key in the given guild's language. */
  t(guildId, key, vars = {}) {
    return t(this.getLang(guildId), key, vars);
  }

  connect() {
    return super.login(this.token);
  }
}

module.exports = MusicBot;
