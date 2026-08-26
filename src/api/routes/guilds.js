const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");

router.use(verifyToken);

router.get("/", (req, res) => {
  const client = req.app.get("client");
  const botGuilds = client.guilds.cache;

  const guilds = botGuilds
    .filter(g => g.members.cache.has(req.user.id) || true)
    .map(g => ({
      id: g.id,
      name: g.name,
      icon: g.iconURL({ size: 128 }),
      memberCount: g.memberCount,
      hasBot: true
    }));

  res.json(guilds);
});

router.get("/:guildId", (req, res) => {
  const client = req.app.get("client");
  const guild = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });

  const prefix = client.db.prefixes.get(guild.id);
  const lang = client.getLang(guild.id);
  const djRole = client.db.djrole.get(guild.id);
  const welcomeConfig = client.db.welcome.get(guild.id);
  const toggles = client.db.toggles.get(guild.id);
  const setup = client.db.setup.get(guild.id);
  const defaultVol = client.db.defaultvolume.get(guild.id);

  res.json({
    id: guild.id,
    name: guild.name,
    icon: guild.iconURL({ size: 256 }),
    memberCount: guild.memberCount,
    channels: guild.channels.cache
      .filter(c => c.type === 0)
      .map(c => ({ id: c.id, name: c.name })),
    roles: guild.roles.cache
      .filter(r => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
    settings: {
      prefix: prefix?.prefix || client.prefix,
      language: lang,
      djRole: djRole?.roleId || null,
      welcome: welcomeConfig || { enabled: false },
      toggles: toggles ? JSON.parse(toggles.commands || "[]") : [],
      musicChannel: setup?.channelId || null,
      defaultVolume: defaultVol || 80
    }
  });
});

router.patch("/:guildId/settings", (req, res) => {
  const client = req.app.get("client");
  const guild = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });

  const { prefix, language, djRole, welcome, toggles, defaultVolume } = req.body;

  if (prefix !== undefined) {
    if (prefix === client.prefix) {
      client.db.prefixes.delete(guild.id);
    } else {
      client.db.prefixes.set(guild.id, { prefix });
    }
  }

  if (language !== undefined) {
    try {
      client.setLang(guild.id, language);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }

  if (djRole !== undefined) {
    if (djRole === null) {
      client.db.djrole.delete(guild.id);
    } else {
      client.db.djrole.set(guild.id, { roleId: djRole });
    }
  }

  if (welcome !== undefined) {
    client.db.welcome.set(guild.id, welcome);
  }

  if (toggles !== undefined) {
    client.db.toggles.set(guild.id, { commands: JSON.stringify(toggles) });
  }

  if (defaultVolume !== undefined) {
    client.db.defaultvolume.set(guild.id, defaultVolume);
  }

  res.json({ success: true });
});

module.exports = router;
