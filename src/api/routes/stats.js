const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");

router.get("/", verifyToken, (req, res) => {
  const client = req.app.get("client");

  const activePlayers = client.manager.players.size;
  const totalGuilds = client.guilds.cache.size;
  const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
  const totalChannels = client.channels.cache.size;

  res.json({
    guilds: totalGuilds,
    users: totalUsers,
    channels: totalChannels,
    activePlayers,
    uptime: client.uptime,
    ping: client.ws.ping,
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  });
});

router.get("/public", (req, res) => {
  const client = req.app.get("client");

  res.json({
    guilds: client.guilds.cache.size,
    users: client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
    uptime: client.uptime
  });
});

module.exports = router;
